/**
 * Web Push sender: VAPID auth, with optional encrypted payloads.
 *
 * Two parts. A signed VAPID JWT proves who is sending, and a POST goes to the
 * endpoint the browser handed us. Supply a payload and it is encrypted to that
 * subscription (RFC 8291) so the notification can carry real text — the push
 * service relays bytes it has no key to read. Omit it and the push is a
 * bodyless doorbell, which is all some notifications need.
 *
 * Written against Deno's Web Crypto rather than pulling in a library, so there
 * is no dependency to audit around signing and encryption keys.
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


// ---------------------------------------------------------------------------
// Payload encryption (RFC 8291, aes128gcm)
// ---------------------------------------------------------------------------
//
// Without this a push can carry no text, so every notification has to say
// something vague like "your order was updated". The push service is not
// trusted with the contents: the payload is encrypted to a key only the
// subscribing browser holds, so Google relays bytes it cannot read.

const AUTH_INFO = new TextEncoder().encode('WebPush: info\0');

function concat(...parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((n, p) => n + p.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

async function hmac(key: Uint8Array, data: Uint8Array): Promise<Uint8Array> {
  const k = await crypto.subtle.importKey(
    'raw',
    key.buffer as ArrayBuffer,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  return new Uint8Array(await crypto.subtle.sign('HMAC', k, data.buffer as ArrayBuffer));
}

/** One-block HKDF expand, which is all the sizes here need. */
async function hkdf(
  salt: Uint8Array,
  ikm: Uint8Array,
  info: Uint8Array,
  length: number
): Promise<Uint8Array> {
  const prk = await hmac(salt, ikm);
  const okm = await hmac(prk, concat(info, new Uint8Array([1])));
  return okm.slice(0, length);
}

export interface PushKeys {
  /** The subscription's p256dh, base64url or standard base64. */
  p256dh: string;
  /** The subscription's auth secret. */
  auth: string;
}

/**
 * Encrypt a payload for one subscription, returning the aes128gcm body.
 */
async function encryptPayload(payload: string, keys: PushKeys): Promise<Uint8Array> {
  const uaPublic = base64UrlDecode(keys.p256dh);
  const authSecret = base64UrlDecode(keys.auth);

  // Ephemeral sender keypair — a fresh one per message, so one compromised
  // message tells an attacker nothing about any other.
  const asKeyPair = (await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveBits']
  )) as CryptoKeyPair;
  const asPublic = new Uint8Array(
    await crypto.subtle.exportKey('raw', asKeyPair.publicKey)
  );

  const uaKey = await crypto.subtle.importKey(
    'raw',
    uaPublic.buffer as ArrayBuffer,
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    []
  );
  const sharedSecret = new Uint8Array(
    await crypto.subtle.deriveBits({ name: 'ECDH', public: uaKey }, asKeyPair.privateKey, 256)
  );

  const salt = crypto.getRandomValues(new Uint8Array(16));

  // RFC 8291 §3.3: mix in both public keys so the derivation is bound to this
  // exact pair of parties.
  const keyInfo = concat(AUTH_INFO, uaPublic, asPublic);
  const ikm = await hkdf(authSecret, sharedSecret, keyInfo, 32);

  const cek = await hkdf(
    salt,
    ikm,
    new TextEncoder().encode('Content-Encoding: aes128gcm\0'),
    16
  );
  const nonce = await hkdf(
    salt,
    ikm,
    new TextEncoder().encode('Content-Encoding: nonce\0'),
    12
  );

  const aesKey = await crypto.subtle.importKey(
    'raw',
    cek.buffer as ArrayBuffer,
    { name: 'AES-GCM' },
    false,
    ['encrypt']
  );

  // 0x02 marks the final record; there is only ever one here.
  const plaintext = concat(new TextEncoder().encode(payload), new Uint8Array([2]));
  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: nonce.buffer as ArrayBuffer },
      aesKey,
      plaintext.buffer as ArrayBuffer
    )
  );

  // Header: salt | record size (4) | key id length (1) | key id
  const recordSize = new Uint8Array(4);
  new DataView(recordSize.buffer).setUint32(0, 4096);

  return concat(salt, recordSize, new Uint8Array([asPublic.length]), asPublic, ciphertext);
}

export interface PushTarget {
  endpoint: string;
  /** Supply both to send readable text; omit for a bodyless "doorbell" push. */
  keys?: PushKeys;
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
  ttlSeconds = 900,
  payload?: string
): Promise<PushOutcome> {
  try {
    const url = new URL(target.endpoint);
    const jwt = await createVapidJwt(
      url.origin,
      vapid.subject,
      vapid.publicKey,
      vapid.privateKey
    );

    const headers: Record<string, string> = {
      Authorization: `vapid t=${jwt}, k=${vapid.publicKey}`,
      TTL: String(ttlSeconds),
      Urgency: 'high',
    };

    let body: BodyInit | undefined;
    if (payload && target.keys?.p256dh && target.keys?.auth) {
      const encrypted = await encryptPayload(payload, target.keys);
      headers['Content-Encoding'] = 'aes128gcm';
      headers['Content-Type'] = 'application/octet-stream';
      body = encrypted.buffer as ArrayBuffer;
    } else {
      // No body, so tell the service there is no content to forward.
      headers['Content-Length'] = '0';
    }

    const res = await fetch(target.endpoint, { method: 'POST', headers, body });

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
