# Conectar iPhone y Mac con Supabase

El código está preparado; la sincronización real requiere un proyecto de Supabase propio. No hay servicio compartido oculto, ni se usan contraseñas o claves de IA de ChatGPT. Se puede empezar con el plan Free de Supabase, sujeto a sus límites y condiciones.

1. Crea una cuenta y un proyecto Free en https://supabase.com/dashboard . La contraseña de la base de datos se introduce allí; no la pegues en el chat, GitHub ni la app.
2. En **SQL Editor**, abre una consulta nueva, pega el contenido de `supabase/setup.sql` y ejecútalo. Crea la tabla y las políticas por usuario. Es seguro volver a ejecutar este script para reinstalar las políticas.
3. En **Authentication → URL Configuration**, establece el Site URL en `https://paukeir.github.io/App-Entrenamiento/`. En **Authentication → Providers**, habilita Email con contraseña y confirmación del correo.
4. Copia el Project URL y la clave **Publishable** (`sb_publishable_…`). El Project URL suele aparecer en Connect; la clave en Settings → API Keys. También se admite la clave pública heredada `anon`. Son datos de configuración públicos, protegidos por las políticas de acceso. Nunca uses `service_role`, `sb_secret_…` ni la contraseña de la base de datos en el frontend.
5. En GitHub, `paukeir/App-Entrenamiento` → **Settings → Secrets and variables → Actions → Variables**, crea estas dos variables de repositorio:
   - `SUPABASE_URL`: el Project URL, por ejemplo `https://tu-proyecto.supabase.co`.
   - `SUPABASE_PUBLISHABLE_KEY`: la clave pública Publishable.
6. Ejecuta **Actions → Publicar Ritmo en GitHub Pages → Run workflow → main**. El build incorpora solo la configuración pública a la web. Sin las dos variables, la app sigue en modo local y muestra que la conexión está pendiente; una configuración parcial o una clave secreta hace fallar el build.
7. En la app pulsa **Conectar iPhone y Mac**, crea tu cuenta de entrenamiento y confirma el correo. Entra con el mismo correo y contraseña desde el iPhone y el Mac. Se leen primero los datos de la cuenta antes de combinarlos con los del dispositivo.

También se puede configurar `app-config.js` para desarrollo local con esos mismos dos valores públicos, sin contraseñas ni credenciales de servidor. Para probar el build con variables locales: `npm run build`; sirve `_site` con un servidor HTTP.

## Qué se conserva y cómo verificarlo

- Los cambios se envían al guardar; se comprueban novedades cada 10 segundos con la app visible, al recuperar conexión y al volver a la app. Esto no es una sincronización instantánea por WebSocket.
- Sin red, los cambios permanecen en el dispositivo. Volver a conectar los envía.
- Cada cuenta tiene una fila protegida por RLS. La revisión se compara al actualizar: una escritura obsoleta no puede sobreescribir una más reciente.
- Se combinan planes de días distintos y reportes distintos. Si ambos dispositivos cambian la misma sesión de forma diferente, la app pide elegir una versión. Antes de resolver guarda una copia de ambas en el navegador (`ritmo.conflict-backup.…`). Guarda también la última copia anterior a recibir cambios (`ritmo.before-sync.…`). La exportación habitual incluye el historial activo; para conservar ambas versiones antes de elegir, descarga la copia de cada dispositivo.
- Al cerrar sesión se conserva una copia local separada por cuenta para no perder cambios aún no enviados, y se retira el historial de la vista principal. Volver a entrar en la misma cuenta recupera esa copia. Iniciar otra cuenta no sube los reportes de la anterior.
- No hay garantía de conservación local si se borran los datos del navegador; usa Descargar copia antes de hacerlo.

Después de configurar el proyecto, verifica con dos dispositivos: inicia la misma cuenta; edita un día en el Mac y espera a que aparezca en el iPhone; añade un reporte en el iPhone y comprueba el Mac; cierra y abre la app; prueba una edición sin conexión y su posterior envío. Prueba también dos cuentas diferentes para confirmar que no ven los datos de la otra. Las pruebas automatizadas usan un transporte simulado: no certifican un proyecto real hasta realizar estas comprobaciones.

## Alcance

La cuenta, el perfil, las carreras, los planes y los reportes se almacenan juntos en el documento privado de cada usuario. Las reglas de entrenamiento se ejecutan en la app, sin API de IA ni cargos por tokens. La aplicación no lee conversaciones de ChatGPT. Las fotos de referencia y los datos iniciales incorporados al código siguen siendo archivos públicos en GitHub Pages; los reportes que se guardan en la cuenta no se publican en GitHub.
