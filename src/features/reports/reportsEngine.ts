import type { Categoria, CompraCuotas, Cuota, Moneda, Movimiento } from '../../db/types'

export interface ItemPorCategoria {
  categoriaId: string
  nombre: string
  moneda: Moneda
  monto: number
}

export interface ResumenMensual {
  ingresosPorMoneda: Record<Moneda, number>
  gastosPorMoneda: Record<Moneda, number>
  ahorroPorMoneda: Record<Moneda, number>
  gastosPorCategoria: ItemPorCategoria[]
  ingresosPorCategoria: ItemPorCategoria[]
}

function sumaVacia(): Record<Moneda, number> {
  return { ARS: 0, USD: 0 }
}

function sumar(mapa: Map<string, Record<Moneda, number>>, key: string, moneda: Moneda, monto: number) {
  const actual = mapa.get(key) ?? sumaVacia()
  actual[moneda] += monto
  mapa.set(key, actual)
}

function aLista(mapa: Map<string, Record<Moneda, number>>, categoriaPorId: Map<string, Categoria>): ItemPorCategoria[] {
  const resultado: ItemPorCategoria[] = []
  for (const [categoriaId, porMoneda] of mapa) {
    const nombre = categoriaId ? (categoriaPorId.get(categoriaId)?.nombre ?? 'Categoría eliminada') : 'Sin categoría'
    for (const moneda of ['ARS', 'USD'] as const) {
      if (porMoneda[moneda] > 0) resultado.push({ categoriaId: categoriaId || 'sin-categoria', nombre, moneda, monto: porMoneda[moneda] })
    }
  }
  return resultado
}

/**
 * Resumen de un mes (yyyy-MM): ingresos y gastos, con el detalle por categoría.
 * Los gastos incluyen tanto los movimientos de gasto normales como las cuotas de
 * tarjeta que caen en ese período — es lo que realmente "pesa" ese mes, tal como
 * ya se ve en el resumen de cada tarjeta.
 */
export function calcularResumenMensual(
  periodo: string,
  movimientos: Movimiento[],
  cuotas: Cuota[],
  compraPorId: Map<string, CompraCuotas>,
  categoriaPorId: Map<string, Categoria>,
): ResumenMensual {
  const ingresosPorMoneda = sumaVacia()
  const gastosPorMoneda = sumaVacia()
  const gastoPorCategoria = new Map<string, Record<Moneda, number>>()
  const ingresoPorCategoria = new Map<string, Record<Moneda, number>>()

  for (const m of movimientos) {
    if (!m.fecha.startsWith(periodo)) continue
    if (m.tipo === 'ingreso') {
      ingresosPorMoneda[m.moneda] += m.monto
      sumar(ingresoPorCategoria, m.categoriaId ?? '', m.moneda, m.monto)
    } else if (m.tipo === 'gasto') {
      gastosPorMoneda[m.moneda] += m.monto
      sumar(gastoPorCategoria, m.categoriaId ?? '', m.moneda, m.monto)
    }
  }

  for (const c of cuotas) {
    if (c.periodo !== periodo) continue
    const compra = compraPorId.get(c.compraId)
    if (!compra) continue
    gastosPorMoneda[c.moneda] += c.monto
    sumar(gastoPorCategoria, compra.categoriaId ?? '', c.moneda, c.monto)
  }

  return {
    ingresosPorMoneda,
    gastosPorMoneda,
    ahorroPorMoneda: { ARS: ingresosPorMoneda.ARS - gastosPorMoneda.ARS, USD: ingresosPorMoneda.USD - gastosPorMoneda.USD },
    gastosPorCategoria: aLista(gastoPorCategoria, categoriaPorId),
    ingresosPorCategoria: aLista(ingresoPorCategoria, categoriaPorId),
  }
}
