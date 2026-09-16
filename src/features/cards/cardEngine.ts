import type { CompraCuotas, Cuota, TarjetaCredito } from '../../db/types'
import { newId, parseFechaLocal } from '../../lib/id'

export interface Periodo {
  year: number
  month: number // 0-indexed
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate()
}

function clampDay(year: number, month: number, day: number): number {
  return Math.min(day, daysInMonth(year, month))
}

export function periodoToString(p: Periodo): string {
  return `${p.year}-${String(p.month + 1).padStart(2, '0')}`
}

export function addMonths(p: Periodo, n: number): Periodo {
  const total = p.year * 12 + p.month + n
  return { year: Math.floor(total / 12), month: ((total % 12) + 12) % 12 }
}

/** En qué resumen (identificado por el mes de cierre) cae una compra hecha en `fecha`. */
export function calcularPeriodoDeCompra(fecha: Date, diaCierre: number): Periodo {
  const year = fecha.getFullYear()
  const month = fecha.getMonth()
  const cierreEsteMes = clampDay(year, month, diaCierre)
  if (fecha.getDate() <= cierreEsteMes) {
    return { year, month }
  }
  return addMonths({ year, month }, 1)
}

export function fechaCierre(p: Periodo, diaCierre: number): Date {
  return new Date(p.year, p.month, clampDay(p.year, p.month, diaCierre))
}

/**
 * Fecha de vencimiento de un resumen. Si el día de vencimiento configurado es
 * anterior al día de cierre, se asume que cae al mes siguiente del cierre
 * (el caso típico en Argentina: cierra el 20, vence el 10 del mes que viene).
 */
export function fechaVencimiento(p: Periodo, diaCierre: number, diaVencimiento: number): Date {
  const venceMismoMes = diaVencimiento >= diaCierre
  const periodoVencimiento = venceMismoMes ? p : addMonths(p, 1)
  return new Date(
    periodoVencimiento.year,
    periodoVencimiento.month,
    clampDay(periodoVencimiento.year, periodoVencimiento.month, diaVencimiento),
  )
}

/** Genera el cronograma de cuotas de una compra, distribuyendo el redondeo en la última. */
export function generarCuotas(compra: CompraCuotas, tarjeta: TarjetaCredito): Cuota[] {
  const primerPeriodo = calcularPeriodoDeCompra(parseFechaLocal(compra.fecha), tarjeta.diaCierre)
  const valorBase = Math.round((compra.montoTotal / compra.cantidadCuotas) * 100) / 100
  const cuotas: Cuota[] = []
  let acumulado = 0

  for (let i = 0; i < compra.cantidadCuotas; i++) {
    const esUltima = i === compra.cantidadCuotas - 1
    const monto = esUltima ? Math.round((compra.montoTotal - acumulado) * 100) / 100 : valorBase
    acumulado += monto
    cuotas.push({
      id: newId(),
      compraId: compra.id,
      numero: i + 1,
      monto,
      moneda: compra.moneda,
      periodo: periodoToString(addMonths(primerPeriodo, i)),
      estado: 'pendiente',
    })
  }
  return cuotas
}
