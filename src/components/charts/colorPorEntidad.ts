/**
 * Asigna un color estable por entidad (cuenta, tarjeta, categoría, etc.), en
 * orden de creación. El color va atado a la entidad, no a su posición actual en
 * una lista ordenada por valor: si dos montos cambian de orden entre sí, sus
 * colores NO se intercambian.
 *
 * Los ids nuevos (ver `newId` en lib/id.ts) arrancan con un timestamp, así que
 * ordenar por id ya es ordenar por fecha de creación — no hace falta pedir
 * `creadoEn` como campo aparte.
 */
export function asignarColorPorEntidad(entidades: { id: string }[]): Map<string, number> {
  const ordenadas = [...entidades].sort((a, b) => a.id.localeCompare(b.id))
  const mapa = new Map<string, number>()
  ordenadas.forEach((e, i) => mapa.set(e.id, i))
  return mapa
}
