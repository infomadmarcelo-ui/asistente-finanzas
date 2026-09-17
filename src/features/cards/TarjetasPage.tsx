import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useState, type FormEvent } from 'react'
import { db } from '../../db/db'
import type { CompraCuotas, Cuenta, Moneda, TarjetaCredito } from '../../db/types'
import { Money } from '../../components/Money'
import { Button, Card, EmptyState, Field, Modal, Select, TextInput } from '../../components/ui'
import { useConfirm } from '../../components/ConfirmProvider'
import { nombreVisibleCuenta } from '../accounts/accountsRepo'
import { todayIso } from '../../lib/id'
import { crearCategoria } from '../categories/categoriesRepo'
import { useCotizacionOficial } from '../quotes/useCotizacion'
import { ResumenCarrusel } from './ResumenCarrusel'
import { actualizarCompraCuotas, actualizarTarjeta, crearCompraCuotas, crearTarjeta, hayCuotasPagadas } from './cardsRepo'
import { useUsoTarjetas, useVentanaResumenes } from './useTarjetas'

export function TarjetasPage() {
  const tarjetas = useLiveQuery(async () => (await db.tarjetas.toArray()).filter((t) => !t.archivada), []) ?? []
  const cuentas = useLiveQuery(async () => (await db.cuentas.toArray()).filter((c) => !c.archivada), []) ?? []
  const compras = useLiveQuery(() => db.comprasCuotas.toArray(), []) ?? []
  const uso = useUsoTarjetas()
  const [modalTarjeta, setModalTarjeta] = useState(false)
  const [tarjetaEditando, setTarjetaEditando] = useState<TarjetaCredito | null>(null)
  const [modalCompra, setModalCompra] = useState(false)
  const [compraEditando, setCompraEditando] = useState<CompraCuotas | null>(null)
  const [tarjetaExpandidaId, setTarjetaExpandidaId] = useState<string | null>(null)

  function abrirNuevaTarjeta() {
    setTarjetaEditando(null)
    setModalTarjeta(true)
  }

  function abrirEdicionTarjeta(t: TarjetaCredito) {
    setTarjetaEditando(t)
    setModalTarjeta(true)
  }

  function abrirNuevaCompra() {
    setCompraEditando(null)
    setModalCompra(true)
  }

  function abrirEdicionCompra(compraId: string) {
    const compra = compras.find((c) => c.id === compraId)
    if (compra) {
      setCompraEditando(compra)
      setModalCompra(true)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Tarjetas</h1>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={abrirNuevaTarjeta}>
            + Tarjeta
          </Button>
          <Button onClick={abrirNuevaCompra} disabled={tarjetas.length === 0}>
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
              onEditar={() => abrirEdicionTarjeta(t)}
              onEditarCompra={abrirEdicionCompra}
            />
          ))}
        </div>
      )}

      <TarjetaFormModal
        open={modalTarjeta}
        tarjeta={tarjetaEditando}
        cuentas={cuentas}
        onClose={() => {
          setModalTarjeta(false)
          setTarjetaEditando(null)
        }}
      />
      <CompraCuotasFormModal
        open={modalCompra}
        compra={compraEditando}
        tarjetas={tarjetas}
        onClose={() => {
          setModalCompra(false)
          setCompraEditando(null)
        }}
      />
    </div>
  )
}

