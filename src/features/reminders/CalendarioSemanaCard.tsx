import { useLiveQuery } from 'dexie-react-hooks'
import { useMemo } from 'react'
import { db } from '../../db/db'
import { Card } from '../../components/ui'
import { TIPOS_RECORDATORIO } from './reminderEngine'
import { useCalendarioSemana } from './useCalendarioSemana'

function etiquetaDia(offset: number, fecha: Date): string {
  if (offset === 0) return 'Hoy'
  if (offset === 1) return 'Mañana'
  const texto = fecha.toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short' })
  return texto.charAt(0).toUpperCase() + texto.slice(1).replace(/\.?,/, '')
}

export function CalendarioSemanaCard() {
  const dias = useCalendarioSemana()
  const idsDeRecurrencia = useLiveQuery(async () => new Set((await db.recurrencias.toArray()).map((r) => r.recordatorioId).filter((id): id is string => !!id)), []) ?? new Set<string>()

  const hayAlgo = useMemo(() => dias.some((d) => d.items.length > 0), [dias])

  return (
    <Card>
      <p className="mb-2 text-sm font-medium text-slate-500 dark:text-slate-400">Próximos 7 días</p>
      {!hayAlgo ? (
        <p className="text-sm text-slate-400">Sin recordatorios ni recurrencias en la semana.</p>
      ) : (
        <ul className="divide-y divide-slate-100 dark:divide-slate-800">
          {dias.map(({ offset, fecha, items }) => (
            <li key={offset} className="flex gap-3 py-2 first:pt-0 last:pb-0">
              <p className="w-20 shrink-0 pt-0.5 text-xs font-medium text-slate-500 dark:text-slate-400">{etiquetaDia(offset, fecha)}</p>
              {items.length === 0 ? (
                <p className="text-xs text-slate-300 dark:text-slate-600">—</p>
              ) : (
                <ul className="flex-1 space-y-1">
                  {items.map(({ recordatorio, vencido }) => {
                    const tipoInfo = TIPOS_RECORDATORIO.find((t) => t.value === recordatorio.tipo)
                    const esRecurrencia = idsDeRecurrencia.has(recordatorio.id)
                    return (
                      <li key={recordatorio.id} className="flex items-center gap-1.5 text-sm">
                        <span className="leading-none">{tipoInfo?.icon ?? '📌'}</span>
                        <span className={vencido ? 'font-medium text-red-500' : ''}>{recordatorio.titulo}</span>
                        {esRecurrencia && (
                          <span
                            className="rounded bg-indigo-100 px-1 py-0.5 text-[10px] leading-none text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300"
                            title="Generado por una recurrencia"
                          >
                            🔁 recurrente
                          </span>
                        )}
                      </li>
                    )
                  })}
                </ul>
              )}
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}
