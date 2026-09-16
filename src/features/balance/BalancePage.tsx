import { useLiveQuery } from 'dexie-react-hooks'
import { useMemo, useState } from 'react'
import { db } from '../../db/db'
import type { Moneda } from '../../db/types'
import { Card } from '../../components/ui'
import { DistribucionBar } from '../../components/charts/DistribucionBar'
import { asignarColorPorEntidad } from '../../components/charts/colorPorEntidad'
import { nombreVisibleCuenta } from '../accounts/accountsRepo'
import { useSaldosCuentas } from '../accounts/useSaldos'
import { useUsoTarjetas } from '../cards/useTarjetas'
import { formatMoney } from '../../lib/money'
import { usePatrimonio } from '../dashboard/usePatrimonio'

export function BalancePage() {
  const { cuentasPorMoneda, vehiculosPorMoneda, inversionesPorMoneda, deudaPorMoneda, patrimonioPorMoneda } = usePatrimonio()
  const [vista, setVista] = useState<Moneda>('ARS')
  const cuentas = useLiveQuery(() => db.cuentas.toArray(), []) ?? []
  const tarjetas = useLiveQuery(async () => (await db.tarjetas.toArray()).filter((t) => !t.archivada), []) ?? []
  const vehiculos = useLiveQuery(async () => (await db.vehiculos.toArray()).filter((v) => !v.archivado), []) ?? []
  const inversiones = useLiveQuery(async () => (await db.inversiones.toArray()).filter((i) => !i.liquidada), []) ?? []
  const saldos = useSaldosCuentas()
  const uso = useUsoTarjetas()
  const cuentasActivas = cuentas.filter((c) => !c.archivada)

  // Un color por entidad (cuenta, tarjeta, vehículo o inversión), estable en el tiempo:
  // no depende del orden en que se dibujan las barras ni cambia si los montos se reordenan.
  const colorPorId = useMemo(
    () =>
      asignarColorPorEntidad(
        [...cuentasActivas, ...tarjetas, ...vehiculos, ...inversiones].map((e) => ({ id: e.id, creadoEn: e.creadoEn })),
      ),
    [cuentasActivas, tarjetas, vehiculos, inversiones],
  )

  const itemsCuentas = cuentasActivas
    .filter((c) => c.moneda === vista)
    .map((c) => ({
      id: c.id,
      label: nombreVisibleCuenta(c).titulo,
      value: saldos.get(c.id) ?? c.saldoInicial,
      colorIndex: colorPorId.get(c.id) ?? 0,
    }))

  const itemsDeuda = tarjetas
    .filter((t) => t.moneda === vista)
    .map((t) => ({ id: t.id, label: t.nombre, value: uso.get(t.id)?.usado ?? 0, colorIndex: colorPorId.get(t.id) ?? 0 }))

  const itemsVehiculos = vehiculos
    .filter((v) => v.moneda === vista)
    .map((v) => ({ id: v.id, label: `${v.marca} ${v.modelo}`, value: v.valorEstimado, colorIndex: colorPorId.get(v.id) ?? 0 }))

  const itemsInversiones = inversiones
    .filter((i) => i.moneda === vista)
    .map((i) => ({
      id: i.id,
      label: i.tipo === 'plazo_fijo' ? 'Plazo fijo' : 'Inversión',
      value: i.capital,
      colorIndex: colorPorId.get(i.id) ?? 0,
    }))

  const hayDesglose = deudaPorMoneda[vista] > 0 || vehiculosPorMoneda[vista] > 0 || inversionesPorMoneda[vista] > 0

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Balance</h1>

      <Card>
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-500 dark:text-slate-400">Patrimonio total</p>
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
        <p className="mt-1 text-2xl font-semibold">{formatMoney(patrimonioPorMoneda[vista], vista)}</p>
        {hayDesglose && (
          <div className="mt-2 space-y-0.5 border-t border-slate-100 pt-2 text-sm dark:border-slate-800">
            <div className="flex justify-between text-slate-500 dark:text-slate-400">
              <span>Cuentas</span>
              <span>{formatMoney(cuentasPorMoneda[vista], vista)}</span>
            </div>
            {vehiculosPorMoneda[vista] > 0 && (
              <div className="flex justify-between text-slate-500 dark:text-slate-400">
                <span>Vehículos</span>
                <span>{formatMoney(vehiculosPorMoneda[vista], vista)}</span>
              </div>
            )}
            {inversionesPorMoneda[vista] > 0 && (
              <div className="flex justify-between text-slate-500 dark:text-slate-400">
                <span>Inversiones</span>
                <span>{formatMoney(inversionesPorMoneda[vista], vista)}</span>
              </div>
            )}
            {deudaPorMoneda[vista] > 0 && (
              <div className="flex justify-between text-slate-500 dark:text-slate-400">
                <span>Deuda de tarjetas (cuotas pendientes)</span>
                <span>− {formatMoney(deudaPorMoneda[vista], vista)}</span>
              </div>
            )}
          </div>
        )}
        <p className="mt-2 text-xs text-slate-400">Cada moneda por separado, sin convertir entre pesos y dólares.</p>
      </Card>

      <Card>
        <DistribucionBar items={itemsCuentas} moneda={vista} titulo={`Saldos en ${vista}`} />
      </Card>

      {vehiculos.length > 0 && (
        <Card>
          <DistribucionBar items={itemsVehiculos} moneda={vista} titulo={`Vehículos en ${vista}`} />
        </Card>
      )}

      {inversiones.length > 0 && (
        <Card>
          <DistribucionBar items={itemsInversiones} moneda={vista} titulo={`Inversiones en ${vista}`} />
        </Card>
      )}

      {tarjetas.length > 0 && (
        <Card>
          <DistribucionBar items={itemsDeuda} moneda={vista} titulo={`Deuda de tarjetas en ${vista}`} />
        </Card>
      )}

      <p className="text-center text-xs text-slate-400">Próximamente: metas de ahorro también se van a poder ver acá.</p>
    </div>
  )
}