function TarjetaItem({
  tarjeta,
  usoInfo,
  expandida,
  onToggle,
  onEditar,
  onEditarCompra,
}: {
  tarjeta: TarjetaCredito
  usoInfo?: { usado: number; disponible: number }
  expandida: boolean
  onToggle: () => void
  onEditar: () => void
  onEditarCompra: (compraId: string) => void
}) {
  const { resumenes, indiceActual } = useVentanaResumenes(expandida ? tarjeta : undefined)
  const usado = usoInfo?.usado ?? 0
  const disponible = usoInfo?.disponible ?? tarjeta.limite
  const porcentaje = tarjeta.limite > 0 ? Math.min(100, Math.round((usado / tarjeta.limite) * 100)) : 0

  return (
    <Card>
      <div className="flex items-start justify-between gap-2">
        <button onClick={onToggle} className="min-w-0 flex-1 text-left">
          <div className="flex items-center justify-between gap-2">
            <p className="font-medium">{tarjeta.nombre}</p>
            <span className="shrink-0 text-xs text-slate-400">
              Cierra el {tarjeta.diaCierre} · vence el {tarjeta.diaVencimiento}
            </span>
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
        <button
          onClick={(e) => {
            e.stopPropagation()
            onEditar()
          }}
          className="shrink-0 rounded p-1 text-xs text-slate-400 hover:bg-slate-100 hover:text-indigo-600 dark:hover:bg-slate-800"
          title="Editar tarjeta"
          aria-label="Editar tarjeta"
        >
          ✎
        </button>
      </div>

      {expandida && (
        <div className="mt-4 border-t border-slate-100 pt-3 dark:border-slate-800">
          <ResumenCarrusel
            resumenes={resumenes}
            indiceActual={indiceActual}
            tarjetaId={tarjeta.id}
            moneda={tarjeta.moneda}
            onEditarCompra={onEditarCompra}
          />
        </div>
      )}
    </Card>
  )
}

function TarjetaFormModal({
  open,
  tarjeta,
  onClose,
  cuentas,
}: {
  open: boolean
  tarjeta: TarjetaCredito | null
  onClose: () => void
  cuentas: Cuenta[]
}) {
  const esEdicion = !!tarjeta
  const [nombre, setNombre] = useState(tarjeta?.nombre ?? '')
  const [limite, setLimite] = useState(String(tarjeta?.limite ?? ''))
  const [moneda, setMoneda] = useState<Moneda>(tarjeta?.moneda ?? 'ARS')
  const [diaCierre, setDiaCierre] = useState(String(tarjeta?.diaCierre ?? '20'))
  const [diaVencimiento, setDiaVencimiento] = useState(String(tarjeta?.diaVencimiento ?? '10'))
  const [cuentaPagoId, setCuentaPagoId] = useState(tarjeta?.cuentaPagoId ?? cuentas[0]?.id ?? '')
  const [guardando, setGuardando] = useState(false)

  const [estabaAbierto, setEstabaAbierto] = useState(open)
  if (open !== estabaAbierto) {
    setEstabaAbierto(open)
    if (open) {
      setNombre(tarjeta?.nombre ?? '')
      setLimite(String(tarjeta?.limite ?? ''))
      setMoneda(tarjeta?.moneda ?? 'ARS')
      setDiaCierre(String(tarjeta?.diaCierre ?? '20'))
      setDiaVencimiento(String(tarjeta?.diaVencimiento ?? '10'))
      setCuentaPagoId(tarjeta?.cuentaPagoId ?? cuentas[0]?.id ?? '')
    }
  }

  // Las cuentas se cargan de forma asíncrona desde IndexedDB: si el modal ya
  // estaba montado cuando todavía no habían llegado, hay que completar la
  // selección apenas estén disponibles (si no, el submit queda bloqueado en silencio).
  useEffect(() => {
    if (!cuentaPagoId && cuentas.length > 0) setCuentaPagoId(cuentas[0].id)
  }, [cuentas, cuentaPagoId])

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!nombre.trim() || !cuentaPagoId) return
    setGuardando(true)
    try {
      const input = {
        nombre: nombre.trim(),
        limite: Number(limite) || 0,
        moneda,
        diaCierre: Number(diaCierre),
        diaVencimiento: Number(diaVencimiento),
        cuentaPagoId,
      }
      if (esEdicion && tarjeta) {
        await actualizarTarjeta(tarjeta.id, input)
      } else {
        await crearTarjeta(input)
      }
      onClose()
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={esEdicion ? 'Editar tarjeta' : 'Nueva tarjeta'}>
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
            {guardando ? 'Guardando…' : esEdicion ? 'Guardar cambios' : 'Crear tarjeta'}
          </Button>
        </form>
      )}
    </Modal>
  )
}

