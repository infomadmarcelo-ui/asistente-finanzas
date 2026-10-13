' Doble click: prende el servidor de sincronización (oculto, sin ventanas molestas)
' y abre la app como si fuera un programa instalado. Cerrar la app no apaga el
' servidor — para eso hay que cerrarlo desde el Administrador de tareas (buscá
' "node.exe") o reiniciar la PC.
Set objShell = CreateObject("WScript.Shell")
Set objFSO = CreateObject("Scripting.FileSystemObject")

strScriptDir = objFSO.GetParentFolderName(WScript.ScriptFullName)
strAppDir = objFSO.GetParentFolderName(strScriptDir)

objShell.CurrentDirectory = strAppDir
objShell.Run "cmd /c npm run sync-server", 0, False

WScript.Sleep 1200

' Edge viene con Windows 10/11, así que alcanza con "msedge" (Windows lo
' encuentra solo, sin necesitar la ruta completa).
urlApp = "https://infomadmarcelo-ui.github.io/asistente-finanzas/"
objShell.Run "cmd /c start msedge --app=" & urlApp, 0, False
