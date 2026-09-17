import { useLiveQuery } from 'dexie-react-hooks'
import { useState, type FormEvent } from 'react'
import { db } from '../../db/db'
import type { FrecuenciaRecurrencia, Recordatorio, TipoRecordatorio } from '../../db/types'
import { Button, Card, EmptyState, Field, Modal, Select, TextInput } from '../../components/ui'
import { RecurrenciasSection } from '../recurrences/RecurrenciasSection'
import { todayIso } from '../../lib/id'
import { TIPOS_RECORDATORIO } from './reminderEngine'
import {
  actualizarRecordatorio,
  archivarRecordatorio,
  crearRecordatorio,
  desarchivarRecordatorio,
  marcarCompletado,
  type RecordatorioInput,
} from './remindersRepo'
import { useListaRecordatorios, useRecordatoriosArchivados, type ItemRecordatorio } from './useRecordatorios'

type Tab = 'recordatorios' | 'recurrencias'

const TABS: { key: Tab; label: string }[] = [
  { key: 'recordatorios', label: 'Recordatorios' },
  { key: 'recurrencias', label: 'Ingresos y gastos fijos' },
]

export function RecordatoriosPage() {
  const [tab, setTab] = useState<Tab>('recordatorios')

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Recordatorios</h1>

      <div className="flex w-fit gap-1 rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`rounded-md px-3 py-1.5 text-sm ${
              tab === key ? 'bg-white shadow dark:bg-slate-700' : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'recordatorios' ? <RecordatoriosSection /> : <RecurrenciasSection />}
    </div>
  )
}

