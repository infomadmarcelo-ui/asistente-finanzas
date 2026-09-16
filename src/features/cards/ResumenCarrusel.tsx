import { useEffect, useRef, useState } from 'react'
import type { Moneda } from '../../db/types'
import { Money } from '../../components/Money'
import { Button } from '../../components/ui'
import { pagarResumen } from './cardsRepo'
import type { ResumenPeriodo } from './useTarjetas'

function formatearPeriodo(periodo: string): string {
  const [year, month] = periodo.split('-').map(Number)
  const texto = new Date(year, month - 1, 1).toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })
  return texto.charAt(0).toUpperCase() + texto.slice(1)
}

export function ResumenCarrusel({
  resumenes,
  indiceActual,
  tarjetaId,
  moneda,
}: {
  resumenes: ResumenPeriodo[]
  indiceActual: number
  tarjetaId: string
  moneda: Moneda
}) {
  const contenedorRef = useRef<HTMLDivElement>(null)
  const [indiceVisible, setIndiceVisible] = useState(indiceActual)
  const yaCentro = useRef(false)

  // Al abrir el carrusel por primera vez, centrarlo de una en el período actual (sin animación).
  useEffect(() => {
    const el = contenedorRef.current
    if (!el || yaCentro.current) return
    yaCentro.current = true
    el.scrollLeft = indiceActual * el.clientWidth
  }, [indiceActual])

  function moverA(indice: number) {
    const el = contenedorRef.current
    if (!el) return
    const destino = Math.max(0, Math.min(resumenes.length - 1, indice))
    el.scrollTo({ left: destino * el.clientWidth, behavior: 'smooth' })
  }

  function onScroll() {
    const el = contenedorRef.current
    if (!el || el.clientWidth === 0) return
    setIndiceVisible(Math.round(el.scrollLeft / el.clientWidth))
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <button
          onClick={() => moverA(indiceVisible - 1)}
          disabled={indiceVisible <= 0}
          className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 disabled:opacity-30 dark:hover:bg-slate-800"
          aria-label="Mes anterior"
        >
          ‹
        </button>
        <p className="text-sm font-medium">
          {formatearPeriodo(resumenes[indiceVisible]?.periodo ?? '')}
          {indiceVisible === indiceActual && (
            <span className="ml-2 rounded bg-indigo-100 px-1.5 py-0.5 text-[10px] text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300">
              próximo vencimiento
            </span>
          )}
        </p>
        <button
          onClick={() => moverA(indiceVisible + 1)}
          disabled={indiceVisible >= resumenes.length - 1}
          className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 disabled:opacity-30 dark:hover:bg-slate-800"
          aria-label="Mes siguiente"
        >
          ›
        </button>
      </div>

      <div ref={contenedorRef} onScroll={onScroll} className="flex snap-x snap-mandatory overflow-x-auto scroll-smooth">
        {resumenes.map((r) => (
          <div key={r.periodo} className="w-full shrink-0 snap-center px-1">
            <div className="rounded-xl border border-slate-100 p-3 dark:border-slate-800">
              <div className="mb-2 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                <span>Vence {r.vencimiento}</span>
                {r.total > 0 &&
                  (r.estado === 'pagada' ? (
                    <span className="rounded bg-emerald-100 px-2 py-0.5 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300">Pagado</span>
                  ) : (
                    <span className="rounded bg-amber-100 px-2 py-0.5 text-amber-700 dark:bg-amber-900 dark:text-amber-300">Pendiente</span>
                  ))}
              </div>

              {r.items.length === 0 ? (
                <p className="py-3 text-center text-sm text-slate-400">Sin consumos en este período.</p>
              ) : (
                <ul className="mb-2 max-h-40 space-y-1 overflow-y-auto text-sm">
                  {r.items.map((item, i) => (
                    <li key={i} className="flex justify-between gap-2">
                      <span className="truncate text-slate-600 dark:text-slate-300">
                        {item.descripcion}
                        {item.cantidadCuotas > 1 && (
                          <span className="text-slate-400"> ({item.numero}/{item.cantidadCuotas})</span>
                        )}
                      </span>
                      <span className="shrink-0">
                        <Money monto={item.monto} moneda={moneda} />
                      </span>
                    </li>
                  ))}
                </ul>
              )}

              <div className="flex items-center justify-between border-t border-slate-100 pt-2 dark:border-slate-800">
                <span className="text-sm font-semibold">
                  Total: <Money monto={r.total} moneda={moneda} />
                </span>
                {r.total > 0 && r.estado === 'pendiente' && (
                  <Button variant="secondary" onClick={() => pagarResumen(tarjetaId, r.periodo)}>
                    Pagar resumen
                  </Button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
