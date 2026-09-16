import { useState } from 'react'
import type { Moneda } from '../../db/types'
import { formatMoney } from '../../lib/money'

// Paleta categórica validada (orden fijo, nunca ciclado) — ver el skill de dataviz.
// Cada slot trae su propio par claro/oscuro para que el modo oscuro no sea un
// simple filtro, sino su propio paso de la misma rampa.
const SLOTS = [
  'bg-[#2a78d6] dark:bg-[#3987e5]', // azul
  'bg-[#eb6834] dark:bg-[#d95926]', // naranja
  'bg-[#1baf7a] dark:bg-[#199e70]', // aqua
  'bg-[#eda100] dark:bg-[#c98500]', // amarillo
  'bg-[#e87ba4] dark:bg-[#d55181]', // magenta
  'bg-[#008300] dark:bg-[#008300]', // verde
  'bg-[#4a3aa7] dark:bg-[#9085e9]', // violeta
  'bg-[#e34948] dark:bg-[#e66767]', // rojo
]
const OTROS_SLOT = 'bg-slate-400 dark:bg-slate-600'

export interface ItemDistribucion {
  id: string
  label: string
  value: number
  /** Slot de color asignado a esta entidad (estable, ver colorPorEntidad.ts). Ni el orden
   * de aparición ni el valor lo modifican: una misma entidad conserva su color siempre. */
  colorIndex: number
}

/** Barra apilada horizontal (part-to-whole) con su total. Si hay más de 8 ítems,
 * los más chicos se agrupan en "Otros" para no repetir colores. */
export function DistribucionBar({ items, moneda, titulo }: { items: ItemDistribucion[]; moneda: Moneda; titulo: string }) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null)

  const ordenados = [...items].filter((i) => i.value > 0).sort((a, b) => b.value - a.value)
  const visibles = ordenados.length > 8 ? ordenados.slice(0, 7) : ordenados
  const otros = ordenados.length > 8 ? ordenados.slice(7).reduce((acc, i) => acc + i.value, 0) : 0
  const segmentos: (ItemDistribucion & { esOtros?: boolean })[] =
    otros > 0 ? [...visibles, { id: '__otros__', label: 'Otros', value: otros, colorIndex: -1, esOtros: true }] : visibles

  const total = segmentos.reduce((acc, i) => acc + i.value, 0)

  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between">
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{titulo}</p>
        <p className="text-sm font-semibold">{formatMoney(total, moneda)}</p>
      </div>

      {total <= 0 ? (
        <p className="text-sm text-slate-400">Nada para mostrar todavía.</p>
      ) : (
        <>
          <div className="flex h-6 gap-[2px]">
            {segmentos.map((seg, i) => {
              const pct = (seg.value / total) * 100
              const claseColor = seg.esOtros ? OTROS_SLOT : SLOTS[seg.colorIndex % SLOTS.length]
              const esPrimero = i === 0
              const esUltimo = i === segmentos.length - 1
              return (
                <div
                  key={seg.id}
                  tabIndex={0}
                  role="img"
                  aria-label={`${seg.label}: ${formatMoney(seg.value, moneda)}, ${pct.toFixed(0)}% del total`}
                  className={`group relative outline-none ${claseColor} ${esPrimero ? 'rounded-l-[4px]' : ''} ${
                    esUltimo ? 'rounded-r-[4px]' : ''
                  } ${hoverIdx === i ? 'brightness-110' : ''} focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-indigo-400`}
                  style={{ width: `${pct}%` }}
                  onMouseEnter={() => setHoverIdx(i)}
                  onMouseLeave={() => setHoverIdx(null)}
                  onFocus={() => setHoverIdx(i)}
                  onBlur={() => setHoverIdx(null)}
                >
                  {hoverIdx === i && (
                    <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1.5 -translate-x-1/2 whitespace-nowrap rounded-md bg-slate-800 px-2 py-1 text-xs text-white shadow-lg dark:bg-slate-700">
                      <span className="font-semibold">{formatMoney(seg.value, moneda)}</span>{' '}
                      <span className="text-slate-300">
                        {seg.label} · {pct.toFixed(0)}%
                      </span>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          <ul className="mt-3 space-y-1">
            {segmentos.map((seg) => {
              const pct = (seg.value / total) * 100
              const claseColor = seg.esOtros ? OTROS_SLOT : SLOTS[seg.colorIndex % SLOTS.length]
              return (
                <li key={seg.id} className="flex items-center justify-between gap-2 text-sm">
                  <span className="flex min-w-0 items-center gap-2 text-slate-600 dark:text-slate-300">
                    <span className={`h-2.5 w-2.5 shrink-0 rounded-sm ${claseColor}`} />
                    <span className="truncate">{seg.label}</span>
                  </span>
                  <span className="shrink-0 text-slate-500 dark:text-slate-400">
                    {formatMoney(seg.value, moneda)} <span className="text-slate-400 dark:text-slate-500">({pct.toFixed(0)}%)</span>
                  </span>
                </li>
              )
            })}
          </ul>
        </>
      )}
    </div>
  )
}
