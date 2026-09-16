import { db } from '../../db/db'
import type { Cuenta, TipoCuenta, Moneda } from '../../db/types'
import { newId, nowIso } from '../../lib/id'

export interface CuentaInput {
  nombre?: string
  tipo: TipoCuenta
  moneda: Moneda
  entidad?: string
  saldoInicial: number
}

export async function crearCuenta(input: CuentaInput): Promise<void> {
  const cuenta: Cuenta = {
    id: newId(),
    ...input,
    archivada: false,
    creadoEn: nowIso(),
  }
  await db.cuentas.add(cuenta)
}

export async function actualizarCuenta(id: string, input: CuentaInput): Promise<void> {
  await db.cuentas.update(id, input)
}

/** Oculta la cuenta de las listas activas (no borra nada: sus movimientos y su
 * historial siguen intactos). Se usa para cuentas cerradas que ya no querés
 * ver en el día a día pero cuyo historial querés conservar. */
export async function archivarCuenta(id: string): Promise<void> {
  await db.cuentas.update(id, { archivada: true })
}

export async function desarchivarCuenta(id: string): Promise<void> {
  await db.cuentas.update(id, { archivada: false })
}

export const TIPOS_CUENTA: { value: TipoCuenta; label: string }[] = [
  { value: 'caja_ahorro', label: 'Caja de ahorro' },
  { value: 'cuenta_corriente', label: 'Cuenta corriente' },
  { value: 'billetera_virtual', label: 'Billetera virtual' },
  { value: 'efectivo', label: 'Efectivo' },
]

const MONEDA_TEXTO: Record<Moneda, string> = { ARS: 'en pesos', USD: 'en dólares' }

/** Nombre para mostrar: banco/billetera + tipo de cuenta + moneda (ej: "Banco Ciudad — Caja de ahorro en pesos").
 * El alias que haya cargado el usuario, si lo hay, se muestra como subtítulo. */
export function nombreVisibleCuenta(c: Pick<Cuenta, 'nombre' | 'tipo' | 'moneda' | 'entidad'>): {
  titulo: string
  subtitulo?: string
} {
  const tipoLabel = TIPOS_CUENTA.find((t) => t.value === c.tipo)?.label ?? c.tipo
  const titulo = c.entidad ? `${c.entidad} — ${tipoLabel} ${MONEDA_TEXTO[c.moneda]}` : `${tipoLabel} ${MONEDA_TEXTO[c.moneda]}`
  const subtitulo = c.nombre?.trim() ? c.nombre.trim() : undefined
  return { titulo, subtitulo }
}
