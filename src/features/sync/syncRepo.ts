import { db } from '../../db/db'
import { contarCambios, fusionarSnapshots, type SnapshotSync } from './mergeEngine'

/** Mismas tablas que `SnapshotSync`: todo lo que se sincroniza entre dispositivos.
 * configAuth (PIN/huella) y configApp (preferencias locales) quedan afuera a propósito. */
const TABLAS_SYNC = [
  'cuentas',
  'tarjetas',
  'categorias',
  'fuentesIngreso',
  'movimientos',
  'movimientosEliminados',
  'comprasCuotas',
  'cuotas',
  'cotizaciones',
  'vehiculos',
  'metasAhorro',
  'inversiones',
  'recordatorios',
  'recurrencias',
] as const satisfies readonly (keyof SnapshotSync)[]

export async function leerSnapshot(): Promise<SnapshotSync> {
  const entradas = await Promise.all(TABLAS_SYNC.map(async (nombre) => [nombre, await db.table(nombre).toArray()] as const))
  return Object.fromEntries(entradas) as unknown as SnapshotSync
}

async function aplicarSnapshot(snapshot: SnapshotSync): Promise<void> {
  const tablas = TABLAS_SYNC.map((nombre) => db.table(nombre))
  await db.transaction('rw', tablas, async () => {
    for (const nombre of TABLAS_SYNC) {
      const tabla = db.table(nombre)
      await tabla.clear()
      const filas = snapshot[nombre]
      if (filas.length > 0) await tabla.bulkAdd(filas)
    }
  })
}

/**
 * Combina el snapshot local actual con uno recibido del otro dispositivo, guarda
 * el resultado localmente (reemplazando las tablas sincronizables) y devuelve
 * cuántos registros quedaron distintos a como estaban, para mostrarlo en la UI.
 */
export async function sincronizarConSnapshot(remoto: SnapshotSync): Promise<number> {
  const local = await leerSnapshot()
  const fusion = fusionarSnapshots(local, remoto)
  await aplicarSnapshot(fusion)
  return contarCambios(local, fusion)
}
