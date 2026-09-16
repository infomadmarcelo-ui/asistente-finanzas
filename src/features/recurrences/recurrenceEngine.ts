import type { Recurrencia } from '../../db/types'

function diasEnMes(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate()
}

/** Período que le corresponde a "hoy" para una recurrencia (yyyy-MM para mensual, yyyy para anual). */
export function periodoDe(r: Pick<Recurrencia, 'frecuencia'>, hoy: Date): string {
  if (r.frecuencia === 'mensual') return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`
  return String(hoy.getFullYear())
}

/** Fecha exacta (dentro del período de "hoy") en que corresponde generar esta recurrencia. */
export function fechaProgramada(r: Pick<Recurrencia, 'frecuencia' | 'diaDelMes' | 'mes'>, hoy: Date): Date {
  const year = hoy.getFullYear()
  if (r.frecuencia === 'mensual') {
    const month = hoy.getMonth()
    return new Date(year, month, Math.min(r.diaDelMes, diasEnMes(year, month)))
  }
  const month = (r.mes ?? 1) - 1
  return new Date(year, month, Math.min(r.diaDelMes, diasEnMes(year, month)))
}

export interface RecurrenciaPendiente {
  recurrencia: Recurrencia
  periodo: string
  fecha: Date
}

/**
 * Recurrencias activas cuya fecha programada de este período ya llegó y todavía
 * no se generaron. Ojo: si la app estuvo mucho tiempo sin abrirse, solo se genera
 * el período actual (no se recuperan períodos salteados) — evita cargar de
 * sorpresa movimientos viejos sin que el usuario lo vea pasar.
 */
export function recurrenciasPendientes(recurrencias: Recurrencia[], hoy: Date = new Date()): RecurrenciaPendiente[] {
  const pendientes: RecurrenciaPendiente[] = []
  for (const r of recurrencias) {
    if (!r.activa || !r.generarMovimiento) continue
    const periodo = periodoDe(r, hoy)
    if (r.ultimoPeriodoGenerado === periodo) continue
    const fecha = fechaProgramada(r, hoy)
    if (fecha > hoy) continue
    pendientes.push({ recurrencia: r, periodo, fecha })
  }
  return pendientes
}
