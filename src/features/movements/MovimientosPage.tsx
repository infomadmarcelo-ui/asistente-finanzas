import { useLiveQuery } from 'dexie-react-hooks'
import { useMemo, useState, type FormEvent } from 'react'
import { db } from '../../db/db'
import type { Categoria, Cuenta, Moneda, Movimiento, MovimientoGasto, MovimientoIngreso, MovimientoTransferencia } from '../../db/types'
import { Money } from '../../components/Money'
import { Button, Card, EmptyState, Field, Modal, Select, TextInput } from '../../components/ui'
import { useConfirm } from '../../components/ConfirmProvider'
import { nombreVisibleCuenta } from '../accounts/accountsRepo'
import { tocaCuenta } from '../accounts/useMovimientosCuenta'
import { todayIso } from '../../lib/id'
import {
  actualizarGasto,
  actualizarIngreso,
  actualizarTransferencia,
  crearGasto,
  crearIngreso,
  crearTransferencia,
  eliminarMovimiento,
} from './movementsRepo'

type Tab = 'gasto' | 'ingreso' | 'transferencia'
type FiltroTipo = 'todos' | Tab

function opcionCuenta(c: Cuenta): string {
  return nombreVisibleCuenta(c).titulo
}

/** Las transferencias generadas por "Pagar resumen" tienen un lado que es la tarjeta, no una
 * cuenta: ese caso no se puede editar con este formulario simple de cuenta a cuenta. */
function esMovimientoEditable(m: Movimiento): boolean {
  return m.tipo !== 'transferencia' || (m.origen.tipo === 'cuenta' && m.destino.tipo === 'cuenta')
}

export function MovimientosPage() {
  const movimientos = useLiveQuery(() => db.movimientos.orderBy('fecha').reverse().toArray(), []) ?? []
  const todasLasCuentas = useLiveQuery(() => db.cuentas.toArray(), []) ?? []
  const categorias = useLiveQuery(() => db.categorias.toArray(), []) ?? []
  const [modalAbierto, setModalAbierto] = useState(false)
  const [movimientoEditando, setMovimientoEditando] = useState<Movimiento | null>(null)

  const [busqueda, setBusqueda] = useState('')
  const [filtroTipo, setFiltroTipo] = useState<FiltroTipo>('todos')
  const [filtroCuentaId, setFiltroCuentaId] = useState('')
  const [filtroCategoriaId, setFiltroCategoriaId] = useState('')
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')

  const cuentas = useMemo(() => todasLasCuentas.filter((c) => !c.archivada), [todasLasCuentas])
  const cuentaPorId = useMemo(() => new Map(todasLasCuentas.map((c) => [c.id, c])), [todasLasCuentas])
  const categoriaPorId = useMemo(() => new Map(categorias.map((c) => [c.id, c])), [categorias])

  const hayFiltrosActivos = !!(busqueda || filtroTipo !== 'todos' || filtroCuentaId || filtroCategoriaId || desde || hasta)

  const movimientosFiltrados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase()
    return movimientos.filter((m) => {
      if (filtroTipo !== 'todos' && m.tipo !== filtroTipo) return false
      if (desde && m.fecha < desde) return false
      if (hasta && m.fecha > hasta) return false
      if (filtroCuentaId && !tocaCuenta(m, filtroCuentaId)) return false
      if (filtroCategoriaId) {
        const categoriaId = m.tipo === 'ingreso' || m.tipo === 'gasto' ? m.categoriaId : undefined
        if (categoriaId !== filtroCategoriaId) return false
      }
      if (texto) {
        const categoriaNombre = (m.tipo === 'ingreso' || m.tipo === 'gasto') && m.categoriaId ? (categoriaPorId.get(m.categoriaId)?.nombre ?? '') : ''
        const haystack = `${m.descripcion ?? ''} ${categoriaNombre}`.toLowerCase()
        if (!haystack.includes(texto)) return false
      }
      return true
    })
  }, [movimientos, busqueda, filtroTipo, filtroCuentaId, filtroCategoriaId, desde, hasta, categoriaPorId])

  function limpiarFiltros() {
    setBusqueda('')
    setFiltroTipo('todos')
    setFiltroCuentaId('')
    setFiltroCategoriaId('')
    setDesde('')
    setHasta('')
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Movimientos</h1>
        <Button onClick={() => setModalAbierto(true)} disabled={cuentas.length === 0}>
          + Nuevo
        </Button>
      </div>

      {cuentas.length === 0 ? (
        <EmptyState icon="💸" title="Primero cargá una cuenta" description="Andá a la sección Cuentas y creá al menos una para poder registrar movimientos." />
      ) : movimientos.length === 0 ? (
        <EmptyState icon="💸" title="Todavía no hay movimientos" description="Registrá tu primer ingreso, gasto o transferencia." />
      ) : (
        <>
          <FiltrosMovimientos
            busqueda={busqueda}
            onBusqueda={setBusqueda}
            filtroTipo={filtroTipo}
            onFiltroTipo={setFiltroTipo}
            filtroCuentaId={filtroCuentaId}
            onFiltroCuentaId={setFiltroCuentaId}
            filtroCategoriaId={filtroCategoriaId}
            onFiltroCategoriaId={setFiltroCategoriaId}
            desde={desde}
            onDesde={setDesde}
            hasta={hasta}
            onHasta={setHasta}
            cuentas={todasLasCuentas}
            categorias={categorias}
            hayFiltrosActivos={hayFiltrosActivos}
            onLimpiar={limpiarFiltros}
          />

          {movimientosFiltrados.length === 0 ? (
            <EmptyState icon="🔍" title="Nada con esos filtros" description="Probá cambiar la búsqueda o limpiar los filtros." />
          ) : (
            <div className="space-y-2">
              {movimientosFiltrados.map((m) => (
                <MovimientoRow
                  key={m.id}
                  m={m}
                  cuentaPorId={cuentaPorId}
                  categoriaPorId={categoriaPorId}
                  onEditar={esMovimientoEditable(m) ? () => setMovimientoEditando(m) : undefined}
                />
              ))}
            </div>
          )}
        </>
      )}

      <NuevoMovimientoModal open={modalAbierto} onClose={() => setModalAbierto(false)} cuentas={cuentas} categorias={categorias} />
      <EditarMovimientoModal
        movimiento={movimientoEditando}
        onClose={() => setMovimientoEditando(null)}
        cuentas={cuentas}
        categorias={categorias}
      />
    </div>
  )
}

