import { db } from '../../db/db'
import type { Moneda, MovimientoGasto, Vehiculo } from '../../db/types'
import { newId, nowIso } from '../../lib/id'

const CATEGORIA_COMBUSTIBLE = 'Combustible'

async function idCategoriaCombustible(): Promise<string> {
  const existente = await db.categorias.filter((c) => !c.archivada && c.tipo === 'gasto' && c.nombre === CATEGORIA_COMBUSTIBLE).first()
  if (existente) return existente.id
  const id = newId()
  await db.categorias.add({ id, nombre: CATEGORIA_COMBUSTIBLE, tipo: 'gasto', esFijo: false, archivada: false })
  return id
}

export interface CargaCombustibleInput {
  vehiculoId: string
  fecha: string
  monto: number
  moneda: Moneda
  litros: number
  odometro: number
  cuentaId: string
}

/** Registra una carga de combustible como un gasto normal, etiquetado con el vehículo
 * y con litros/odómetro para poder calcular consumo entre cargas. */
export async function cargarCombustible(input: CargaCombustibleInput): Promise<void> {
  const categoriaId = await idCategoriaCombustible()
  const movimiento: MovimientoGasto = {
    id: newId(),
    tipo: 'gasto',
    fecha: input.fecha,
    monto: input.monto,
    moneda: input.moneda,
    cuentaId: input.cuentaId,
    categoriaId,
    descripcion: CATEGORIA_COMBUSTIBLE,
    dimension: { tipo: 'vehiculo', id: input.vehiculoId },
    litros: input.litros,
    odometro: input.odometro,
    creadoEn: nowIso(),
  }
  await db.movimientos.add(movimiento)
  await actualizarOdometroSiCorresponde(input.vehiculoId, input.odometro)
}

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
  const vehiculo: Vehiculo = { id: newId(), ...input, archivado: false, creadoEn: nowIso() }
  await db.vehiculos.add(vehiculo)
}

export async function actualizarVehiculo(id: string, input: VehiculoInput): Promise<void> {
  await db.vehiculos.update(id, input)
}

export async function archivarVehiculo(id: string): Promise<void> {
  await db.vehiculos.update(id, { archivado: true })
}

export async function desarchivarVehiculo(id: string): Promise<void> {
  await db.vehiculos.update(id, { archivado: false })
}

/** Sube el odómetro del vehículo si el nuevo valor es mayor al actual (nunca lo retrocede). */
export async function actualizarOdometroSiCorresponde(id: string, odometro: number): Promise<void> {
  const vehiculo = await db.vehiculos.get(id)
  if (vehiculo && odometro > vehiculo.odometroActual) {
    await db.vehiculos.update(id, { odometroActual: odometro })
  }
}
