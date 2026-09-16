import { useMemo, useState } from 'react'
import type { Moneda } from '../../db/types'
import { Card } from '../../components/ui'
import { DistribucionBar } from '../../components/charts/DistribucionBar'
import { asignarColorPorEntidad } from '../../components/charts/colorPorEntidad'
import { formatMoney } from '../../lib/money'
import { useResumenMensual } from './useResumenMensual'

function periodoConOffset(offset: number): { periodo: string; etiqueta: string } {
  const hoy = new Date()
  const total = hoy.getFullYear() * 12 + hoy.getMonth() + offset
  const year = Math.floor(total / 12)
  const month = ((total % 12) + 12) % 12
  const periodo = `${year}-${String(month + 1).padStart(2, '0')}`
  const texto = new Date(year, month, 1).toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })
  return { periodo, etiqueta: texto.charAt(0).toUpperCase() + texto.slice(1) }
}

export function ResumenMensualPage() {
  const [offset, setOffset] = useState(0)
  const [vista, setVista] = useState<Moneda>('ARS')
  const { periodo, etiqueta } = periodoConOffset(offset)
  const resumen = useResumenMensual(periodo)

  const colorPorId = useMemo(
    () => asignarColorPorEntidad([...resumen.gastosPorCategoria, ...resumen.ingresosPorCategoria].map((i) => ({ id: i.categoriaId }))),
    [resumen],
  )

  const itemsGastos = resumen.gastosPorCategoria
    .filter((i) => i.moneda === vista)
    .map((i) => ({ id: i.categoriaId, label: i.nombre, value: i.monto, colorIndex: colorPorId.get(i.categoriaId) ?? 0 }))

  const itemsIngresos = resumen.ingresosPorCategoria
    .filter((i) => i.moneda === vista)
    .map((i) => ({ id: i.categoriaId, label: i.nombre, value: i.monto, colorIndex: colorPorId.get(i.categoriaId) ?? 0 }))

  const ahorro = resumen.ahorroPorMoneda[vista]

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Resumen mensual</h1>

      <div className="flex items-center justify-between">
        <button onClick={() => setOffset(offset - 1)} className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
          ‹
        </button>
        <p className="text-sm font-medium">{etiqueta}</p>
        <button
          onClick={() => setOffset(Math.min(0, offset + 1))}
          disabled={offset >= 0}
          className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 disabled:opacity-30 dark:hover:bg-slate-800"
        >
          ›
        </button>
      </div>

      <Card>
        <div className="flex items-center justify-end">
          <div className="flex gap-1 rounded-lg bg-slate-100 p-1 text-xs dark:bg-slate-800">
            {(['ARS', 'USD'] as const).map((m) => (
              <button
                key={m}
                onClick={() => setVista(m)}
                className={`rounded-md px-2 py-1 ${vista === m ? 'bg-white shadow dark:bg-slate-700' : 'text-slate-500'}`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-2 grid grid-cols-3 gap-2 text-center">
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">Ingresos</p>
            <p className="text-lg font-semibold text-emerald-600 dark:text-emerald-400">
              {formatMoney(resumen.ingresosPorMoneda[vista], vista)}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">Gastos</p>
            <p className="text-lg font-semibold text-red-600 dark:text-red-400">{formatMoney(resumen.gastosPorMoneda[vista], vista)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">Ahorro neto</p>
            <p className={`text-lg font-semibold ${ahorro >= 0 ? 'text-slate-900 dark:text-white' : 'text-red-600 dark:text-red-400'}`}>
              {formatMoney(ahorro, vista)}
            </p>
          </div>
        </div>
        <p className="mt-2 text-xs text-slate-400">
          Los gastos incluyen las cuotas de tarjeta que caen en el mes, no solo lo pagado en efectivo o débito.
        </p>
      </Card>

      <Card>
        <DistribucionBar items={itemsGastos} moneda={vista} titulo={`Gastos por categoría en ${vista}`} />
      </Card>

      {itemsIngresos.length > 0 && (
        <Card>
          <DistribucionBar items={itemsIngresos} moneda={vista} titulo={`Ingresos por categoría en ${vista}`} />
        </Card>
      )}
    </div>
  )
}
