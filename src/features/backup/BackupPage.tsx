import { useState } from 'react'
import { Button, Card, TextInput } from '../../components/ui'
import { useConfirm } from '../../components/ConfirmProvider'
import { ArchivoInvalidoError, ContrasenaIncorrectaError, exportarBackup, importarBackup, nombreArchivoBackup } from './backupRepo'

export function BackupPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Backup</h1>
      <p className="text-sm text-slate-500 dark:text-slate-400">
        Tus datos viven solo en este dispositivo — no hay ningún servidor. El backup es la forma de no perderlos si se rompe el
        equipo, de pasarlos a otro dispositivo, o de actualizar la app sin arrancar de cero.
      </p>

      <ExportarBackupCard />
      <RestaurarBackupCard />
    </div>
  )
}

function ExportarBackupCard() {
  const [password, setPassword] = useState('')
  const [confirmacion, setConfirmacion] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [ok, setOk] = useState(false)
  const [guardando, setGuardando] = useState(false)

  async function exportar() {
    setError(null)
    setOk(false)
    if (password.length < 4) {
      setError('Usá al menos 4 caracteres.')
      return
    }
    if (password !== confirmacion) {
      setError('No coinciden.')
      return
    }
    setGuardando(true)
    try {
      const blob = await exportarBackup(password)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = nombreArchivoBackup()
      a.click()
      URL.revokeObjectURL(url)
      setPassword('')
      setConfirmacion('')
      setOk(true)
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Card className="space-y-3">
      <p className="font-medium">Exportar</p>
      <p className="text-sm text-slate-500 dark:text-slate-400">
        Elegí una contraseña para proteger el archivo. Sin ella, nadie (ni vos) va a poder abrirlo — anotala en un lugar seguro.
      </p>
      <TextInput type="password" placeholder="Contraseña" value={password} onChange={(e) => setPassword(e.target.value)} />
      <TextInput type="password" placeholder="Repetila" value={confirmacion} onChange={(e) => setConfirmacion(e.target.value)} />
      {error && <p className="text-sm text-red-500">{error}</p>}
      {ok && <p className="text-sm text-emerald-600 dark:text-emerald-400">Backup descargado.</p>}
      <Button onClick={exportar} disabled={guardando} className="w-full">
        {guardando ? 'Preparando…' : 'Descargar backup'}
      </Button>
    </Card>
  )
}

function RestaurarBackupCard() {
  const confirmar = useConfirm()
  const [archivo, setArchivo] = useState<File | null>(null)
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [restaurando, setRestaurando] = useState(false)

  async function restaurar() {
    if (!archivo || !password) return
    setError(null)

    const ok = await confirmar({
      titulo: 'Restaurar backup',
      mensaje: 'Esto va a borrar todos los datos que tengas cargados ahora en este dispositivo y los va a reemplazar por los del archivo. No se puede deshacer.',
      textoConfirmar: 'Restaurar y reemplazar todo',
    })
    if (!ok) return

    setRestaurando(true)
    try {
      const texto = await archivo.text()
      await importarBackup(texto, password)
      window.location.reload()
    } catch (e) {
      if (e instanceof ContrasenaIncorrectaError || e instanceof ArchivoInvalidoError) {
        setError(e.message)
      } else {
        setError('No se pudo restaurar el backup.')
      }
      setRestaurando(false)
    }
  }

  return (
    <Card className="space-y-3">
      <p className="font-medium">Restaurar</p>
      <p className="text-sm text-slate-500 dark:text-slate-400">
        Reemplaza todo lo que tenés cargado en este dispositivo por lo que haya en el archivo. Usalo para pasar tus datos a un
        equipo nuevo o para recuperarlos si perdiste este dispositivo.
      </p>
      <input
        type="file"
        accept="application/json,.json"
        onChange={(e) => setArchivo(e.target.files?.[0] ?? null)}
        className="block w-full text-sm text-slate-500 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm file:font-medium file:text-slate-700 dark:text-slate-400 dark:file:bg-slate-800 dark:file:text-slate-200"
      />
      <TextInput type="password" placeholder="Contraseña del backup" value={password} onChange={(e) => setPassword(e.target.value)} />
      {error && <p className="text-sm text-red-500">{error}</p>}
      <Button variant="danger" onClick={restaurar} disabled={!archivo || !password || restaurando} className="w-full">
        {restaurando ? 'Restaurando…' : 'Restaurar backup'}
      </Button>
    </Card>
  )
}
