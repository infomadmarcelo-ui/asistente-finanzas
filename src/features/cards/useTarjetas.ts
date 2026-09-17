import { useLiveQuery } from 'dexie-react-hooks'
import { useMemo } from 'react'
import { db } from '../../db/db'
import type { CompraCuotas, Cuota, TarjetaCredito } from '../../db/types'
import { addMonths, calcularPeriodoDeCompra, fechaVencimiento, periodoToString } from './cardEngine'
import { calcularUsoTarjeta, type UsoTarjeta } from './cardsRepo'
import { fechaLocalIso } from '../../lib/id'

/** Mapa tarjetaId -> uso (usado/disponible), en base a las cuotas pendientes de cada una. */
export function useUsoTarjetas(): Map<string, UsoTarjeta> {
  const tarjetas = useLiveQuery(() => db.tarjetas.toArray(), []) ?? []
  const compras = useLiveQuery(() => db.comprasCuotas.toArray(), []) ?? []
  const cuotas = useLiveQuery(() => db.cuotas.toArray(), []) ?? []

  return useMemo(() => {
    const compraATarjeta = new Map(compras.map((c) => [c.id, c.tarjetaId]))
    const pendientesPorTarjeta = new Map<string, Cuota[]>()
    for (const cuota of cuotas) {
      if (cuota.estado !== 'pendiente') continue
      const tarjetaId = compraATarjeta.get(cuota.compraId)
      if (!tarjetaId) continue
      const lista = pendientesPorTarjeta.get(tarjetaId) ?? []
      lista.push(cuota)
      pendientesPorTarjeta.set(tarjetaId, lista)
    }
    const map = new Map<string, UsoTarjeta>()
    for (const tarjeta of tarjetas) {
      map.set(tarjeta.id, calcularUsoTarjeta(tarjeta, pendientesPorTarjeta.get(tarjeta.id) ?? []))
    }
    return map
  }, [tarjetas, compras, cuotas])
}

export interface ItemResumen {
  compraId: string
  descripcion: string
  numero: number
  cantidadCuotas: number
  monto: number
  origenUsd?: CompraCuotas['origenUsd']
}

export interface ResumenPeriodo {
  periodo: string
  vencimiento: string
  total: number
  estado: 'pendiente' | 'pagada'
  items: ItemResumen[]
}

/** Todas las cuotas de una tarjeta (con la descripción de su compra), para armar resúmenes por período. */
function useCuotasConCompra(tarjeta: TarjetaCredito | undefined): { cuota: Cuota; compra: CompraCuotas }[] {
  const compras =
    useLiveQuery<CompraCuotas[]>(
      () => (tarjeta ? db.comprasCuotas.where('tarjetaId').equals(tarjeta.id).toArray() : Promise.resolve([])),
      [tarjeta?.id],
    ) ?? []
  const compraPorId = useMemo(() => new Map(compras.map((c) => [c.id, c])), [compras])
  const cuotas = useLiveQuery(() => db.cuotas.toArray(), []) ?? []

  return useMemo(() => {
    const resultado: { cuota: Cuota; compra: CompraCuotas }[] = []
    for (const cuota of cuotas) {
      const compra = compraPorId.get(cuota.compraId)
      if (compra) resultado.push({ cuota, compra })
    }
    return resultado
  }, [cuotas, compraPorId])
}

/** Cuotas de una tarjeta agrupadas por período (resumen), con total, vencimiento y desglose. */
export function useResumenesTarjeta(tarjeta: TarjetaCredito | undefined): ResumenPeriodo[] {
  const cuotasConCompra = useCuotasConCompra(tarjeta)

  return useMemo(() => {
    if (!tarjeta) return []
    const porPeriodo = new Map<string, { cuota: Cuota; compra: CompraCuotas }[]>()
    for (const par of cuotasConCompra) {
      const lista = porPeriodo.get(par.cuota.periodo) ?? []
      lista.push(par)
      porPeriodo.set(par.cuota.periodo, lista)
    }
    const resultado: ResumenPeriodo[] = []
    for (const [periodo, lista] of porPeriodo) {
      resultado.push(armarResumen(tarjeta, periodo, lista))
    }
    return resultado.sort((a, b) => a.periodo.localeCompare(b.periodo))
  }, [tarjeta, cuotasConCompra])
}

function armarResumen(tarjeta: TarjetaCredito, periodo: string, lista: { cuota: Cuota; compra: CompraCuotas }[]): ResumenPeriodo {
  const [year, month] = periodo.split('-').map(Number)
  const vencimiento = fechaVencimiento({ year, month: month - 1 }, tarjeta.diaCierre, tarjeta.diaVencimiento)
  const total = lista.reduce((acc, { cuota }) => acc + cuota.monto, 0)
  const estado = lista.length > 0 && lista.every(({ cuota }) => cuota.estado === 'pagada') ? 'pagada' : 'pendiente'
  const items: ItemResumen[] = lista
    .map(({ cuota, compra }) => ({
      compraId: compra.id,
      descripcion: compra.descripcion,
      numero: cuota.numero,
      cantidadCuotas: compra.cantidadCuotas,
      monto: cuota.monto,
      origenUsd: compra.origenUsd,
    }))
    .sort((a, b) => a.descripcion.localeCompare(b.descripcion))
  return { periodo, vencimiento: fechaLocalIso(vencimiento), total, estado, items }
}

export interface VentanaResumenes {
  resumenes: ResumenPeriodo[]
  indiceActual: number
}

/** Ventana de `meses` períodos para atrás y para adelante alrededor del período "actual"
 * (el que está acumulando consumos hoy, cuyo vencimiento es el próximo a pagar). Los meses
 * sin compras cargadas aparecen igual, en $0, para poder navegar el calendario completo. */
export function useVentanaResumenes(tarjeta: TarjetaCredito | undefined, meses = 6): VentanaResumenes {
  const cuotasConCompra = useCuotasConCompra(tarjeta)

  return useMemo(() => {
    if (!tarjeta) return { resumenes: [], indiceActual: meses }

    const porPeriodo = new Map<string, { cuota: Cuota; compra: CompraCuotas }[]>()
    for (const par of cuotasConCompra) {
      const lista = porPeriodo.get(par.cuota.periodo) ?? []
      lista.push(par)
      porPeriodo.set(par.cuota.periodo, lista)
    }

    const periodoActual = calcularPeriodoDeCompra(new Date(), tarjeta.diaCierre)
    const resumenes: ResumenPeriodo[] = []
    for (let offset = -meses; offset <= meses; offset++) {
      const p = addMonths(periodoActual, offset)
      const periodoStr = periodoToString(p)
      resumenes.push(armarResumen(tarjeta, periodoStr, porPeriodo.get(periodoStr) ?? []))
    }
    return { resumenes, indiceActual: meses }
  }, [tarjeta, cuotasConCompra, meses])
}

export { periodoToString }
