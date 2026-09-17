import { db } from '../../db/db'
import type { Categoria, TipoCategoria } from '../../db/types'
import { newId } from '../../lib/id'

export interface CategoriaInput {
  nombre: string
  tipo: TipoCategoria
  esFijo: boolean
}

export async function crearCategoria(input: CategoriaInput): Promise<string> {
  const categoria: Categoria = { id: newId(), ...input, archivada: false }
  await db.categorias.add(categoria)
  return categoria.id
}

export async function actualizarCategoria(id: string, input: CategoriaInput): Promise<void> {
  await db.categorias.update(id, input)
}

export async function archivarCategoria(id: string): Promise<void> {
  await db.categorias.update(id, { archivada: true })
}

export async function desarchivarCategoria(id: string): Promise<void> {
  await db.categorias.update(id, { archivada: false })
}

const CATEGORIAS_POR_DEFECTO: CategoriaInput[] = [
  { nombre: 'Sueldo', tipo: 'ingreso', esFijo: true },
  { nombre: 'Freelance / changas', tipo: 'ingreso', esFijo: false },
  { nombre: 'Otros ingresos', tipo: 'ingreso', esFijo: false },
  { nombre: 'Alquiler', tipo: 'gasto', esFijo: true },
  { nombre: 'Servicios (luz, gas, agua, internet)', tipo: 'gasto', esFijo: true },
  { nombre: 'Comida', tipo: 'gasto', esFijo: false },
  { nombre: 'Transporte', tipo: 'gasto', esFijo: false },
  { nombre: 'Salud', tipo: 'gasto', esFijo: false },
  { nombre: 'Educación', tipo: 'gasto', esFijo: false },
  { nombre: 'Entretenimiento', tipo: 'gasto', esFijo: false },
  { nombre: 'Ropa', tipo: 'gasto', esFijo: false },
  { nombre: 'Otros gastos', tipo: 'gasto', esFijo: false },
]

/** Carga categorías comunes la primera vez que se usa la app, para que
 * recordatorios, recurrencias y movimientos tengan algo para elegir desde el
 * principio. Solo actúa si todavía no existe ninguna categoría cargada. */
export async function sembrarCategoriasPorDefecto(): Promise<void> {
  const hayAlguna = (await db.categorias.count()) > 0
  if (hayAlguna) return
  const categorias: Categoria[] = CATEGORIAS_POR_DEFECTO.map((c) => ({ id: newId(), ...c, archivada: false }))
  await db.categorias.bulkAdd(categorias)
}
