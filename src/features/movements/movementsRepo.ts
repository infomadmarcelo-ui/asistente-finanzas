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
  const movimiento: MovimientoIngreso = { id: newId(), tipo: 'ingreso', creadoEn: nowIso(), ...input }
  await db.movimientos.add(movimiento)
}

export async function actualizarIngreso(id: string, input: NuevoIngresoInput): Promise<void> {
  await db.movimientos.update(id, { tipo: 'ingreso', ...input })
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
  const movimiento: MovimientoGasto = { id: newId(), tipo: 'gasto', creadoEn: nowIso(), ...input }
  await db.movimientos.add(movimiento)
}

export async function actualizarGasto(id: string, input: NuevoGastoInput): Promise<void> {
  await db.movimientos.update(id, { tipo: 'gasto', ...input })
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
  const movimiento: MovimientoTransferencia = {
    id: newId(),
    tipo: 'transferencia',
    creadoEn: nowIso(),
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
  }
  await db.movimientos.update(id, cambios)
}

export async function eliminarMovimiento(id: string): Promise<void> {
  await db.movimientos.delete(id)
}