function CompraCuotasFormModal({
  open,
  compra,
  onClose,
  tarjetas,
}: {
  open: boolean
  compra: CompraCuotas | null
  onClose: () => void
  tarjetas: TarjetaCredito[]
}) {
  const esEdicion = !!compra
  const confirmar = useConfirm()
  const cotizacionOficial = useCotizacionOficial()
  const categorias = useLiveQuery(async () => (await db.categorias.toArray()).filter((c) => !c.archivada && c.tipo === 'gasto'), []) ?? []
  const [tarjetaId, setTarjetaId] = useState(compra?.tarjetaId ?? tarjetas[0]?.id ?? '')
  const [fecha, setFecha] = useState(compra?.fecha ?? todayIso())
  const [descripcion, setDescripcion] = useState(compra?.descripcion ?? '')
  const [montoTotal, setMontoTotal] = useState(String(compra?.montoTotal ?? ''))
  const [cantidadCuotas, setCantidadCuotas] = useState(String(compra?.cantidadCuotas ?? '1'))
  const [categoriaId, setCategoriaId] = useState(compra?.categoriaId ?? '')
  const [creandoCategoria, setCreandoCategoria] = useState(false)
  const [nombreNuevaCategoria, setNombreNuevaCategoria] = useState('')
  const [usaUsd, setUsaUsd] = useState(!!compra?.origenUsd)
  const [montoUsd, setMontoUsd] = useState(String(compra?.origenUsd?.montoUsd ?? ''))
  const [cotizacionUsd, setCotizacionUsd] = useState(String(compra?.origenUsd?.cotizacion ?? cotizacionOficial ?? ''))
  const [recargoPct, setRecargoPct] = useState(String(compra?.origenUsd?.recargoPct ?? 30))
  const [guardando, setGuardando] = useState(false)

  const [estabaAbierto, setEstabaAbierto] = useState(open)
  if (open !== estabaAbierto) {
    setEstabaAbierto(open)
    if (open) {
      setTarjetaId(compra?.tarjetaId ?? tarjetas[0]?.id ?? '')
      setFecha(compra?.fecha ?? todayIso())
      setDescripcion(compra?.descripcion ?? '')
      setMontoTotal(String(compra?.montoTotal ?? ''))
      setCantidadCuotas(String(compra?.cantidadCuotas ?? '1'))
      setCategoriaId(compra?.categoriaId ?? '')
      setCreandoCategoria(false)
      setUsaUsd(!!compra?.origenUsd)
      setMontoUsd(String(compra?.origenUsd?.montoUsd ?? ''))
      setCotizacionUsd(String(compra?.origenUsd?.cotizacion ?? cotizacionOficial ?? ''))
      setRecargoPct(String(compra?.origenUsd?.recargoPct ?? 30))
    }
  }

  const tarjeta = tarjetas.find((t) => t.id === tarjetaId) ?? tarjetas[0]
  // El gasto en USD solo tiene sentido si la tarjeta está en pesos (si no, ya se
  // carga directo en dólares con el campo normal de "Monto total").
  const mostrarUsd = usaUsd && tarjeta?.moneda === 'ARS'

  // Mientras el gasto se carga en USD, el monto total (en la moneda de la tarjeta) se
  // recalcula solo a partir del monto en dólares, la cotización y el recargo. Si el
  // usuario apaga el interruptor, "Monto total" vuelve a ser un campo manual normal.
  useEffect(() => {
    if (!mostrarUsd) return
    const usd = Number(montoUsd) || 0
    const cot = Number(cotizacionUsd) || 0
    const recargo = Number(recargoPct) || 0
    const total = usd * cot * (1 + recargo / 100)
    setMontoTotal(total > 0 ? String(Math.round(total * 100) / 100) : '')
  }, [mostrarUsd, montoUsd, cotizacionUsd, recargoPct])

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

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!tarjeta || !descripcion.trim() || !montoTotal) return
    setGuardando(true)
    try {
      const input = {
        tarjetaId: tarjeta.id,
        fecha,
        descripcion: descripcion.trim(),
        categoriaId: categoriaId || undefined,
        montoTotal: Number(montoTotal),
        moneda: tarjeta.moneda,
        cantidadCuotas: Math.max(1, Number(cantidadCuotas) || 1),
        origenUsd: mostrarUsd
          ? { montoUsd: Number(montoUsd) || 0, cotizacion: Number(cotizacionUsd) || 0, recargoPct: Number(recargoPct) || 0 }
          : undefined,
      }
      if (esEdicion && compra) {
        if (await hayCuotasPagadas(compra.id)) {
          const ok = await confirmar({
            titulo: 'Esta compra ya tiene cuotas pagadas',
            mensaje:
              'Al corregir el monto o la cantidad de cuotas se rearma todo el cronograma, así que las cuotas que ya estaban marcadas como pagadas van a volver a quedar pendientes. ¿Querés continuar?',
            textoConfirmar: 'Corregir igual',
          })
          if (!ok) return
        }
        await actualizarCompraCuotas(compra.id, input)
      } else {
        await crearCompraCuotas(input)
      }
      onClose()
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={esEdicion ? 'Editar compra' : 'Nueva compra'}>
      <form onSubmit={onSubmit} className="space-y-4">
        <Field label="Qué compraste">
          <TextInput value={descripcion} onChange={(e) => setDescripcion(e.target.value)} placeholder="Ej: Zapatillas" autoFocus />
        </Field>
        {tarjeta?.moneda === 'ARS' && (
          <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
            <input type="checkbox" checked={usaUsd} onChange={(e) => setUsaUsd(e.target.checked)} className="h-4 w-4" />
            Es un gasto en dólares (ej: suscripción del exterior)
          </label>
        )}

        {mostrarUsd ? (
          <>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Monto en USD">
                <TextInput type="number" step="0.01" value={montoUsd} onChange={(e) => setMontoUsd(e.target.value)} placeholder="0.00" />
              </Field>
              <Field label="Cotización del dólar">
                <TextInput type="number" step="0.01" value={cotizacionUsd} onChange={(e) => setCotizacionUsd(e.target.value)} />
              </Field>
            </div>
            <Field label="% de recargo total (Ganancias + impuestos)">
              <TextInput type="number" step="0.01" value={recargoPct} onChange={(e) => setRecargoPct(e.target.value)} />
            </Field>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Hoy el recargo por "dólar tarjeta" es 30% de percepción a cuenta de Ganancias sobre el dólar oficial. Si es un
              servicio digital del exterior (streaming, software, suscripciones) puede sumar 21% de IVA — ajustá el % según
              corresponda a tu caso (el viejo Impuesto PAÍS ya no existe). Con estos valores, el monto total en pesos es:
            </p>
            <p className="text-sm font-semibold">
              <Money monto={Number(montoTotal) || 0} moneda="ARS" />
            </p>
            <Field label="Cuotas">
              <TextInput type="number" min={1} value={cantidadCuotas} onChange={(e) => setCantidadCuotas(e.target.value)} />
            </Field>
          </>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <Field label="Monto total">
              <TextInput type="number" step="0.01" value={montoTotal} onChange={(e) => setMontoTotal(e.target.value)} placeholder="0.00" />
            </Field>
            <Field label="Cuotas">
              <TextInput type="number" min={1} value={cantidadCuotas} onChange={(e) => setCantidadCuotas(e.target.value)} />
            </Field>
          </div>
        )}
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
          {esEdicion && ' Si cambiás el monto o la cantidad de cuotas, se rearma todo el cronograma.'}
        </p>
        <Button type="submit" disabled={guardando} className="w-full">
          {guardando ? 'Guardando…' : esEdicion ? 'Guardar cambios' : 'Registrar compra'}
        </Button>
      </form>
    </Modal>
  )
}
