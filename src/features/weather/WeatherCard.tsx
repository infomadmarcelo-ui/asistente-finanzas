import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useState } from 'react'
import { db } from '../../db/db'
import { Button, Card, TextInput } from '../../components/ui'
import { iconoClima, textoClima } from './weatherCodes'
import {
  buscarUbicaciones,
  guardarUbicacion,
  obtenerPronostico,
  borrarUbicacion,
  type CandidatoUbicacion,
  type DiaPronostico,
} from './weatherRepo'

function etiquetaDia(fechaIso: string, indice: number): string {
  if (indice === 0) return 'Hoy'
  if (indice === 1) return 'Mañana'
  const texto = new Date(fechaIso + 'T00:00:00').toLocaleDateString('es-AR', { weekday: 'short' })
  return texto.charAt(0).toUpperCase() + texto.slice(1).replace('.', '')
}

export function WeatherCard() {
  // ".get()" resuelve a `undefined` tanto si todavía no cargó como si no hay fila
  // guardada (caso normal en una copia limpia): por eso acá se normaliza a `null`
  // para poder distinguir "todavía cargando" (undefined) de "ya cargó, vacío" (null).
  const config = useLiveQuery(() => db.configApp.get('app').then((c) => c ?? null), [])

  if (config === undefined) {
    return null // todavía cargando la config, evita el parpadeo del buscador
  }

  const ubicacion = config?.ubicacionClima
  return <Card>{ubicacion ? <Pronostico ubicacion={ubicacion} /> : <BuscadorUbicacion />}</Card>
}

function Pronostico({ ubicacion }: { ubicacion: { lat: number; lon: number; nombre: string } }) {
  const [dias, setDias] = useState<DiaPronostico[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    let cancelado = false
    setCargando(true)
    setError(null)
    obtenerPronostico(ubicacion.lat, ubicacion.lon)
      .then((res) => {
        if (!cancelado) setDias(res)
      })
      .catch(() => {
        if (!cancelado) setError('No se pudo conectar para traer el clima. Probá de nuevo más tarde.')
      })
      .finally(() => {
        if (!cancelado) setCargando(false)
      })
    return () => {
      cancelado = true
    }
  }, [ubicacion.lat, ubicacion.lon])

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Clima en {ubicacion.nombre}</p>
        <button onClick={() => borrarUbicacion()} className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
          Cambiar
        </button>
      </div>

      {cargando && <p className="text-sm text-slate-400">Cargando pronóstico…</p>}
      {error && <p className="text-sm text-slate-400">{error}</p>}

      {dias && (
        <div className="grid grid-cols-4 gap-2 text-center">
          {dias.map((d, i) => (
            <div key={d.fecha} className="rounded-lg bg-slate-50 py-2 dark:bg-slate-800">
              <p className="text-xs text-slate-500 dark:text-slate-400">{etiquetaDia(d.fecha, i)}</p>
              <p className="text-2xl" title={textoClima(d.codigo)}>
                {iconoClima(d.codigo)}
              </p>
              <p className="text-xs">
                <span className="font-medium">{Math.round(d.tempMax)}°</span>{' '}
                <span className="text-slate-400">{Math.round(d.tempMin)}°</span>
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function BuscadorUbicacion() {
  const [consulta, setConsulta] = useState('')
  const [buscando, setBuscando] = useState(false)
  const [resultados, setResultados] = useState<CandidatoUbicacion[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function buscar() {
    if (!consulta.trim()) return
    setBuscando(true)
    setError(null)
    try {
      const res = await buscarUbicaciones(consulta)
      setResultados(res)
      if (res.length === 0) setError('No encontramos esa localidad. Probá con otro nombre.')
    } catch {
      setError('No se pudo buscar (revisá tu conexión) e intentá de nuevo.')
    } finally {
      setBuscando(false)
    }
  }

  return (
    <div>
      <p className="mb-2 text-sm font-medium text-slate-500 dark:text-slate-400">Pronóstico del clima</p>
      <p className="mb-2 text-xs text-slate-400">Elegí tu ciudad para ver el pronóstico acá.</p>
      <div className="flex gap-2">
        <TextInput
          value={consulta}
          onChange={(e) => setConsulta(e.target.value)}
          placeholder="Ej: Córdoba"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              buscar()
            }
          }}
        />
        <Button onClick={buscar} disabled={buscando}>
          {buscando ? 'Buscando…' : 'Buscar'}
        </Button>
      </div>
      {error && <p className="mt-2 text-sm text-slate-400">{error}</p>}
      {resultados && resultados.length > 0 && (
        <ul className="mt-2 space-y-1">
          {resultados.map((r) => (
            <li key={`${r.lat},${r.lon}`}>
              <button
                onClick={() => guardarUbicacion(r)}
                className="w-full rounded-lg px-2 py-1.5 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                {r.nombre}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