function FiltrosMovimientos({
  busqueda,
  onBusqueda,
  filtroTipo,
  onFiltroTipo,
  filtroCuentaId,
  onFiltroCuentaId,
  filtroCategoriaId,
  onFiltroCategoriaId,
  desde,
  onDesde,
  hasta,
  onHasta,
  cuentas,
  categorias,
  hayFiltrosActivos,
  onLimpiar,
}: {
  busqueda: string
  onBusqueda: (v: string) => void
  filtroTipo: FiltroTipo
  onFiltroTipo: (v: FiltroTipo) => void
  filtroCuentaId: string
  onFiltroCuentaId: (v: string) => void
  filtroCategoriaId: string
  onFiltroCategoriaId: (v: string) => void
  desde: string
  onDesde: (v: string) => void
  hasta: string
  onHasta: (v: string) => void
  cuentas: Cuenta[]
  categorias: Categoria[]
  hayFiltrosActivos: boolean
  onLimpiar: () => void
}) {
  return (
    <Card className="space-y-2">
      <TextInput
        value={busqueda}
        onChange={(e) => onBusqueda(e.target.value)}
        placeholder="Buscar por descripción o categoría…"
      />
      <div className="flex flex-wrap gap-2">
        <Select value={filtroTipo} onChange={(e) => onFiltroTipo(e.target.value as FiltroTipo)} className="w-auto flex-1 min-w-[8rem]">
          <option value="todos">Todos los tipos</option>
          <option value="ingreso">Ingresos</option>
          <option value="gasto">Gastos</option>
          <option value="transferencia">Transferencias</option>
        </Select>
        <Select value={filtroCuentaId} onChange={(e) => onFiltroCuentaId(e.target.value)} className="w-auto flex-1 min-w-[8rem]">
          <option value="">Todas las cuentas</option>
          {cuentas.map((c) => (
            <option key={c.id} value={c.id}>
              {opcionCuenta(c)}
            </option>
          ))}
        </Select>
        <Select value={filtroCategoriaId} onChange={(e) => onFiltroCategoriaId(e.target.value)} className="w-auto flex-1 min-w-[8rem]">
          <option value="">Todas las categorías</option>
          {categorias.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nombre}
            </option>
          ))}
        </Select>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <TextInput type="date" value={desde} onChange={(e) => onDesde(e.target.value)} className="w-auto flex-1 min-w-[8rem]" />
        <span className="text-xs text-slate-400">a</span>
        <TextInput type="date" value={hasta} onChange={(e) => onHasta(e.target.value)} className="w-auto flex-1 min-w-[8rem]" />
        {hayFiltrosActivos && (
          <button onClick={onLimpiar} className="ml-auto text-xs text-indigo-500 hover:text-indigo-400">
            Limpiar filtros
          </button>
        )}
      </div>
    </Card>
  )
}

