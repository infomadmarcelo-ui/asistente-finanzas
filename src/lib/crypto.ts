// Utilidades criptográficas para el candado local. Todo corre en el dispositivo
// con Web Crypto (SubtleCrypto); nunca se guarda el PIN en texto plano.

function bufToBase64(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
}

function base64ToBuf(b64: string): ArrayBuffer {
  const bin = atob(b64)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return bytes.buffer
}

const PBKDF2_ITERATIONS = 250_000

export function generateSalt(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  return bufToBase64(bytes.buffer)
}

async function deriveBits(pin: string, saltB64: string, bitLength: number): Promise<ArrayBuffer> {
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(pin),
    'PBKDF2',
    false,
    ['deriveBits'],
  )
  return crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: base64ToBuf(saltB64),
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    bitLength,
  )
}

export async function hashPin(pin: string, saltB64: string): Promise<string> {
  const bits = await deriveBits(pin, saltB64, 256)
  return bufToBase64(bits)
}

export async function verifyPin(pin: string, saltB64: string, expectedHash: string): Promise<boolean> {
  const hash = await hashPin(pin, saltB64)
  return timingSafeEqual(hash, expectedHash)
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

/**
 * Deriva una clave AES-GCM a partir de una contraseña, para encriptar el backup.
 * Se usa una sal por-export (guardada junto al archivo) para que dos backups
 * con la misma contraseña no compartan clave.
 */
export async function deriveAesKey(password: string, saltB64: string): Promise<CryptoKey> {
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveKey'],
  )
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: base64ToBuf(saltB64),
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  )
}

export { bufToBase64, base64ToBuf }
