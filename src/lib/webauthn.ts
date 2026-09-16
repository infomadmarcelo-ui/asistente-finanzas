// Desbloqueo biométrico (huella/cara) como mejora sobre el PIN, usando WebAuthn
// con un autenticador de plataforma. No hay servidor: la clave pública se guarda
// en el propio dispositivo (IndexedDB) y la firma se verifica localmente con
// Web Crypto. El PIN siempre sigue siendo el camino principal por si el
// navegador/dispositivo no soporta esto bien (p. ej. algunas PWA en iOS).

const RP_NAME = 'Asistente Personal'

export function isPlatformAuthenticatorLikelyAvailable(): boolean {
  return (
    typeof window !== 'undefined' &&
    !!window.PublicKeyCredential &&
    typeof PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === 'function'
  )
}

export async function isPlatformAuthenticatorAvailable(): Promise<boolean> {
  if (!isPlatformAuthenticatorLikelyAvailable()) return false
  try {
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
  } catch {
    return false
  }
}

export interface RegisteredCredential {
  credentialId: string // base64url
  publicKeyJwk: JsonWebKey
}

function toBase64Url(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf)
  let bin = ''
  for (const b of bytes) bin += String.fromCharCode(b)
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromBase64Url(b64url: string): ArrayBuffer {
  const b64 = b64url.replace(/-/g, '+').replace(/_/g, '/')
  const pad = b64.length % 4 === 0 ? '' : '='.repeat(4 - (b64.length % 4))
  const bin = atob(b64 + pad)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return bytes.buffer
}

/** Registra una credencial de plataforma (huella/cara/PIN del sistema operativo). */
export async function registerBiometric(): Promise<RegisteredCredential | null> {
  if (!isPlatformAuthenticatorLikelyAvailable()) return null

  const challenge = crypto.getRandomValues(new Uint8Array(32))
  const userId = crypto.getRandomValues(new Uint8Array(16))

  const credential = (await navigator.credentials.create({
    publicKey: {
      challenge,
      rp: { name: RP_NAME },
      user: { id: userId, name: 'usuario-local', displayName: 'Usuario' },
      pubKeyCredParams: [{ type: 'public-key', alg: -7 }], // ES256
      authenticatorSelection: {
        authenticatorAttachment: 'platform',
        userVerification: 'required',
        residentKey: 'required',
      },
      timeout: 60_000,
      attestation: 'none',
    },
  })) as PublicKeyCredential | null

  if (!credential) return null

  const response = credential.response as AuthenticatorAttestationResponse
  if (typeof response.getPublicKey !== 'function') {
    // Navegador sin soporte para extraer la clave pública sin parsear CBOR a mano.
    return null
  }
  const spki = response.getPublicKey()
  if (!spki) return null

  const key = await crypto.subtle.importKey('spki', spki, { name: 'ECDSA', namedCurve: 'P-256' }, true, ['verify'])
  const publicKeyJwk = await crypto.subtle.exportKey('jwk', key)

  return {
    credentialId: toBase64Url(credential.rawId),
    publicKeyJwk,
  }
}

/** Pide una firma biométrica y la verifica localmente contra la clave pública guardada. */
export async function verifyBiometric(credentialId: string, publicKeyJwk: JsonWebKey): Promise<boolean> {
  if (!isPlatformAuthenticatorLikelyAvailable()) return false

  const challenge = crypto.getRandomValues(new Uint8Array(32))

  const assertion = (await navigator.credentials.get({
    publicKey: {
      challenge,
      allowCredentials: [{ id: fromBase64Url(credentialId), type: 'public-key' }],
      userVerification: 'required',
      timeout: 60_000,
    },
  })) as PublicKeyCredential | null

  if (!assertion) return false

  const response = assertion.response as AuthenticatorAssertionResponse
  const key = await crypto.subtle.importKey(
    'jwk',
    publicKeyJwk,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['verify'],
  )

  const clientDataHash = await crypto.subtle.digest('SHA-256', response.clientDataJSON)
  const signedData = new Uint8Array(response.authenticatorData.byteLength + clientDataHash.byteLength)
  signedData.set(new Uint8Array(response.authenticatorData), 0)
  signedData.set(new Uint8Array(clientDataHash), response.authenticatorData.byteLength)

  // WebAuthn firma en formato DER; Web Crypto ECDSA espera r||s "raw".
  const rawSignature = derToRawEcdsaSignature(new Uint8Array(response.signature))

  return crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, key, rawSignature as BufferSource, signedData as BufferSource)
}

function derToRawEcdsaSignature(der: Uint8Array): Uint8Array {
  // Estructura DER: 0x30 len 0x02 rLen r 0x02 sLen s
  let offset = 2
  offset += 1 // 0x02
  const rLen = der[offset]
  offset += 1
  let r = der.slice(offset, offset + rLen)
  offset += rLen
  offset += 1 // 0x02
  const sLen = der[offset]
  offset += 1
  let s = der.slice(offset, offset + sLen)

  r = stripLeadingZeros(r, 32) as Uint8Array<ArrayBuffer>
  s = stripLeadingZeros(s, 32) as Uint8Array<ArrayBuffer>

  const raw = new Uint8Array(64)
  raw.set(r, 32 - r.length)
  raw.set(s, 64 - s.length)
  return raw
}

function stripLeadingZeros(bytes: Uint8Array, targetLen: number): Uint8Array {
  let start = 0
  while (bytes.length - start > targetLen && bytes[start] === 0) start++
  return bytes.slice(start)
}
