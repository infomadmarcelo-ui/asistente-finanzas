import { useLiveQuery } from 'dexie-react-hooks'
import { useMemo } from 'react'
import { db } from '../../db/db'
import { calcularResumenMensual, type ResumenMensual } from './reportsEngine'

export function useResumenMensual(periodo: string): ResumenMensual {
  const movimientos = useLiveQuery(() => db.movimientos.toArray(), []) ?? []
  const cuotas = useLiveQuery(() => db.cuotas.toArray(), []) ?? []
  const compras = useLiveQuery(() => db.comprasCuotas.toArray(), []) ?? []
  const categorias = useLiveQuery(() => db.categorias.toArray(), []) ?? []

  const compraPorId = useMemo(() => new Map(compras.map((c) => [c.id, c])), [compras])
  const categoriaPorId = useMemo(() => new Map(categorias.map((c) => [c.id, c])), [categorias])

  return useMemo(
    () => calcularResumenMensual(periodo, movimientos, cuotas, compraPorId, categoriaPorId),
    [periodo, movimientos, cuotas, compraPorId, categoriaPorId],
  )
}
