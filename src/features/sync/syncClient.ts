import { leerSnapshot, sincronizarConSnapshot } from './syncRepo'
import type { SnapshotSync } from './mergeEngine'

export const PUERTO_SYNC_DEFECTO = 4780

export type SyncEvento =
  | { tipo: 'conectando' }
  | { tipo: 'codigo-listo'; codigo: string; ip: string | null; puerto: number }
  | { tipo: 'sincronizando' }
  | { tipo: 'listo'; cambios: number }
  | { tipo: 'error'; mensaje: string }

export interface ConexionSync {
  cerrar: () => void
}

interface MensajeServidor {
  tipo: 'sesion-creada' | 'conectado' | 'datos' | 'error' | 'desconectado'
  codigo?: string
  ip?: string | null
  mensaje?: string
  snapshot?: SnapshotSync
}

function manejarConexion(ws: WebSocket, onEvento: (e: SyncEvento) => void): void {
  ws.onmessage = (ev) => {
    void (async () => {
      let msg: MensajeServidor
      try {
        msg = JSON.parse(ev.data as string)
      } catch {
        return
      }
      switch (msg.tipo) {
        case 'sesion-creada':
          if (msg.codigo) onEvento({ tipo: 'codigo-listo', codigo: msg.codigo, ip: msg.ip ?? null, puerto: PUERTO_SYNC_DEFECTO })
          break
        case 'conectado': {
          onEvento({ tipo: 'sincronizando' })
          const snapshot = await leerSnapshot()
          ws.send(JSON.stringify({ tipo: 'datos', snapshot }))
          break
        }
        case 'datos': {
          if (!msg.snapshot) return
          const cambios = await sincronizarConSnapshot(msg.snapshot)
          onEvento({ tipo: 'listo', cambios })
          ws.close()
          break
        }
        case 'error':
          onEvento({ tipo: 'error', mensaje: msg.mensaje ?? 'Ocurrió un error inesperado.' })
          break
        case 'desconectado':
          onEvento({ tipo: 'error', mensaje: 'Se cortó la conexión con el otro dispositivo antes de terminar.' })
          break
      }
    })()
  }
  ws.onerror = () => {
    onEvento({
      tipo: 'error',
      mensaje: 'No se pudo conectar. Revisá que el servidor de sincronización esté prendido en la PC y que los dos dispositivos estén en la misma red WiFi.',
    })
  }
}

/** La PC arranca una sesión nueva: se conecta a su propio servidor local
 * (corriendo en esta misma máquina) y espera a que el celular se una. */
export function iniciarComoHost(onEvento: (e: SyncEvento) => void): ConexionSync {
  const ws = new WebSocket(`wss://localhost:${PUERTO_SYNC_DEFECTO}`)
  ws.onopen = () => ws.send(JSON.stringify({ tipo: 'crear-sesion' }))
  manejarConexion(ws, onEvento)
  return { cerrar: () => ws.close() }
}

/** El celular se une a una sesión ya creada en la PC, usando los datos leídos
 * del código QR (o tipeados a mano como alternativa). */
export function unirseComoInvitado(host: string, puerto: number, codigo: string, onEvento: (e: SyncEvento) => void): ConexionSync {
  onEvento({ tipo: 'conectando' })
  const ws = new WebSocket(`wss://${host}:${puerto}`)
  ws.onopen = () => ws.send(JSON.stringify({ tipo: 'unirse-sesion', codigo }))
  manejarConexion(ws, onEvento)
  return { cerrar: () => ws.close() }
}
