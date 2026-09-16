import { useLiveQuery } from 'dexie-react-hooks'
import { useMemo, useState, type FormEvent } from 'react'
import { db } from '../../db/db'
import type { Cuenta, Moneda, MovimientoGasto, Vehiculo } from '../../db/types'
import { Money } from '../../components/Money'
import { Button, Card, EmptyState, Field, Modal, Select, TextInput } from '../../components/ui'
import { nombreVisibleCuenta } from '../accounts/accountsRepo'
import { todayIso } from '../../lib/id'
import { calcularConsumos } from './vehicleEngine'
import {
  actualizarVehiculo,
  archivarVehiculo,
  cargarCombustible,
  crearVehiculo,
  desarchivarVehiculo,
  type VehiculoInput,
} from './vehiclesRepo'

export function VehiculosPage() {
  const todosLosVehiculos = useLiveQuery(() => db.vehiculos.toArray(), []) ?? []
  const cuentas = useLiveQuery(async () => (await db.cuentas.toArray()).filter((c) => !c.archivada), []) ?? []
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
              cuentas={cuentas}
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
  cuentas,
  expandido,
  onToggle,
  onEditar,
}: {
  vehiculo: Vehiculo
  cuentas: Cuenta[]
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

  const [modalCombustible, setModalCombustible] = useState(false)

  const totalPorMoneda = useMemo(() => {
    const totales: Partial<Record<Moneda, number>> = {}
    for (const m of movimientos) totales[m.moneda] = (totales[m.moneda] ?? 0) + m.monto
    return totales
  }, [movimientos])

  const cargas = useMemo(() => calcularConsumos(movimientos.filter((m) => m.litros != null)), [movimientos])

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
        <div className="mt-4 space-y-4 border-t border-slate-100 pt-3 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Gastos cargados</p>
            <Button variant="secondary" onClick={() => setModalCombustible(true)}>
              + Cargar combustible
            </Button>
          </div>

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

              {cargas.length > 0 && (
                <div>
                  <p className="mb-1 text-xs font-medium text-slate-500 dark:text-slate-400">Cargas de combustible</p>
                  <ul className="space-y-1 text-sm">
                    {cargas
                      .slice()
                      .reverse()
                      .map((c) => (
                        <li key={c.movimiento.id} className="flex items-center justify-between">
                          <span className="text-slate-500 dark:text-slate-400">
                            {c.movimiento.fecha} · {c.movimiento.odometro?.toLocaleString('es-AR')} km · {c.movimiento.litros} L
                          </span>
                          <span>
                            {c.kmPorLitro ? `${c.kmPorLitro.toFixed(1)} km/L` : '—'}
                            {c.costoPorKm ? ` · ${c.costoPorKm.toFixed(0)} ${c.movimiento.moneda}/km` : ''}
                          </span>
                        </li>
                      ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </div>
      )}

      <CargarCombustibleModal
        open={modalCombustible}
        vehiculo={vehiculo}
        cuentas={cuentas}
        onClose={() => setModalCombustible(false)}
      />
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

function CargarCombustibleModal({
  open,
  vehiculo,
  cuentas,
  onClose,
}: {
  open: boolean
  vehiculo: Vehiculo
  cuentas: Cuenta[]
  onClose: () => void
}) {
  const [fecha, setFecha] = useState(todayIso())
  const [monto, setMonto] = useState('')
  const [litros, setLitros] = useState('')
  const [odometro, setOdometro] = useState(String(vehiculo.odometroActual))
  const [cuentaId, setCuentaId] = useState(cuentas[0]?.id ?? '')
  const [guardando, setGuardando] = useState(false)

  const [estabaAbierto, setEstabaAbierto] = useState(open)
  if (open !== estabaAbierto) {
    setEstabaAbierto(open)
    if (open) {
      setFecha(todayIso())
      setMonto('')
      setLitros('')
      setOdometro(String(vehiculo.odometroActual))
      setCuentaId(cuentas[0]?.id ?? '')
    }
  }

  const cuenta = cuentas.find((c) => c.id === cuentaId)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!cuenta || !monto || !litros) return
    setGuardando(true)
    try {
      await cargarCombustible({
        vehiculoId: vehiculo.id,
        fecha,
        monto: Number(monto),
        moneda: cuenta.moneda,
        litros: Number(litros),
        odometro: Number(odometro) || vehiculo.odometroActual,
        cuentaId,
      })
      onClose()
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Cargar combustible">
      {cuentas.length === 0 ? (
        <p className="text-sm text-slate-500">Primero creá una cuenta para poder pagar la carga.</p>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Fecha">
              <TextInput type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
            </Field>
            <Field label="Monto">
              <TextInput type="number" step="0.01" autoFocus value={monto} onChange={(e) => setMonto(e.target.value)} placeholder="0.00" />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Litros">
              <TextInput type="number" step="0.01" value={litros} onChange={(e) => setLitros(e.target.value)} />
            </Field>
            <Field label="Odómetro (km)">
              <TextInput type="number" value={odometro} onChange={(e) => setOdometro(e.target.value)} />
            </Field>
          </div>
          <Field label="Pagado con">
            <Select value={cuentaId} onChange={(e) => setCuentaId(e.target.value)}>
              {cuentas.map((c) => (
                <option key={c.id} value={c.id}>
                  {nombreVisibleCuenta(c).titulo}
                </option>
              ))}
            </Select>
          </Field>
          <Button type="submit" disabled={guardando} className="w-full">
            {guardando ? 'Guardando…' : 'Registrar carga'}
          </Button>
        </form>
      )}
    </Modal>
  )
}
