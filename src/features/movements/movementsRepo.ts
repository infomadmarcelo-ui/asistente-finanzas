import { db } from '../../db/db'
import type { Dimension, Moneda, MovimientoGasto, MovimientoIngreso, MovimientoTransferencia } from '../../db/types'
import { newId, nowIso } from '../../lib/id'

export interface NuevoIngresoInput {
  fecha: string
  monto: number
  moneda: Moneda
  cuentaId: string
  categoriaId?: string
  fuenteIngresoId?: string
  descripcion?: string
  dimension?: Dimension
}

export async function crearIngreso(input: NuevoIngresoInput): Promise<void> {
  const ahora = nowIso()
  const movimiento: MovimientoIngreso = { id: newId(), tipo: 'ingreso', creadoEn: ahora, actualizadoEn: ahora, ...input }
  await db.movimientos.add(movimiento)
}

export async function actualizarIngreso(id: string, input: NuevoIngresoInput): Promise<void> {
  await db.movimientos.update(id, { tipo: 'ingreso', ...input, actualizadoEn: nowIso() })
}

export interface NuevoGastoInput {
  fecha: string
  monto: number
  moneda: Moneda
  cuentaId: string
  categoriaId?: string
  descripcion?: string
  dimension?: Dimension
}

export async function crearGasto(input: NuevoGastoInput): Promise<void> {
  const ahora = nowIso()
  const movimiento: MovimientoGasto = { id: newId(), tipo: 'gasto', creadoEn: ahora, actualizadoEn: ahora, ...input }
  await db.movimientos.add(movimiento)
}

export async function actualizarGasto(id: string, input: NuevoGastoInput): Promise<void> {
  await db.movimientos.update(id, { tipo: 'gasto', ...input, actualizadoEn: nowIso() })
}

export interface NuevaTransferenciaInput {
  fecha: string
  cuentaOrigenId: string
  cuentaDestinoId: string
  montoOrigen: number
  monedaOrigen: Moneda
  montoDestino: number
  monedaDestino: Moneda
  descripcion?: string
}

export async function crearTransferencia(input: NuevaTransferenciaInput): Promise<void> {
  const ahora = nowIso()
  const movimiento: MovimientoTransferencia = {
    id: newId(),
    tipo: 'transferencia',
    creadoEn: ahora,
    actualizadoEn: ahora,
    fecha: input.fecha,
    descripcion: input.descripcion,
    origen: { tipo: 'cuenta', cuentaId: input.cuentaOrigenId },
    destino: { tipo: 'cuenta', cuentaId: input.cuentaDestinoId },
    montoOrigen: input.montoOrigen,
    monedaOrigen: input.monedaOrigen,
    montoDestino: input.montoDestino,
    monedaDestino: input.monedaDestino,
  }
  await db.movimientos.add(movimiento)
}

export async function actualizarTransferencia(id: string, input: NuevaTransferenciaInput): Promise<void> {
  const cambios: Partial<MovimientoTransferencia> = {
    tipo: 'transferencia',
    fecha: input.fecha,
    descripcion: input.descripcion,
    origen: { tipo: 'cuenta', cuentaId: input.cuentaOrigenId },
    destino: { tipo: 'cuenta', cuentaId: input.cuentaDestinoId },
    montoOrigen: input.montoOrigen,
    monedaOrigen: input.monedaOrigen,
    montoDestino: input.montoDestino,
    monedaDestino: input.monedaDestino,
    actualizadoEn: nowIso(),
  }
  await db.movimientos.update(id, cambios)
}

/** Borra el movimiento de verdad (no es un archivado) y deja una "marca" de que
 * se borró, con la fecha. Esa marca es necesaria para sincronizar entre
 * dispositivos: sin ella, un movimiento borrado en un equipo podría "revivir"
 * al sincronizar con otro que todavía no se enteró del borrado. */
export async function eliminarMovimiento(id: string): Promise<void> {
  const eliminadoEn = nowIso()
  await db.transaction('rw', db.movimientos, db.movimientosEliminados, async () => {
    await db.movimientos.delete(id)
    await db.movimientosEliminados.put({ id, eliminadoEn })
  })
}
