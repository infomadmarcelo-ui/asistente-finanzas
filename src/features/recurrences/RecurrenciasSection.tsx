import { useLiveQuery } from 'dexie-react-hooks'
import { useState, type FormEvent } from 'react'
import { db } from '../../db/db'
import type { Cuenta, Moneda, Recurrencia } from '../../db/types'
import { Button, Card, EmptyState, Field, Modal, Select, TextInput } from '../../components/ui'
import { Money } from '../../components/Money'
import { nombreVisibleCuenta } from '../accounts/accountsRepo'
import { activarRecurrencia, actualizarRecurrencia, crearRecurrencia, type RecurrenciaInput } from './recurrencesRepo'

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

export function RecurrenciasSection() {
  const recurrencias = useLiveQuery(() => db.recurrencias.toArray(), []) ?? []
  const cuentas = useLiveQuery(async () => (await db.cuentas.toArray()).filter((c) => !c.archivada), []) ?? []
  const [modalAbierto, setModalAbierto] = useState(false)
  const [editando, setEditando] = useState<Recurrencia | null>(null)

  function abrirNueva() {
    setEditando(null)
    setModalAbierto(true)
  }

  function abrirEdicion(r: Recurrencia) {
    setEditando(r)
    setModalAbierto(true)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Plantillas para sueldos, alquiler, servicios, suscripciones... que se repiten solas.
        </p>
        <Button onClick={abrirNueva}>+ Nueva</Button>
      </div>

      {recurrencias.length === 0 ? (
        <EmptyState
          icon="🔁"
          title="Todavía no cargaste recurrencias"
          description="Cargá un sueldo, un alquiler o un servicio y la app te va a avisar (y, si querés, registrar el movimiento sola) cuando llegue la fecha."
        />
      ) : (
        <div className="space-y-2">
          {recurrencias.map((r) => (
            <RecurrenciaRow key={r.id} r={r} onEditar={() => abrirEdicion(r)} />
          ))}
        </div>
      )}

      <RecurrenciaFormModal
        open={modalAbierto}
        recurrencia={editando}
        cuentas={cuentas}
        onClose={() => {
          setModalAbierto(false)
          setEditando(null)
        }}
      />
    </div>
  )
}

function RecurrenciaRow({ r, onEditar }: { r: Recurrencia; onEditar: () => void }) {
  const frecuenciaTexto =
    r.frecuencia === 'mensual' ? `Todos los meses el día ${r.diaDelMes}` : `Todos los años el ${r.diaDelMes} de ${MESES[(r.mes ?? 1) - 1]}`

  return (
    <Card
      className={`flex cursor-pointer items-center justify-between hover:ring-2 hover:ring-indigo-200 dark:hover:ring-indigo-900 ${
        r.activa ? '' : 'opacity-60'
      }`}
      onClick={onEditar}
    >
      <div>
        <p className="font-medium">
          {r.concepto} <span className={r.tipo === 'ingreso' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}>
            <Money monto={r.monto} moneda={r.moneda} />
          </span>
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {frecuenciaTexto} {r.generarMovimiento && '· carga el movimiento sola'}
        </p>
      </div>
      <label className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400" onClick={(e) => e.stopPropagation()}>
        {r.activa ? 'Activa' : 'Pausada'}
        <input type="checkbox" checked={r.activa} onChange={(e) => activarRecurrencia(r.id, e.target.checked)} className="h-4 w-4" />
      </label>
    </Card>
  )
}

