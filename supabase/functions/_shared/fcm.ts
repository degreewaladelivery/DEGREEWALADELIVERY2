/**
 * Firebase Cloud Messaging sender (HTTP v1).
 *
 * v1 authenticates with a short-lived OAuth token minted from a service account
 * key, not the old static server key. We sign the JWT with Deno's Web Crypto
 * rather than pulling in googleapis, for the same reason as the VAPID code: no
 * dependency to audit around a signing key.
 */

export interface ServiceAccount {
  project_id: string;
  client_email: string;
  private_key: string;
}

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** Service account keys are PEM PKCS#8; Web Crypto wants the raw DER bytes. */
function pemToDer(pem: string): Uint8Array {
  const body = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\s+/g, '');
  const binary = atob(body);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

let cachedToken: { token: string; expiresAt: number } | null = null;

/**
 * Mint (or reuse) an OAuth access token for FCM. Cached until shortly before
 * expiry — an order burst shouldn't mean a token exchange per order.
 */
export async function getAccessToken(account: ServiceAccount): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (cachedToken && cachedToken.expiresAt > now + 60) return cachedToken.token;

  const header = base64UrlEncode(
    new TextEncoder().encode(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
  );
  const claims = base64UrlEncode(
    new TextEncoder().encode(
      JSON.stringify({
        iss: account.client_email,
        scope: 'https://www.googleapis.com/auth/firebase.messaging',
        aud: 'https://oauth2.googleapis.com/token',
        iat: now,
        exp: now + 3600,
      })
    )
  );

  const key = await crypto.subtle.importKey(
    'pkcs8',
    pemToDer(account.private_key).buffer as ArrayBuffer,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    key,
    new TextEncoder().encode(`${header}.${claims}`)
  );
  const jwt = `${header}.${claims}.${base64UrlEncode(new Uint8Array(signature))}`;

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });
  const data = await res.json();
  if (!data.access_token) throw new Error(data.error_description ?? 'FCM auth failed');

  cachedToken = { token: data.access_token, expiresAt: now + (data.expires_in ?? 3600) };
  return cachedToken.token;
}

export interface FcmOutcome {
  token: string;
  ok: boolean;
  /** True when FCM says this token is dead and should be removed. */
  gone: boolean;
}

/**
 * Send one notification. Never throws — one unreachable phone must not stop the
 * other agents being told.
 */
export async function sendFcm(
  account: ServiceAccount,
  accessToken: string,
  token: string,
  title: string,
  body: string
): Promise<FcmOutcome> {
  try {
    const res = await fetch(
      `https://fcm.googleapis.com/v1/projects/${account.project_id}/messages:send`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: {
            token,
            notification: { title, body },
            android: {
              priority: 'HIGH',
              notification: {
                // One tag so a burst of orders collapses rather than burying
                // the phone, matching the web behaviour.
                tag: 'dw-new-order',
                channel_id: 'dw-orders',
                sound: 'default',
              },
            },
            apns: {
              headers: { 'apns-priority': '10', 'apns-collapse-id': 'dw-new-order' },
              payload: { aps: { sound: 'default' } },
            },
          },
        }),
      }
    );

    if (res.ok) return { token, ok: true, gone: false };

    const detail = await res.json().catch(() => ({}));
    const status = detail?.error?.status;
    // UNREGISTERED = uninstalled or token rotated; INVALID_ARGUMENT on a token
    // means it's malformed. Either way it will never work again.
    const gone = res.status === 404 || status === 'UNREGISTERED' || status === 'INVALID_ARGUMENT';
    return { token, ok: false, gone };
  } catch {
    return { token, ok: false, gone: false };
  }
}
