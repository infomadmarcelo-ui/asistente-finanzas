// Motor de fusión para la sincronización entre dispositivos (PC/celular) por
// WiFi local. Es "last write wins" (gana el más reciente) por registro, con dos
// excepciones que necesitan trato especial — ver fusionarMovimientos y
// fusionarCuotas más abajo. Todas las funciones acá son puras (sin IndexedDB,
// sin red) para poder razonarlas y probarlas con facilidad.
import type {
  Categoria,
  CompraCuotas,
  Cotizacion,
  Cuenta,
  Cuota,
  FuenteIngreso,
  Inversion,
  MetaAhorro,
  Movimiento,
  MovimientoEliminado,
  Recordatorio,
  Recurrencia,
  TarjetaCredito,
  Vehiculo,
} from '../../db/types'

interface ConActualizacion {
  id: string
  actualizadoEn?: string
}

function marca(x: ConActualizacion): number {
  const t = x.actualizadoEn ? Date.parse(x.actualizadoEn) : NaN
  // Un registro sin fecha (ej: restaurado de un backup viejo, de antes de esta
  // función) se trata como "lo más viejo posible": nunca le gana a uno que sí
  // tiene fecha, pero tampoco rompe la fusión.
  return Number.isFinite(t) ? t : 0
}

/** Fusión genérica "gana el más reciente" por id. Sirve para toda tabla donde
 * "borrar" es en realidad archivar (un campo más, no una fila que desaparece):
 * cuentas, tarjetas, categorías, vehículos, metas, inversiones, recordatorios,
 * recurrencias, compras en cuotas, cotización y fuentes de ingreso. */
export function fusionarPorId<T extends ConActualizacion>(local: T[], remoto: T[]): T[] {
  const resultado = new Map<string, T>()
  for (const item of local) resultado.set(item.id, item)
  for (const item of remoto) {
    const existente = resultado.get(item.id)
    if (!existente || marca(item) > marca(existente)) resultado.set(item.id, item)
  }
  return [...resultado.values()]
}

/** Las "marcas" de movimientos borrados se combinan quedándose con la fecha de
 * borrado más reciente para cada id (en la práctica casi nunca compiten: un
 * movimiento se borra una sola vez). */
export function fusionarEliminados(local: MovimientoEliminado[], remoto: MovimientoEliminado[]): MovimientoEliminado[] {
  const resultado = new Map<string, MovimientoEliminado>()
  for (const item of local) resultado.set(item.id, item)
  for (const item of remoto) {
    const existente = resultado.get(item.id)
    if (!existente || Date.parse(item.eliminadoEn) > Date.parse(existente.eliminadoEn)) resultado.set(item.id, item)
  }
  return [...resultado.values()]
}

/**
 * Los movimientos se borran de verdad (no se archivan), así que una fusión
 * ingenua por id podría "revivir" uno que se borró en un dispositivo pero
 * sigue estando en el otro porque todavía no se enteró. Por eso acá un
 * movimiento sobrevive solo si nadie lo borró, o si se modificó DESPUÉS de
 * que lo borraran en el otro lado (se interpreta como "lo quiso de vuelta").
 */
export function fusionarMovimientos(local: Movimiento[], remoto: Movimiento[], eliminadosFusionados: MovimientoEliminado[]): Movimiento[] {
  const fusionados = fusionarPorId(local, remoto)
  const tumbaPorId = new Map(eliminadosFusionados.map((e) => [e.id, e]))
  return fusionados.filter((m) => {
    const tumba = tumbaPorId.get(m.id)
    if (!tumba) return true
    return marca(m) > Date.parse(tumba.eliminadoEn)
  })
}

/**
 * Editar una compra en cuotas rehace su cronograma entero (borra las cuotas
 * viejas y genera unas nuevas con ids distintos) — no es una edición in-place.
 * Por eso las cuotas no se fusionan una por una: se agrupan por compra, y para
 * cada compra gana el cronograma completo del lado que lo tocó más reciente
 * (ya sea por una edición o por marcar una cuota como pagada). Así nunca quedan
 * mezcladas cuotas de un cronograma viejo con uno regenerado.
 */
