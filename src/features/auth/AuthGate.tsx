import { useState, type FormEvent, type ReactNode } from 'react'
import { useAuth } from './AuthContext'

export function AuthGate({ children }: { children: ReactNode }) {
  const { state } = useAuth()

  if (state === 'checking') {
    return <CenteredScreen>Cargando…</CenteredScreen>
  }
  if (state === 'setup') {
    return <SetupPinScreen />
  }
  if (state === 'locked') {
    return <LockScreen />
  }
  return <>{children}</>
}

function CenteredScreen({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-svh items-center justify-center bg-slate-950 text-slate-200">
      {children}
    </div>
  )
}

function SetupPinScreen() {
  const { crearPin, biometricAvailable } = useAuth()
  const [pin, setPin] = useState('')
  const [confirmacion, setConfirmacion] = useState('')
  const [habilitarBiometria, setHabilitarBiometria] = useState(biometricAvailable)
  const [error, setError] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (pin.length < 4) {
      setError('Usá al menos 4 caracteres.')
      return
    }
    if (pin !== confirmacion) {
      setError('No coinciden. Repetilo de nuevo.')
      return
    }
    setGuardando(true)
    try {
      await crearPin(pin, habilitarBiometria)
    } finally {
      setGuardando(false)
    }
  }

  return (
    <CenteredScreen>
      <form onSubmit={onSubmit} className="w-full max-w-sm space-y-5 rounded-2xl bg-slate-900 p-8 shadow-xl">
        <div className="space-y-1 text-center">
          <h1 className="text-xl font-semibold text-white">Creá tu candado</h1>
          <p className="text-sm text-slate-400">
            Elegí un PIN o contraseña. Se guarda solo en este dispositivo: nadie más puede recuperarlo por vos.
          </p>
        </div>

        <div className="space-y-3">
          <label className="block text-sm text-slate-300">
            PIN o contraseña
            <input
              type="password"
              autoFocus
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white outline-none focus:border-indigo-500"
            />
          </label>
          <label className="block text-sm text-slate-300">
            Repetilo
            <input
              type="password"
              value={confirmacion}
              onChange={(e) => setConfirmacion(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white outline-none focus:border-indigo-500"
            />
          </label>
        </div>

        {biometricAvailable && (
          <label className="flex items-center gap-2 text-sm text-slate-300">
            <input
              type="checkbox"
              checked={habilitarBiometria}
              onChange={(e) => setHabilitarBiometria(e.target.checked)}
              className="h-4 w-4"
            />
            Habilitar desbloqueo con huella / cara
          </label>
        )}

        {error && <p className="text-sm text-red-400">{error}</p>}

        <button
          type="submit"
          disabled={guardando}
          className="w-full rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
        >
          {guardando ? 'Guardando…' : 'Empezar'}
        </button>
      </form>
    </CenteredScreen>
  )
}

function LockScreen() {
  const { desbloquearConPin, desbloquearConBiometria, biometricEnabled } = useAuth()
  const [pin, setPin] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [verificando, setVerificando] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setVerificando(true)
    try {
      const ok = await desbloquearConPin(pin)
      if (!ok) {
        setError('No es correcto. Probá de nuevo.')
        setPin('')
      }
    } finally {
      setVerificando(false)
    }
  }

  async function onBiometria() {
    setError(null)
    const ok = await desbloquearConBiometria()
    if (!ok) setError('No se pudo verificar. Usá tu PIN.')
  }

  return (
    <CenteredScreen>
      <form onSubmit={onSubmit} className="w-full max-w-sm space-y-5 rounded-2xl bg-slate-900 p-8 shadow-xl">
        <div className="space-y-1 text-center">
          <h1 className="text-xl font-semibold text-white">Bloqueado</h1>
          <p className="text-sm text-slate-400">Ingresá tu PIN para continuar.</p>
        </div>

        <input
          type="password"
          autoFocus
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-center text-lg text-white outline-none focus:border-indigo-500"
        />

        {error && <p className="text-center text-sm text-red-400">{error}</p>}

        <button
          type="submit"
          disabled={verificando}
          className="w-full rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
        >
          {verificando ? 'Verificando…' : 'Desbloquear'}
        </button>

        {biometricEnabled && (
          <button
            type="button"
            onClick={onBiometria}
            className="w-full rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800"
          >
            Usar huella / cara
          </button>
        )}
      </form>
    </CenteredScreen>
  )
}
