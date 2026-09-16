/**
 * Id con un prefijo de timestamp (base36, ancho fijo) + un sufijo random. Como
 * IndexedDB devuelve las filas de una tabla ordenadas por clave primaria cuando
 * no se pide un orden explícito, esto hace que CUALQUIER `.toArray()` en toda la
 * app quede ordenado por fecha de creación "gratis", sin tener que acordarse de
 * ordenar en cada lugar donde se lista o se toma "el primero" como default.
 */
export function newId(): string {
  const timestamp = Date.now().toString(36).padStart(10, '0')
  const random = crypto.randomUUID().slice(0, 8)
  return `${timestamp}-${random}`
}

export function nowIso(): string {
  return new Date().toISOString()
}

/**
 * Fecha (yyyy-MM-dd) de un Date en su zona horaria LOCAL, sin pasar por UTC.
 * `date.toISOString()` convierte a UTC primero, así que en Argentina (UTC-3)
 * cualquier hora entre las 21:00 y medianoche "saltaba" al día siguiente. Esta
 * es la función a usar siempre que haya que convertir un Date a string de fecha.
 */
export function fechaLocalIso(d: Date): string {
  const anio = d.getFullYear()
  const mes = String(d.getMonth() + 1).padStart(2, '0')
  const dia = String(d.getDate()).padStart(2, '0')
  return `${anio}-${mes}-${dia}`
}

export function todayIso(): string {
  return fechaLocalIso(new Date())
}

/**
 * Parsea una fecha "yyyy-MM-dd" (la que sale de un <input type="date"> o de
 * `fechaLocalIso`) como medianoche LOCAL. El contrario de esto, `new Date(str)`,
 * la interpreta como medianoche UTC — en Argentina (UTC-3) eso hace que
 * `.getDate()` devuelva el día anterior. Usar siempre esta función para volver
 * a convertir una de estas fechas guardadas en un objeto Date.
 */
export function parseFechaLocal(fechaIso: string): Date {
  const [year, month, day] = fechaIso.split('-').map(Number)
  return new Date(year, month - 1, day)
}
