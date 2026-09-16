import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { db } from '../../db/db'
import { generateSalt, hashPin, verifyPin } from '../../lib/crypto'
import { registerBiometric, verifyBiometric, isPlatformAuthenticatorAvailable } from '../../lib/webauthn'

type LockState = 'checking' | 'setup' | 'locked' | 'unlocked'

interface AuthContextValue {
  state: LockState
  biometricEnabled: boolean
  biometricAvailable: boolean
  crearPin: (pin: string, habilitarBiometria: boolean) => Promise<void>
  desbloquearConPin: (pin: string) => Promise<boolean>
  desbloquearConBiometria: () => Promise<boolean>
  bloquear: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<LockState>('checking')
  const [biometricEnabled, setBiometricEnabled] = useState(false)
  const [biometricAvailable, setBiometricAvailable] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const [config, plataformaDisponible] = await Promise.all([
        db.configAuth.get('auth'),
        isPlatformAuthenticatorAvailable(),
      ])
      if (cancelled) return
      setBiometricAvailable(plataformaDisponible)
      if (!config) {
        setState('setup')
      } else {
        setBiometricEnabled(!!config.webauthnCredentialId)
        setState('locked')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  async function crearPin(pin: string, habilitarBiometria: boolean) {
    const salt = generateSalt()
    const pinHash = await hashPin(pin, salt)

    let webauthnCredentialId: string | undefined
    let webauthnPublicKey: JsonWebKey | undefined
    if (habilitarBiometria) {
      const cred = await registerBiometric()
      if (cred) {
        webauthnCredentialId = cred.credentialId
        webauthnPublicKey = cred.publicKeyJwk
      }
    }

    await db.configAuth.put({ id: 'auth', pinHash, pinSalt: salt, webauthnCredentialId, webauthnPublicKey })
    setBiometricEnabled(!!webauthnCredentialId)
    setState('unlocked')
  }

  async function desbloquearConPin(pin: string): Promise<boolean> {
    const config = await db.configAuth.get('auth')
    if (!config) return false
    const ok = await verifyPin(pin, config.pinSalt, config.pinHash)
    if (ok) setState('unlocked')
    return ok
  }

  async function desbloquearConBiometria(): Promise<boolean> {
    const config = await db.configAuth.get('auth')
    if (!config?.webauthnCredentialId || !config.webauthnPublicKey) return false
    try {
      const ok = await verifyBiometric(config.webauthnCredentialId, config.webauthnPublicKey)
      if (ok) setState('unlocked')
      return ok
    } catch {
      return false
    }
  }

  function bloquear() {
    setState('locked')
  }

  return (
    <AuthContext.Provider
      value={{ state, biometricEnabled, biometricAvailable, crearPin, desbloquearConPin, desbloquearConBiometria, bloquear }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider')
  return ctx
}
