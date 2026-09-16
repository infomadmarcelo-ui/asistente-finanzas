import { useLiveQuery } from 'dexie-react-hooks'
import { useState, type FormEvent } from 'react'
import { db } from '../../db/db'
import type { Cuenta, MetaAhorro, Moneda } from '../../db/types'
import { Money } from '../../components/Money'
import { Button, Card, EmptyState, Field, Modal, Select, TextInput } from '../../components/ui'
import { nombreVisibleCuenta } from '../accounts/accountsRepo'
import { useSaldosCuentas } from '../accounts/useSaldos'
import { crearTransferencia } from '../movements/movementsRepo'
import { todayIso } from '../../lib/id'
import { archivarMeta, actualizarMeta, crearMeta, desarchivarMeta, type MetaAhorroInput } from './goalsRepo'

export function MetasPage() {
  const todasLasMetas = useLiveQuery(() => db.metasAhorro.toArray(), []) ?? []
  const cuentas = useLiveQuery(async () => (await db.cuentas.toArray()).filter((c) => !c.archivada), []) ?? []
  const saldos = useSaldosCuentas()
  const [modalAbierto, setModalAbierto] = useState(false)
  const [editando, setEditando] = useState<MetaAhorro | null>(null)
  const [aportando, setAportando] = useState<MetaAhorro | null>(null)
  const [verArchivadas, setVerArchivadas] = useState(false)

  const metas = todasLasMetas.filter((m) => !m.archivada)
  const archivadas = todasLasMetas.filter((m) => m.archivada)

  function abrirNueva() {
    setEditando(null)
    setModalAbierto(true)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Metas de ahorro</h1>
        <Button onClick={abrirNueva} disabled={cuentas.length === 0}>
          + Nueva
        </Button>
      </div>

      {cuentas.length === 0 ? (
        <EmptyState icon="🎯" title="Primero cargá una cuenta" description="Una meta necesita una cuenta dedicada donde ir juntando la plata." />
      ) : metas.length === 0 ? (
        <EmptyState icon="🎯" title="Todavía no cargaste metas" description="Un viaje, un fondo de emergencia, lo que sea: elegí una cuenta y un objetivo." />
      ) : (
        <div className="space-y-2">
          {metas.map((m) => {
            const saldo = saldos.get(m.cuentaId) ?? 0
            const porcentaje = m.montoObjetivo > 0 ? Math.min(100, Math.round((saldo / m.montoObjetivo) * 100)) : 0
            return (
              <Card
                key={m.id}
                className="cursor-pointer hover:ring-2 hover:ring-indigo-200 dark:hover:ring-indigo-900"
                onClick={() => {
                  setEditando(m)
                  setModalAbierto(true)
                }}
              >
                <div className="flex items-center justify-between">
                  <p className="font-medium">{m.nombre}</p>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      archivarMeta(m.id)
                    }}
                    className="text-xs text-slate-400 hover:text-red-500"
                  >
                    Archivar
                  </button>
                </div>
                <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                  <div className="h-full bg-indigo-600" style={{ width: `${porcentaje}%` }} />
                </div>
                <div className="mt-1 flex items-center justify-between text-sm">
                  <span>
                    <Money monto={saldo} moneda={m.moneda} /> de <Money monto={m.montoObjetivo} moneda={m.moneda} /> ({porcentaje}%)
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setAportando(m)
                    }}
                    className="rounded-lg border border-slate-300 px-2 py-1 text-xs text-slate-500 hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
                  >
                    + Agregar fondos
                  </button>
                </div>
                {m.fechaObjetivo && <p className="mt-1 text-xs text-slate-400">Objetivo para {m.fechaObjetivo}</p>}
              </Card>
            )
          })}
        </div>
      )}

      {archivadas.length > 0 && (
        <div className="pt-2">
          <button
            onClick={() => setVerArchivadas((v) => !v)}
            className="text-xs text-slate-400 underline decoration-dotted hover:text-slate-600 dark:hover:text-slate-300"
          >
            {verArchivadas ? 'Ocultar' : 'Ver'} archivadas ({archivadas.length})
          </button>
          {verArchivadas && (
            <Card className="mt-2">
              <ul className="space-y-1">
                {archivadas.map((m) => (
                  <li key={m.id} className="flex items-center justify-between text-sm opacity-70">
                    <span>{m.nombre}</span>
                    <button onClick={() => desarchivarMeta(m.id)} className="text-xs text-indigo-500 hover:text-indigo-400">
                      Restaurar
                    </button>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      )}

      <MetaFormModal
        open={modalAbierto}
        meta={editando}
        cuentas={cuentas}
        onClose={() => {
          setModalAbierto(false)
          setEditando(null)
        }}
      />
      <AgregarFondosModal meta={aportando} cuentas={cuentas} onClose={() => setAportando(null)} />
    </div>
  )
}

function MetaFormModal({
  open,
  meta,
  cuentas,
  onClose,
}: {
  open: boolean
  meta: MetaAhorro | null
  cuentas: Cuenta[]
  onClose: () => void
}) {
  const esEdicion = !!meta
  const [nombre, setNombre] = useState(meta?.nombre ?? '')
  const [moneda, setMoneda] = useState<Moneda>(meta?.moneda ?? 'ARS')
  const [montoObjetivo, setMontoObjetivo] = useState(String(meta?.montoObjetivo ?? ''))
  const [fechaObjetivo, setFechaObjetivo] = useState(meta?.fechaObjetivo ?? '')
  const [cuentaId, setCuentaId] = useState(meta?.cuentaId ?? cuentas[0]?.id ?? '')
  const [guardando, setGuardando] = useState(false)

  const [estabaAbierto, setEstabaAbierto] = useState(open)
  if (open !== estabaAbierto) {
    setEstabaAbierto(open)
    if (open) {
      setNombre(meta?.nombre ?? '')
      setMoneda(meta?.moneda ?? 'ARS')
      setMontoObjetivo(String(meta?.montoObjetivo ?? ''))
      setFechaObjetivo(meta?.fechaObjetivo ?? '')
      setCuentaId(meta?.cuentaId ?? cuentas[0]?.id ?? '')
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!nombre.trim() || !montoObjetivo || !cuentaId) return
    setGuardando(true)
    try {
      const input: MetaAhorroInput = {
        nombre: nombre.trim(),
        moneda,
        montoObjetivo: Number(montoObjetivo),
        fechaObjetivo: fechaObjetivo || undefined,
        cuentaId,
      }
      if (esEdicion && meta) {
        await actualizarMeta(meta.id, input)
      } else {
        await crearMeta(input)
      }
      onClose()
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={esEdicion ? 'Editar meta' : 'Nueva meta de ahorro'}>
      <form onSubmit={onSubmit} className="space-y-4">
        <Field label="Nombre">
          <TextInput value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej: Viaje a Bariloche" autoFocus />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Monto objetivo">
            <TextInput type="number" step="0.01" value={montoObjetivo} onChange={(e) => setMontoObjetivo(e.target.value)} placeholder="0.00" />
          </Field>
          <Field label="Moneda">
            <Select value={moneda} onChange={(e) => setMoneda(e.target.value as Moneda)}>
              <option value="ARS">ARS</option>
              <option value="USD">USD</option>
            </Select>
          </Field>
        </div>
        <Field label="Cuenta dedicada a esta meta">
          <Select value={cuentaId} onChange={(e) => setCuentaId(e.target.value)}>
            {cuentas.map((c) => (
              <option key={c.id} value={c.id}>
                {nombreVisibleCuenta(c).titulo}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Fecha objetivo (opcional)">
          <TextInput type="date" value={fechaObjetivo} onChange={(e) => setFechaObjetivo(e.target.value)} />
        </Field>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          El progreso se calcula solo, con el saldo de esa cuenta. Usá una cuenta dedicada nada más que a esta meta.
        </p>
        <Button type="submit" disabled={guardando} className="w-full">
          {guardando ? 'Guardando…' : esEdicion ? 'Guardar cambios' : 'Crear meta'}
        </Button>
      </form>
    </Modal>
  )
}

function AgregarFondosModal({ meta, cuentas, onClose }: { meta: MetaAhorro | null; cuentas: Cuenta[]; onClose: () => void }) {
  // Mismo criterio que el resto de la app: acá no se convierte moneda, así que solo
  // se puede aportar desde una cuenta en la misma moneda que la meta.
  const otrasCuentas = cuentas.filter((c) => c.id !== meta?.cuentaId && c.moneda === meta?.moneda)
  const [cuentaOrigenId, setCuentaOrigenId] = useState(otrasCuentas[0]?.id ?? '')
  const [monto, setMonto] = useState('')
  const [guardando, setGuardando] = useState(false)

  const [ultimaMetaId, setUltimaMetaId] = useState<string | null>(null)
  if ((meta?.id ?? null) !== ultimaMetaId) {
    setUltimaMetaId(meta?.id ?? null)
    setCuentaOrigenId(otrasCuentas[0]?.id ?? '')
    setMonto('')
  }

  if (!meta) return null

  const origen = otrasCuentas.find((c) => c.id === cuentaOrigenId)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!meta || !origen || !monto) return
    setGuardando(true)
    try {
      await crearTransferencia({
        fecha: todayIso(),
        cuentaOrigenId: origen.id,
        cuentaDestinoId: meta.cuentaId,
        montoOrigen: Number(monto),
        monedaOrigen: origen.moneda,
        montoDestino: Number(monto),
        monedaDestino: meta.moneda,
        descripcion: `Aporte a ${meta.nombre}`,
      })
      onClose()
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Modal open={!!meta} onClose={onClose} title={`Agregar fondos a "${meta.nombre}"`}>
      {otrasCuentas.length === 0 ? (
        <p className="text-sm text-slate-500">Necesitás otra cuenta desde la cual transferir.</p>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4">
          <Field label="Desde">
            <Select value={cuentaOrigenId} onChange={(e) => setCuentaOrigenId(e.target.value)}>
              {otrasCuentas.map((c) => (
                <option key={c.id} value={c.id}>
                  {nombreVisibleCuenta(c).titulo}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={`Monto (${origen?.moneda ?? ''})`}>
            <TextInput type="number" step="0.01" autoFocus value={monto} onChange={(e) => setMonto(e.target.value)} placeholder="0.00" />
          </Field>
          <Button type="submit" disabled={guardando} className="w-full">
            {guardando ? 'Guardando…' : 'Transferir'}
          </Button>
        </form>
      )}
    </Modal>
  )
}