export function fusionarCuotas(local: Cuota[], remoto: Cuota[]): Cuota[] {
  function agruparPorCompra(cuotas: Cuota[]): Map<string, Cuota[]> {
    const grupos = new Map<string, Cuota[]>()
    for (const c of cuotas) {
      const lista = grupos.get(c.compraId) ?? []
      lista.push(c)
      grupos.set(c.compraId, lista)
    }
    return grupos
  }
  function maxMarca(cuotas: Cuota[]): number {
    return cuotas.reduce((max, c) => Math.max(max, marca(c)), -Infinity)
  }

  const gruposLocal = agruparPorCompra(local)
  const gruposRemoto = agruparPorCompra(remoto)
  const compraIds = new Set([...gruposLocal.keys(), ...gruposRemoto.keys()])

  const resultado: Cuota[] = []
  for (const compraId of compraIds) {
    const cuotasLocal = gruposLocal.get(compraId) ?? []
    const cuotasRemoto = gruposRemoto.get(compraId) ?? []
    const ganaRemoto = maxMarca(cuotasRemoto) > maxMarca(cuotasLocal)
    resultado.push(...(ganaRemoto ? cuotasRemoto : cuotasLocal))
  }
  return resultado
}

/** Todo lo que se sincroniza entre dispositivos. Deliberadamente NO incluye
 * configAuth (el PIN/huella es de cada dispositivo) ni configApp (preferencias
 * locales como la ubicación del clima u el estado del asistente inicial). */
export interface SnapshotSync {
  cuentas: Cuenta[]
  tarjetas: TarjetaCredito[]
  categorias: Categoria[]
  fuentesIngreso: FuenteIngreso[]
  movimientos: Movimiento[]
  movimientosEliminados: MovimientoEliminado[]
  comprasCuotas: CompraCuotas[]
  cuotas: Cuota[]
  cotizaciones: Cotizacion[]
  vehiculos: Vehiculo[]
  metasAhorro: MetaAhorro[]
  inversiones: Inversion[]
  recordatorios: Recordatorio[]
  recurrencias: Recurrencia[]
}

/** Fusiona dos snapshots completos. Es determinística y simétrica: no importa
 * cuál se llama "local" y cuál "remoto", el resultado es el mismo — así cada
 * dispositivo puede calcularlo por su cuenta y llegar al mismo estado final. */
export function fusionarSnapshots(local: SnapshotSync, remoto: SnapshotSync): SnapshotSync {
  const eliminados = fusionarEliminados(local.movimientosEliminados, remoto.movimientosEliminados)
  return {
    cuentas: fusionarPorId(local.cuentas, remoto.cuentas),
    tarjetas: fusionarPorId(local.tarjetas, remoto.tarjetas),
    categorias: fusionarPorId(local.categorias, remoto.categorias),
    fuentesIngreso: fusionarPorId(local.fuentesIngreso, remoto.fuentesIngreso),
    movimientos: fusionarMovimientos(local.movimientos, remoto.movimientos, eliminados),
    movimientosEliminados: eliminados,
    comprasCuotas: fusionarPorId(local.comprasCuotas, remoto.comprasCuotas),
    cuotas: fusionarCuotas(local.cuotas, remoto.cuotas),
    cotizaciones: fusionarPorId(local.cotizaciones, remoto.cotizaciones),
    vehiculos: fusionarPorId(local.vehiculos, remoto.vehiculos),
    metasAhorro: fusionarPorId(local.metasAhorro, remoto.metasAhorro),
    inversiones: fusionarPorId(local.inversiones, remoto.inversiones),
    recordatorios: fusionarPorId(local.recordatorios, remoto.recordatorios),
    recurrencias: fusionarPorId(local.recurrencias, remoto.recurrencias),
  }
}

/** Cuántos registros quedaron distintos a como estaban antes de fusionar (nuevos,
 * editados o borrados), para poder mostrar algo como "se sincronizaron 12 cambios". */
export function contarCambios(antes: SnapshotSync, despues: SnapshotSync): number {
  let cambios = 0
  for (const clave of Object.keys(despues) as (keyof SnapshotSync)[]) {
    const antesPorId = new Map((antes[clave] as ConActualizacion[]).map((x) => [x.id, JSON.stringify(x)]))
    const despuesIds = new Set<string>()
    for (const item of despues[clave] as ConActualizacion[]) {
      despuesIds.add(item.id)
      if (antesPorId.get(item.id) !== JSON.stringify(item)) cambios++
    }
    for (const id of antesPorId.keys()) {
      if (!despuesIds.has(id)) cambios++
    }
  }
  return cambios
}
