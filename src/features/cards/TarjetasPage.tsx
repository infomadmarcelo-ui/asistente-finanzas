import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useState, type FormEvent } from 'react'
import { db } from '../../db/db'
import type { Cuenta, Moneda, TarjetaCredito } from '../../db/types'
import { Money } from '../../components/Money'
import { Button, Card, EmptyState, Field, Modal, Select, TextInput } from '../../components/ui'
import { nombreVisibleCuenta } from '../accounts/accountsRepo'
import { todayIso } from '../../lib/id'
import { crearCategoria } from '../categories/categoriesRepo'
import { ResumenCarrusel } from './ResumenCarrusel'
import { crearCompraCuotas, crearTarjeta } from './cardsRepo'
import { useUsoTarjetas, useVentanaResumenes } from './useTarjetas'

export function TarjetasPage() {
  const tarjetas = useLiveQuery(async () => (await db.tarjetas.toArray()).filter((t) => !t.archivada), []) ?? []
  const cuentas = useLiveQuery(async () => (await db.cuentas.toArray()).filter((c) => !c.archivada), []) ?? []
  const uso = useUsoTarjetas()
  const [modalTarjeta, setModalTarjeta] = useState(false)
  const [modalCompra, setModalCompra] = useState(false)
  const [tarjetaExpandidaId, setTarjetaExpandidaId] = useState<string | null>(null)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Tarjetas</h1>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setModalTarjeta(true)}>
            + Tarjeta
          </Button>
          <Button onClick={() => setModalCompra(true)} disabled={tarjetas.length === 0}>
            + Compra en cuotas
          </Button>
        </div>
      </div>

      {tarjetas.length === 0 ? (
        <EmptyState icon="💳" title="Todavía no cargaste tarjetas" description="Agregá tu tarjeta con su límite, día de cierre y día de vencimiento." />
      ) : (
        <div className="space-y-3">
          {tarjetas.map((t) => (
            <TarjetaItem
              key={t.id}
              tarjeta={t}
              usoInfo={uso.get(t.id)}
              expandida={tarjetaExpandidaId === t.id}
              onToggle={() => setTarjetaExpandidaId(tarjetaExpandidaId === t.id ? null : t.id)}
            />
          ))}
        </div>
      )}

      <NuevaTarjetaModal open={modalTarjeta} onClose={() => setModalTarjeta(false)} cuentas={cuentas} />
      <NuevaCompraCuotasModal open={modalCompra} onClose={() => setModalCompra(false)} tarjetas={tarjetas} />
    </div>
  )
}

function TarjetaItem({
  tarjeta,
  usoInfo,
  expandida,
  onToggle,
}: {
  tarjeta: TarjetaCredito
  usoInfo?: { usado: number; disponible: number }
  expandida: boolean
  onToggle: () => void
}) {
  const { resumenes, indiceActual } = useVentanaResumenes(expandida ? tarjeta : undefined)
  const usado = usoInfo?.usado ?? 0
  const disponible = usoInfo?.disponible ?? tarjeta.limite
  const porcentaje = tarjeta.limite > 0 ? Math.min(100, Math.round((usado / tarjeta.limite) * 100)) : 0

  return (
    <Card>
      <button onClick={onToggle} className="w-full text-left">
        <div className="flex items-center justify-between">
          <p className="font-medium">{tarjeta.nombre}</p>
          <span className="text-xs text-slate-400">Cierra el {tarjeta.diaCierre} · vence el {tarjeta.diaVencimiento}</span>
        </div>
        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
          <div className="h-full bg-indigo-600" style={{ width: `${porcentaje}%` }} />
        </div>
        <div className="mt-1 flex justify-between text-sm">
          <span>
            Usado: <Money monto={usado} moneda={tarjeta.moneda} />
          </span>
          <span className="text-slate-500 dark:text-slate-400">
            Disponible: <Money monto={disponible} moneda={tarjeta.moneda} />
          </span>
        </div>
      </button>

      {expandida && (
        <div className="mt-4 border-t border-slate-100 pt-3 dark:border-slate-800">
          <ResumenCarrusel resumenes={resumenes} indiceActual={indiceActual} tarjetaId={tarjeta.id} moneda={tarjeta.moneda} />
        </div>
      )}
    </Card>
  )
}

