import { useEffect, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../../components/ui'
import { CuentasPage } from '../accounts/CuentasPage'
import { TarjetasPage } from '../cards/TarjetasPage'
import { VehiculosPage } from '../vehicles/VehiculosPage'
import { RecurrenciasSection } from '../recurrences/RecurrenciasSection'
import { completarOnboarding, guardarPasoOnboarding, obtenerEstadoOnboarding, omitirOnboarding } from './onboardingRepo'

interface Paso {
  titulo: string
  descripcion: string
  contenido: ReactNode
}

const PASOS: Paso[] = [
  {
    titulo: 'Tus cuentas y billeteras',
    descripcion: 'Cargá cada cuenta con el saldo que tiene hoy: así arrancamos desde tu situación real, no desde cero.',
    contenido: <CuentasPage />,
  },
  {
    titulo: 'Tarjetas y deudas en curso',
    descripcion:
      'Cargá tus tarjetas (límite, cierre y vencimiento) y, si ya tenés compras en cuotas corriendo, cargalas como "Compra en cuotas" con la cantidad de cuotas que te quedan pendientes.',
    contenido: <TarjetasPage />,
  },
  {
    titulo: 'Vehículos',
    descripcion: 'Si tenés auto o moto, sumalo acá con su valor estimado y el odómetro actual.',
    contenido: <VehiculosPage />,
  },
  {
    titulo: 'Ingresos y gastos recurrentes',
    descripcion: 'Sueldo, alquiler, servicios, suscripciones... lo que se repite todos los meses.',
    contenido: <RecurrenciasSection />,
  },
]

export function OnboardingPage() {
  const navigate = useNavigate()
  const [paso, setPaso] = useState(0)
  const [cargado, setCargado] = useState(false)

  useEffect(() => {
    obtenerEstadoOnboarding().then(({ paso }) => {
      setPaso(Math.min(paso, PASOS.length - 1))
      setCargado(true)
    })
  }, [])

  async function irA(nuevoPaso: number) {
    setPaso(nuevoPaso)
    await guardarPasoOnboarding(nuevoPaso)
    window.scrollTo({ top: 0 })
  }

  async function saltearTodo() {
    await omitirOnboarding()
    navigate('/')
  }

  async function finalizar() {
    await completarOnboarding()
    navigate('/')
  }

  if (!cargado) return null

  const esUltimo = paso === PASOS.length - 1
  const actual = PASOS[paso]

  return (
    <div className="space-y-4 pb-8">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-slate-400">
          Paso {paso + 1} de {PASOS.length}
        </p>
        <button onClick={saltearTodo} className="text-xs text-slate-400 underline decoration-dotted hover:text-slate-600 dark:hover:text-slate-300">
          Saltear todo esto
        </button>
      </div>

      <div className="flex gap-1.5">
        {PASOS.map((_, i) => (
          <div key={i} className={`h-1.5 flex-1 rounded-full ${i <= paso ? 'bg-indigo-600' : 'bg-slate-200 dark:bg-slate-800'}`} />
        ))}
      </div>

      <div>
        <h1 className="text-xl font-semibold">{actual.titulo}</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{actual.descripcion}</p>
      </div>

      <div>{actual.contenido}</div>

      <div className="flex items-center justify-between border-t border-slate-100 pt-4 dark:border-slate-800">
        <Button variant="secondary" onClick={() => irA(Math.max(0, paso - 1))} disabled={paso === 0}>
          Atrás
        </Button>
        <div className="flex gap-2">
          {!esUltimo && (
            <Button variant="secondary" onClick={() => irA(paso + 1)}>
              Omitir este paso
            </Button>
          )}
          {esUltimo ? (
            <Button onClick={finalizar}>Listo, terminar</Button>
          ) : (
            <Button onClick={() => irA(paso + 1)}>Siguiente</Button>
          )}
        </div>
      </div>
    </div>
  )
}
