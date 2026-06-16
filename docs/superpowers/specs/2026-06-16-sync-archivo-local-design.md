# Diseño: Sustituir Supabase por sync de archivo local (OneDrive)

**Fecha:** 2026-06-16
**Estado:** Aprobado (diseño), pendiente de plan de implementación

## Contexto y motivación

La app ganó en algún momento una capa de sincronización basada en **Supabase** (cuentas
email/contraseña + tabla `progress` que guarda un blob de `localStorage`). Esto contradice las
restricciones canónicas originales del `CLAUDE.md` ("sin backend, sin cuentas, sin sync").

Hugo quiere retirar Supabase por cuatro motivos, todos marcados explícitamente:

1. **Datos en servidor de terceros** — prefiere que su progreso viva en su propio almacenamiento.
2. **Cuentas y login molestan** — el registro email/contraseña sobra para una app personal.
3. **Dependencia de un servicio externo** — le preocupa que Supabase cambie, deje de ser gratis o se caiga.
4. **Complejidad / mantenimiento** — quiere menos piezas (claves, tablas, tokens).

**Restricción real:** Hugo usa la app en **dos equipos Windows** (sobremesa y portátil), ambos con
**el mismo OneDrive** configurado, y quiere mantener el progreso sincronizado entre ellos.

### Tensión de diseño

Sincronizar automáticamente, en segundo plano, entre dos dispositivos separados exige un
intermediario con identidad (servidor + cuentas) — justo lo que se quiere eliminar. La solución
acordada renuncia al "automático mágico de fondo" y lo sustituye por un **sync semi-automático
mediante un archivo en una carpeta sincronizada por OneDrive**, accedido con la
**File System Access API** de los navegadores Chromium.

> Corrección de un malentendido inicial: **no** hace falta convertir la web en app instalable
> (PWA/Electron) para escribir en disco. La File System Access API funciona en una web normal
> servida por HTTPS (GitHub Pages incluido), en Chrome/Edge de escritorio.

## Objetivo

Eliminar por completo Supabase y reemplazar la sincronización por un sistema de archivo local que
cumpla las cuatro objeciones, manteniendo un sync casi automático entre los dos equipos de Hugo.

## Alcance

**Dentro:**
- Borrado de Supabase (cliente, auth, script CDN, modal de cuentas/login).
- Nuevo módulo `js/sync.js` que persiste un *handle* de archivo y hace push/pull a ese archivo.
- Botón de sync en el home + mini-panel de estado.
- Push silencioso al terminar ejercicios/lección/volver al home (reemplaza el push a Supabase).
- Pull silencioso al abrir (con fallback a botón si el navegador pide reconfirmar permiso).
- Actualización del `CLAUDE.md` para reflejar el nuevo subsistema.

**Fuera (YAGNI):**
- Merge ítem-por-ítem de progreso (se usa last-write-wins a nivel de archivo).
- Soporte de Firefox/Safari o móvil (Hugo usa Chrome/Edge en dos PCs).
- Conversión a PWA / app instalable (independiente; no es necesaria para esto).
- Cualquier sync automático en background sin gesto.

## Arquitectura

### Qué se elimina

- `js/supabase-client.js` — eliminado.
- `js/auth.js` — eliminado (su lógica reutilizable, `collectProgress`/`applyProgress`, se mueve a `sync.js`).
- `index.html` — se quita el `<script>` del CDN `@supabase/supabase-js`.
- El botón `#home-auth` ("👤 Iniciar sesión") y todo el modal de cuentas/login (`.auth-*`).
- (Acción manual de Hugo, fuera del código: borrar el proyecto en supabase.com.)

### Qué se crea: `js/sync.js`

Reemplaza a `auth.js`. API pública:

- `connectFile()` — abre `showSaveFilePicker`/`showOpenFilePicker` para elegir/crear
  `progreso.json` en la carpeta de OneDrive. Persiste el `FileSystemFileHandle` en **IndexedDB**
  (no cabe en `localStorage`).
- `pushProgress()` — serializa todas las claves `jp_n5_*` (vía `collectProgress()`) más un
  timestamp global y las escribe en el archivo. Mantiene el nombre actual para minimizar cambios
  en los importadores.
- `pullProgress()` — lee el archivo, y si su timestamp es más reciente que la última subida local,
  aplica las claves a `localStorage` (vía `applyProgress()`).
- `initSyncButton()` — reemplaza a `initAuthButton()`: monta el botón de sync del home y, al
  arrancar, intenta el pull silencioso.
