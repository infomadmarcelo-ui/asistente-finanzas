// Servidor-puente para sincronizar la app entre dispositivos por WiFi local.
// NO guarda tus datos en ningún momento: solo conecta la pestaña de la PC con
// la del celular y deja pasar los mensajes entre las dos. La fusión de datos
// la hace cada navegador con su propia base local (ver src/features/sync).
//
// Se arranca a mano cuando querés sincronizar: `npm run sync-server` (o
// doble click en iniciar.bat). Necesita un certificado generado con mkcert
// para esa IP — ver sync-server/README.md.
import { readFileSync, existsSync } from 'node:fs'
import { createServer } from 'node:https'
import { randomInt } from 'node:crypto'
import { networkInterfaces } from 'node:os'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { WebSocketServer } from 'ws'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PUERTO = 4780
const CERT = join(__dirname, 'certs', 'lan-cert.pem')
const KEY = join(__dirname, 'certs', 'lan-key.pem')
const MINUTOS_SESION_SIN_RECLAMAR = 5
const MINUTOS_SESION_INACTIVA = 15

if (!existsSync(CERT) || !existsSync(KEY)) {
  console.error('Falta el certificado. Generalo primero con mkcert (ver sync-server/README.md).')
  process.exit(1)
}

/** La IP de esta PC en la red WiFi, para que el celular sepa a dónde conectarse
 * (se la mandamos al mostrar el QR, así no hay que tipearla a mano). */
function detectarIpLan() {
  for (const ifaces of Object.values(networkInterfaces())) {
    for (const iface of ifaces ?? []) {
      if (iface.family === 'IPv4' && !iface.internal) return iface.address
    }
  }
  return null
}

const servidorHttps = createServer({ cert: readFileSync(CERT), key: readFileSync(KEY) })
const wss = new WebSocketServer({ server: servidorHttps })

/** codigo (string de 6 dígitos) -> { host, invitado, creadoEn, ultimaActividad } */
const sesiones = new Map()

function generarCodigo() {
  let codigo
  do {
    codigo = String(randomInt(0, 1_000_000)).padStart(6, '0')
  } while (sesiones.has(codigo))
  return codigo
}

function enviar(ws, mensaje) {
  if (ws && ws.readyState === ws.OPEN) ws.send(JSON.stringify(mensaje))
}

function otroLado(sesion, ws) {
  return sesion.host === ws ? sesion.invitado : sesion.host
}

function cerrarSesion(codigo) {
  sesiones.delete(codigo)
}

wss.on('connection', (ws) => {
  let miCodigo = null

  ws.on('message', (data) => {
    let mensaje
    try {
      mensaje = JSON.parse(data.toString())
    } catch {
      return
    }

    if (mensaje.tipo === 'crear-sesion') {
      const codigo = generarCodigo()
      sesiones.set(codigo, { host: ws, invitado: null, creadoEn: Date.now(), ultimaActividad: Date.now() })
      miCodigo = codigo
      enviar(ws, { tipo: 'sesion-creada', codigo, ip: detectarIpLan() })
      return
    }

    if (mensaje.tipo === 'unirse-sesion') {
      const sesion = sesiones.get(mensaje.codigo)
      if (!sesion || sesion.invitado) {
        enviar(ws, { tipo: 'error', mensaje: 'Ese código no existe, ya se usó o venció. Generá uno nuevo desde la PC.' })
        return
      }
      sesion.invitado = ws
      sesion.ultimaActividad = Date.now()
      miCodigo = mensaje.codigo
      enviar(sesion.host, { tipo: 'conectado' })
      enviar(sesion.invitado, { tipo: 'conectado' })
      return
    }

    // Cualquier otro mensaje (los datos a sincronizar, acks, etc.) se reenvía
    // tal cual al otro lado de la sesión — el servidor no mira el contenido.
    if (miCodigo) {
      const sesion = sesiones.get(miCodigo)
      if (!sesion) return
      sesion.ultimaActividad = Date.now()
      enviar(otroLado(sesion, ws), mensaje)
    }
  })

  ws.on('close', () => {
    if (!miCodigo) return
    const sesion = sesiones.get(miCodigo)
    if (!sesion) return
    enviar(otroLado(sesion, ws), { tipo: 'desconectado' })
    cerrarSesion(miCodigo)
  })
})

// Limpieza periódica: sesiones creadas y nunca reclamadas, o que quedaron
// mucho tiempo sin mensajes (alguien cerró la pestaña sin avisar).
setInterval(() => {
  const ahora = Date.now()
  for (const [codigo, sesion] of sesiones) {
    const sinReclamar = !sesion.invitado && ahora - sesion.creadoEn > MINUTOS_SESION_SIN_RECLAMAR * 60_000
    const inactiva = ahora - sesion.ultimaActividad > MINUTOS_SESION_INACTIVA * 60_000
    if (sinReclamar || inactiva) cerrarSesion(codigo)
  }
}, 60_000).unref()

servidorHttps.listen(PUERTO, () => {
  console.log(`Servidor de sincronización escuchando en https://0.0.0.0:${PUERTO}`)
  console.log('Dejalo abierto mientras sincronizás. Cerrá esta ventana cuando termines.')
})
