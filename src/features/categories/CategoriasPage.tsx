import { useLiveQuery } from 'dexie-react-hooks'
import { useState, type FormEvent } from 'react'
import { db } from '../../db/db'
import type { Categoria, TipoCategoria } from '../../db/types'
import { Button, Card, EmptyState, Field, Modal, Select, TextInput } from '../../components/ui'
import { actualizarCategoria, archivarCategoria, crearCategoria, desarchivarCategoria } from './categoriesRepo'

export function CategoriasPage() {
  const todasLasCategorias = useLiveQuery(() => db.categorias.toArray(), []) ?? []
  const [modalAbierto, setModalAbierto] = useState(false)
  const [categoriaEditando, setCategoriaEditando] = useState<Categoria | null>(null)
  const [verArchivadas, setVerArchivadas] = useState(false)

  const categorias = todasLasCategorias.filter((c) => !c.archivada)
  const archivadas = todasLasCategorias.filter((c) => c.archivada)
  const ingresos = categorias.filter((c) => c.tipo === 'ingreso')
  const gastos = categorias.filter((c) => c.tipo === 'gasto')

  function abrirEdicion(c: Categoria) {
    setCategoriaEditando(c)
    setModalAbierto(true)
  }

  function abrirNueva() {
    setCategoriaEditando(null)
    setModalAbierto(true)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Categorías</h1>
        <Button onClick={abrirNueva}>+ Nueva categoría</Button>
      </div>

      {categorias.length === 0 ? (
        <EmptyState
          icon="🏷️"
          title="Todavía no cargaste categorías"
          description="Las categorías te sirven para clasificar tus ingresos y gastos, por ejemplo: Sueldo, Comida, Transporte."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          <Card>
            <p className="mb-2 text-sm font-medium text-slate-500 dark:text-slate-400">Ingresos</p>
            <ul className="space-y-1">
              {ingresos.map((c) => (
                <ListaCategoriaItem key={c.id} categoria={c} onEditar={() => abrirEdicion(c)} onArchivar={() => archivarCategoria(c.id)} />
              ))}
              {ingresos.length === 0 && <p className="text-sm text-slate-400">Sin categorías de ingreso.</p>}
            </ul>
          </Card>
          <Card>
            <p className="mb-2 text-sm font-medium text-slate-500 dark:text-slate-400">Gastos</p>
            <ul className="space-y-1">
              {gastos.map((c) => (
                <ListaCategoriaItem key={c.id} categoria={c} onEditar={() => abrirEdicion(c)} onArchivar={() => archivarCategoria(c.id)} />
              ))}
              {gastos.length === 0 && <p className="text-sm text-slate-400">Sin categorías de gasto.</p>}
            </ul>
          </Card>
        </div>
      )}

      {archivadas.length > 0 && (
        <div className="pt-2">
          <button
            onClick={() => setVerArchivadas((v) => !v)}
            className="text-xs text-slate-400 underline decoration-dotted hover:text-slate-600 dark:hover:text-slate-300"
          >
            {verArchivadas ? 'Ocultar' : 'Ver'} categorías archivadas ({archivadas.length})
          </button>
          {verArchivadas && (
            <Card className="mt-2">
              <ul className="space-y-1">
                {archivadas.map((c) => (
                  <li key={c.id} className="flex items-center justify-between text-sm opacity-70">
                    <span>{c.nombre}</span>
                    <button onClick={() => desarchivarCategoria(c.id)} className="text-xs text-indigo-500 hover:text-indigo-400">
                      Restaurar
                    </button>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      )}

      <CategoriaFormModal
        open={modalAbierto}
        categoria={categoriaEditando}
        onClose={() => {
          setModalAbierto(false)
          setCategoriaEditando(null)
        }}
      />
    </div>
  )
}

function ListaCategoriaItem({
  categoria,
  onEditar,
  onArchivar,
}: {
  categoria: Categoria
  onEditar: () => void
  onArchivar: () => void
}) {
  return (
    <li className="flex items-center justify-between rounded-lg px-2 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-800">
      <button onClick={onEditar} className="flex-1 text-left">
        {categoria.nombre}
        {categoria.esFijo && (
          <span className="ml-2 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500 dark:bg-slate-800 dark:text-slate-400">fijo</span>
        )}
      </button>
      <button
        onClick={(e) => {
          e.stopPropagation()
          onArchivar()
        }}
        className="text-xs text-slate-400 hover:text-red-500"
      >
        Archivar
      </button>
    </li>
  )
}

function CategoriaFormModal({ open, categoria, onClose }: { open: boolean; categoria: Categoria | null; onClose: () => void }) {
  const esEdicion = !!categoria
  const [nombre, setNombre] = useState(categoria?.nombre ?? '')
  const [tipo, setTipo] = useState<TipoCategoria>(categoria?.tipo ?? 'gasto')
  const [esFijo, setEsFijo] = useState(categoria?.esFijo ?? false)
  const [guardando, setGuardando] = useState(false)

  const [estabaAbierto, setEstabaAbierto] = useState(open)
  if (open !== estabaAbierto) {
    setEstabaAbierto(open)
    if (open) {
      setNombre(categoria?.nombre ?? '')
      setTipo(categoria?.tipo ?? 'gasto')
      setEsFijo(categoria?.esFijo ?? false)
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!nombre.trim()) return
    setGuardando(true)
    try {
      const input = { nombre: nombre.trim(), tipo, esFijo }
      if (esEdicion && categoria) {
        await actualizarCategoria(categoria.id, input)
      } else {
        await crearCategoria(input)
      }
      onClose()
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={esEdicion ? 'Editar categoría' : 'Nueva categoría'}>
      <form onSubmit={onSubmit} className="space-y-4">
        <Field label="Nombre">
          <TextInput value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej: Comida" autoFocus />
        </Field>
        <Field label="Tipo">
          <Select value={tipo} onChange={(e) => setTipo(e.target.value as TipoCategoria)}>
            <option value="gasto">Gasto</option>
            <option value="ingreso">Ingreso</option>
          </Select>
        </Field>
        <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
          <input type="checkbox" checked={esFijo} onChange={(e) => setEsFijo(e.target.checked)} className="h-4 w-4" />
          Es un gasto/ingreso fijo (se repite todos los meses)
        </label>
        <Button type="submit" disabled={guardando} className="w-full">
          {guardando ? 'Guardando…' : esEdicion ? 'Guardar cambios' : 'Crear categoría'}
        </Button>
      </form>
    </Modal>
  )
}
