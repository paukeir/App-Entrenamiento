# Ritmo

Primera versión de una app personal de entrenamiento, en español y adaptable al móvil. JavaScript nativo, sin dependencias de instalación. Requiere Python 3 y Node.js 18+ para las pruebas.

## Desarrollo

Desde `/workspace/App-Entrenamiento`:

```sh
npm start
# Servidor HTTP en el puerto 5173
npm test
```

En el entorno cloud usa el checkout existente; no hace falta crear un worktree. Los procesos deben arrancarse de nuevo en cada sesión. Para comprobar el servidor internamente: `curl --fail http://127.0.0.1:5173/`.

## Publicar con GitHub Pages

Sube el proyecto completo a la rama `main` de `paukeir/App-Entrenamiento`. En GitHub, abre **Settings → Pages → Build and deployment → Source** y selecciona **GitHub Actions**. El workflow `.github/workflows/pages.yml` ejecuta las pruebas y publica solo `index.html`, `style.css`, `app.js` y `model.js`. Si el push ocurrió antes de activar Pages, ejecuta manualmente **Actions → Publicar Ritmo en GitHub Pages → Run workflow**.

La URL prevista es `https://paukeir.github.io/App-Entrenamiento/`; confirma el enlace y el resultado de la publicación en GitHub antes de usarla. Preparar el workflow localmente no sube código ni activa Pages.

En iPhone, abre la web en Safari y elige **Compartir → Añadir a pantalla de inicio**. El icono usa el logo `r.` de Ritmo, en PNG opaco de 180×180. Si el acceso directo ya existía, puede ser necesario eliminarlo y volver a añadirlo para renovar el icono que iOS guarda en caché. No borres los datos de Safari; puedes descargar una copia de tus reportes antes de renovar el acceso directo.

Pages sirve la app como web estática: no incorpora inicio de sesión ni sincronización entre dispositivos. Los registros iniciales incluidos en `model.js` son accesibles a quienes puedan abrir la web. Los reportes nuevos se guardan únicamente en el navegador donde se introducen.

## Funciones

- Hoy, calendario con navegación semanal e historial.
- Plantilla semanal: lunes y miércoles descanso, martes gimnasio, jueves y sábado running, viernes gimnasio y domingo tirada larga. El reparto es editable; no prescribe kilómetros, intensidad ni progresiones.
- Plan y reporte separados. Reportes completados, parciales o no realizados; sensaciones, esfuerzo percibido y motivo de cambios.
- Running con métricas y parciales transcritos manualmente.
- Gimnasio con referencia anterior, calentamiento realizado y peso/repeticiones por serie; se pueden añadir o quitar series. Para la plancha se registran segundos.
- Guardado local, exportación/restauración JSON y resumen semanal para compartir.

Los ejemplos iniciales son los datos aportados por el usuario: carrera del 29/10 (año 2026 asumido y editable) y gimnasio del 27/10/2026 con plancha de 3×60 segundos, confirmados por el usuario. La corrección se aplica una sola vez al registro inicial de copias anteriores, conservando las fechas y duraciones ya editadas; si el 27/10 ya está ocupado, no se fuerza una fecha duplicada. La observación «puedo subirle» no cambia las cargas.

## Alcance y datos

Los datos viven en `localStorage` bajo `ritmo.v1`, en este navegador y origen. No hay cuenta, servidor de datos, sincronización ni conexión con Strava o IA/OCR. Descarga copias antes de borrar datos del navegador o cambiar de dispositivo. La restauración sustituye el conjunto de datos tras confirmación. Esta versión admite un reporte por día. Las fuentes usan la tipografía del sistema, sin peticiones externas.

La app no genera planes automáticos ni interpreta una FC aislada como evaluación de recuperación. El resumen permite revisar los reportes antes de decidir la siguiente planificación.
