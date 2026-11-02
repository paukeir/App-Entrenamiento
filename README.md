# Ritmo

App personal de entrenamiento en español, adaptable a móvil. JavaScript nativo sin dependencias de ejecución. Python 3 para el servidor local y Node.js 18+ para pruebas/build (CI usa Node 24).

## Desarrollo y publicación

```sh
npm ci           # herramientas de prueba (no dependencias de la web)
npm start        # servidor en 5173
npm test         # calendario, datos, reglas y sincronización con transporte simulado
npm run build    # genera únicamente la web pública en _site
npm run test:browser # con el servidor ya activo y Chromium instalado
```

Usa el checkout existente en `/workspace/App-Entrenamiento`; no hace falta crear un worktree. Los procesos se vuelven a iniciar en cada tarea. Comprueba el servidor internamente con `curl --fail http://127.0.0.1:5173/`.

Las pruebas de navegador usan Chromium (`/usr/bin/chromium`, configurable con `CHROMIUM_PATH`) y dos contextos aislados con una API simulada. `RITMO_TEST_URL` permite probar otro servidor. No se conectan a cuentas reales.

El workflow `.github/workflows/pages.yml` ejecuta las pruebas, construye `_site` y lo publica con GitHub Pages al subir a `main`. En GitHub, Settings → Pages → Source debe ser GitHub Actions. La web es https://paukeir.github.io/App-Entrenamiento/ . No se publica el SQL ni los tests. Configuración de cuenta y base de datos: [supabase/README.md](supabase/README.md).

En iPhone, Safari → Compartir → Añadir a pantalla de inicio. Icono `r.` opaco de 180×180. Si iOS conserva el anterior, vuelve a añadir el acceso directo sin borrar los datos de Safari.

## Flujo de entrenamiento

- Hoy, semana, historial y objetivo/carreras.
- Plan previsto separado de reporte realizado; running, gimnasio y descansos.
- El martes 3/11/2026 incluye los siete ejercicios reales aportados en el chat, con pesos y repeticiones en rango, calentamiento e intensidad.
- La captura del 2–8 de noviembre se incorpora como propuesta que el usuario puede aprobar. Sábado descanso; 5K opcional y rodaje alternativo de 7–9 km el domingo. Confirmar la 5K en Mi objetivo cambia la sesión prevista del domingo. El viernes no tiene ejercicios acordados: se muestra una referencia del historial, pero hace falta editar/guardar su detalle para usarlo en continuidad automática.
- Reportes por serie, calentamiento realizado, sensaciones, esfuerzo, motivo de cambios y métricas de running. Un reporte por día.
- Fotos desplegables de los ejercicios, con dos posiciones y aviso sobre variantes de máquina/técnica. Fuente y licencia en `assets/exercises/ATTRIBUTION.md`.
- Referencias de gimnasio tomadas del plan específico; si falta, de la última sesión anterior al día, evitando usar una rutina futura como referencia.
- Los datos iniciales del gimnasio del 27/10 y la plancha de 3×60 s se conservan. Las migraciones no sustituyen planes ni duraciones ya editados.

## Continuidad automática sin IA

Se ejecuta al guardar o abrir la app; no requiere mantener el chat ni hacer llamadas de IA. No hay ejecución en segundo plano con la app cerrada. El perfil permite activar/desactivar la continuidad y confirmar o eliminar carreras.

Para generar la siguiente semana necesita una semana completa definida/aprobada, todos los reportes de sesiones previstos (completados, parciales o no realizados), distancias de running y ejercicios de gimnasio. Si falta información, lo indica y no inventa una semana.

Las reglas conservan la distribución de la semana de origen y respetan sus descansos. Mantienen las cargas salvo fatiga, esfuerzo ≥8/10 o incumplimiento: reducen running un 20% y series de fuerza. Con molestias se pausa. Dos semanas completas de sensaciones favorables y esfuerzo ≤6/10 permiten hasta un 5% de distancia adicional solo si todos los rodajes eran suaves y no hay carrera confirmada en las próximas dos semanas; no se aumenta además la intensidad. Nunca se suben automáticamente los pesos del gimnasio. Una carrera confirmada en domingo reduce los rodajes previos un 35% e incorpora su distancia real. Una carrera en otro día o varias carreras requieren ajustar la distribución manualmente.

La semana generada se marca como propuesta automática y explica su motivo. No reemplaza una semana que ya tenga algún plan o reporte, ni genera semanas en cascada. Las reglas son conservadoras y limitadas; no reproducen el razonamiento de las conversaciones previas ni sustituyen una planificación individual profesional.

## Guardado y sincronización

Sin Supabase configurado, los datos se guardan solo en este navegador (`ritmo.v1`). El botón de cuenta indica que la conexión está pendiente. Con Supabase, al entrar con la misma cuenta en ambos dispositivos se comprueban cambios cada 10 segundos, al guardar y al volver a la app. Hay combinación de cambios independientes, protección frente a escrituras obsoletas y resolución explícita de conflictos. Los cambios sin red quedan pendientes. No se actualiza un formulario mientras lo estás editando.

Exportar/restaurar JSON conserva los datos; restaurar sustituye el historial tras confirmación. Descarga copias antes de borrar los datos del navegador. La app no conecta con Strava ni lee capturas automáticamente: las métricas se transcriben manualmente. La configuración pública de Supabase no contiene claves secretas; no pongas contraseñas ni claves de IA en el frontend.
