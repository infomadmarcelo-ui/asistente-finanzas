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

' Se abre con tu navegador y perfil de siempre (el mismo que si tipeás la URL
' o abrís un favorito) — así siempre cae en el mismo lugar donde están tus
' datos reales. A propósito NO se usa "--app" (modo aplicación): ese modo
' puede quedar con un almacenamiento separado del de tus pestañas normales.
urlApp = "https://infomadmarcelo-ui.github.io/asistente-finanzas/"
objShell.Run "cmd /c start """" """ & urlApp & """", 0, False
