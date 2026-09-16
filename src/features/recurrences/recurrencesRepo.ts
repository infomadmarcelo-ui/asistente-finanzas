import { db } from '../../db/db'
import type { Movimiento, Recurrencia } from '../../db/types'
import { fechaLocalIso, newId, nowIso } from '../../lib/id'
import { crearRecordatorio, actualizarRecordatorio } from '../reminders/remindersRepo'
import { fechaProgramada, recurrenciasPendientes } from './recurrenceEngine'

export interface RecurrenciaInput {
  concepto: string
  tipo: 'ingreso' | 'gasto'
  monto: number
  moneda: Recurrencia['moneda']
  categoriaId?: string
  cuentaId?: string
  frecuencia: 'mensual' | 'anual'
  diaDelMes: number
  mes?: number
  generarMovimiento: boolean
}

function tituloRecordatorio(input: RecurrenciaInput): string {
  return input.tipo === 'ingreso' ? `Cobrar ${input.concepto}` : `Pagar ${input.concepto}`
}

function fechaAncla(input: RecurrenciaInput): string {
  const hoy = new Date()
  return fechaLocalIso(fechaProgramada(input, hoy))
}

export async function crearRecurrencia(input: RecurrenciaInput): Promise<void> {
  const recordatorioId = await crearRecordatorio({
    titulo: tituloRecordatorio(input),
    tipo: 'vencimiento_pago',
    fecha: fechaAncla(input),
    frecuencia: input.frecuencia,
    antelacionDias: 3,
  })

  const recurrencia: Recurrencia = {
    id: newId(),
    ...input,
    activa: true,
    recordatorioId,
    creadoEn: nowIso(),
  }
  await db.recurrencias.add(recurrencia)
}

export async function actualizarRecurrencia(id: string, input: RecurrenciaInput): Promise<void> {
  const actual = await db.recurrencias.get(id)
  await db.recurrencias.update(id, input)
  if (actual?.recordatorioId) {
    await actualizarRecordatorio(actual.recordatorioId, {
      titulo: tituloRecordatorio(input),
      tipo: 'vencimiento_pago',
      fecha: fechaAncla(input),
      frecuencia: input.frecuencia,
      antelacionDias: 3,
    })
  }
}

export async function activarRecurrencia(id: string, activa: boolean): Promise<void> {
  await db.recurrencias.update(id, { activa })
}

/**
 * Revisa las recurrencias activas y carga los movimientos de las que ya llegaron a su
 * fecha y todavía no se generaron en este período. Se llama al abrir la app.
 *
 * Todo el chequeo y la escritura pasan DENTRO de una única transacción: si esta
 * función se dispara dos veces casi al mismo tiempo (p. ej. el doble efecto de
 * React en desarrollo), Dexie serializa ambas transacciones y la segunda vuelve
 * a leer el estado ya actualizado por la primera, así que no duplica nada.
 */
export async function procesarRecurrencias(): Promise<void> {
  await db.transaction('rw', db.recurrencias, db.movimientos, async () => {
    const recurrencias = await db.recurrencias.toArray()
    const pendientes = recurrenciasPendientes(recurrencias)

    for (const { recurrencia, periodo, fecha } of pendientes) {
      const actual = await db.recurrencias.get(recurrencia.id)
      if (!actual || actual.ultimoPeriodoGenerado === periodo) continue

      if (!recurrencia.cuentaId) {
        await db.recurrencias.update(recurrencia.id, { ultimoPeriodoGenerado: periodo })
        continue
      }
      const base = {
        id: newId(),
        fecha: fechaLocalIso(fecha),
        monto: recurrencia.monto,
        moneda: recurrencia.moneda,
        categoriaId: recurrencia.categoriaId,
        descripcion: recurrencia.concepto,
        creadoEn: nowIso(),
      }
      const movimiento: Movimiento =
        recurrencia.tipo === 'ingreso'
          ? { ...base, tipo: 'ingreso', cuentaId: recurrencia.cuentaId }
          : { ...base, tipo: 'gasto', cuentaId: recurrencia.cuentaId }
      await db.movimientos.add(movimiento)
      await db.recurrencias.update(recurrencia.id, { ultimoPeriodoGenerado: periodo })
    }
  })
}