function NuevaTarjetaModal({ open, onClose, cuentas }: { open: boolean; onClose: () => void; cuentas: Cuenta[] }) {
  const [nombre, setNombre] = useState('')
  const [limite, setLimite] = useState('')
  const [moneda, setMoneda] = useState<Moneda>('ARS')
  const [diaCierre, setDiaCierre] = useState('20')
  const [diaVencimiento, setDiaVencimiento] = useState('10')
  const [cuentaPagoId, setCuentaPagoId] = useState(cuentas[0]?.id ?? '')
  const [guardando, setGuardando] = useState(false)

  // Las cuentas se cargan de forma asíncrona desde IndexedDB: si el modal ya
  // estaba montado cuando todavía no habían llegado, hay que completar la
  // selección apenas estén disponibles (si no, el submit queda bloqueado en silencio).
  useEffect(() => {
    if (!cuentaPagoId && cuentas.length > 0) setCuentaPagoId(cuentas[0].id)
  }, [cuentas, cuentaPagoId])

  function limpiarYcerrar() {
    setNombre('')
    setLimite('')
    setDiaCierre('20')
    setDiaVencimiento('10')
    onClose()
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!nombre.trim() || !cuentaPagoId) return
    setGuardando(true)
    try {
      await crearTarjeta({
        nombre: nombre.trim(),
        limite: Number(limite) || 0,
        moneda,
        diaCierre: Number(diaCierre),
        diaVencimiento: Number(diaVencimiento),
        cuentaPagoId,
      })
      limpiarYcerrar()
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Modal open={open} onClose={limpiarYcerrar} title="Nueva tarjeta">
      {cuentas.length === 0 ? (
        <p className="text-sm text-slate-500">Primero creá una cuenta: la vas a necesitar para indicar con qué se paga el resumen.</p>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4">
          <Field label="Nombre">
            <TextInput value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej: Visa Santander" autoFocus />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Límite">
              <TextInput type="number" step="0.01" value={limite} onChange={(e) => setLimite(e.target.value)} />
            </Field>
            <Field label="Moneda">
              <Select value={moneda} onChange={(e) => setMoneda(e.target.value as Moneda)}>
                <option value="ARS">ARS</option>
                <option value="USD">USD</option>
              </Select>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Día de cierre">
              <TextInput type="number" min={1} max={31} value={diaCierre} onChange={(e) => setDiaCierre(e.target.value)} />
            </Field>
            <Field label="Día de vencimiento">
              <TextInput type="number" min={1} max={31} value={diaVencimiento} onChange={(e) => setDiaVencimiento(e.target.value)} />
            </Field>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            El <strong>cierre</strong> es el día hasta el que se acumulan los consumos de un resumen; el <strong>vencimiento</strong> es cuando hay que pagarlo.
          </p>
          <Field label="Se paga con">
            <Select value={cuentaPagoId} onChange={(e) => setCuentaPagoId(e.target.value)}>
              {cuentas.map((c) => (
                <option key={c.id} value={c.id}>
                  {nombreVisibleCuenta(c).titulo}
                </option>
              ))}
            </Select>
          </Field>
          <Button type="submit" disabled={guardando} className="w-full">
            {guardando ? 'Guardando…' : 'Crear tarjeta'}
          </Button>
        </form>
      )}
    </Modal>
  )
}

