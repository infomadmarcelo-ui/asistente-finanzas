import { useLiveQuery } from 'dexie-react-hooks'
import { useState, type FormEvent } from 'react'
import { db } from '../../db/db'
import type { Cuenta, Moneda } from '../../db/types'
import { Money } from '../../components/Money'
import { Button, Card, EmptyState, Field, Modal, Select, TextInput } from '../../components/ui'
import { nombreVisibleCuenta } from '../accounts/accountsRepo'
import { todayIso } from '../../lib/id'
import { crearInversion, liquidarInversion, type InversionInput } from './investmentsRepo'

export function InversionesPage() {
  const todasLasInversiones = useLiveQuery(() => db.inversiones.toArray(), []) ?? []
  const cuentas = useLiveQuery(async () => (await db.cuentas.toArray()).filter((c) => !c.archivada), []) ?? []
  const [modalAbierto, setModalAbierto] = useState(false)
  const [verLiquidadas, setVerLiquidadas] = useState(false)

  const activas = todasLasInversiones.filter((i) => !i.liquidada)
  const liquidadas = todasLasInversiones.filter((i) => i.liquidada)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Inversiones</h1>
        <Button onClick={() => setModalAbierto(true)} disabled={cuentas.length === 0}>
          + Nueva
        </Button>
      </div>

      {cuentas.length === 0 ? (
        <EmptyState icon="📈" title="Primero cargá una cuenta" description="Vas a necesitar de dónde sale el capital para invertir." />
      ) : activas.length === 0 ? (
        <EmptyState
          icon="📈"
          title="Todavía no cargaste inversiones"
          description="Un plazo fijo u otra inversión: sale de una cuenta como transferencia y suma a tu patrimonio hasta que la liquidés."
        />
      ) : (
        <div className="space-y-2">
          {activas.map((inv) => (
            <Card key={inv.id} className="flex items-center justify-between">
              <div>
                <p className="font-medium">{inv.tipo === 'plazo_fijo' ? 'Plazo fijo' : 'Inversión'}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Desde {inv.fechaInicio} · vence {inv.fechaVencimiento}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="font-semibold">
                    <Money monto={inv.capital} moneda={inv.moneda} />
                  </p>
                  <p className="text-xs text-emerald-600 dark:text-emerald-400">
                    + <Money monto={inv.rendimiento} moneda={inv.moneda} /> al vencer
                  </p>
                </div>
                <Button variant="secondary" onClick={() => liquidarInversion(inv.id)}>
                  Liquidar
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {liquidadas.length > 0 && (
        <div className="pt-2">
          <button
            onClick={() => setVerLiquidadas((v) => !v)}
            className="text-xs text-slate-400 underline decoration-dotted hover:text-slate-600 dark:hover:text-slate-300"
          >
            {verLiquidadas ? 'Ocultar' : 'Ver'} liquidadas ({liquidadas.length})
          </button>
          {verLiquidadas && (
            <Card className="mt-2">
              <ul className="space-y-1">
                {liquidadas.map((inv) => (
                  <li key={inv.id} className="flex justify-between text-sm opacity-70">
                    <span>
                      {inv.tipo === 'plazo_fijo' ? 'Plazo fijo' : 'Inversión'} · {inv.fechaInicio} a {inv.fechaVencimiento}
                    </span>
                    <Money monto={inv.capital + inv.rendimiento} moneda={inv.moneda} />
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      )}

      <NuevaInversionModal open={modalAbierto} cuentas={cuentas} onClose={() => setModalAbierto(false)} />
    </div>
  )
}

function NuevaInversionModal({
  open,
  cuentas,
  onClose,
}: {
  open: boolean
  cuentas: Cuenta[]
  onClose: () => void
}) {
  const [tipo, setTipo] = useState<'plazo_fijo' | 'otro'>('plazo_fijo')
  const [capital, setCapital] = useState('')
  const [moneda, setMoneda] = useState<Moneda>('ARS')
  const [fechaInicio, setFechaInicio] = useState(todayIso())
  const [fechaVencimiento, setFechaVencimiento] = useState(todayIso())
  const [rendimiento, setRendimiento] = useState('')
  const [cuentaOrigenId, setCuentaOrigenId] = useState(cuentas[0]?.id ?? '')
  const [guardando, setGuardando] = useState(false)

  const [estabaAbierto, setEstabaAbierto] = useState(open)
  if (open !== estabaAbierto) {
    setEstabaAbierto(open)
    if (open) {
      setTipo('plazo_fijo')
      setCapital('')
      setFechaInicio(todayIso())
      setFechaVencimiento(todayIso())
      setRendimiento('')
      setCuentaOrigenId(cuentas[0]?.id ?? '')
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!capital || !cuentaOrigenId) return
    setGuardando(true)
    try {
      const input: InversionInput = {
        tipo,
        capital: Number(capital),
        moneda,
        fechaInicio,
        fechaVencimiento,
        rendimiento: Number(rendimiento) || 0,
        cuentaOrigenId,
      }
      await crearInversion(input)
      onClose()
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Nueva inversión">
      <form onSubmit={onSubmit} className="space-y-4">
        <Field label="Tipo">
          <Select value={tipo} onChange={(e) => setTipo(e.target.value as 'plazo_fijo' | 'otro')}>
            <option value="plazo_fijo">Plazo fijo</option>
            <option value="otro">Otro</option>
          </Select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Capital">
            <TextInput type="number" step="0.01" autoFocus value={capital} onChange={(e) => setCapital(e.target.value)} placeholder="0.00" />
          </Field>
          <Field label="Moneda">
            <Select value={moneda} onChange={(e) => setMoneda(e.target.value as Moneda)}>
              <option value="ARS">ARS</option>
              <option value="USD">USD</option>
            </Select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Fecha de inicio">
            <TextInput type="date" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} />
          </Field>
          <Field label="Fecha de vencimiento">
            <TextInput type="date" value={fechaVencimiento} onChange={(e) => setFechaVencimiento(e.target.value)} />
          </Field>
        </div>
        <Field label="Rendimiento (interés que vas a cobrar al vencer)">
          <TextInput type="number" step="0.01" value={rendimiento} onChange={(e) => setRendimiento(e.target.value)} placeholder="0.00" />
        </Field>
        <Field label="Cuenta de origen">
          <Select value={cuentaOrigenId} onChange={(e) => setCuentaOrigenId(e.target.value)}>
            {cuentas.map((c) => (
              <option key={c.id} value={c.id}>
                {nombreVisibleCuenta(c).titulo}
              </option>
            ))}
          </Select>
        </Field>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          El capital sale de esa cuenta como una transferencia y se va a sumar a tu patrimonio hasta que liquides la inversión.
        </p>
        <Button type="submit" disabled={guardando} className="w-full">
          {guardando ? 'Guardando…' : 'Crear inversión'}
        </Button>
      </form>
    </Modal>
  )
}
