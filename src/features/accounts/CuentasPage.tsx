import { useLiveQuery } from 'dexie-react-hooks'
import { useState, type FormEvent } from 'react'
import { db } from '../../db/db'
import type { Cuenta, Moneda, TipoCuenta } from '../../db/types'
import { Money } from '../../components/Money'
import { Button, Card, EmptyState, Field, Modal, Select, TextInput } from '../../components/ui'
import { TIPOS_CUENTA, actualizarCuenta, archivarCuenta, crearCuenta, desarchivarCuenta, nombreVisibleCuenta } from './accountsRepo'
import { useSaldosCuentas } from './useSaldos'

export function CuentasPage() {
  const todasLasCuentas = useLiveQuery(() => db.cuentas.toArray(), []) ?? []
  const saldos = useSaldosCuentas()
  const [modalAbierto, setModalAbierto] = useState(false)
  const [cuentaEditando, setCuentaEditando] = useState<Cuenta | null>(null)
  const [verArchivadas, setVerArchivadas] = useState(false)

  const cuentas = todasLasCuentas.filter((c) => !c.archivada)
  const archivadas = todasLasCuentas.filter((c) => c.archivada)

  function abrirEdicion(c: Cuenta) {
    setCuentaEditando(c)
    setModalAbierto(true)
  }

  function abrirNueva() {
    setCuentaEditando(null)
    setModalAbierto(true)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Cuentas</h1>
        <Button onClick={abrirNueva}>+ Nueva cuenta</Button>
      </div>

      {cuentas.length === 0 ? (
        <EmptyState
          icon="🏦"
          title="Todavía no cargaste ninguna cuenta"
          description="Agregá tu caja de ahorro, cuenta corriente, billetera virtual o efectivo para empezar a registrar movimientos."
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {cuentas.map((c) => {
            const { titulo, subtitulo } = nombreVisibleCuenta(c)
            return (
              <Card
                key={c.id}
                className="cursor-pointer space-y-1 hover:ring-2 hover:ring-indigo-200 dark:hover:ring-indigo-900"
                onClick={() => abrirEdicion(c)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium leading-tight">{titulo}</p>
                    {subtitulo && <p className="text-xs text-slate-500 dark:text-slate-400">{subtitulo}</p>}
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      archivarCuenta(c.id)
                    }}
                    className="shrink-0 text-xs text-slate-400 hover:text-red-500"
                    title="Archivar cuenta"
                  >
                    Archivar
                  </button>
                </div>
                <p className="text-lg font-semibold">
                  <Money monto={saldos.get(c.id) ?? c.saldoInicial} moneda={c.moneda} />
                </p>
              </Card>
            )
          })}
        </div>
      )}

      {archivadas.length > 0 && (
        <div className="pt-2">
          <button
            onClick={() => setVerArchivadas((v) => !v)}
            className="text-xs text-slate-400 underline decoration-dotted hover:text-slate-600 dark:hover:text-slate-300"
          >
            {verArchivadas ? 'Ocultar' : 'Ver'} cuentas archivadas ({archivadas.length})
          </button>
          {verArchivadas && (
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {archivadas.map((c) => {
                const { titulo, subtitulo } = nombreVisibleCuenta(c)
                return (
                  <Card key={c.id} className="flex items-center justify-between opacity-70">
                    <div>
                      <p className="text-sm font-medium leading-tight">{titulo}</p>
                      {subtitulo && <p className="text-xs text-slate-500 dark:text-slate-400">{subtitulo}</p>}
                    </div>
                    <button
                      onClick={() => desarchivarCuenta(c.id)}
                      className="shrink-0 text-xs text-indigo-500 hover:text-indigo-400"
                    >
                      Restaurar
                    </button>
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      )}

      <CuentaFormModal
        open={modalAbierto}
        cuenta={cuentaEditando}
        onClose={() => {
          setModalAbierto(false)
          setCuentaEditando(null)
        }}
      />
    </div>
  )
}

function CuentaFormModal({ open, cuenta, onClose }: { open: boolean; cuenta: Cuenta | null; onClose: () => void }) {
  const esEdicion = !!cuenta
  const [nombre, setNombre] = useState(cuenta?.nombre ?? '')
  const [tipo, setTipo] = useState<TipoCuenta>(cuenta?.tipo ?? 'caja_ahorro')
  const [moneda, setMoneda] = useState<Moneda>(cuenta?.moneda ?? 'ARS')
  const [entidad, setEntidad] = useState(cuenta?.entidad ?? '')
  const [saldoInicial, setSaldoInicial] = useState(String(cuenta?.saldoInicial ?? 0))
  const [guardando, setGuardando] = useState(false)

  // Reponer los valores cada vez que el modal pasa de cerrado a abierto (nueva cuenta o edición).
  const [estabaAbierto, setEstabaAbierto] = useState(open)
  if (open !== estabaAbierto) {
    setEstabaAbierto(open)
    if (open) {
      setNombre(cuenta?.nombre ?? '')
      setTipo(cuenta?.tipo ?? 'caja_ahorro')
      setMoneda(cuenta?.moneda ?? 'ARS')
      setEntidad(cuenta?.entidad ?? '')
      setSaldoInicial(String(cuenta?.saldoInicial ?? 0))
    }
  }

  function cerrar() {
    onClose()
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setGuardando(true)
    try {
      const input = {
        nombre: nombre.trim() || undefined,
        tipo,
        moneda,
        entidad: entidad.trim() || undefined,
        saldoInicial: Number(saldoInicial) || 0,
      }
      if (esEdicion && cuenta) {
        await actualizarCuenta(cuenta.id, input)
      } else {
        await crearCuenta(input)
      }
      cerrar()
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Modal open={open} onClose={cerrar} title={esEdicion ? 'Editar cuenta' : 'Nueva cuenta'}>
      <form onSubmit={onSubmit} className="space-y-4">
        <Field label="Banco / billetera">
          <TextInput value={entidad} onChange={(e) => setEntidad(e.target.value)} placeholder="Ej: Banco Ciudad" autoFocus />
        </Field>
        <Field label="Tipo">
          <Select value={tipo} onChange={(e) => setTipo(e.target.value as TipoCuenta)}>
            {TIPOS_CUENTA.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </Select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Moneda">
            <Select value={moneda} onChange={(e) => setMoneda(e.target.value as Moneda)}>
              <option value="ARS">ARS</option>
              <option value="USD">USD</option>
            </Select>
          </Field>
          <Field label="Saldo inicial">
            <TextInput type="number" step="0.01" value={saldoInicial} onChange={(e) => setSaldoInicial(e.target.value)} />
          </Field>
        </div>
        <p className="-mt-2 text-xs text-slate-500 dark:text-slate-400">
          El saldo con el que arranca la cuenta. Tu saldo actual se calcula sumando los movimientos que cargues después.
        </p>
        <Field label="Alias (opcional)">
          <TextInput value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej: Cuenta sueldo" />
        </Field>
        <Button type="submit" disabled={guardando} className="w-full">
          {guardando ? 'Guardando…' : esEdicion ? 'Guardar cambios' : 'Crear cuenta'}
        </Button>
      </form>
    </Modal>
  )
}
