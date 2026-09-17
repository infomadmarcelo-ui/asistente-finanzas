import { db } from '../../db/db'
import type { CompraCuotas, Moneda, MovimientoTransferencia, TarjetaCredito } from '../../db/types'
import { newId, nowIso, todayIso } from '../../lib/id'
import { generarCuotas } from './cardEngine'

export interface NuevaTarjetaInput {
  nombre: string
  limite: number
  moneda: Moneda
  diaCierre: number
  diaVencimiento: number
  cuentaPagoId: string
}

export async function crearTarjeta(input: NuevaTarjetaInput): Promise<void> {
  const tarjeta: TarjetaCredito = { id: newId(), ...input, archivada: false, creadoEn: nowIso() }
  await db.tarjetas.add(tarjeta)
}

export async function actualizarTarjeta(id: string, input: NuevaTarjetaInput): Promise<void> {
  await db.tarjetas.update(id, input)
}

export async function archivarTarjeta(id: string): Promise<void> {
  await db.tarjetas.update(id, { archivada: true })
}

export interface NuevaCompraCuotasInput {
  tarjetaId: string
  fecha: string
  descripcion: string
  categoriaId?: string
  montoTotal: number
  moneda: CompraCuotas['moneda']
  cantidadCuotas: number
  origenUsd?: { montoUsd: number; cotizacion: number; recargoPct: number }
}

export async function crearCompraCuotas(input: NuevaCompraCuotasInput): Promise<void> {
  const tarjeta = await db.tarjetas.get(input.tarjetaId)
  if (!tarjeta) throw new Error('Tarjeta no encontrada')

  const compra: CompraCuotas = {
    id: newId(),
    tarjetaId: input.tarjetaId,
    fecha: input.fecha,
    descripcion: input.descripcion,
    categoriaId: input.categoriaId,
    montoTotal: input.montoTotal,
    moneda: input.moneda,
    cantidadCuotas: input.cantidadCuotas,
    creadoEn: nowIso(),
    origenUsd: input.origenUsd,
  }
  const cuotas = generarCuotas(compra, tarjeta)

  await db.transaction('rw', db.comprasCuotas, db.cuotas, async () => {
    await db.comprasCuotas.add(compra)
    await db.cuotas.bulkAdd(cuotas)
  })
}

/** Si alguna cuota de la compra ya está pagada: editarla va a rehacer todo el
 * cronograma, así que conviene avisarle al usuario antes de perder ese estado. */
export async function hayCuotasPagadas(compraId: string): Promise<boolean> {
  const cuotas = await db.cuotas.where('compraId').equals(compraId).toArray()
  return cuotas.some((c) => c.estado === 'pagada')
}

/** Corrige una compra ya cargada (por ejemplo, si se cargó el valor de la cuota en vez
 * del total). Como el monto y la cantidad de cuotas pueden cambiar, se rehace todo el
 * cronograma de cuotas: cualquier cuota que ya estuviera pagada vuelve a quedar pendiente. */
export async function actualizarCompraCuotas(id: string, input: NuevaCompraCuotasInput): Promise<void> {
  const [compraExistente, tarjeta] = await Promise.all([db.comprasCuotas.get(id), db.tarjetas.get(input.tarjetaId)])
  if (!compraExistente) throw new Error('Compra no encontrada')
  if (!tarjeta) throw new Error('Tarjeta no encontrada')

  const compra: CompraCuotas = {
    ...compraExistente,
    tarjetaId: input.tarjetaId,
    fecha: input.fecha,
    descripcion: input.descripcion,
    categoriaId: input.categoriaId,
    montoTotal: input.montoTotal,
    moneda: input.moneda,
    cantidadCuotas: input.cantidadCuotas,
    origenUsd: input.origenUsd,
  }
  const cuotasNuevas = generarCuotas(compra, tarjeta)

  await db.transaction('rw', db.comprasCuotas, db.cuotas, async () => {
    await db.cuotas.where('compraId').equals(id).delete()
    await db.comprasCuotas.put(compra)
    await db.cuotas.bulkAdd(cuotasNuevas)
  })
}

/** Marca como pagadas todas las cuotas de una tarjeta que caen en un período (resumen) y
 * registra la transferencia desde la cuenta pagadora. */
export async function pagarResumen(tarjetaId: string, periodo: string): Promise<void> {
  const tarjeta = await db.tarjetas.get(tarjetaId)
  if (!tarjeta) throw new Error('Tarjeta no encontrada')

  const comprasDeLaTarjeta = await db.comprasCuotas.where('tarjetaId').equals(tarjetaId).toArray()
  const compraIds = new Set(comprasDeLaTarjeta.map((c) => c.id))

  const cuotasDelPeriodo = (await db.cuotas.where('periodo').equals(periodo).toArray()).filter(
    (c) => compraIds.has(c.compraId) && c.estado === 'pendiente',
  )
  if (cuotasDelPeriodo.length === 0) return

  const total = cuotasDelPeriodo.reduce((acc, c) => acc + c.monto, 0)
  const pagadaEn = nowIso()

  await db.transaction('rw', db.cuotas, db.movimientos, async () => {
    await Promise.all(
      cuotasDelPeriodo.map((c) => db.cuotas.update(c.id, { estado: 'pagada', pagadaEn })),
    )
    const movimiento: MovimientoTransferencia = {
      id: newId(),
      tipo: 'transferencia',
      fecha: todayIso(),
      descripcion: `Pago resumen ${tarjeta.nombre} (${periodo})`,
      origen: { tipo: 'cuenta', cuentaId: tarjeta.cuentaPagoId },
      destino: { tipo: 'tarjeta', tarjetaId: tarjeta.id },
      montoOrigen: total,
      monedaOrigen: tarjeta.moneda,
      montoDestino: total,
      monedaDestino: tarjeta.moneda,
      creadoEn: pagadaEn,
    }
    await db.movimientos.add(movimiento)
  })
}

export interface UsoTarjeta {
  usado: number
  disponible: number
}

export function calcularUsoTarjeta(tarjeta: TarjetaCredito, cuotasPendientes: { monto: number }[]): UsoTarjeta {
  const usado = cuotasPendientes.reduce((acc, c) => acc + c.monto, 0)
  return { usado, disponible: tarjeta.limite - usado }
}
