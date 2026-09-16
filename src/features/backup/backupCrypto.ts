import { base64ToBuf, bufToBase64, deriveAesKey, generateSalt } from '../../lib/crypto'

export interface PayloadCifrado {
  salt: string
  iv: string
  datos: string
}

export async function encriptarTexto(texto: string, password: string): Promise<PayloadCifrado> {
  const salt = generateSalt()
  const key = await deriveAesKey(password, salt)
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const cifrado = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(texto))
  return { salt, iv: bufToBase64(iv.buffer), datos: bufToBase64(cifrado) }
}

/** Lanza un error (contraseña incorrecta o archivo corrupto) si no puede desencriptar. */
export async function desencriptarTexto(payload: PayloadCifrado, password: string): Promise<string> {
  const key = await deriveAesKey(password, payload.salt)
  const iv = base64ToBuf(payload.iv)
  const plano = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, base64ToBuf(payload.datos))
  return new TextDecoder().decode(plano)
}