function MovimientoRow({
  m,
  cuentaPorId,
  categoriaPorId,
  onEditar,
}: {
  m: Movimiento
  cuentaPorId: Map<string, Cuenta>
  categoriaPorId: Map<string, Categoria>
  onEditar?: () => void
}) {
  const confirmar = useConfirm()
  const signo = m.tipo === 'ingreso' ? '+' : m.tipo === 'gasto' ? '-' : '↔'
  const color = m.tipo === 'ingreso' ? 'text-emerald-600 dark:text-emerald-400' : m.tipo === 'gasto' ? 'text-red-600 dark:text-red-400' : 'text-slate-500'

  let titulo: string
  let monto: number
  let moneda: Moneda
  let subtitulo: string
  if (m.tipo === 'ingreso') {
    titulo = m.descripcion || categoriaPorId.get(m.categoriaId ?? '')?.nombre || 'Ingreso'
    monto = m.monto
    moneda = m.moneda
    const cuenta = cuentaPorId.get(m.cuentaId)
    subtitulo = cuenta ? opcionCuenta(cuenta) : ''
  } else if (m.tipo === 'gasto') {
    titulo = m.descripcion || categoriaPorId.get(m.categoriaId ?? '')?.nombre || 'Gasto'
    monto = m.monto
    moneda = m.moneda
    const cuenta = cuentaPorId.get(m.cuentaId)
    subtitulo = cuenta ? opcionCuenta(cuenta) : ''
  } else {
    titulo = m.descripcion || 'Transferencia'
    monto = m.montoOrigen
    moneda = m.monedaOrigen
    const origenCuenta = m.origen.tipo === 'cuenta' ? cuentaPorId.get(m.origen.cuentaId) : undefined
    const destinoCuenta = m.destino.tipo === 'cuenta' ? cuentaPorId.get(m.destino.cuentaId) : undefined
    const origenNombre = origenCuenta ? opcionCuenta(origenCuenta) : 'tarjeta'
    const destinoNombre = destinoCuenta ? opcionCuenta(destinoCuenta) : 'tarjeta'
    subtitulo = `${origenNombre} → ${destinoNombre}`
  }

  return (
    <Card
      className={`flex items-center justify-between ${onEditar ? 'cursor-pointer hover:ring-2 hover:ring-indigo-200 dark:hover:ring-indigo-900' : ''}`}
      onClick={onEditar}
    >
      <div>
        <p className="font-medium">{titulo}</p>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {m.fecha} · {subtitulo}
        </p>
      </div>
      <div className="flex items-center gap-3">
        <p className={`font-semibold ${color}`}>
          {signo} <Money monto={monto} moneda={moneda} />
        </p>
        <button
          onClick={async (e) => {
            e.stopPropagation()
            if (await confirmar({ mensaje: `¿Borrar "${titulo}"? Esta acción no se puede deshacer.`, textoConfirmar: 'Borrar' })) {
              eliminarMovimiento(m.id)
            }
          }}
          className="text-xs text-slate-400 hover:text-red-500"
        >
          Borrar
        </button>
      </div>
    </Card>
  )
}

