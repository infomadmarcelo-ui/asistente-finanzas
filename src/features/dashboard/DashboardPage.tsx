import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { db } from '../../db/db'
import type { Cuenta, Moneda } from '../../db/types'
import { Money } from '../../components/Money'
import { Button, Card, TextInput } from '../../components/ui'
import { nombreVisibleCuenta } from '../accounts/accountsRepo'
import { useSaldosCuentas } from '../accounts/useSaldos'
import { useMovimientosDeCuenta } from '../accounts/useMovimientosCuenta'
import { omitirOnboarding } from '../onboarding/onboardingRepo'
import { actualizarCotizacionDesdeApi, setCotizacionManual, useCotizacionInfo } from '../quotes/useCotizacion'
import { TIPOS_RECORDATORIO } from '../reminders/reminderEngine'
import { useRecordatoriosDelDia } from '../reminders/useRecordatorios'
import { CalendarioSemanaCard } from '../reminders/CalendarioSemanaCard'
import { WeatherCard } from '../weather/WeatherCard'
import { usePatrimonio } from './usePatrimonio'
import { formatMoney } from '../../lib/money'

export function DashboardPage() {
  const cuentas = useLiveQuery(() => db.cuentas.toArray(), []) ?? []
  const saldos = useSaldosCuentas()
  const { cuentasPorMoneda } = usePatrimonio()
  const recordatoriosDelDia = useRecordatoriosDelDia()
  const [expandido, setExpandido] = useState<Moneda | null>(null)

  // ".get()" resuelve `undefined` tanto si todavía no cargó como si no hay fila
  // guardada: se normaliza a `null` para distinguir "cargando" de "sin onboarding".
  const configApp = useLiveQuery(() => db.configApp.get('app').then((c) => c ?? null), [])

  const cuentasActivas = cuentas.filter((c) => !c.archivada)

  if (configApp === undefined) return null
  if (configApp?.onboardingEstado === undefined) return <Navigate to="/onboarding" replace />

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Hola 👋</h1>

      {configApp.onboardingEstado === 'pendiente' && <BannerOnboardingPendiente />}

      <ResumenRecordatorios items={recordatoriosDelDia} />

      <div className="grid grid-cols-2 gap-3">
        <TarjetaSaldo
          moneda="ARS"
          total={cuentasPorMoneda.ARS}
          expandida={expandido === 'ARS'}
          onToggle={() => setExpandido(expandido === 'ARS' ? null : 'ARS')}
        />
        <TarjetaSaldo
          moneda="USD"
          total={cuentasPorMoneda.USD}
          expandida={expandido === 'USD'}
          onToggle={() => setExpandido(expandido === 'USD' ? null : 'USD')}
        />
      </div>

      {expandido && (
        <DesgloseCuentas moneda={expandido} cuentas={cuentasActivas.filter((c) => c.moneda === expandido)} saldos={saldos} />
      )}

      <CotizacionCard />

      <WeatherCard />

      <CalendarioSemanaCard />
    </div>
  )
}

function BannerOnboardingPendiente() {
  return (
    <Card className="flex items-center justify-between gap-3 border-indigo-200 bg-indigo-50 dark:border-indigo-900 dark:bg-indigo-950">
      <div>
        <p className="text-sm font-medium text-indigo-900 dark:text-indigo-200">Te falta terminar de cargar tu situación inicial</p>
        <p className="text-xs text-indigo-700 dark:text-indigo-300">Podés seguir donde lo dejaste cuando quieras.</p>
      </div>
      <div className="flex shrink-0 gap-2">
        <button onClick={() => omitirOnboarding()} className="text-xs text-indigo-500 hover:text-indigo-400">
          Descartar
        </button>
        <Link to="/onboarding">
          <Button>Continuar</Button>
        </Link>
      </div>
    </Card>
  )
}

function ResumenRecordatorios({ items }: { items: ReturnType<typeof useRecordatoriosDelDia> }) {
  if (items.length === 0) return null

  return (
    <Card>
      <div className="mb-2 flex items-center justify-between">
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Para hoy y los próximos días</p>
        <Link to="/recordatorios" className="text-xs text-indigo-500 hover:text-indigo-400">
          Ver todos
        </Link>
      </div>
      <ul className="space-y-2">
        {items.slice(0, 5).map(({ recordatorio, texto, vencido }) => {
          const tipoInfo = TIPOS_RECORDATORIO.find((t) => t.value === recordatorio.tipo)
          return (
            <li key={recordatorio.id} className="flex items-center gap-3 text-sm">
              <span className="text-lg leading-none">{tipoInfo?.icon ?? '📌'}</span>
              <span className="flex-1 truncate">{recordatorio.titulo}</span>
              <span className={vencido ? 'font-medium text-red-500' : 'text-slate-500 dark:text-slate-400'}>{texto}</span>
            </li>
          )
        })}
      </ul>
    </Card>
  )
}

function TarjetaSaldo({
  moneda,
  total,
  expandida,
  onToggle,
}: {
  moneda: Moneda
  total: number
  expandida: boolean
  onToggle: () => void
}) {
  return (
    <Card
      className={`cursor-pointer hover:ring-2 hover:ring-indigo-200 dark:hover:ring-indigo-900 ${expandida ? 'ring-2 ring-indigo-300 dark:ring-indigo-800' : ''}`}
      onClick={onToggle}
    >
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500 dark:text-slate-400">Saldo en {moneda}</p>
        <span className="text-xs text-slate-400">{expandida ? '▲' : '▼'}</span>
      </div>
      <p className="mt-1 text-xl font-semibold">{formatMoney(total, moneda)}</p>
    </Card>
  )
}

