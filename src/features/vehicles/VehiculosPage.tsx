import { useLiveQuery } from 'dexie-react-hooks'
import { useMemo, useState, type FormEvent } from 'react'
import { db } from '../../db/db'
import type { Moneda, MovimientoGasto, Vehiculo } from '../../db/types'
import { Money } from '../../components/Money'
import { Button, Card, EmptyState, Field, Modal, Select, TextInput } from '../../components/ui'
import { calcularConsumos } from './vehicleEngine'
import { actualizarVehiculo, archivarVehiculo, crearVehiculo, desarchivarVehiculo, type VehiculoInput } from './vehiclesRepo'

export function VehiculosPage() {
  const todosLosVehiculos = useLiveQuery(() => db.vehiculos.toArray(), []) ?? []
  const [modalAbierto, setModalAbierto] = useState(false)
  const [editando, setEditando] = useState<Vehiculo | null>(null)
  const [expandidoId, setExpandidoId] = useState<string | null>(null)
  const [verArchivados, setVerArchivados] = useState(false)

  const vehiculos = todosLosVehiculos.filter((v) => !v.archivado)
  const archivados = todosLosVehiculos.filter((v) => v.archivado)

  function abrirNuevo() {
    setEditando(null)
    setModalAbierto(true)
  }

  function abrirEdicion(v: Vehiculo) {
    setEditando(v)
    setModalAbierto(true)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Vehículos</h1>
        <Button onClick={abrirNuevo}>+ Nuevo</Button>
      </div>

      {vehiculos.length === 0 ? (
        <EmptyState icon="🚗" title="Todavía no cargaste vehículos" description="Sumá tu auto o moto para llevar sus gastos, el consumo de combustible y su valor en el patrimonio." />
      ) : (
        <div className="space-y-3">
          {vehiculos.map((v) => (
            <VehiculoItem
              key={v.id}
              vehiculo={v}
              expandido={expandidoId === v.id}
              onToggle={() => setExpandidoId(expandidoId === v.id ? null : v.id)}
              onEditar={() => abrirEdicion(v)}
            />
          ))}
        </div>
      )}

      {archivados.length > 0 && (
        <div className="pt-2">
          <button
            onClick={() => setVerArchivados((x) => !x)}
            className="text-xs text-slate-400 underline decoration-dotted hover:text-slate-600 dark:hover:text-slate-300"
          >
            {verArchivados ? 'Ocultar' : 'Ver'} archivados ({archivados.length})
          </button>
          {verArchivados && (
            <Card className="mt-2">
              <ul className="space-y-1">
                {archivados.map((v) => (
                  <li key={v.id} className="flex items-center justify-between text-sm opacity-70">
                    <span>{v.marca} {v.modelo} ({v.anio})</span>
                    <button onClick={() => desarchivarVehiculo(v.id)} className="text-xs text-indigo-500 hover:text-indigo-400">
                      Restaurar
                    </button>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      )}

      <VehiculoFormModal open={modalAbierto} vehiculo={editando} onClose={() => setModalAbierto(false)} />
    </div>
  )
}

function VehiculoItem({
  vehiculo,
  expandido,
  onToggle,
  onEditar,
}: {
  vehiculo: Vehiculo
  expandido: boolean
  onToggle: () => void
  onEditar: () => void
}) {
  const movimientos =
    useLiveQuery(
      async () => {
        if (!expandido) return [] as MovimientoGasto[]
        const todos = await db.movimientos.toArray()
        return todos.filter(
          (m): m is MovimientoGasto => m.tipo === 'gasto' && m.dimension?.tipo === 'vehiculo' && m.dimension.id === vehiculo.id,
        )
      },
      [expandido, vehiculo.id],
    ) ?? []

  const [busqueda, setBusqueda] = useState('')

  const totalPorMoneda = useMemo(() => {
    const totales: Partial<Record<Moneda, number>> = {}
    for (const m of movimientos) totales[m.moneda] = (totales[m.moneda] ?? 0) + m.monto
    return totales
  }, [movimientos])

  // Las cargas de combustible se cruzan entre sí (por odómetro) para sacar consumo
  // (km/l y $/km); el resto del historial se muestra sin esa cuenta.
  const consumoPorId = useMemo(() => {
    const cargas = calcularConsumos(movimientos.filter((m) => m.litros != null))
    return new Map(cargas.map((c) => [c.movimiento.id, c]))
  }, [movimientos])

  const historial = useMemo(() => {
    const termino = busqueda.trim().toLowerCase()
    const ordenado = [...movimientos].sort((a, b) => b.fecha.localeCompare(a.fecha) || b.creadoEn.localeCompare(a.creadoEn))
    if (!termino) return ordenado
    return ordenado.filter((m) => (m.descripcion ?? '').toLowerCase().includes(termino))
  }, [movimientos, busqueda])

  return (
    <Card>
      <div className="flex items-start justify-between">
        <button onClick={onToggle} className="flex-1 text-left">
          <p className="font-medium">
            {vehiculo.marca} {vehiculo.modelo} <span className="text-slate-400">({vehiculo.anio})</span>
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Patente {vehiculo.patente} · {vehiculo.odometroActual.toLocaleString('es-AR')} km
          </p>
        </button>
        <div className="flex items-center gap-3">
          <p className="text-sm font-semibold">
            <Money monto={vehiculo.valorEstimado} moneda={vehiculo.moneda} />
          </p>
          <button onClick={onEditar} className="text-xs text-slate-400 hover:text-indigo-500">
            Editar
          </button>
          <button
            onClick={() => archivarVehiculo(vehiculo.id)}
            className="text-xs text-slate-400 hover:text-red-500"
          >
            Archivar
          </button>
        </div>
      </div>

      {expandido && (
        <div className="mt-4 space-y-3 border-t border-slate-100 pt-3 dark:border-slate-800">
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
            Historial
            <span className="ml-2 font-normal text-slate-400">
              Para cargar combustible o un mantenimiento, usá "+ Nuevo" en Movimientos y elegí este vehículo.
            </span>
          </p>

          {movimientos.length === 0 ? (
            <p className="text-sm text-slate-400">Todavía no cargaste gastos de este vehículo.</p>
          ) : (
            <>
              <div className="flex flex-wrap gap-4 text-sm">
                {Object.entries(totalPorMoneda).map(([moneda, total]) => (
                  <span key={moneda}>
                    Total: <Money monto={total} moneda={moneda as Moneda} />
                  </span>
                ))}
              </div>

              <TextInput
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar en el historial por descripción…"
              />

              {historial.length === 0 ? (
                <p className="text-sm text-slate-400">No hay nada que coincida con esa búsqueda.</p>
              ) : (
                <ul className="space-y-1 text-sm">
                  {historial.map((m) => {
                    const consumo = consumoPorId.get(m.id)
                    return (
                      <li key={m.id} className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate">{m.descripcion || '(Sin descripción)'}</p>
                          <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                            {m.fecha}
                            {m.odometro != null && ` · ${m.odometro.toLocaleString('es-AR')} km`}
                            {m.litros != null && ` · ${m.litros} L`}
                            {consumo?.kmPorLitro != null && ` · ${consumo.kmPorLitro.toFixed(1)} km/L`}
                          </p>
                        </div>
                        <span className="shrink-0 font-medium">
                          <Money monto={m.monto} moneda={m.moneda} />
                        </span>
                      </li>
                    )
                  })}
                </ul>
              )}
            </>
          )}
        </div>
      )}
    </Card>
  )
}

function VehiculoFormModal({ open, vehiculo, onClose }: { open: boolean; vehiculo: Vehiculo | null; onClose: () => void }) {
  const esEdicion = !!vehiculo
  const [marca, setMarca] = useState(vehiculo?.marca ?? '')
  const [modelo, setModelo] = useState(vehiculo?.modelo ?? '')
  const [anio, setAnio] = useState(String(vehiculo?.anio ?? new Date().getFullYear()))
  const [patente, setPatente] = useState(vehiculo?.patente ?? '')
  const [valorEstimado, setValorEstimado] = useState(String(vehiculo?.valorEstimado ?? ''))
  const [moneda, setMoneda] = useState<Moneda>(vehiculo?.moneda ?? 'USD')
  const [odometroActual, setOdometroActual] = useState(String(vehiculo?.odometroActual ?? 0))
  const [guardando, setGuardando] = useState(false)

  const [estabaAbierto, setEstabaAbierto] = useState(open)
  if (open !== estabaAbierto) {
    setEstabaAbierto(open)
    if (open) {
      setMarca(vehiculo?.marca ?? '')
      setModelo(vehiculo?.modelo ?? '')
      setAnio(String(vehiculo?.anio ?? new Date().getFullYear()))
      setPatente(vehiculo?.patente ?? '')
      setValorEstimado(String(vehiculo?.valorEstimado ?? ''))
      setMoneda(vehiculo?.moneda ?? 'USD')
      setOdometroActual(String(vehiculo?.odometroActual ?? 0))
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!marca.trim() || !modelo.trim()) return
    setGuardando(true)
    try {
      const input: VehiculoInput = {
        marca: marca.trim(),
        modelo: modelo.trim(),
        anio: Number(anio) || new Date().getFullYear(),
        patente: patente.trim(),
        valorEstimado: Number(valorEstimado) || 0,
        moneda,
        odometroActual: Number(odometroActual) || 0,
      }
      if (esEdicion && vehiculo) {
        await actualizarVehiculo(vehiculo.id, input)
      } else {
        await crearVehiculo(input)
      }
      onClose()
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={esEdicion ? 'Editar vehículo' : 'Nuevo vehículo'}>
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Marca">
            <TextInput value={marca} onChange={(e) => setMarca(e.target.value)} placeholder="Ej: Toyota" autoFocus />
          </Field>
          <Field label="Modelo">
            <TextInput value={modelo} onChange={(e) => setModelo(e.target.value)} placeholder="Ej: Corolla" />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Año">
            <TextInput type="number" value={anio} onChange={(e) => setAnio(e.target.value)} />
          </Field>
          <Field label="Patente">
            <TextInput value={patente} onChange={(e) => setPatente(e.target.value)} placeholder="Ej: AB123CD" />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Valor estimado">
            <TextInput type="number" step="0.01" value={valorEstimado} onChange={(e) => setValorEstimado(e.target.value)} />
          </Field>
          <Field label="Moneda">
            <Select value={moneda} onChange={(e) => setMoneda(e.target.value as Moneda)}>
              <option value="ARS">ARS</option>
              <option value="USD">USD</option>
            </Select>
          </Field>
        </div>
        <Field label="Odómetro actual (km)">
          <TextInput type="number" value={odometroActual} onChange={(e) => setOdometroActual(e.target.value)} />
        </Field>
        <p className="text-xs text-slate-500 dark:text-slate-400">El valor estimado se suma a tu patrimonio en Balance.</p>
        <Button type="submit" disabled={guardando} className="w-full">
          {guardando ? 'Guardando…' : esEdicion ? 'Guardar cambios' : 'Crear vehículo'}
        </Button>
      </form>
    </Modal>
  )
}

