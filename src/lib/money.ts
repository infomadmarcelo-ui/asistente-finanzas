import type { Moneda } from '../db/types'

const formatters: Record<Moneda, Intl.NumberFormat> = {
  ARS: new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }),
  USD: new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'USD' }),
}

export function formatMoney(monto: number, moneda: Moneda): string {
  return formatters[moneda].format(monto)
}

/** Convierte un monto en USD a ARS usando la cotización oficial. */
export function usdToArs(montoUsd: number, cotizacionOficial: number): number {
  return montoUsd * cotizacionOficial
}

export function arsToUsd(montoArs: number, cotizacionOficial: number): number {
  return montoArs / cotizacionOficial
}
