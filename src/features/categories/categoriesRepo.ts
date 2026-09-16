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
