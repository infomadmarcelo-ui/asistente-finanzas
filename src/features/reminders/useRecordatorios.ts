import { useLiveQuery } from 'dexie-react-hooks'
import { useMemo } from 'react'
import { db } from '../../db/db'
import type { Recordatorio, Vehiculo } from '../../db/types'
import { calcularProximaOcurrencia, calcularRestanteKm, diasHasta, textoRelativo, textoRelativoKm } from './reminderEngine'

export interface ItemRecordatorio {
  recordatorio: Recordatorio
  esPorKm: boolean
  /** Días o km restantes (lo que corresponda), para ordenar: más chico es más urgente. */
  orden: number
  vencido: boolean
  dentroDeAntelacion: boolean
  texto: string
}

function calcularItem(r: Recordatorio, hoy: Date, vehiculoPorId: Map<string, Vehiculo>): ItemRecordatorio | null {
  if (r.condicionKm != null) {
    const vehiculo = r.vehiculoId ? vehiculoPorId.get(r.vehiculoId) : undefined
    if (!vehiculo) return null
    const restante = calcularRestanteKm(r, vehiculo.odometroActual)
    return {
      recordatorio: r,
      esPorKm: true,
      orden: restante,
      vencido: restante < 0,
      dentroDeAntelacion: restante <= (r.antelacionKm ?? 500),
      texto: textoRelativoKm(restante),
    }
  }

  const proxima = calcularProximaOcurrencia(r, hoy)
  if (!proxima) return null
  const dias = diasHasta(proxima, hoy)
  return {
    recordatorio: r,
    esPorKm: false,
    orden: dias,
    vencido: dias < 0,
    dentroDeAntelacion: dias <= r.antelacionDias,
    texto: textoRelativo(dias),
  }
}

function useTodosConEstado(): ItemRecordatorio[] {
  const recordatorios = useLiveQuery(() => db.recordatorios.toArray(), []) ?? []
  const vehiculos = useLiveQuery(() => db.vehiculos.toArray(), []) ?? []
  const vehiculoPorId = useMemo(() => new Map(vehiculos.map((v) => [v.id, v])), [vehiculos])

  return useMemo(() => {
    const hoy = new Date()
    const items: ItemRecordatorio[] = []
    for (const r of recordatorios) {
      if (r.archivado) continue
      const item = calcularItem(r, hoy, vehiculoPorId)
      if (item) items.push(item)
    }
    return items
  }, [recordatorios, vehiculoPorId])
}

/** Todos los recordatorios activos, ordenados por proximidad. */
export function useListaRecordatorios(): ItemRecordatorio[] {
  const todos = useTodosConEstado()
  return useMemo(() => [...todos].sort((a, b) => a.orden - b.orden), [todos])
}

/** Los que hay que mostrar en el resumen del día: vencidos o dentro de su antelación. */
export function useRecordatoriosDelDia(): ItemRecordatorio[] {
  const lista = useListaRecordatorios()
  return useMemo(() => lista.filter((r) => r.dentroDeAntelacion), [lista])
}

export function useRecordatoriosArchivados(): Recordatorio[] {
  return useLiveQuery(async () => (await db.recordatorios.toArray()).filter((r) => r.archivado), []) ?? []
}
