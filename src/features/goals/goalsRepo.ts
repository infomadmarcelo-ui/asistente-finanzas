import { db } from '../../db/db'
import type { MetaAhorro, Moneda } from '../../db/types'
import { newId, nowIso } from '../../lib/id'

export interface MetaAhorroInput {
  nombre: string
  moneda: Moneda
  montoObjetivo: number
  fechaObjetivo?: string
  cuentaId: string
}

export async function crearMeta(input: MetaAhorroInput): Promise<void> {
  const ahora = nowIso()
  const meta: MetaAhorro = { id: newId(), ...input, archivada: false, creadoEn: ahora, actualizadoEn: ahora }
  await db.metasAhorro.add(meta)
}

export async function actualizarMeta(id: string, input: MetaAhorroInput): Promise<void> {
  await db.metasAhorro.update(id, { ...input, actualizadoEn: nowIso() })
}

export async function archivarMeta(id: string): Promise<void> {
  await db.metasAhorro.update(id, { archivada: true, actualizadoEn: nowIso() })
}

export async function desarchivarMeta(id: string): Promise<void> {
  await db.metasAhorro.update(id, { archivada: false, actualizadoEn: nowIso() })
}
