import { useLiveQuery } from 'dexie-react-hooks'
import { useMemo } from 'react'
import { db } from '../../db/db'
import type { Moneda } from '../../db/types'
import { useSaldosCuentas } from '../accounts/useSaldos'
import { useUsoTarjetas } from '../cards/useTarjetas'

export interface Patrimonio {
  cuentasPorMoneda: Record<Moneda, number>
  vehiculosPorMoneda: Record<Moneda, number>
  inversionesPorMoneda: Record<Moneda, number>
  deudaPorMoneda: Record<Moneda, number>
  patrimonioPorMoneda: Record<Moneda, number>
}

function sumaVacia(): Record<Moneda, number> {
  return { ARS: 0, USD: 0 }
}

/** Cuentas + vehículos + inversiones activas, menos deuda de tarjetas. Cada
 * moneda por separado (sin convertir), tal como se ve en toda la app. */
export function usePatrimonio(): Patrimonio {
  const cuentas = useLiveQuery(() => db.cuentas.toArray(), []) ?? []
  const tarjetas = useLiveQuery(async () => (await db.tarjetas.toArray()).filter((t) => !t.archivada), []) ?? []
  const vehiculos = useLiveQuery(async () => (await db.vehiculos.toArray()).filter((v) => !v.archivado), []) ?? []
  const inversiones = useLiveQuery(async () => (await db.inversiones.toArray()).filter((i) => !i.liquidada), []) ?? []
  const saldos = useSaldosCuentas()
  const uso = useUsoTarjetas()

  return useMemo(() => {
    const cuentasPorMoneda = sumaVacia()
    const deudaPorMoneda = sumaVacia()
    const vehiculosPorMoneda = sumaVacia()
    const inversionesPorMoneda = sumaVacia()

    for (const c of cuentas) {
      if (c.archivada) continue
      cuentasPorMoneda[c.moneda] += saldos.get(c.id) ?? c.saldoInicial
    }
    for (const t of tarjetas) {
      deudaPorMoneda[t.moneda] += uso.get(t.id)?.usado ?? 0
    }
    for (const v of vehiculos) {
      vehiculosPorMoneda[v.moneda] += v.valorEstimado
    }
    for (const i of inversiones) {
      inversionesPorMoneda[i.moneda] += i.capital
    }

    const patrimonioPorMoneda: Record<Moneda, number> = {
      ARS: cuentasPorMoneda.ARS + vehiculosPorMoneda.ARS + inversionesPorMoneda.ARS - deudaPorMoneda.ARS,
      USD: cuentasPorMoneda.USD + vehiculosPorMoneda.USD + inversionesPorMoneda.USD - deudaPorMoneda.USD,
    }

    return { cuentasPorMoneda, vehiculosPorMoneda, inversionesPorMoneda, deudaPorMoneda, patrimonioPorMoneda }
  }, [cuentas, tarjetas, vehiculos, inversiones, saldos, uso])
}
