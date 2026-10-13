import Dexie, { type EntityTable } from 'dexie'
import type {
  Categoria,
  Cotizacion,
  CompraCuotas,
  ConfigApp,
  ConfigAuth,
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
} from './types'

export class AsistenteDB extends Dexie {
  cuentas!: EntityTable<Cuenta, 'id'>
  tarjetas!: EntityTable<TarjetaCredito, 'id'>
  categorias!: EntityTable<Categoria, 'id'>
  fuentesIngreso!: EntityTable<FuenteIngreso, 'id'>
  movimientos!: EntityTable<Movimiento, 'id'>
  movimientosEliminados!: EntityTable<MovimientoEliminado, 'id'>
  comprasCuotas!: EntityTable<CompraCuotas, 'id'>
  cuotas!: EntityTable<Cuota, 'id'>
  cotizaciones!: EntityTable<Cotizacion, 'id'>
  vehiculos!: EntityTable<Vehiculo, 'id'>
  metasAhorro!: EntityTable<MetaAhorro, 'id'>
  inversiones!: EntityTable<Inversion, 'id'>
  recordatorios!: EntityTable<Recordatorio, 'id'>
  recurrencias!: EntityTable<Recurrencia, 'id'>
  configAuth!: EntityTable<ConfigAuth, 'id'>
  configApp!: EntityTable<ConfigApp, 'id'>

  constructor() {
    super('asistente-personal')

    // Nota: IndexedDB no admite booleanos como clave de índice, así que los
    // campos booleanos (archivada, activa, liquidada, etc.) no se indexan acá:
    // se filtran en memoria después de leer por un índice o el store entero.
    this.version(1).stores({
      cuentas: 'id',
      tarjetas: 'id, cuentaPagoId',
      categorias: 'id, tipo',
      fuentesIngreso: 'id',
      movimientos: 'id, tipo, fecha, categoriaId',
      comprasCuotas: 'id, tarjetaId, fecha',
      cuotas: 'id, compraId, periodo, estado',
      cotizaciones: 'id',
      vehiculos: 'id',
      metasAhorro: 'id, cuentaId',
      inversiones: 'id, cuentaOrigenId',
      recordatorios: 'id, tipo, fecha',
      recurrencias: 'id',
      configAuth: 'id',
      configApp: 'id',
    })

    // v2: agrega la tabla de "marcas" de movimientos borrados, necesaria para
    // que la sincronización entre dispositivos (PC/celular) respete un borrado
    // en vez de revivirlo. No toca ninguna tabla existente.
    this.version(2).stores({
      movimientosEliminados: 'id',
    })
  }
}

export const db = new AsistenteDB()
