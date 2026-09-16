import { db } from '../../db/db'
import type { Inversion, Moneda, MovimientoTransferencia } from '../../db/types'
import { newId, nowIso, todayIso } from '../../lib/id'
import { crearRecordatorio } from '../reminders/remindersRepo'

export interface InversionInput {
  tipo: 'plazo_fijo' | 'otro'
  capital: number
  moneda: Moneda
  fechaInicio: string
  fechaVencimiento: string
  rendimiento: number
  cuentaOrigenId: string
}

function tituloInversion(input: InversionInput): string {
  const nombre = input.tipo === 'plazo_fijo' ? 'Plazo fijo' : 'Inversión'
  return `Vencimiento: ${nombre}`
}

/** Crear una inversión es una transferencia: la plata sale de la cuenta y "entra"
 * a la inversión. También arma el recordatorio de vencimiento. */
export async function crearInversion(input: InversionInput): Promise<void> {
  const id = newId()
  const ahora = nowIso()

  await crearRecordatorio({
    titulo: tituloInversion(input),
    tipo: 'vencimiento_pago',
    fecha: input.fechaVencimiento,
    frecuencia: 'unica',
    antelacionDias: 3,
  })

  const inversion: Inversion = { id, ...input, liquidada: false, creadoEn: ahora }

  const movimiento: MovimientoTransferencia = {
    id: newId(),
    tipo: 'transferencia',
    fecha: input.fechaInicio,
    descripcion: tituloInversion(input),
    origen: { tipo: 'cuenta', cuentaId: input.cuentaOrigenId },
    destino: { tipo: 'inversion', inversionId: id },
    montoOrigen: input.capital,
    monedaOrigen: input.moneda,
    montoDestino: input.capital,
    monedaDestino: input.moneda,
    creadoEn: ahora,
  }

  await db.transaction('rw', db.inversiones, db.movimientos, async () => {
    await db.inversiones.add(inversion)
    await db.movimientos.add(movimiento)
  })
}

/** Al vencer: la inversión devuelve capital + rendimiento a la cuenta de origen. */
export async function liquidarInversion(id: string): Promise<void> {
  const inversion = await db.inversiones.get(id)
  if (!inversion || inversion.liquidada) return

  const total = inversion.capital + inversion.rendimiento
  const ahora = nowIso()
  const movimiento: MovimientoTransferencia = {
    id: newId(),
    tipo: 'transferencia',
    fecha: todayIso(),
    descripcion: `${tituloInversion(inversion)} (liquidación)`,
    origen: { tipo: 'inversion', inversionId: id },
    destino: { tipo: 'cuenta', cuentaId: inversion.cuentaOrigenId },
    montoOrigen: total,
    monedaOrigen: inversion.moneda,
    montoDestino: total,
    monedaDestino: inversion.moneda,
    creadoEn: ahora,
  }

  await db.transaction('rw', db.inversiones, db.movimientos, async () => {
    await db.movimientos.add(movimiento)
    await db.inversiones.update(id, { liquidada: true })
  })
}
