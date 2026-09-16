import type { MovimientoGasto } from '../../db/types'

export interface CargaCombustible {
  movimiento: MovimientoGasto
  kmRecorridos: number | null
  kmPorLitro: number | null
  costoPorKm: number | null
}

/**
 * Cruza cada carga de combustible con la anterior (por odómetro) para sacar
 * consumo (km/l) y costo por km. La primera carga registrada no tiene desde
 * dónde calcular, así que queda sin esos datos.
 */
export function calcularConsumos(cargas: MovimientoGasto[]): CargaCombustible[] {
  const ordenadas = [...cargas]
    .filter((m) => m.odometro != null)
    .sort((a, b) => (a.odometro ?? 0) - (b.odometro ?? 0))

  return ordenadas.map((movimiento, i) => {
    if (i === 0) return { movimiento, kmRecorridos: null, kmPorLitro: null, costoPorKm: null }
    const anterior = ordenadas[i - 1]
    const kmRecorridos = (movimiento.odometro ?? 0) - (anterior.odometro ?? 0)
    if (kmRecorridos <= 0) return { movimiento, kmRecorridos: null, kmPorLitro: null, costoPorKm: null }
    const kmPorLitro = movimiento.litros ? kmRecorridos / movimiento.litros : null
    const costoPorKm = movimiento.monto / kmRecorridos
    return { movimiento, kmRecorridos, kmPorLitro, costoPorKm }
  })
}
