import { db } from '../../db/db'

export interface UbicacionClima {
  lat: number
  lon: number
  nombre: string
}

export interface CandidatoUbicacion {
  nombre: string
  lat: number
  lon: number
}

export interface DiaPronostico {
  fecha: string
  tempMax: number
  tempMin: number
  codigo: number
}

export async function obtenerUbicacionGuardada(): Promise<UbicacionClima | undefined> {
  const config = await db.configApp.get('app')
  return config?.ubicacionClima
}

export async function guardarUbicacion(ubicacion: UbicacionClima): Promise<void> {
  const actual = await db.configApp.get('app')
  await db.configApp.put({ ...(actual ?? { id: 'app' }), ubicacionClima: ubicacion })
}

export async function borrarUbicacion(): Promise<void> {
  const actual = await db.configApp.get('app')
  if (!actual) return
  await db.configApp.put({ ...actual, ubicacionClima: undefined })
}

/** Geocoding público de Open-Meteo: sin clave, sin datos personales, solo el nombre de ciudad. */
export async function buscarUbicaciones(consulta: string): Promise<CandidatoUbicacion[]> {
  if (!consulta.trim()) return []
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(consulta.trim())}&count=6&language=es&format=json`
  const respuesta = await fetch(url)
  if (!respuesta.ok) throw new Error('No se pudo buscar la ubicación')
  const datos = await respuesta.json()
  const resultados: { name: string; admin1?: string; country?: string; latitude: number; longitude: number }[] = datos.results ?? []
  return resultados.map((r) => ({
    nombre: [r.name, r.admin1, r.country].filter(Boolean).join(', '),
    lat: r.latitude,
    lon: r.longitude,
  }))
}

/** Pronóstico público de Open-Meteo para los próximos días, sin clave y sin datos del usuario. */
export async function obtenerPronostico(lat: number, lon: number): Promise<DiaPronostico[]> {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=weathercode,temperature_2m_max,temperature_2m_min&timezone=auto&forecast_days=4`
  const respuesta = await fetch(url)
  if (!respuesta.ok) throw new Error('No se pudo obtener el pronóstico')
  const datos = await respuesta.json()
  const fechas: string[] = datos.daily?.time ?? []
  const max: number[] = datos.daily?.temperature_2m_max ?? []
  const min: number[] = datos.daily?.temperature_2m_min ?? []
  const codigos: number[] = datos.daily?.weathercode ?? []
  return fechas.map((fecha, i) => ({ fecha, tempMax: max[i], tempMin: min[i], codigo: codigos[i] }))
}
