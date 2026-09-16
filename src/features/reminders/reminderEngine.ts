import type { Recordatorio } from '../../db/types'
import { parseFechaLocal } from '../../lib/id'

function soloFecha(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

function diasEnMes(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate()
}

/**
 * Próxima ocurrencia de un recordatorio POR FECHA a partir de `hoy` (incluye hoy
 * mismo). Para 'unica' devuelve su fecha (o null si ya está completado). Para
 * 'mensual' y 'anual' proyecta hacia adelante usando el día (y mes) de `fecha`
 * como ancla. Los recordatorios por kilómetros (condicionKm) no pasan por acá:
 * ver `calcularRestanteKm`.
 */
export function calcularProximaOcurrencia(r: Recordatorio, hoy: Date = new Date()): Date | null {
  if (r.condicionKm != null || !r.fecha) return null
  const ancla = parseFechaLocal(r.fecha)
  const h = soloFecha(hoy)

  if (r.frecuencia === 'unica') {
    if (r.completado) return null
    return soloFecha(ancla)
  }

  if (r.frecuencia === 'mensual') {
    const dia = ancla.getDate()
    const candidato = new Date(h.getFullYear(), h.getMonth(), Math.min(dia, diasEnMes(h.getFullYear(), h.getMonth())))
    if (candidato >= h) return candidato
    const siguienteMes = h.getMonth() + 1
    return new Date(h.getFullYear(), siguienteMes, Math.min(dia, diasEnMes(h.getFullYear(), siguienteMes)))
  }

  // anual
  const dia = ancla.getDate()
  const mes = ancla.getMonth()
  const candidato = new Date(h.getFullYear(), mes, Math.min(dia, diasEnMes(h.getFullYear(), mes)))
  if (candidato >= h) return candidato
  return new Date(h.getFullYear() + 1, mes, Math.min(dia, diasEnMes(h.getFullYear() + 1, mes)))
}

/** Días hasta la próxima ocurrencia (negativo si ya venció). */
export function diasHasta(fecha: Date, hoy: Date = new Date()): number {
  const msPorDia = 1000 * 60 * 60 * 24
  return Math.round((soloFecha(fecha).getTime() - soloFecha(hoy).getTime()) / msPorDia)
}

export function textoRelativo(dias: number): string {
  if (dias < 0) return `Venció hace ${Math.abs(dias)} día${Math.abs(dias) === 1 ? '' : 's'}`
  if (dias === 0) return 'Hoy'
  if (dias === 1) return 'Mañana'
  return `En ${dias} días`
}

/** Kilómetros que faltan para un recordatorio por km (negativo si ya se pasó). */
export function calcularRestanteKm(r: Pick<Recordatorio, 'condicionKm'>, odometroActual: number): number {
  return (r.condicionKm ?? 0) - odometroActual
}

export function textoRelativoKm(restante: number): string {
  if (restante < 0) return `Pasaste el km hace ${Math.abs(restante).toLocaleString('es-AR')} km`
  if (restante === 0) return 'Es ahora'
  return `Faltan ${restante.toLocaleString('es-AR')} km`
}

export const TIPOS_RECORDATORIO: { value: Recordatorio['tipo']; label: string; icon: string }[] = [
  { value: 'vencimiento_pago', label: 'Vencimiento de pago', icon: '💳' },
  { value: 'mantenimiento_vehiculo', label: 'Mantenimiento de vehículo', icon: '🚗' },
  { value: 'cumpleanos', label: 'Cumpleaños', icon: '🎂' },
  { value: 'tramite', label: 'Trámite', icon: '📋' },
  { value: 'documento', label: 'Documento que vence', icon: '🪪' },
  { value: 'salud', label: 'Salud', icon: '🩺' },
  { value: 'revisar', label: 'Revisar', icon: '🔎' },
  { value: 'otro', label: 'Otro', icon: '📌' },
]