function RecordatoriosSection() {
  const lista = useListaRecordatorios()
  const archivados = useRecordatoriosArchivados()
  const [modalAbierto, setModalAbierto] = useState(false)
  const [editando, setEditando] = useState<Recordatorio | null>(null)
  const [verArchivados, setVerArchivados] = useState(false)

  function abrirNuevo() {
    setEditando(null)
    setModalAbierto(true)
  }

  function abrirEdicion(r: Recordatorio) {
    setEditando(r)
    setModalAbierto(true)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Cargá vencimientos de pago, trámites, cumpleaños, documentos que vencen o turnos de salud, y elegí con cuántos
          días (o, para mantenimiento de vehículos, con cuántos kilómetros) de anticipación querés que te avisemos.
        </p>
        <Button onClick={abrirNuevo} className="shrink-0">
          + Nuevo
        </Button>
      </div>

      {lista.length === 0 ? (
        <EmptyState
          icon="🔔"
          title="Todavía no cargaste recordatorios"
          description="Vencimientos de pago, trámites, cumpleaños, documentos que vencen, turnos de salud... lo que necesites que no se te pase."
        />
      ) : (
        <div className="space-y-2">
          {lista.map((item) => (
            <RecordatorioRow key={item.recordatorio.id} item={item} onEditar={() => abrirEdicion(item.recordatorio)} />
          ))}
        </div>
      )}

      {archivados.length > 0 && (
        <div className="pt-2">
          <button
            onClick={() => setVerArchivados((v) => !v)}
            className="text-xs text-slate-400 underline decoration-dotted hover:text-slate-600 dark:hover:text-slate-300"
          >
            {verArchivados ? 'Ocultar' : 'Ver'} archivados ({archivados.length})
          </button>
          {verArchivados && (
            <Card className="mt-2">
              <ul className="space-y-1">
                {archivados.map((r) => (
                  <li key={r.id} className="flex items-center justify-between text-sm opacity-70">
                    <span>{r.titulo}</span>
                    <button onClick={() => desarchivarRecordatorio(r.id)} className="text-xs text-indigo-500 hover:text-indigo-400">
                      Restaurar
                    </button>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      )}

      <RecordatorioFormModal
        open={modalAbierto}
        recordatorio={editando}
        onClose={() => {
          setModalAbierto(false)
          setEditando(null)
        }}
      />
    </div>
  )
}

function RecordatorioRow({ item, onEditar }: { item: ItemRecordatorio; onEditar: () => void }) {
  const { recordatorio, texto, vencido } = item
  const tipoInfo = TIPOS_RECORDATORIO.find((t) => t.value === recordatorio.tipo)
  const puedeCompletar = recordatorio.frecuencia === 'unica' || item.esPorKm

  return (
    <Card
      className="flex cursor-pointer items-center justify-between hover:ring-2 hover:ring-indigo-200 dark:hover:ring-indigo-900"
      onClick={onEditar}
    >
      <div className="flex items-center gap-3">
        <span className="text-xl">{tipoInfo?.icon ?? '📌'}</span>
        <div>
          <p className="font-medium">{recordatorio.titulo}</p>
          <p className={`text-xs ${vencido ? 'font-medium text-red-500' : 'text-slate-500 dark:text-slate-400'}`}>
            {texto}
            {!item.esPorKm && recordatorio.frecuencia !== 'unica' && (
              <span className="text-slate-400"> · se repite {recordatorio.frecuencia === 'mensual' ? 'todos los meses' : 'todos los años'}</span>
            )}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        {puedeCompletar && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              marcarCompletado(recordatorio.id, true)
            }}
            className="rounded-lg border border-slate-300 px-2 py-1 text-xs text-slate-500 hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
          >
            Marcar hecho
          </button>
        )}
        <button
          onClick={(e) => {
            e.stopPropagation()
            archivarRecordatorio(recordatorio.id)
          }}
          className="text-xs text-slate-400 hover:text-red-500"
        >
          Archivar
        </button>
      </div>
    </Card>
  )
}

function RecordatorioFormModal({
  open,
  recordatorio,
  onClose,
}: {
  open: boolean
  recordatorio: Recordatorio | null
  onClose: () => void
}) {
  const vehiculos = useLiveQuery(async () => (await db.vehiculos.toArray()).filter((v) => !v.archivado), []) ?? []
  const esEdicion = !!recordatorio
  const [titulo, setTitulo] = useState(recordatorio?.titulo ?? '')
  const [tipo, setTipo] = useState<TipoRecordatorio>(recordatorio?.tipo ?? 'vencimiento_pago')
  const [porKm, setPorKm] = useState(recordatorio?.condicionKm != null)
  const [fecha, setFecha] = useState(recordatorio?.fecha ?? todayIso())
  const [frecuencia, setFrecuencia] = useState<FrecuenciaRecurrencia>(recordatorio?.frecuencia ?? 'unica')
  const [antelacionDias, setAntelacionDias] = useState(String(recordatorio?.antelacionDias ?? 3))
  const [vehiculoId, setVehiculoId] = useState(recordatorio?.vehiculoId ?? vehiculos[0]?.id ?? '')
  const [condicionKm, setCondicionKm] = useState(String(recordatorio?.condicionKm ?? ''))
  const [antelacionKm, setAntelacionKm] = useState(String(recordatorio?.antelacionKm ?? 500))
  const [guardando, setGuardando] = useState(false)

  const [estabaAbierto, setEstabaAbierto] = useState(open)
  if (open !== estabaAbierto) {
    setEstabaAbierto(open)
    if (open) {
      setTitulo(recordatorio?.titulo ?? '')
      setTipo(recordatorio?.tipo ?? 'vencimiento_pago')
      setPorKm(recordatorio?.condicionKm != null)
      setFecha(recordatorio?.fecha ?? todayIso())
      setFrecuencia(recordatorio?.frecuencia ?? 'unica')
      setAntelacionDias(String(recordatorio?.antelacionDias ?? 3))
      setVehiculoId(recordatorio?.vehiculoId ?? vehiculos[0]?.id ?? '')
      setCondicionKm(String(recordatorio?.condicionKm ?? ''))
      setAntelacionKm(String(recordatorio?.antelacionKm ?? 500))
    }
  }

  const esMantenimiento = tipo === 'mantenimiento_vehiculo'
  const usaKm = esMantenimiento && porKm && vehiculos.length > 0

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!titulo.trim()) return
    if (usaKm && !vehiculoId) return
    setGuardando(true)
    try {
      const input: RecordatorioInput = usaKm
        ? {
            titulo: titulo.trim(),
            tipo,
            frecuencia: 'unica',
            antelacionDias: 0,
            vehiculoId,
            condicionKm: Number(condicionKm) || 0,
            antelacionKm: Number(antelacionKm) || 0,
          }
        : { titulo: titulo.trim(), tipo, fecha, frecuencia, antelacionDias: Number(antelacionDias) || 0 }

      if (esEdicion && recordatorio) {
        await actualizarRecordatorio(recordatorio.id, input)
      } else {
        await crearRecordatorio(input)
      }
      onClose()
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={esEdicion ? 'Editar recordatorio' : 'Nuevo recordatorio'}>
      <form onSubmit={onSubmit} className="space-y-4">
        <Field label="Título">
          <TextInput value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ej: Pagar seguro del auto" autoFocus />
        </Field>
        <Field label="Tipo">
          <Select value={tipo} onChange={(e) => setTipo(e.target.value as TipoRecordatorio)}>
            {TIPOS_RECORDATORIO.map((t) => (
              <option key={t.value} value={t.value}>
                {t.icon} {t.label}
              </option>
            ))}
          </Select>
        </Field>

        {esMantenimiento && vehiculos.length > 0 && (
          <div className="flex w-fit gap-1 rounded-lg bg-slate-100 p-1 text-sm dark:bg-slate-800">
            <button
              type="button"
              onClick={() => setPorKm(false)}
              className={`rounded-md px-3 py-1 ${!porKm ? 'bg-white shadow dark:bg-slate-700' : 'text-slate-500 dark:text-slate-400'}`}
            >
              Por fecha
            </button>
            <button
              type="button"
              onClick={() => setPorKm(true)}
              className={`rounded-md px-3 py-1 ${porKm ? 'bg-white shadow dark:bg-slate-700' : 'text-slate-500 dark:text-slate-400'}`}
            >
              Por kilómetros
            </button>
          </div>
        )}

        {usaKm ? (
          <>
            <Field label="Vehículo">
              <Select value={vehiculoId} onChange={(e) => setVehiculoId(e.target.value)}>
                {vehiculos.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.marca} {v.modelo} ({v.odometroActual.toLocaleString('es-AR')} km)
                  </option>
                ))}
              </Select>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Avisar al llegar a (km)">
                <TextInput type="number" value={condicionKm} onChange={(e) => setCondicionKm(e.target.value)} />
              </Field>
              <Field label="Con cuántos km de anticipación">
                <TextInput type="number" value={antelacionKm} onChange={(e) => setAntelacionKm(e.target.value)} />
              </Field>
            </div>
          </>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3">
              <Field label={frecuencia === 'unica' ? 'Fecha' : 'Próxima fecha'}>
                <TextInput type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
              </Field>
              <Field label="Se repite">
                <Select value={frecuencia} onChange={(e) => setFrecuencia(e.target.value as FrecuenciaRecurrencia)}>
                  <option value="unica">Una vez</option>
                  <option value="mensual">Todos los meses</option>
                  <option value="anual">Todos los años</option>
                </Select>
              </Field>
            </div>
            <Field label="Avisar con cuántos días de anticipación">
              <TextInput type="number" min={0} value={antelacionDias} onChange={(e) => setAntelacionDias(e.target.value)} />
            </Field>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {frecuencia === 'mensual' && 'Se va a repetir todos los meses el mismo día que elegiste.'}
              {frecuencia === 'anual' && 'Se va a repetir todos los años el mismo día y mes que elegiste (ideal para cumpleaños).'}
              {frecuencia === 'unica' && 'Va a aparecer una sola vez, en esa fecha.'}
            </p>
          </>
        )}

        <Button type="submit" disabled={guardando} className="w-full">
          {guardando ? 'Guardando…' : esEdicion ? 'Guardar cambios' : 'Crear recordatorio'}
        </Button>
      </form>
    </Modal>
  )
}