function RecurrenciaFormModal({
  open,
  recurrencia,
  cuentas,
  onClose,
}: {
  open: boolean
  recurrencia: Recurrencia | null
  cuentas: Cuenta[]
  onClose: () => void
}) {
  const esEdicion = !!recurrencia
  const categoriasTodas = useLiveQuery(async () => (await db.categorias.toArray()).filter((c) => !c.archivada), []) ?? []

  const [concepto, setConcepto] = useState(recurrencia?.concepto ?? '')
  const [tipo, setTipo] = useState<'ingreso' | 'gasto'>(recurrencia?.tipo ?? 'gasto')
  const [monto, setMonto] = useState(String(recurrencia?.monto ?? ''))
  const [moneda, setMoneda] = useState<Moneda>(recurrencia?.moneda ?? 'ARS')
  const [categoriaId, setCategoriaId] = useState(recurrencia?.categoriaId ?? '')
  const [cuentaId, setCuentaId] = useState(recurrencia?.cuentaId ?? cuentas[0]?.id ?? '')
  const [frecuencia, setFrecuencia] = useState<'mensual' | 'anual'>(recurrencia?.frecuencia ?? 'mensual')
  const [diaDelMes, setDiaDelMes] = useState(String(recurrencia?.diaDelMes ?? 1))
  const [mes, setMes] = useState(String(recurrencia?.mes ?? 1))
  const [generarMovimiento, setGenerarMovimiento] = useState(recurrencia?.generarMovimiento ?? false)
  const [guardando, setGuardando] = useState(false)

  const [estabaAbierto, setEstabaAbierto] = useState(open)
  if (open !== estabaAbierto) {
    setEstabaAbierto(open)
    if (open) {
      setConcepto(recurrencia?.concepto ?? '')
      setTipo(recurrencia?.tipo ?? 'gasto')
      setMonto(String(recurrencia?.monto ?? ''))
      setMoneda(recurrencia?.moneda ?? 'ARS')
      setCategoriaId(recurrencia?.categoriaId ?? '')
      setCuentaId(recurrencia?.cuentaId ?? cuentas[0]?.id ?? '')
      setFrecuencia(recurrencia?.frecuencia ?? 'mensual')
      setDiaDelMes(String(recurrencia?.diaDelMes ?? 1))
      setMes(String(recurrencia?.mes ?? 1))
      setGenerarMovimiento(recurrencia?.generarMovimiento ?? false)
    }
  }

  const categorias = categoriasTodas.filter((c) => c.tipo === tipo)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!concepto.trim() || !monto) return
    setGuardando(true)
    try {
      const input: RecurrenciaInput = {
        concepto: concepto.trim(),
        tipo,
        monto: Number(monto),
        moneda,
        categoriaId: categoriaId || undefined,
        cuentaId: cuentaId || undefined,
        frecuencia,
        diaDelMes: Math.min(31, Math.max(1, Number(diaDelMes) || 1)),
        mes: frecuencia === 'anual' ? Math.min(12, Math.max(1, Number(mes) || 1)) : undefined,
        generarMovimiento,
      }
      if (esEdicion && recurrencia) {
        await actualizarRecurrencia(recurrencia.id, input)
      } else {
        await crearRecurrencia(input)
      }
      onClose()
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={esEdicion ? 'Editar recurrencia' : 'Nueva recurrencia'}>
      <form onSubmit={onSubmit} className="space-y-4">
        <Field label="Concepto">
          <TextInput value={concepto} onChange={(e) => setConcepto(e.target.value)} placeholder="Ej: Alquiler" autoFocus />
        </Field>
        <Field label="Tipo">
          <Select value={tipo} onChange={(e) => setTipo(e.target.value as 'ingreso' | 'gasto')}>
            <option value="gasto">Gasto</option>
            <option value="ingreso">Ingreso</option>
          </Select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Monto">
            <TextInput type="number" step="0.01" value={monto} onChange={(e) => setMonto(e.target.value)} placeholder="0.00" />
          </Field>
          <Field label="Moneda">
            <Select value={moneda} onChange={(e) => setMoneda(e.target.value as Moneda)}>
              <option value="ARS">ARS</option>
              <option value="USD">USD</option>
            </Select>
          </Field>
        </div>
        <Field label="Categoría (opcional)">
          <Select value={categoriaId} onChange={(e) => setCategoriaId(e.target.value)}>
            <option value="">Sin categoría</option>
            {categorias.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
          </Select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Se repite">
            <Select value={frecuencia} onChange={(e) => setFrecuencia(e.target.value as 'mensual' | 'anual')}>
              <option value="mensual">Todos los meses</option>
              <option value="anual">Todos los años</option>
            </Select>
          </Field>
          <Field label="Día">
            <TextInput type="number" min={1} max={31} value={diaDelMes} onChange={(e) => setDiaDelMes(e.target.value)} />
          </Field>
        </div>
        {frecuencia === 'anual' && (
          <Field label="Mes">
            <Select value={mes} onChange={(e) => setMes(e.target.value)}>
              {MESES.map((m, i) => (
                <option key={m} value={i + 1}>
                  {m}
                </option>
              ))}
            </Select>
          </Field>
        )}
        <label className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300">
          <input
            type="checkbox"
            checked={generarMovimiento}
            onChange={(e) => setGenerarMovimiento(e.target.checked)}
            className="mt-0.5 h-4 w-4"
          />
          <span>
            Cargar el movimiento automáticamente cuando llegue la fecha (si el monto puede variar, dejalo destildado y solo te vamos a
            recordar pagarlo).
          </span>
        </label>
        {generarMovimiento && (
          <Field label="Cuenta">
            <Select value={cuentaId} onChange={(e) => setCuentaId(e.target.value)}>
              {cuentas.map((c) => (
                <option key={c.id} value={c.id}>
                  {nombreVisibleCuenta(c).titulo}
                </option>
              ))}
            </Select>
          </Field>
        )}
        <Button type="submit" disabled={guardando} className="w-full">
          {guardando ? 'Guardando…' : esEdicion ? 'Guardar cambios' : 'Crear recurrencia'}
        </Button>
      </form>
    </Modal>
  )
}
