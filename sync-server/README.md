# Servidor de sincronización local

Conecta la app de la PC con la del celular por WiFi local para sincronizar datos,
sin pasar por internet y sin que el servidor guarde nada — solo hace de puente
entre las dos pestañas mientras dura la sincronización.

## Configuración inicial (una sola vez)

1. Instalar `mkcert` (ya lo tenés si seguiste esta guía con Claude) y generar el
   certificado para la IP de esta PC en la red WiFi de casa:

   ```
   cd sync-server/certs
   mkcert -cert-file lan-cert.pem -key-file lan-key.pem localhost 127.0.0.1 <IP-DE-LA-PC>
   ```

   La IP de la PC se ve con `ipconfig` (buscá "Dirección IPv4" de la placa WiFi).

2. Pasar el certificado raíz al celular e instalarlo, para que el celular confíe
   en el certificado de la PC:
   - El archivo está en `mkcert -CAROOT` (normalmente
     `C:\Users\<usuario>\AppData\Local\mkcert\rootCA.pem`).
   - Pasalo al celular por cable USB (como cuando pasás fotos) — es un paso único.
   - En Android: `Ajustes → Seguridad → Más ajustes de seguridad → Encriptación
     y credenciales → Instalar un certificado → Certificado de CA`, elegís el
     archivo `rootCA.pem`.
   - En iPhone: mandátelo por AirDrop/cable, abrilo para instalar el perfil
     (`Ajustes → Perfil descargado → Instalar`), y después activá la confianza
     completa en `Ajustes → General → Información → Ajustes de confianza de
     certificados`.

## Uso normal

1. En la PC, con las dos apps conectadas a la misma WiFi: `npm run sync-server`
   (o doble click en `iniciar.bat`). Dejalo abierto mientras sincronizás.
2. Abrí la app en la PC → "Sincronizar" → te muestra un QR.
3. Abrí la app en el celular → "Sincronizar" → escanear QR.
4. Listo — cuando termina te dice cuántos cambios se aplicaron en cada lado.

## Si cambia la IP de la PC

Si la PC cambió de red o el router le asignó otra IP, hay que regenerar el
certificado (paso 1 de arriba) con la IP nueva — el celular no necesita
reinstalar nada, el certificado raíz sigue sirviendo.

## Windows Firewall

La primera vez que arranca el servidor, Windows puede preguntar si permitís que
Node.js reciba conexiones en la red — hay que aceptar (al menos para "Redes
privadas") para que el celular pueda conectarse.