function NuevaCompraCuotasModal({ open, onClose, tarjetas }: { open: boolean; onClose: () => void; tarjetas: TarjetaCredito[] }) {
  const categorias = useLiveQuery(async () => (await db.categorias.toArray()).filter((c) => !c.archivada && c.tipo === 'gasto'), []) ?? []
  const [tarjetaId, setTarjetaId] = useState(tarjetas[0]?.id ?? '')
  const [fecha, setFecha] = useState(todayIso())
  const [descripcion, setDescripcion] = useState('')
  const [montoTotal, setMontoTotal] = useState('')
  const [cantidadCuotas, setCantidadCuotas] = useState('1')
  const [categoriaId, setCategoriaId] = useState('')
  const [creandoCategoria, setCreandoCategoria] = useState(false)
  const [nombreNuevaCategoria, setNombreNuevaCategoria] = useState('')
  const [guardando, setGuardando] = useState(false)

  function onCambiarCategoria(valor: string) {
    if (valor === '__nueva__') {
      setCreandoCategoria(true)
      return
    }
    setCategoriaId(valor)
  }

  async function agregarCategoriaInline() {
    const nombre = nombreNuevaCategoria.trim()
    if (!nombre) return
    const id = await crearCategoria({ nombre, tipo: 'gasto', esFijo: false })
    setCategoriaId(id)
    setNombreNuevaCategoria('')
    setCreandoCategoria(false)
  }

  const tarjeta = tarjetas.find((t) => t.id === tarjetaId) ?? tarjetas[0]

  function limpiarYcerrar() {
    setFecha(todayIso())
    setDescripcion('')
    setMontoTotal('')
    setCantidadCuotas('1')
    onClose()
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!tarjeta || !descripcion.trim() || !montoTotal) return
    setGuardando(true)
    try {
      await crearCompraCuotas({
        tarjetaId: tarjeta.id,
        fecha,
        descripcion: descripcion.trim(),
        categoriaId: categoriaId || undefined,
        montoTotal: Number(montoTotal),
        moneda: tarjeta.moneda,
        cantidadCuotas: Math.max(1, Number(cantidadCuotas) || 1),
      })
      limpiarYcerrar()
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Modal open={open} onClose={limpiarYcerrar} title="Nueva compra">
      <form onSubmit={onSubmit} className="space-y-4">
        <Field label="Qué compraste">
          <TextInput value={descripcion} onChange={(e) => setDescripcion(e.target.value)} placeholder="Ej: Zapatillas" autoFocus />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Monto total">
            <TextInput type="number" step="0.01" value={montoTotal} onChange={(e) => setMontoTotal(e.target.value)} placeholder="0.00" />
          </Field>
          <Field label="Cuotas">
            <TextInput type="number" min={1} value={cantidadCuotas} onChange={(e) => setCantidadCuotas(e.target.value)} />
          </Field>
        </div>
        <Field label="Tarjeta">
          <Select value={tarjetaId} onChange={(e) => setTarjetaId(e.target.value)}>
            {tarjetas.map((t) => (
              <option key={t.id} value={t.id}>
                {t.nombre}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Fecha de compra">
          <TextInput type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
        </Field>
        <Field label="Categoría (opcional)">
          {creandoCategoria ? (
            <div className="flex gap-2">
              <TextInput
                value={nombreNuevaCategoria}
                onChange={(e) => setNombreNuevaCategoria(e.target.value)}
                placeholder="Nombre de la categoría"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    agregarCategoriaInline()
                  }
                }}
              />
              <Button type="button" onClick={agregarCategoriaInline}>
                Agregar
              </Button>
              <Button type="button" variant="secondary" onClick={() => setCreandoCategoria(false)}>
                Cancelar
              </Button>
            </div>
          ) : (
            <Select value={categoriaId} onChange={(e) => onCambiarCategoria(e.target.value)}>
              <option value="">Sin categoría</option>
              {categorias.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
              <option value="__nueva__">+ Nueva categoría…</option>
            </Select>
          )}
        </Field>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Si la pagaste en un solo pago, dejá "Cuotas" en 1. La app arma el cronograma sola.
        </p>
        <Button type="submit" disabled={guardando} className="w-full">
          {guardando ? 'Guardando…' : 'Registrar compra'}
        </Button>
      </form>
    </Modal>
  )
}