function DesgloseCuentas({ moneda, cuentas, saldos }: { moneda: Moneda; cuentas: Cuenta[]; saldos: Map<string, number> }) {
  const [cuentaExpandidaId, setCuentaExpandidaId] = useState<string | null>(null)

  return (
    <Card>
      <p className="mb-2 text-sm font-medium text-slate-500 dark:text-slate-400">Cómo se compone tu saldo en {moneda}</p>
      {cuentas.length === 0 ? (
        <p className="text-sm text-slate-400">Todavía no cargaste cuentas en {moneda}.</p>
      ) : (
        <ul className="space-y-1">
          {cuentas.map((c) => (
            <FilaCuenta
              key={c.id}
              cuenta={c}
              saldo={saldos.get(c.id) ?? c.saldoInicial}
              expandida={cuentaExpandidaId === c.id}
              onToggle={() => setCuentaExpandidaId(cuentaExpandidaId === c.id ? null : c.id)}
            />
          ))}
        </ul>
      )}
    </Card>
  )
}

function FilaCuenta({
  cuenta,
  saldo,
  expandida,
  onToggle,
}: {
  cuenta: Cuenta
  saldo: number
  expandida: boolean
  onToggle: () => void
}) {
  const { titulo } = nombreVisibleCuenta(cuenta)

  return (
    <li className="border-b border-slate-50 py-1 last:border-none dark:border-slate-800/60">
      <button onClick={onToggle} className="flex w-full items-center justify-between text-sm">
        <span className="flex items-center gap-1.5">
          <span className="text-xs text-slate-400">{expandida ? '▲' : '▼'}</span>
          {titulo}
        </span>
        <Money monto={saldo} moneda={cuenta.moneda} />
      </button>
      {expandida && <MovimientosDeCuenta cuentaId={cuenta.id} />}
    </li>
  )
}

function MovimientosDeCuenta({ cuentaId }: { cuentaId: string }) {
  const movimientos = useMovimientosDeCuenta(cuentaId)

  if (movimientos.length === 0) {
    return <p className="mt-1 mb-2 pl-5 text-xs text-slate-400">Todavía no hay movimientos en esta cuenta.</p>
  }

  return (
    <ul className="mt-1 mb-2 space-y-1 pl-5">
      {movimientos.slice(0, 10).map(({ movimiento, titulo, monto, moneda }) => (
        <li key={movimiento.id} className="flex items-center justify-between text-xs">
          <span className="truncate text-slate-500 dark:text-slate-400">
            {movimiento.fecha} · {titulo}
          </span>
          <span className={monto < 0 ? 'text-red-500' : 'text-emerald-600 dark:text-emerald-400'}>
            {monto < 0 ? '-' : '+'} <Money monto={Math.abs(monto)} moneda={moneda} />
          </span>
        </li>
      ))}
      {movimientos.length > 10 && (
        <li>
          <Link to="/movimientos" className="text-xs text-indigo-500 hover:text-indigo-400">
            Ver todos los movimientos →
          </Link>
        </li>
      )}
    </ul>
  )
}

function CotizacionCard() {
  const info = useCotizacionInfo()
  const [valor, setValor] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [actualizando, setActualizando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function guardar() {
    const num = Number(valor)
    if (!num || num <= 0) return
    setGuardando(true)
    try {
      await setCotizacionManual(num)
      setValor('')
    } finally {
      setGuardando(false)
    }
  }

  async function actualizarAhora() {
    setActualizando(true)
    setError(null)
    try {
      await actualizarCotizacionDesdeApi()
    } catch {
      setError('No se pudo conectar con la API. Probá de nuevo o cargala a mano.')
    } finally {
      setActualizando(false)
    }
  }

  const textoOrigen =
    info?.fuente === 'api' ? 'Actualizada automáticamente' : info?.fuente === 'manual' ? 'Cargada a mano' : null
  const fechaTexto = info ? new Date(info.actualizadoEn).toLocaleString('es-AR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : null

  return (
    <Card>
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Cotización del dólar oficial</p>
        <button onClick={actualizarAhora} disabled={actualizando} className="text-xs text-indigo-500 hover:text-indigo-400 disabled:opacity-50">
          {actualizando ? 'Actualizando…' : 'Actualizar'}
        </button>
      </div>

      {info && (
        <p className="mt-1 text-lg font-semibold">
          {formatMoney(info.valor, 'ARS')} <span className="text-sm font-normal text-slate-400">por USD</span>
        </p>
      )}
      <p className="text-xs text-slate-400">
        {info ? `${textoOrigen} · ${fechaTexto}` : 'Todavía no hay ninguna cargada.'}
      </p>
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}

      <div className="mt-2 flex items-center gap-2">
        <TextInput type="number" step="0.01" placeholder="Corregir a mano" value={valor} onChange={(e) => setValor(e.target.value)} />
        <Button variant="secondary" onClick={guardar} disabled={guardando}>
          Guardar
        </Button>
      </div>
    </Card>
  )
}
