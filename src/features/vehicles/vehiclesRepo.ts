import { db } from '../../db/db'
import type { Moneda, Vehiculo } from '../../db/types'
import { newId, nowIso } from '../../lib/id'

export interface VehiculoInput {
  marca: string
  modelo: string
  anio: number
  patente: string
  valorEstimado: number
  moneda: Moneda
  odometroActual: number
}

export async function crearVehiculo(input: VehiculoInput): Promise<void> {
  const ahora = nowIso()
  const vehiculo: Vehiculo = { id: newId(), ...input, archivado: false, creadoEn: ahora, actualizadoEn: ahora }
  await db.vehiculos.add(vehiculo)
}

export async function actualizarVehiculo(id: string, input: VehiculoInput): Promise<void> {
  await db.vehiculos.update(id, { ...input, actualizadoEn: nowIso() })
}

export async function archivarVehiculo(id: string): Promise<void> {
  await db.vehiculos.update(id, { archivado: true, actualizadoEn: nowIso() })
}

export async function desarchivarVehiculo(id: string): Promise<void> {
  await db.vehiculos.update(id, { archivado: false, actualizadoEn: nowIso() })
}

/** Sube el odómetro del vehículo si el nuevo valor es mayor al actual (nunca lo retrocede). */
export async function actualizarOdometroSiCorresponde(id: string, odometro: number): Promise<void> {
  const vehiculo = await db.vehiculos.get(id)
  if (vehiculo && odometro > vehiculo.odometroActual) {
    await db.vehiculos.update(id, { odometroActual: odometro, actualizadoEn: nowIso() })
  }
}
