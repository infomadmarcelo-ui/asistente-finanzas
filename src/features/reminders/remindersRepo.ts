import { db } from '../../db/db'
import type { FrecuenciaRecurrencia, Recordatorio, TipoRecordatorio } from '../../db/types'
import { newId, nowIso } from '../../lib/id'

export interface RecordatorioInput {
  titulo: string
  tipo: TipoRecordatorio
  frecuencia: FrecuenciaRecurrencia
  antelacionDias: number
  /** Recordatorio por fecha. */
  fecha?: string
  /** Recordatorio por kilómetros (mantenimiento de vehículo). */
  vehiculoId?: string
  condicionKm?: number
  antelacionKm?: number
}

export async function crearRecordatorio(input: RecordatorioInput): Promise<string> {
  const recordatorio: Recordatorio = {
    id: newId(),
    ...input,
    completado: false,
    archivado: false,
    creadoEn: nowIso(),
  }
  await db.recordatorios.add(recordatorio)
  return recordatorio.id
}

export async function actualizarRecordatorio(id: string, input: RecordatorioInput): Promise<void> {
  await db.recordatorios.update(id, input)
}

export async function marcarCompletado(id: string, completado: boolean): Promise<void> {
  await db.recordatorios.update(id, { completado })
}

export async function archivarRecordatorio(id: string): Promise<void> {
  await db.recordatorios.update(id, { archivado: true })
}

export async function desarchivarRecordatorio(id: string): Promise<void> {
  await db.recordatorios.update(id, { archivado: false })
}