- Helpers internos para IndexedDB (guardar/leer handle) y para `queryPermission`/`requestPermission`.

### Puntos de integración (cambios mínimos en importadores)

| Archivo | Cambio |
|---|---|
| `index.html` | Quitar `<script>` de Supabase CDN |
| `js/app.js` | `import` de `./auth.js` → `./sync.js`; `pushProgress()` al volver al home se mantiene |
| `js/exercise.js` | `import` de `./auth.js` → `./sync.js`; `pushProgress()` al final de sesión se mantiene |
| `js/lessons.js` | `import` dinámico de `./auth.js` → `./sync.js`; `pushProgress()` se mantiene |
| `js/home.js` | `import` `initAuthButton` → `initSyncButton`; reemplazar botón `#home-auth` por botón de sync; ajustar markup del panel |
| `css/styles.css` | Reutilizar/renombrar estilos `.auth-*` para el panel de sync; limpiar lo sobrante |

## Flujo de datos

- **Al terminar ejercicios / lección / volver al home** → `pushProgress()` silencioso escribe al
  archivo. OneDrive sube el archivo a la nube solo.
- **Al abrir la app** (`initSyncButton`):
  - Si hay handle en IndexedDB y `queryPermission({mode:'read'}) === 'granted'` → `pullProgress()`
    silencioso (aplica solo si el archivo es más reciente).
  - Si el permiso está en `prompt` → no se carga solo; se muestra un botón discreto en el home
    ("↻ Conectar OneDrive") que al pulsarse hace `requestPermission()` + `pullProgress()`.
  - Si no hay handle → el botón de sync invita a `connectFile()`.
- **Panel de sync** (sustituye al modal de cuenta): estado del archivo (conectado/no), última
  sincronización (`jp_n5_last_sync`), y botones Conectar / Subir / Descargar / Desconectar.

## Resolución de conflictos: last-write-wins a nivel de archivo

El archivo incluye un campo de timestamp global de escritura. En el pull, si el timestamp del
archivo es **más reciente** que la última subida local registrada, se aplica todo el contenido;
si no, se ignora.

- **Ventaja:** simple, predecible, sin lógica frágil de merge.
- **Riesgo aceptado:** solo se perdería progreso si Hugo estudia en los dos equipos *a la vez* sin
  dejar que OneDrive sincronice entre medias (mismo caso que un "archivo en conflicto" de OneDrive).
  Para uso secuencial de una persona, es suficiente.

El merge ítem-por-ítem (combinar tarjeta a tarjeta por `lastSeen`) queda descartado por YAGNI.

## Manejo de errores

- **Navegador sin File System Access API** (Firefox/Safari): detección de capacidad; el panel de
  sync muestra un aviso "Tu navegador no soporta sync por archivo; usa Chrome/Edge" y deja
  disponible el export/import manual JSON ya existente (`exportAll`/`importAll` en `storage.js`)
  como salida de emergencia.
- **Permiso denegado / revocado**: el pull/push falla con elegancia; el panel muestra
  "Reconecta el archivo" y deja reintentar `connectFile()`.
- **Archivo borrado/movido en OneDrive**: la lectura lanza; se captura, se invalida el handle
  guardado y se invita a reconectar.
- **JSON corrupto**: `pullProgress()` valida que el parseo y la forma sean correctos antes de
  aplicar; si falla, no toca `localStorage` y avisa.
- Toda escritura silenciosa (`pushProgress` automático) que falle no debe interrumpir el estudio:
  se registra y se actualiza el estado del panel, sin modal intrusivo.

## Tests

- **Lógica pura (runner casero `test/`):** `collectProgress`/`applyProgress` (round-trip de claves
  `jp_n5_*`) y la comparación de timestamps de last-write-wins.
- **Dependiente de Web APIs (verificación manual en Chrome/Edge real):** picker, persistencia del
  handle en IndexedDB, `queryPermission`/`requestPermission`, pull al abrir, push silencioso. El
  `CLAUDE.md` ya exige verificar en navegador real toda lógica que dependa de `window.*`/DOM/Web APIs.

## Actualización de documentación

`CLAUDE.md`:
- Ajustar la restricción canónica nº 2 ("sin backend, sin cuentas, sin sync"): sigue sin backend
  y sin cuentas, pero ahora hay un sync **local** opcional por archivo (no nube de terceros).
- Añadir `js/sync.js` a la sección de subsistemas, describiendo el flujo de archivo + OneDrive +
  last-write-wins y la limitación de navegador (Chromium escritorio).
