/** Códigos WMO que devuelve Open-Meteo, mapeados a algo entendible. */
export function iconoClima(codigo: number): string {
  if (codigo === 0) return '☀️'
  if (codigo <= 2) return '🌤️'
  if (codigo === 3) return '☁️'
  if (codigo === 45 || codigo === 48) return '🌫️'
  if (codigo >= 51 && codigo <= 57) return '🌦️'
  if (codigo >= 61 && codigo <= 67) return '🌧️'
  if (codigo >= 71 && codigo <= 77) return '🌨️'
  if (codigo >= 80 && codigo <= 82) return '🌧️'
  if (codigo >= 85 && codigo <= 86) return '🌨️'
  if (codigo >= 95) return '⛈️'
  return '🌡️'
}

export function textoClima(codigo: number): string {
  if (codigo === 0) return 'Despejado'
  if (codigo <= 2) return 'Parcialmente nublado'
  if (codigo === 3) return 'Nublado'
  if (codigo === 45 || codigo === 48) return 'Niebla'
  if (codigo >= 51 && codigo <= 57) return 'Llovizna'
  if (codigo >= 61 && codigo <= 67) return 'Lluvia'
  if (codigo >= 71 && codigo <= 77) return 'Nieve'
  if (codigo >= 80 && codigo <= 82) return 'Chaparrones'
  if (codigo >= 85 && codigo <= 86) return 'Nevadas'
  if (codigo >= 95) return 'Tormenta'
  return 'Clima'
}
