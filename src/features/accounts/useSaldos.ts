import { useLiveQuery } from 'dexie-react-hooks'
import { useMemo } from 'react'
import { db } from '../../db/db'

/** Mapa cuentaId -> saldo actual, calculado a partir de saldoInicial + movimientos. */
export function useSaldosCuentas(): Map<string, number> {
  const cuentas = useLiveQuery(() => db.cuentas.toArray(), []) ?? []
  const movimientos = useLiveQuery(() => db.movimientos.toArray(), []) ?? []

  return useMemo(() => {
    const map = new Map<string, number>()
    for (const c of cuentas) map.set(c.id, c.saldoInicial)

    for (const m of movimientos) {
      if (m.tipo === 'ingreso') {
        map.set(m.cuentaId, (map.get(m.cuentaId) ?? 0) + m.monto)
      } else if (m.tipo === 'gasto') {
        map.set(m.cuentaId, (map.get(m.cuentaId) ?? 0) - m.monto)
      } else if (m.tipo === 'transferencia') {
        if (m.origen.tipo === 'cuenta') {
          map.set(m.origen.cuentaId, (map.get(m.origen.cuentaId) ?? 0) - m.montoOrigen)
        }
        if (m.destino.tipo === 'cuenta') {
          map.set(m.destino.cuentaId, (map.get(m.destino.cuentaId) ?? 0) + m.montoDestino)
        }
      }
    }
    return map
  }, [cuentas, movimientos])
}
