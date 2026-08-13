/**
 * Minimal Web Push sender (VAPID, no payload).
 *
 * The Web Push protocol needs two things: a signed VAPID JWT proving who is
 * sending, and a POST to the endpoint the browser handed us. Encrypting a
 * payload additionally needs ECDH + HKDF + AES-GCM, which we skip entirely by
 * sending a bodyless push — the notification text lives in the service worker.
 * That keeps order details off the vendor's push service too.
 *
 * Written against Deno's Web Crypto rather than pulling in a library, so there
 * is no dependency to audit for something that handles signing keys.
 */

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlDecode(value: string): Uint8Array {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(padded + '='.repeat((4 - (padded.length % 4)) % 4));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/**
 * The VAPID private key is a raw 32-byte P-256 scalar; Web Crypto wants a JWK,
 * and a JWK needs the public coordinates too — which we recover from the
 * uncompressed public key (0x04 || X || Y).
 */
async function importVapidKey(publicKey: string, privateKey: string): Promise<CryptoKey> {
  const pub = base64UrlDecode(publicKey);
  if (pub.length !== 65 || pub[0] !== 0x04) {
    throw new Error('VAPID public key must be an uncompressed P-256 point');
  }
  const jwk: JsonWebKey = {
    kty: 'EC',
    crv: 'P-256',
    x: base64UrlEncode(pub.slice(1, 33)),
    y: base64UrlEncode(pub.slice(33, 65)),
    d: privateKey.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''),
    ext: true,
  };
  return crypto.subtle.importKey('jwk', jwk, { name: 'ECDSA', namedCurve: 'P-256' }, false, [
    'sign',
  ]);
}

async function createVapidJwt(
  audience: string,
  subject: string,
  publicKey: string,
  privateKey: string
): Promise<string> {
  const header = base64UrlEncode(
    new TextEncoder().encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' }))
  );
  const claims = base64UrlEncode(
    new TextEncoder().encode(
      JSON.stringify({
        aud: audience,
        // Push services reject anything more than 24h out; 12h leaves room.
        exp: Math.floor(Date.now() / 1000) + 12 * 60 * 60,
        sub: subject,
      })
    )
  );

  const key = await importVapidKey(publicKey, privateKey);
  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    key,
    new TextEncoder().encode(`${header}.${claims}`)
  );

  return `${header}.${claims}.${base64UrlEncode(new Uint8Array(signature))}`;
}

export interface PushTarget {
  endpoint: string;
}

export interface PushOutcome {
  endpoint: string;
  status: number;
  /** True when the push service says this subscription is dead and should go. */
  gone: boolean;
}

/**
 * Ring one device. Never throws — a single unreachable browser must not stop
 * the rest of the agents being told about the order.
 */
export async function sendPush(
  target: PushTarget,
  vapid: { publicKey: string; privateKey: string; subject: string },
  ttlSeconds = 900
): Promise<PushOutcome> {
  try {
    const url = new URL(target.endpoint);
    const jwt = await createVapidJwt(
      url.origin,
      vapid.subject,
      vapid.publicKey,
      vapid.privateKey
    );

    const res = await fetch(target.endpoint, {
      method: 'POST',
      headers: {
        Authorization: `vapid t=${jwt}, k=${vapid.publicKey}`,
        TTL: String(ttlSeconds),
        // No body, so tell the service there is no content to forward.
        'Content-Length': '0',
        Urgency: 'high',
      },
    });

    return {
      endpoint: target.endpoint,
      status: res.status,
      // 404/410 mean the browser dropped the subscription for good.
      gone: res.status === 404 || res.status === 410,
    };
  } catch {
    return { endpoint: target.endpoint, status: 0, gone: false };
  }
}
