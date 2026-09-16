import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'
import { Button, Modal } from './ui'

interface ConfirmOptions {
  titulo?: string
  mensaje: string
  textoConfirmar?: string
  peligroso?: boolean
}

interface PendingConfirm extends ConfirmOptions {
  resolve: (ok: boolean) => void
}

type ConfirmFn = (options: ConfirmOptions | string) => Promise<boolean>

const ConfirmContext = createContext<ConfirmFn | null>(null)

/** Diálogo de confirmación reutilizable para acciones que borran datos de verdad
 * (no las que archivan: esas se pueden restaurar y no necesitan este paso). */
export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [pendiente, setPendiente] = useState<PendingConfirm | null>(null)

  const confirmar = useCallback<ConfirmFn>((options) => {
    const opts = typeof options === 'string' ? { mensaje: options } : options
    return new Promise<boolean>((resolve) => setPendiente({ ...opts, resolve }))
  }, [])

  function resolverCon(ok: boolean) {
    pendiente?.resolve(ok)
    setPendiente(null)
  }

  return (
    <ConfirmContext.Provider value={confirmar}>
      {children}
      <Modal open={!!pendiente} onClose={() => resolverCon(false)} title={pendiente?.titulo ?? 'Confirmar'}>
        <p className="text-sm text-slate-600 dark:text-slate-300">{pendiente?.mensaje}</p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => resolverCon(false)}>
            Cancelar
          </Button>
          <Button variant={pendiente?.peligroso === false ? 'primary' : 'danger'} onClick={() => resolverCon(true)}>
            {pendiente?.textoConfirmar ?? 'Borrar'}
          </Button>
        </div>
      </Modal>
    </ConfirmContext.Provider>
  )
}

/** `if (await confirmar('¿Seguro?')) { ...borrar... }` desde cualquier componente. */
export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext)
  if (!ctx) throw new Error('useConfirm debe usarse dentro de ConfirmProvider')
  return ctx
}
