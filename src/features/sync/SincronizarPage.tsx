import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import QRCode from 'qrcode'
import { Button, Card, Field, TextInput } from '../../components/ui'
import { iniciarComoHost, unirseComoInvitado, type ConexionSync, type SyncEvento } from './syncClient'

/** Arma la URL que va adentro del QR: la misma app, apuntando a esta pantalla
 * con los datos de conexión como parámetros, para que al escanearla el otro
 * dispositivo se una solo (sin tener que tipear nada). */
function armarUrlInvitacion(ip: string, puerto: number, codigo: string): string {
  const base = window.location.origin + window.location.pathname
  return `${base}#/sincronizar?host=${ip}&puerto=${puerto}&codigo=${codigo}`
}

export function SincronizarPage() {
  const [searchParams] = useSearchParams()
  const host = searchParams.get('host')
  const puerto = searchParams.get('puerto')
  const codigo = searchParams.get('codigo')

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Sincronizar</h1>
      <p className="text-sm text-slate-500 dark:text-slate-400">
        Combina los datos de este dispositivo con los de otro (PC/celular) directo por la red WiFi de casa, sin pasar por
        internet. Los dos dispositivos quedan con la misma información al terminar.
      </p>

      {host && puerto && codigo ? (
        <ConectandoComoInvitado host={host} puerto={Number(puerto)} codigo={codigo} />
      ) : (
        <SincronizarHub />
      )}
    </div>
  )
}

function SincronizarHub() {
  const [modo, setModo] = useState<'inicio' | 'generar' | 'unirse'>('inicio')

  if (modo === 'generar') return <GenerarCodigo onVolver={() => setModo('inicio')} />
  if (modo === 'unirse') return <UnirseManual onVolver={() => setModo('inicio')} />

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Card className="space-y-3">
        <p className="font-medium">Mostrar un código</p>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Para que el otro dispositivo se conecte acá. Usalo, por ejemplo, desde la PC.
        </p>
        <Button onClick={() => setModo('generar')} className="w-full">
          Generar código
        </Button>
      </Card>
      <Card className="space-y-3">
        <p className="font-medium">Conectarme a un código</p>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Escaneá el QR del otro dispositivo con la cámara (se abre solo), o escribí los datos a mano acá abajo.
        </p>
        <Button variant="secondary" onClick={() => setModo('unirse')} className="w-full">
          Escribir código a mano
        </Button>
      </Card>
    </div>
  )
}

function EstadoSync({ evento }: { evento: SyncEvento | null }) {
  if (!evento) return <p className="text-sm text-slate-500 dark:text-slate-400">Conectando al servidor local…</p>
  switch (evento.tipo) {
    case 'conectando':
      return <p className="text-sm text-slate-500 dark:text-slate-400">Conectando…</p>
    case 'sincronizando':
      return <p className="text-sm text-indigo-600 dark:text-indigo-400">Sincronizando datos…</p>
    case 'listo':
      return (
        <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
          Listo — {evento.cambios === 0 ? 'ya estaban al día, no hubo cambios' : `se aplicaron ${evento.cambios} cambios`}.
        </p>
      )
    case 'error':
      return <p className="text-sm font-medium text-red-500">{evento.mensaje}</p>
    default:
      return null
  }
}

function GenerarCodigo({ onVolver }: { onVolver: () => void }) {
  const [evento, setEvento] = useState<SyncEvento | null>(null)
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)
  const conexionRef = useRef<ConexionSync | null>(null)

  useEffect(() => {
    const conexion = iniciarComoHost(setEvento)
    conexionRef.current = conexion
    return () => conexion.cerrar()
  }, [])

  useEffect(() => {
    if (evento?.tipo !== 'codigo-listo') return
    if (!evento.ip) {
      setQrDataUrl(null)
      return
    }
    const url = armarUrlInvitacion(evento.ip, evento.puerto, evento.codigo)
    QRCode.toDataURL(url, { width: 240, margin: 1 }).then(setQrDataUrl)
  }, [evento])

  const codigoListo = evento?.tipo === 'codigo-listo' ? evento : null

  return (
    <Card className="space-y-4">
      <button onClick={onVolver} className="text-xs text-slate-400 underline decoration-dotted hover:text-slate-600 dark:hover:text-slate-300">
        ← Volver
      </button>

      {codigoListo ? (
        <div className="space-y-3 text-center">
          {codigoListo.ip ? (
            <>
              {qrDataUrl && <img src={qrDataUrl} alt="Código QR para sincronizar" className="mx-auto rounded-lg" />}
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Escaneá este código desde el otro dispositivo (menú "Sincronizar" → "Escribir código a mano" tiene los mismos
                datos por si la cámara no agarra).
              </p>
            </>
          ) : (
            <p className="text-sm text-amber-600 dark:text-amber-400">
              No se pudo detectar la IP de esta red. Conectate a la WiFi y generá el código de nuevo.
            </p>
          )}
          <p className="font-mono text-2xl font-semibold tracking-widest">{codigoListo.codigo}</p>
          {codigoListo.ip && <p className="text-xs text-slate-400">IP: {codigoListo.ip} · Puerto: {codigoListo.puerto}</p>}
        </div>
      ) : (
        <EstadoSync evento={evento} />
      )}

      {codigoListo && <EstadoSync evento={evento} />}
    </Card>
  )
}

function ConectandoComoInvitado({ host, puerto, codigo }: { host: string; puerto: number; codigo: string }) {
  const [evento, setEvento] = useState<SyncEvento | null>(null)

  useEffect(() => {
    const conexion = unirseComoInvitado(host, puerto, codigo, setEvento)
    return () => conexion.cerrar()
  }, [host, puerto, codigo])

  return (
    <Card className="space-y-2">
      <p className="text-sm text-slate-500 dark:text-slate-400">
        Conectando con {host}:{puerto}…
      </p>
      <EstadoSync evento={evento} />
    </Card>
  )
}

function UnirseManual({ onVolver }: { onVolver: () => void }) {
  const [host, setHost] = useState('')
  const [puerto, setPuerto] = useState('4780')
  const [codigo, setCodigo] = useState('')
  const [evento, setEvento] = useState<SyncEvento | null>(null)
  const conexionRef = useRef<ConexionSync | null>(null)

  function conectar() {
    if (!host.trim() || !codigo.trim()) return
    conexionRef.current?.cerrar()
    conexionRef.current = unirseComoInvitado(host.trim(), Number(puerto) || 4780, codigo.trim(), setEvento)
  }

  useEffect(() => () => conexionRef.current?.cerrar(), [])

  return (
    <Card className="space-y-4">
      <button onClick={onVolver} className="text-xs text-slate-400 underline decoration-dotted hover:text-slate-600 dark:hover:text-slate-300">
        ← Volver
      </button>
      <Field label="IP de la PC">
        <TextInput value={host} onChange={(e) => setHost(e.target.value)} placeholder="Ej: 192.168.1.5" autoFocus />
      </Field>
      <Field label="Puerto">
        <TextInput value={puerto} onChange={(e) => setPuerto(e.target.value)} placeholder="4780" />
      </Field>
      <Field label="Código">
        <TextInput value={codigo} onChange={(e) => setCodigo(e.target.value)} placeholder="123456" />
      </Field>
      <Button onClick={conectar} disabled={!host.trim() || !codigo.trim()} className="w-full">
        Conectar
      </Button>
      <EstadoSync evento={evento} />
    </Card>
  )
}
