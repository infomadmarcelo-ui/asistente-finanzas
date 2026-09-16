import { db } from '../../db/db'
import { nowIso } from '../../lib/id'
import { desencriptarTexto, encriptarTexto } from './backupCrypto'

/**
 * Todo lo que se exporta en un backup. El candado (PIN/huella) queda afuera a
 * propósito: es específico de este dispositivo, y si restauran en otro equipo
 * van a crear su propio PIN ahí — mezclar el candado viejo sería confuso y no
 * aporta nada (la huella ni siquiera funcionaría en el hardware nuevo).
 */
const TABLAS_BACKUP = [
  'cuentas',
  'tarjetas',
  'categorias',
  'fuentesIngreso',
  'movimientos',
  'comprasCuotas',
  'cuotas',
  'cotizaciones',
  'vehiculos',
  'metasAhorro',
  'inversiones',
  'recordatorios',
  'recurrencias',
  'configApp',
] as const

const TIPO_ARCHIVO = 'asistente-backup'
const VERSION_BACKUP = 1

export interface ArchivoBackup {
  tipo: typeof TIPO_ARCHIVO
  version: number
  salt: string
  iv: string
  datos: string
}

export async function exportarBackup(password: string): Promise<Blob> {
  const contenido: Record<string, unknown[]> = {}
  for (const nombre of TABLAS_BACKUP) {
    contenido[nombre] = await db.table(nombre).toArray()
  }
  const paquete = JSON.stringify({ version: VERSION_BACKUP, exportadoEn: nowIso(), contenido })
  const cifrado = await encriptarTexto(paquete, password)
  const archivo: ArchivoBackup = { tipo: TIPO_ARCHIVO, version: VERSION_BACKUP, ...cifrado }
  return new Blob([JSON.stringify(archivo)], { type: 'application/json' })
}

export function nombreArchivoBackup(): string {
  return `asistente-backup-${nowIso().slice(0, 10)}.json`
}

export class ContrasenaIncorrectaError extends Error {}
export class ArchivoInvalidoError extends Error {}

/** Reemplaza TODOS los datos locales por los del backup. Es destructivo: hay que
 * confirmarlo con el usuario antes de llamar a esta función. */
export async function importarBackup(textoArchivo: string, password: string): Promise<void> {
  let archivo: ArchivoBackup
  try {
    archivo = JSON.parse(textoArchivo)
  } catch {
    throw new ArchivoInvalidoError('Ese archivo no tiene el formato esperado.')
  }
  if (archivo?.tipo !== TIPO_ARCHIVO || !archivo.salt || !archivo.iv || !archivo.datos) {
    throw new ArchivoInvalidoError('Ese archivo no es un backup de esta aplicación.')
  }

  let paquete: { contenido: Record<string, unknown[]> }
  try {
    const textoPlano = await desencriptarTexto(archivo, password)
    paquete = JSON.parse(textoPlano)
  } catch {
    throw new ContrasenaIncorrectaError('La contraseña no es correcta (o el archivo está dañado).')
  }

  const tablas = TABLAS_BACKUP.map((nombre) => db.table(nombre))
  await db.transaction('rw', tablas, async () => {
    for (const nombre of TABLAS_BACKUP) {
      const tabla = db.table(nombre)
      await tabla.clear()
      const filas = paquete.contenido[nombre]
      if (Array.isArray(filas) && filas.length > 0) await tabla.bulkAdd(filas)
    }
  })
}