function NuevoMovimientoModal({
  open,
  onClose,
  cuentas,
  categorias,
}: {
  open: boolean
  onClose: () => void
  cuentas: Cuenta[]
  categorias: Categoria[]
}) {
  const [tab, setTab] = useState<Tab>('gasto')

  function cerrar() {
    setTab('gasto')
    onClose()
  }

  return (
    <Modal open={open} onClose={cerrar} title="Nuevo movimiento">
      <div className="mb-4 flex gap-1 rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
        {(['gasto', 'ingreso', 'transferencia'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 rounded-md py-1.5 text-sm capitalize ${
              tab === t ? 'bg-white shadow dark:bg-slate-700' : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'gasto' && <GastoForm cuentas={cuentas} categorias={categorias.filter((c) => c.tipo === 'gasto')} onDone={cerrar} />}
      {tab === 'ingreso' && <IngresoForm cuentas={cuentas} categorias={categorias.filter((c) => c.tipo === 'ingreso')} onDone={cerrar} />}
      {tab === 'transferencia' && <TransferenciaForm cuentas={cuentas} onDone={cerrar} />}
    </Modal>
  )
}

const TITULO_EDICION: Record<Tab, string> = { gasto: 'Editar gasto', ingreso: 'Editar ingreso', transferencia: 'Editar transferencia' }

function EditarMovimientoModal({
  movimiento,
  onClose,
  cuentas,
  categorias,
}: {
  movimiento: Movimiento | null
  onClose: () => void
  cuentas: Cuenta[]
  categorias: Categoria[]
}) {
  return (
    <Modal open={!!movimiento} onClose={onClose} title={movimiento ? TITULO_EDICION[movimiento.tipo as Tab] : ''}>
      {movimiento?.tipo === 'gasto' && (
        <GastoForm cuentas={cuentas} categorias={categorias.filter((c) => c.tipo === 'gasto')} existing={movimiento} onDone={onClose} />
      )}
      {movimiento?.tipo === 'ingreso' && (
        <IngresoForm cuentas={cuentas} categorias={categorias.filter((c) => c.tipo === 'ingreso')} existing={movimiento} onDone={onClose} />
      )}
      {movimiento?.tipo === 'transferencia' && <TransferenciaForm cuentas={cuentas} existing={movimiento} onDone={onClose} />}
    </Modal>
  )
}

function GastoForm({
  cuentas,
  categorias,
  existing,
  onDone,
}: {
  cuentas: Cuenta[]
  categorias: Categoria[]
  existing?: MovimientoGasto
  onDone: () => void
}) {
  const vehiculos = useLiveQuery(async () => (await db.vehiculos.toArray()).filter((v) => !v.archivado), []) ?? []
  const [fecha, setFecha] = useState(existing?.fecha ?? todayIso())
  const [cuentaId, setCuentaId] = useState(existing?.cuentaId ?? cuentas[0]?.id ?? '')
  const [monto, setMonto] = useState(existing ? String(existing.monto) : '')
  const [categoriaId, setCategoriaId] = useState(existing?.categoriaId ?? categorias[0]?.id ?? '')
  const [descripcion, setDescripcion] = useState(existing?.descripcion ?? '')
  const [vehiculoId, setVehiculoId] = useState(existing?.dimension?.tipo === 'vehiculo' ? existing.dimension.id : '')
  const [guardando, setGuardando] = useState(false)

  const cuenta = cuentas.find((c) => c.id === cuentaId)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!cuenta || !monto) return
    setGuardando(true)
    try {
      const input = {
        fecha,
        monto: Number(monto),
        moneda: cuenta.moneda,
        cuentaId,
        categoriaId: categoriaId || undefined,
        descripcion: descripcion.trim() || undefined,
        dimension: vehiculoId ? ({ tipo: 'vehiculo', id: vehiculoId } as const) : undefined,
      }
      if (existing) {
        await actualizarGasto(existing.id, input)
      } else {
        await crearGasto(input)
      }
      onDone()
    } finally {
      setGuardando(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Fecha">
          <TextInput type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
        </Field>
        <Field label="Monto">
          <TextInput type="number" step="0.01" autoFocus value={monto} onChange={(e) => setMonto(e.target.value)} placeholder="0.00" />
        </Field>
      </div>
      <Field label="Cuenta">
        <Select value={cuentaId} onChange={(e) => setCuentaId(e.target.value)}>
          {cuentas.map((c) => (
            <option key={c.id} value={c.id}>
              {opcionCuenta(c)}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Categoría">
        <Select value={categoriaId} onChange={(e) => setCategoriaId(e.target.value)}>
          <option value="">Sin categoría</option>
          {categorias.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nombre}
            </option>
          ))}
        </Select>
      </Field>
      {vehiculos.length > 0 && (
        <Field label="Vehículo (opcional)">
          <Select value={vehiculoId} onChange={(e) => setVehiculoId(e.target.value)}>
            <option value="">Ninguno</option>
            {vehiculos.map((v) => (
              <option key={v.id} value={v.id}>
                {v.marca} {v.modelo}
              </option>
            ))}
          </Select>
        </Field>
      )}
      <Field label="Descripción (opcional)">
        <TextInput value={descripcion} onChange={(e) => setDescripcion(e.target.value)} />
      </Field>
      <Button type="submit" disabled={guardando} className="w-full">
        {guardando ? 'Guardando…' : existing ? 'Guardar cambios' : 'Registrar gasto'}
      </Button>
    </form>
  )
}

function IngresoForm({
  cuentas,
  categorias,
  existing,
  onDone,
}: {
  cuentas: Cuenta[]
  categorias: Categoria[]
  existing?: MovimientoIngreso
  onDone: () => void
}) {
  const fuentes = useLiveQuery(async () => (await db.fuentesIngreso.toArray()).filter((f) => !f.archivada), []) ?? []
  const [fecha, setFecha] = useState(existing?.fecha ?? todayIso())
  const [cuentaId, setCuentaId] = useState(existing?.cuentaId ?? cuentas[0]?.id ?? '')
  const [monto, setMonto] = useState(existing ? String(existing.monto) : '')
  const [categoriaId, setCategoriaId] = useState(existing?.categoriaId ?? categorias[0]?.id ?? '')
  const [fuenteIngresoId, setFuenteIngresoId] = useState(existing?.fuenteIngresoId ?? '')
  const [descripcion, setDescripcion] = useState(existing?.descripcion ?? '')
  const [guardando, setGuardando] = useState(false)

  const cuenta = cuentas.find((c) => c.id === cuentaId)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!cuenta || !monto) return
    setGuardando(true)
    try {
      const input = {
        fecha,
        monto: Number(monto),
        moneda: cuenta.moneda,
        cuentaId,
        categoriaId: categoriaId || undefined,
        fuenteIngresoId: fuenteIngresoId || undefined,
        descripcion: descripcion.trim() || undefined,
      }
      if (existing) {
        await actualizarIngreso(existing.id, input)
      } else {
        await crearIngreso(input)
      }
      onDone()
    } finally {
      setGuardando(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Fecha">
          <TextInput type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
        </Field>
        <Field label="Monto">
          <TextInput type="number" step="0.01" autoFocus value={monto} onChange={(e) => setMonto(e.target.value)} placeholder="0.00" />
        </Field>
      </div>
      <Field label="Cuenta">
        <Select value={cuentaId} onChange={(e) => setCuentaId(e.target.value)}>
          {cuentas.map((c) => (
            <option key={c.id} value={c.id}>
              {opcionCuenta(c)}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Categoría">
        <Select value={categoriaId} onChange={(e) => setCategoriaId(e.target.value)}>
          <option value="">Sin categoría</option>
          {categorias.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nombre}
            </option>
          ))}
        </Select>
      </Field>
      {fuentes.length > 0 && (
        <Field label="Fuente de ingreso (opcional)">
          <Select value={fuenteIngresoId} onChange={(e) => setFuenteIngresoId(e.target.value)}>
            <option value="">Sin especificar</option>
            {fuentes.map((f) => (
              <option key={f.id} value={f.id}>
                {f.nombre}
              </option>
            ))}
          </Select>
        </Field>
      )}
      <Field label="Descripción (opcional)">
        <TextInput value={descripcion} onChange={(e) => setDescripcion(e.target.value)} />
      </Field>
      <Button type="submit" disabled={guardando} className="w-full">
        {guardando ? 'Guardando…' : existing ? 'Guardar cambios' : 'Registrar ingreso'}
      </Button>
    </form>
  )
}

function TransferenciaForm({
  cuentas,
  existing,
  onDone,
}: {
  cuentas: Cuenta[]
  existing?: MovimientoTransferencia
  onDone: () => void
}) {
  const existingOrigenId = existing?.origen.tipo === 'cuenta' ? existing.origen.cuentaId : undefined
  const existingDestinoId = existing?.destino.tipo === 'cuenta' ? existing.destino.cuentaId : undefined

  const [fecha, setFecha] = useState(existing?.fecha ?? todayIso())
  const [cuentaOrigenId, setCuentaOrigenId] = useState(existingOrigenId ?? cuentas[0]?.id ?? '')
  const [cuentaDestinoId, setCuentaDestinoId] = useState(existingDestinoId ?? cuentas[1]?.id ?? cuentas[0]?.id ?? '')
  const [montoOrigen, setMontoOrigen] = useState(existing ? String(existing.montoOrigen) : '')
  const [montoDestino, setMontoDestino] = useState(existing ? String(existing.montoDestino) : '')
  const [descripcion, setDescripcion] = useState(existing?.descripcion ?? '')
  const [guardando, setGuardando] = useState(false)

  const origen = cuentas.find((c) => c.id === cuentaOrigenId)
  const destino = cuentas.find((c) => c.id === cuentaDestinoId)
  const mismaMoneda = origen && destino && origen.moneda === destino.moneda

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!origen || !destino || !montoOrigen) return
    const montoDestinoFinal = mismaMoneda ? Number(montoOrigen) : Number(montoDestino || montoOrigen)
    setGuardando(true)
    try {
      const input = {
        fecha,
        cuentaOrigenId,
        cuentaDestinoId,
        montoOrigen: Number(montoOrigen),
        monedaOrigen: origen.moneda,
        montoDestino: montoDestinoFinal,
        monedaDestino: destino.moneda,
        descripcion: descripcion.trim() || undefined,
      }
      if (existing) {
        await actualizarTransferencia(existing.id, input)
      } else {
        await crearTransferencia(input)
      }
      onDone()
    } finally {
      setGuardando(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <Field label="Fecha">
        <TextInput type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
      </Field>
      <Field label="Desde">
        <Select value={cuentaOrigenId} onChange={(e) => setCuentaOrigenId(e.target.value)}>
          {cuentas.map((c) => (
            <option key={c.id} value={c.id}>
              {opcionCuenta(c)}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Hacia">
        <Select value={cuentaDestinoId} onChange={(e) => setCuentaDestinoId(e.target.value)}>
          {cuentas.map((c) => (
            <option key={c.id} value={c.id}>
              {opcionCuenta(c)}
            </option>
          ))}
        </Select>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label={`Monto (${origen?.moneda ?? ''})`}>
          <TextInput type="number" step="0.01" autoFocus value={montoOrigen} onChange={(e) => setMontoOrigen(e.target.value)} placeholder="0.00" />
        </Field>
        {!mismaMoneda && (
          <Field label={`Recibido (${destino?.moneda ?? ''})`}>
            <TextInput type="number" step="0.01" value={montoDestino} onChange={(e) => setMontoDestino(e.target.value)} placeholder="0.00" />
          </Field>
        )}
      </div>
      {!mismaMoneda && (
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Origen y destino están en monedas distintas (ej: comprar dólares): indicá cuánto sale y cuánto entra.
        </p>
      )}
      <Field label="Descripción (opcional)">
        <TextInput value={descripcion} onChange={(e) => setDescripcion(e.target.value)} />
      </Field>
      <Button type="submit" disabled={guardando} className="w-full">
        {guardando ? 'Guardando…' : existing ? 'Guardar cambios' : 'Registrar transferencia'}
      </Button>
    </form>
  )
}
