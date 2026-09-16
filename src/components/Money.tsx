import { useState } from 'react'
import type { Moneda } from '../db/types'
import { formatMoney, usdToArs } from '../lib/money'
import { useCotizacionOficial } from '../features/quotes/useCotizacion'

/** Muestra un monto formateado. Si es USD, al pasar el mouse (o mantener presionado
 * en móvil) muestra el equivalente en ARS al tipo de cambio oficial. */
export function Money({ monto, moneda, className }: { monto: number; moneda: Moneda; className?: string }) {
  const cotizacion = useCotizacionOficial()
  const [mostrarTooltip, setMostrarTooltip] = useState(false)

  const texto = formatMoney(monto, moneda)

  if (moneda !== 'USD' || cotizacion == null) {
    return <span className={className}>{texto}</span>
  }

  const equivalente = formatMoney(usdToArs(monto, cotizacion), 'ARS')

  return (
    <span
      className={`relative inline-block cursor-help underline decoration-dotted ${className ?? ''}`}
      onMouseEnter={() => setMostrarTooltip(true)}
      onMouseLeave={() => setMostrarTooltip(false)}
      onTouchStart={() => setMostrarTooltip((v) => !v)}
    >
      {texto}
      {mostrarTooltip && (
        <span className="absolute bottom-full left-1/2 z-10 mb-1 -translate-x-1/2 whitespace-nowrap rounded-md bg-slate-800 px-2 py-1 text-xs text-white shadow-lg">
          ≈ {equivalente} (oficial)
        </span>
      )}
    </span>
  )
}
