import { useMemo } from 'react'
import { useListaRecordatorios, type ItemRecordatorio } from './useRecordatorios'

export interface DiaCalendario {
  offset: number
  fecha: Date
  items: ItemRecordatorio[]
}

/** Recordatorios por fecha (no los de por kilómetros: no tienen un día de calendario)
 * agrupados en los próximos 7 días, hoy incluido. */
export function useCalendarioSemana(): DiaCalendario[] {
  const lista = useListaRecordatorios()

  return useMemo(() => {
    const hoy = new Date()
    const dias: DiaCalendario[] = []
    for (let offset = 0; offset <= 6; offset++) {
      const fecha = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() + offset)
      const items = lista.filter((i) => !i.esPorKm && i.orden === offset)
      dias.push({ offset, fecha, items })
    }
    return dias
  }, [lista])
}
