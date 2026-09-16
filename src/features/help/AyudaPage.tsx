import { useState } from 'react'
import { Card } from '../../components/ui'

interface Pregunta {
  titulo: string
  respuesta: string
}

const SECCIONES: { titulo: string; preguntas: Pregunta[] }[] = [
  {
    titulo: 'Privacidad y datos',
    preguntas: [
      {
        titulo: '¿Dónde viven mis datos?',
        respuesta:
          'Todo (cuentas, movimientos, tarjetas, todo) se guarda solo en este dispositivo, en el navegador. No hay servidor ni nube. La app solo sale a internet para dos cosas de solo lectura: la cotización del dólar oficial y el pronóstico del clima — en esas llamadas nunca viaja ningún dato tuyo.',
      },
      {
        titulo: '¿Cómo paso mis datos a otro dispositivo, o los recupero si se rompe este?',
        respuesta:
          'Con el backup encriptado (sección "Backup"). Exportás un archivo protegido con una contraseña que elegís vos, y lo importás en el otro dispositivo. Es también la forma de actualizar a una versión nueva de la app sin perder nada.',
      },
      {
        titulo: '¿Qué pasa si me olvido el PIN?',
        respuesta:
          'Como no hay servidor, nadie puede resetear el PIN por vos. Si tenés un backup exportado, vas a poder reinstalar la app y restaurar tus datos con la contraseña del backup (no con el PIN).',
      },
    ],
  },
  {
    titulo: 'Tarjetas y cuotas',
    preguntas: [
      {
        titulo: '¿Cuál es la diferencia entre "cierre" y "vencimiento"?',
        respuesta:
          'El cierre es el día hasta el que se acumulan los consumos de un resumen. El vencimiento es la fecha en la que hay que pagar ese resumen. Una compra hecha después del cierre cae en el resumen siguiente, no en el que está por vencer.',
      },
      {
        titulo: '¿Por qué una compra con tarjeta no baja el saldo de mi cuenta al instante?',
        respuesta:
          'Porque la tarjeta es una deuda, no una cuenta: la plata recién sale de tu cuenta cuando pagás el resumen. Por eso "usado" y "disponible" de la tarjeta reflejan las cuotas pendientes, no movimientos en tu cuenta bancaria.',
      },
      {
        titulo: '¿Cómo cargo una compra en cuotas?',
        respuesta:
          'Desde Tarjetas, "+ Compra en cuotas": ponés qué compraste, el monto total y en cuántas cuotas. La app arma sola el cronograma completo — no hace falta cargar cuota por cuota. Si la pagaste en un pago, dejá "Cuotas" en 1.',
      },
    ],
  },
  {
    titulo: 'Cuentas y movimientos',
    preguntas: [
      {
        titulo: '¿Por qué una transferencia no cuenta como gasto?',
        respuesta:
          'Porque la plata no se fue: solo cambió de lugar (de una cuenta a otra, a una inversión, a un ahorro). Si contara como gasto, tu resumen mensual mostraría salidas de plata que en realidad seguís teniendo.',
      },
      {
        titulo: '¿Por qué el título de mi cuenta no es el que escribí?',
        respuesta:
          'El título se arma solo con el banco/billetera y el tipo de cuenta (ej: "Banco Ciudad — Caja de ahorro en pesos"), para que sea siempre reconocible. Lo que escribas en "Alias" aparece como subtítulo, debajo.',
      },
      {
        titulo: '¿Qué diferencia hay entre "Saldo" (Inicio) y "Patrimonio" (Balance)?',
        respuesta:
          'El saldo es la suma de tus cuentas, nada más. El patrimonio en Balance también suma vehículos e inversiones y resta la deuda de tarjetas — es una foto más completa de cuánto tenés en total.',
      },
    ],
  },
  {
    titulo: 'Recordatorios y recurrencias',
    preguntas: [
      {
        titulo: '¿Qué diferencia hay entre un recordatorio y una recurrencia?',
        respuesta:
          'Un recordatorio solo te avisa (por fecha o, para mantenimiento de vehículos, por kilómetros). Una recurrencia además puede cargar el movimiento sola cuando llega la fecha — pensada para sueldos, alquiler o servicios de monto fijo. Cada recurrencia crea su propio recordatorio automáticamente.',
      },
      {
        titulo: 'Mi gasto es variable (no sé cuánto va a salir) — ¿igual uso una recurrencia?',
        respuesta:
          'Sí, pero dejá destildado "Cargar el movimiento automáticamente": así solo te va a avisar que llegó la fecha, y vos cargás el monto real a mano cuando lo sepas.',
      },
    ],
  },
  {
    titulo: 'Vehículos, inversiones y metas',
    preguntas: [
      {
        titulo: '¿Cómo calcula la app el consumo (km/L) de mi auto?',
        respuesta:
          'Cada vez que cargás combustible, anotá el odómetro. La app compara esa carga con la anterior: los kilómetros recorridos entre las dos, divididos por los litros de esta carga.',
      },
      {
        titulo: '¿Cómo sé el progreso de una meta de ahorro?',
        respuesta:
          'Cada meta tiene una cuenta dedicada. El progreso es, ni más ni menos, el saldo actual de esa cuenta contra el objetivo — por eso conviene que esa cuenta no se use para otra cosa.',
      },
    ],
  },
]

export function AyudaPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Ayuda</h1>
      <p className="text-sm text-slate-500 dark:text-slate-400">
        Esta app está pensada para explicarse sola. Si algo no te cierra, seguramente esté acá.
      </p>
      {SECCIONES.map((seccion) => (
        <Card key={seccion.titulo}>
          <p className="mb-2 text-sm font-semibold text-slate-500 dark:text-slate-400">{seccion.titulo}</p>
          <div className="space-y-1">
            {seccion.preguntas.map((p) => (
              <PreguntaItem key={p.titulo} pregunta={p} />
            ))}
          </div>
        </Card>
      ))}
    </div>
  )
}

function PreguntaItem({ pregunta }: { pregunta: Pregunta }) {
  const [abierta, setAbierta] = useState(false)
  return (
    <div className="border-b border-slate-100 py-2 last:border-none dark:border-slate-800">
      <button onClick={() => setAbierta((v) => !v)} className="flex w-full items-center justify-between text-left text-sm font-medium">
        {pregunta.titulo}
        <span className="ml-2 shrink-0 text-slate-400">{abierta ? '▲' : '▼'}</span>
      </button>
      {abierta && <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-300">{pregunta.respuesta}</p>}
    </div>
  )
}
