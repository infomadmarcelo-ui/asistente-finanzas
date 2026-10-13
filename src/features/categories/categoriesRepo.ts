import { db } from '../../db/db'
import type { Categoria, TipoCategoria } from '../../db/types'
import { newId, nowIso } from '../../lib/id'

export interface CategoriaInput {
  nombre: string
  tipo: TipoCategoria
  esFijo: boolean
}

export async function crearCategoria(input: CategoriaInput): Promise<string> {
  const categoria: Categoria = { id: newId(), ...input, archivada: false, actualizadoEn: nowIso() }
  await db.categorias.add(categoria)
  return categoria.id
}

export async function actualizarCategoria(id: string, input: CategoriaInput): Promise<void> {
  await db.categorias.update(id, { ...input, actualizadoEn: nowIso() })
}

export async function archivarCategoria(id: string): Promise<void> {
  await db.categorias.update(id, { archivada: true, actualizadoEn: nowIso() })
}

export async function desarchivarCategoria(id: string): Promise<void> {
  await db.categorias.update(id, { archivada: false, actualizadoEn: nowIso() })
}

const CATEGORIAS_POR_DEFECTO: (CategoriaInput & { id: string })[] = [
  { id: 'default-sueldo', nombre: 'Sueldo', tipo: 'ingreso', esFijo: true },
  { id: 'default-freelance', nombre: 'Freelance / changas', tipo: 'ingreso', esFijo: false },
  { id: 'default-otros-ingresos', nombre: 'Otros ingresos', tipo: 'ingreso', esFijo: false },
  { id: 'default-alquiler', nombre: 'Alquiler', tipo: 'gasto', esFijo: true },
  { id: 'default-servicios', nombre: 'Servicios (luz, gas, agua, internet)', tipo: 'gasto', esFijo: true },
  { id: 'default-comida', nombre: 'Comida', tipo: 'gasto', esFijo: false },
  { id: 'default-transporte', nombre: 'Transporte', tipo: 'gasto', esFijo: false },
  { id: 'default-salud', nombre: 'Salud', tipo: 'gasto', esFijo: false },
  { id: 'default-educacion', nombre: 'Educación', tipo: 'gasto', esFijo: false },
  { id: 'default-entretenimiento', nombre: 'Entretenimiento', tipo: 'gasto', esFijo: false },
  { id: 'default-ropa', nombre: 'Ropa', tipo: 'gasto', esFijo: false },
  { id: 'default-otros-gastos', nombre: 'Otros gastos', tipo: 'gasto', esFijo: false },
]

/** Carga categorías comunes la primera vez que se usa la app, para que
 * recordatorios, recurrencias y movimientos tengan algo para elegir desde el
 * principio. Solo actúa si todavía no existe ninguna categoría cargada.
 *
 * Usan ids fijos (no al azar) a propósito: si dos dispositivos todavía no
 * sincronizaron nunca, cada uno siembra sus categorías por defecto por su
 * cuenta, y necesitamos que representen "la misma" categoría (mismo id) para
 * que al sincronizar no termines con "Comida" duplicada. */
export async function sembrarCategoriasPorDefecto(): Promise<void> {
  // El chequeo y la escritura van en una única transacción: si esta función se
  // llama dos veces casi al mismo tiempo (el doble efecto de React en
  // desarrollo, o dos pestañas abiertas), Dexie serializa ambas transacciones
  // y la segunda ve que ya hay categorías, así que no intenta sembrarlas de
  // nuevo (lo que rompería con un id duplicado, al ser ids fijos).
  await db.transaction('rw', db.categorias, async () => {
    const hayAlguna = (await db.categorias.count()) > 0
    if (hayAlguna) return
    const ahora = nowIso()
    const categorias: Categoria[] = CATEGORIAS_POR_DEFECTO.map((c) => ({ ...c, archivada: false, actualizadoEn: ahora }))
    await db.categorias.bulkAdd(categorias)
  })
}
