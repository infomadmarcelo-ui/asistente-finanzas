import { useLiveQuery } from 'dexie-react-hooks'
import { useMemo } from 'react'
import { db } from '../../db/db'
import type { Moneda, Movimiento } from '../../db/types'

export interface MovimientoDeCuenta {
  movimiento: Movimiento
  titulo: string
  /** Monto con signo desde el punto de vista de esta cuenta (+ entra, - sale). */
  monto: number
  moneda: Moneda
}

export function tocaCuenta(m: Movimiento, cuentaId: string): boolean {
  if (m.tipo === 'ingreso' || m.tipo === 'gasto') return m.cuentaId === cuentaId
  return (m.origen.tipo === 'cuenta' && m.origen.cuentaId === cuentaId) || (m.destino.tipo === 'cuenta' && m.destino.cuentaId === cuentaId)
}

/** Movimientos que afectan una cuenta puntual, con el monto ya con signo desde
 * el punto de vista de esa cuenta, más recientes primero. */
export function useMovimientosDeCuenta(cuentaId: string | null): MovimientoDeCuenta[] {
  const movimientos = useLiveQuery(() => db.movimientos.toArray(), []) ?? []
  const categorias = useLiveQuery(() => db.categorias.toArray(), []) ?? []
  const categoriaPorId = useMemo(() => new Map(categorias.map((c) => [c.id, c.nombre])), [categorias])

  return useMemo(() => {
    if (!cuentaId) return []

    const resultado: MovimientoDeCuenta[] = []
    for (const m of movimientos) {
      if (!tocaCuenta(m, cuentaId)) continue

      if (m.tipo === 'ingreso') {
        resultado.push({ movimiento: m, titulo: m.descripcion || categoriaPorId.get(m.categoriaId ?? '') || 'Ingreso', monto: m.monto, moneda: m.moneda })
      } else if (m.tipo === 'gasto') {
        resultado.push({ movimiento: m, titulo: m.descripcion || categoriaPorId.get(m.categoriaId ?? '') || 'Gasto', monto: -m.monto, moneda: m.moneda })
      } else {
        const esOrigen = m.origen.tipo === 'cuenta' && m.origen.cuentaId === cuentaId
        const titulo = m.descripcion || (esOrigen ? 'Transferencia enviada' : 'Transferencia recibida')
        const monto = esOrigen ? -m.montoOrigen : m.montoDestino
        const moneda = esOrigen ? m.monedaOrigen : m.monedaDestino
        resultado.push({ movimiento: m, titulo, monto, moneda })
      }
    }
    return resultado.sort((a, b) => b.movimiento.fecha.localeCompare(a.movimiento.fecha))
  }, [movimientos, categoriaPorId, cuentaId])
}
