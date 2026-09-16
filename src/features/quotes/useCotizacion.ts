import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../db/db'

const HORAS_ANTES_DE_CONSIDERARLA_VIEJA = 6

/** Cotización oficial guardada localmente. Si todavía no se cargó ninguna, devuelve null. */
export function useCotizacionOficial(): number | null {
  const cotizacion = useLiveQuery(() => db.cotizaciones.get('oficial'), [])
  return cotizacion?.valor ?? null
}

/** El registro completo (valor, cuándo se actualizó y si vino de la API o a mano). */
export function useCotizacionInfo() {
  return useLiveQuery(() => db.cotizaciones.get('oficial'), []) ?? null
}

export async function setCotizacionManual(valor: number): Promise<void> {
  await db.cotizaciones.put({ id: 'oficial', valor, actualizadoEn: new Date().toISOString(), fuente: 'manual' })
}

/**
 * Dólar oficial desde una API pública argentina, sin clave y sin datos del
 * usuario (dolarapi.com, CORS abierto). Usa el valor de "venta" porque es al
 * que se convierte cuando pensás cuánto te cuesta algo en dólares.
 */
export async function actualizarCotizacionDesdeApi(): Promise<void> {
  const respuesta = await fetch('https://dolarapi.com/v1/dolares/oficial')
  if (!respuesta.ok) throw new Error('No se pudo obtener la cotización')
  const datos = await respuesta.json()
  const valor = datos.venta
  if (typeof valor !== 'number' || valor <= 0) throw new Error('La API devolvió una respuesta inesperada')
  await db.cotizaciones.put({ id: 'oficial', valor, actualizadoEn: new Date().toISOString(), fuente: 'api' })
}

/** Se llama al abrir la app: si nunca se cargó o ya pasaron varias horas, la
 * refresca sola. Si falla (sin conexión, etc.) no rompe nada — se sigue
 * usando la última que haya, o el usuario la carga a mano. */
export async function actualizarCotizacionSiEstaVieja(): Promise<void> {
  const actual = await db.cotizaciones.get('oficial')
  if (actual) {
    const horasDesdeUltimaActualizacion = (Date.now() - new Date(actual.actualizadoEn).getTime()) / (1000 * 60 * 60)
    if (horasDesdeUltimaActualizacion < HORAS_ANTES_DE_CONSIDERARLA_VIEJA) return
  }
  try {
    await actualizarCotizacionDesdeApi()
  } catch {
    // Sin conexión o la API no respondió: se sigue usando lo que había.
  }
}
