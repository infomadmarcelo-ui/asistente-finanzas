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
  const meta: MetaAhorro = { id: newId(), ...input, archivada: false, creadoEn: nowIso() }
  await db.metasAhorro.add(meta)
}

export async function actualizarMeta(id: string, input: MetaAhorroInput): Promise<void> {
  await db.metasAhorro.update(id, input)
}

export async function archivarMeta(id: string): Promise<void> {
  await db.metasAhorro.update(id, { archivada: true })
}

export async function desarchivarMeta(id: string): Promise<void> {
  await db.metasAhorro.update(id, { archivada: false })
}
