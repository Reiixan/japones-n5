# Sync de archivo local (OneDrive) — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminar Supabase y sincronizar el progreso entre los dos PCs de Hugo mediante un archivo `progreso.json` en su carpeta de OneDrive, usando la File System Access API.

**Architecture:** La lógica pura (recolección de `localStorage`, construcción/parseo del payload, regla last-write-wins) vive en `js/sync-core.js` y es testeable en el runner casero. El acceso a disco (picker, permisos, lectura/escritura) y el persistido del *handle* en IndexedDB viven en `js/sync.js` e `js/idb-handle.js`, verificables a mano en Chrome/Edge. Los módulos que hoy importan `auth.js` (`app.js`, `exercise.js`, `lessons.js`, `home.js`) pasan a importar `sync.js` conservando los nombres `pushProgress`/`pullProgress`.

**Tech Stack:** Vanilla JS (ES modules, sin build), File System Access API, IndexedDB, runner de tests casero en `test/`.

---

## Estructura de archivos

| Archivo | Responsabilidad |
|---|---|
| `js/sync-core.js` (crear) | Lógica pura: `collectProgress`, `applyProgress`, `buildPayload`, `parsePayload`, `shouldApplyRemote`. Sin Web APIs de disco. |
| `js/idb-handle.js` (crear) | Persistir el `FileSystemFileHandle` en IndexedDB: `saveHandle`, `loadHandle`, `clearHandle`. |
| `js/sync.js` (crear) | Orquestación: `connectFile`, `openExistingFile`, `pushProgress`, `pullProgress`, `initSyncButton`, `openSyncModal`. Usa los dos anteriores + File System Access API. |
| `js/auth.js` (borrar) | Reemplazado por `sync.js`. |
| `js/supabase-client.js` (borrar) | Ya no se usa. |
| `index.html` (modificar) | Quitar `<script>` del CDN de Supabase. |
| `js/app.js` (modificar) | `import` de `./auth.js` → `./sync.js`. |
| `js/exercise.js` (modificar) | `import` de `./auth.js` → `./sync.js`. |
| `js/lessons.js` (modificar) | `import` dinámico de `./auth.js` → `./sync.js`. |
| `js/home.js` (modificar) | `initAuthButton` → `initSyncButton`; botón `#home-auth` → botón de sync. |
| `css/styles.css` (modificar) | Limpieza opcional de clases `.auth-*` muertas (login/tabs/email). |
| `CLAUDE.md` (modificar) | Actualizar restricción nº 2 y añadir `js/sync.js` a subsistemas. |
| `test/sync-core.test.js` (crear) | Tests de la lógica pura. |
| `test/index.html` (modificar) | Registrar `sync-core.test.js`. |

**Formato del payload del archivo:**
```json
{ "version": 1, "updatedAt": 1718539200000, "data": { "jp_n5_v2.vocab.123": {"box":2}, "...": "..." } }
```
`updatedAt` es `Date.now()` en el momento del push. La regla last-write-wins compara `updatedAt` del
archivo contra la marca local `jp_n5_last_sync` (en ms).

---

## Task 1: Lógica pura de sync-core (recolección y aplicación)

**Files:**
- Create: `js/sync-core.js`
- Test: `test/sync-core.test.js`
- Modify: `test/index.html`

- [ ] **Step 1: Escribir el test que falla**

Crear `test/sync-core.test.js`:

```js
import { describe, it, assert, assertEqual } from './runner.js';

function clearJpKeys() {
  for (let i = localStorage.length - 1; i >= 0; i--) {
    const k = localStorage.key(i);
    if (k && k.startsWith('jp_n5_')) localStorage.removeItem(k);
  }
}

describe('sync-core.collectProgress', () => {
  it('recoge solo claves jp_n5_* y parsea JSON', async () => {
    clearJpKeys();
    localStorage.setItem('jp_n5_v2.vocab.1', JSON.stringify({ box: 2 }));
    localStorage.setItem('jp_n5_theme', 'dark');
    localStorage.setItem('otra_cosa', 'no');
    const { collectProgress } = await import('../js/sync-core.js?c=c1');
    const out = collectProgress();
    assertEqual(out['jp_n5_v2.vocab.1'].box, 2);
    assertEqual(out['jp_n5_theme'], 'dark');
    assert(!('otra_cosa' in out), 'no debe incluir claves ajenas');
    clearJpKeys();
  });
});

describe('sync-core.applyProgress', () => {
  it('escribe claves jp_n5_* en localStorage', async () => {
    clearJpKeys();
    const { applyProgress } = await import('../js/sync-core.js?c=c2');
    applyProgress({ 'jp_n5_v2.kanji.5': { box: 3 }, 'jp_n5_goal': 30, 'malo': 1 });
    assertEqual(JSON.parse(localStorage.getItem('jp_n5_v2.kanji.5')).box, 3);
    assertEqual(localStorage.getItem('jp_n5_goal'), '30');
    assert(localStorage.getItem('malo') === null, 'no aplica claves ajenas');
    clearJpKeys();
  });
});
```

- [ ] **Step 2: Registrar el test en el runner**

En `test/index.html`, añadir tras la línea `await import('./lessons.test.js');`:

```js
    await import('./sync-core.test.js');
```

- [ ] **Step 3: Verificar que falla**

Abrir `http://localhost:8765/test/` (o el runner en GitHub Pages). Esperado: los tests de
`sync-core` fallan con error de import (módulo inexistente).

- [ ] **Step 4: Implementación mínima**

Crear `js/sync-core.js`:

```js
// Lógica pura de sincronización: sin acceso a disco ni Web APIs.

const PREFIX = 'jp_n5_';

// Recoge todas las claves jp_n5_* de localStorage, parseando JSON cuando se puede.
export function collectProgress() {
  const result = {};
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(PREFIX)) {
      const raw = localStorage.getItem(key);
      try { result[key] = JSON.parse(raw); }
      catch { result[key] = raw; }
    }
  }
  return result;
}

// Aplica un objeto {clave: valor} a localStorage, solo para claves jp_n5_*.
export function applyProgress(data) {
  for (const [key, value] of Object.entries(data || {})) {
    if (key.startsWith(PREFIX)) {
      localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
    }
  }
}
```

- [ ] **Step 5: Verificar que pasa**

Recargar el runner. Esperado: los dos tests de `sync-core` en verde.

- [ ] **Step 6: Commit**

```bash
git add js/sync-core.js test/sync-core.test.js test/index.html
git commit -m "feat: sync-core con collectProgress/applyProgress y sus tests"
```

---

## Task 2: Payload y regla last-write-wins en sync-core

**Files:**
- Modify: `js/sync-core.js`
- Test: `test/sync-core.test.js`

- [ ] **Step 1: Escribir el test que falla**

Añadir al final de `test/sync-core.test.js`:

```js
describe('sync-core.buildPayload / parsePayload', () => {
  it('build genera version, updatedAt y data', async () => {
    const { buildPayload } = await import('../js/sync-core.js?c=c3');
    const p = buildPayload({ 'jp_n5_x': 1 }, 1718539200000);
    assertEqual(p.version, 1);
    assertEqual(p.updatedAt, 1718539200000);
    assertEqual(p.data['jp_n5_x'], 1);
  });
  it('parse acepta payload válido', async () => {
    const { parsePayload } = await import('../js/sync-core.js?c=c4');
    const text = JSON.stringify({ version: 1, updatedAt: 5, data: { a: 1 } });
    const p = parsePayload(text);
    assertEqual(p.updatedAt, 5);
    assertEqual(p.data.a, 1);
  });
  it('parse lanza con JSON corrupto', async () => {
    const { parsePayload } = await import('../js/sync-core.js?c=c5');
    let threw = false;
    try { parsePayload('{no es json'); } catch (_) { threw = true; }
    assert(threw, 'debe lanzar con JSON corrupto');
  });
  it('parse lanza si falta data', async () => {
    const { parsePayload } = await import('../js/sync-core.js?c=c6');
    let threw = false;
    try { parsePayload(JSON.stringify({ version: 1, updatedAt: 5 })); } catch (_) { threw = true; }
    assert(threw, 'debe lanzar si no hay data');
  });
});

describe('sync-core.shouldApplyRemote', () => {
  it('aplica si el remoto es más nuevo', async () => {
    const { shouldApplyRemote } = await import('../js/sync-core.js?c=c7');
    assert(shouldApplyRemote(100, 50) === true, 'remoto 100 > local 50');
  });
  it('no aplica si el remoto es igual o más viejo', async () => {
    const { shouldApplyRemote } = await import('../js/sync-core.js?c=c8');
    assert(shouldApplyRemote(50, 50) === false, 'igual no aplica');
    assert(shouldApplyRemote(10, 50) === false, 'más viejo no aplica');
  });
  it('aplica si no hay sync local previo (0)', async () => {
    const { shouldApplyRemote } = await import('../js/sync-core.js?c=c9');
    assert(shouldApplyRemote(10, 0) === true, 'sin sync previo, aplica');
  });
});
```

- [ ] **Step 2: Verificar que falla**

Recargar el runner. Esperado: los nuevos tests fallan (funciones inexistentes).

- [ ] **Step 3: Implementación mínima**

Añadir a `js/sync-core.js`:

```js
const PAYLOAD_VERSION = 1;

// Construye el objeto que se serializa al archivo.
export function buildPayload(data, updatedAt) {
  return { version: PAYLOAD_VERSION, updatedAt, data };
}

// Parsea y valida el texto del archivo. Lanza si es inválido.
export function parsePayload(text) {
  const obj = JSON.parse(text); // lanza con JSON corrupto
  if (!obj || typeof obj !== 'object' || typeof obj.data !== 'object' || obj.data === null) {
    throw new Error('Payload de sync inválido: falta data');
  }
  if (typeof obj.updatedAt !== 'number') obj.updatedAt = 0;
  return obj;
}

// Last-write-wins a nivel de archivo: aplicar solo si el remoto es estrictamente más nuevo.
export function shouldApplyRemote(remoteUpdatedAt, localLastSyncMs) {
  return (remoteUpdatedAt || 0) > (localLastSyncMs || 0);
}
```

- [ ] **Step 4: Verificar que pasa**

Recargar el runner. Esperado: todos los tests de `sync-core` en verde.

- [ ] **Step 5: Commit**

```bash
git add js/sync-core.js test/sync-core.test.js
git commit -m "feat: payload y regla last-write-wins en sync-core"
```

---

## Task 3: Persistencia del handle en IndexedDB

**Files:**
- Create: `js/idb-handle.js`
- Test: `test/idb-handle.test.js`
- Modify: `test/index.html`

> IndexedDB existe en el navegador donde corre el runner, así que esto es testeable guardando un
> objeto serializable cualquiera (no hace falta un `FileSystemFileHandle` real).

- [ ] **Step 1: Escribir el test que falla**

Crear `test/idb-handle.test.js`:

```js
import { describe, it, assert, assertEqual } from './runner.js';

describe('idb-handle round-trip', () => {
  it('guarda, lee y borra un valor', async () => {
    const mod = await import('../js/idb-handle.js?c=i1');
    await mod.clearHandle();
    assert((await mod.loadHandle()) === null, 'empieza vacío');
    await mod.saveHandle({ marca: 'test-handle' });
    const got = await mod.loadHandle();
    assertEqual(got.marca, 'test-handle');
    await mod.clearHandle();
    assert((await mod.loadHandle()) === null, 'queda vacío tras borrar');
  });
});
```

- [ ] **Step 2: Registrar el test**

En `test/index.html`, añadir tras `await import('./sync-core.test.js');`:

```js
    await import('./idb-handle.test.js');
```

- [ ] **Step 3: Verificar que falla**

Recargar el runner. Esperado: falla por módulo inexistente.

- [ ] **Step 4: Implementación mínima**

Crear `js/idb-handle.js`:

```js
// Persiste un único FileSystemFileHandle en IndexedDB (no cabe en localStorage).

const DB_NAME = 'jp_n5_sync';
const STORE = 'handles';
const KEY = 'progress-file';

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) {
        req.result.createObjectStore(STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function tx(db, mode) {
  return db.transaction(STORE, mode).objectStore(STORE);
}

export async function saveHandle(handle) {
  const db = await openDb();
  await new Promise((resolve, reject) => {
    const req = tx(db, 'readwrite').put(handle, KEY);
    req.onsuccess = resolve;
    req.onerror = () => reject(req.error);
  });
  db.close();
}

export async function loadHandle() {
  const db = await openDb();
  const result = await new Promise((resolve, reject) => {
    const req = tx(db, 'readonly').get(KEY);
    req.onsuccess = () => resolve(req.result ?? null);
    req.onerror = () => reject(req.error);
  });
  db.close();
  return result;
}

export async function clearHandle() {
  const db = await openDb();
  await new Promise((resolve, reject) => {
    const req = tx(db, 'readwrite').delete(KEY);
    req.onsuccess = resolve;
    req.onerror = () => reject(req.error);
  });
  db.close();
}
```

- [ ] **Step 5: Verificar que pasa**

Recargar el runner. Esperado: el test de `idb-handle` en verde.

- [ ] **Step 6: Commit**

```bash
git add js/idb-handle.js test/idb-handle.test.js test/index.html
git commit -m "feat: persistencia del handle de archivo en IndexedDB"
```

---

## Task 4: Módulo sync.js — conectar archivo, push y pull

**Files:**
- Create: `js/sync.js`

> Estas funciones dependen de la File System Access API y de un gesto del usuario (picker/permiso),
> por lo que **no** llevan test automatizado: se verifican a mano en Chrome/Edge (ver Task 7).

- [ ] **Step 1: Implementar `js/sync.js` (parte de datos)**

Crear `js/sync.js`:

```js
import { collectProgress, applyProgress, buildPayload, parsePayload, shouldApplyRemote } from './sync-core.js';
import { saveHandle, loadHandle, clearHandle } from './idb-handle.js';

const LAST_SYNC_KEY = 'jp_n5_last_sync_ms';

export function isSupported() {
  return typeof window.showSaveFilePicker === 'function'
    && typeof window.showOpenFilePicker === 'function';
}

function getLastSyncMs() {
  return Number(localStorage.getItem(LAST_SYNC_KEY) || 0);
}

function setLastSyncMs(ms) {
  localStorage.setItem(LAST_SYNC_KEY, String(ms));
}

// Crea/elige un archivo nuevo de sync (equipo primario, primera vez).
export async function connectFile() {
  const handle = await window.showSaveFilePicker({
    suggestedName: 'progreso.json',
    types: [{ description: 'Progreso japonés N5', accept: { 'application/json': ['.json'] } }],
  });
  await saveHandle(handle);
  await pushProgress();
  return true;
}

// Abre un archivo de sync existente (equipo secundario / reconectar).
export async function openExistingFile() {
  const [handle] = await window.showOpenFilePicker({
    types: [{ description: 'Progreso japonés N5', accept: { 'application/json': ['.json'] } }],
    multiple: false,
  });
  await saveHandle(handle);
  await pullProgress({ force: true });
  return true;
}

async function ensurePermission(handle, mode) {
  if (!handle) return false;
  const opts = { mode };
  if ((await handle.queryPermission(opts)) === 'granted') return true;
  return (await handle.requestPermission(opts)) === 'granted';
}

// Escribe el progreso local al archivo. Silencioso: no lanza modales.
export async function pushProgress() {
  try {
    const handle = await loadHandle();
    if (!handle) return false;
    if (!(await ensurePermission(handle, 'readwrite'))) return false;
    const now = Date.now();
    const payload = buildPayload(collectProgress(), now);
    const writable = await handle.createWritable();
    await writable.write(JSON.stringify(payload));
    await writable.close();
    setLastSyncMs(now);
    return true;
  } catch (err) {
    console.warn('pushProgress falló:', err);
    return false;
  }
}

// Lee el archivo y aplica si es más nuevo (o si force === true).
export async function pullProgress({ force = false } = {}) {
  try {
    const handle = await loadHandle();
    if (!handle) return false;
    if (!(await ensurePermission(handle, 'read'))) return false;
    const file = await handle.getFile();
    const text = await file.text();
    const payload = parsePayload(text);
    if (!force && !shouldApplyRemote(payload.updatedAt, getLastSyncMs())) return false;
    applyProgress(payload.data);
    setLastSyncMs(payload.updatedAt || Date.now());
    return true;
  } catch (err) {
    console.warn('pullProgress falló:', err);
    return false;
  }
}

export async function disconnect() {
  await clearHandle();
  localStorage.removeItem(LAST_SYNC_KEY);
}
```

- [ ] **Step 2: Commit**

```bash
git add js/sync.js
git commit -m "feat: sync.js con connectFile/openExistingFile/push/pull"
```

---

## Task 5: Botón de sync y panel en sync.js

**Files:**
- Modify: `js/sync.js`

> El panel reutiliza las clases CSS existentes `.auth-modal-*` (no se borran todavía). Verificación
> manual en Task 7.

- [ ] **Step 1: Añadir UI a `js/sync.js`**

Añadir al final de `js/sync.js`:

```js
function fmtLastSync() {
  const ms = getLastSyncMs();
  if (!ms) return 'Sin sincronizar';
  return 'Última sync: ' + new Date(ms).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' });
}

export function openSyncModal() {
  document.querySelector('.auth-modal-overlay')?.remove();
  const overlay = document.createElement('div');
  overlay.className = 'auth-modal-overlay';
  document.body.appendChild(overlay);
  const close = () => overlay.remove();
  overlay.addEventListener('click', e => { if (e.target === overlay) close(); });

  if (!isSupported()) {
    overlay.innerHTML = `<div class="auth-modal">
      <div class="auth-modal-header">
        <div class="auth-modal-title">Sincronización</div>
        <button class="btn-icon auth-close" aria-label="Cerrar">✕</button>
      </div>
      <p class="auth-confirm-msg">Tu navegador no soporta sync por archivo.
      Usa Chrome o Edge de escritorio. Mientras tanto puedes exportar/importar
      tu progreso manualmente desde Estadísticas.</p>
    </div>`;
    overlay.querySelector('.auth-close').addEventListener('click', close);
    return;
  }

  loadHandle().then(handle => {
    overlay.innerHTML = `<div class="auth-modal">
      <div class="auth-modal-header">
        <div class="auth-modal-title">Sincronización</div>
        <button class="btn-icon auth-close" aria-label="Cerrar">✕</button>
      </div>
      <div class="auth-user-info">
        <div class="auth-user-email">${handle ? '📄 Archivo conectado' : 'Sin archivo de sync'}</div>
        <div class="auth-sync-row">
          ${handle
            ? `<button class="auth-btn-secondary" id="sync-push">↑ Subir</button>
               <button class="auth-btn-secondary" id="sync-pull">↓ Descargar</button>`
            : `<button class="auth-btn-secondary" id="sync-new">Crear archivo</button>
               <button class="auth-btn-secondary" id="sync-open">Abrir existente</button>`}
        </div>
        <div class="auth-sync-status" id="sync-status">${fmtLastSync()}</div>
        ${handle ? `<button class="auth-btn-danger" id="sync-disconnect">Desconectar</button>` : ''}
      </div>
    </div>`;
    overlay.querySelector('.auth-close').addEventListener('click', close);
    const statusEl = overlay.querySelector('#sync-status');
    const wrap = async (fn, okMsg) => {
      statusEl.textContent = 'Procesando…';
      const ok = await fn();
      statusEl.textContent = ok ? okMsg : 'No se pudo completar.';
      _updateSyncButton();
    };

    overlay.querySelector('#sync-new')?.addEventListener('click', () =>
      wrap(connectFile, 'Archivo creado y subido.').then(() => openSyncModal()));
    overlay.querySelector('#sync-open')?.addEventListener('click', () =>
      wrap(openExistingFile, 'Archivo abierto y descargado.').then(() => { close(); window.navigate('/'); }));
    overlay.querySelector('#sync-push')?.addEventListener('click', () =>
      wrap(pushProgress, 'Subido: ' + fmtLastSync()));
    overlay.querySelector('#sync-pull')?.addEventListener('click', () =>
      wrap(() => pullProgress({ force: true }), 'Descargado.').then(() => { close(); window.navigate('/'); }));
    overlay.querySelector('#sync-disconnect')?.addEventListener('click', async () => {
      await disconnect();
      close();
      _updateSyncButton();
    });
  });
}

export async function initSyncButton() {
  const btn = document.getElementById('home-auth');
  if (!btn) return;
  btn.addEventListener('click', openSyncModal);
  _updateSyncButton();
  // Pull silencioso al arrancar si ya hay permiso concedido.
  if (isSupported()) {
    const handle = await loadHandle();
    if (handle && (await handle.queryPermission({ mode: 'read' })) === 'granted') {
      const applied = await pullProgress();
      if (applied) window.navigate('/');
    }
  }
}

function _updateSyncButton() {
  const btn = document.getElementById('home-auth');
  if (!btn) return;
  loadHandle().then(handle => {
    btn.classList.toggle('auth-logged-in', !!handle);
    btn.title = handle ? 'Sincronización (archivo conectado)' : 'Sincronización';
    const cta = btn.querySelector('.auth-cta-text');
    if (cta) cta.style.display = handle ? 'none' : '';
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add js/sync.js
git commit -m "feat: panel y botón de sincronización en sync.js"
```

---

## Task 6: Conectar los importadores y borrar Supabase

**Files:**
- Modify: `js/app.js:22`, `js/exercise.js:5`, `js/lessons.js:339`, `js/home.js:4,174,211`
- Modify: `index.html:16`
- Delete: `js/auth.js`, `js/supabase-client.js`

- [ ] **Step 1: Actualizar `js/app.js`**

Reemplazar la línea 22:
```js
import { pushProgress } from './auth.js';
```
por:
```js
import { pushProgress } from './sync.js';
```
(La llamada `pushProgress();` de la línea 47 se mantiene igual.)

- [ ] **Step 2: Actualizar `js/exercise.js`**

Reemplazar la línea 5:
```js
import { pushProgress } from './auth.js';
```
por:
```js
import { pushProgress } from './sync.js';
```
(La llamada de la línea 208 se mantiene.)

- [ ] **Step 3: Actualizar `js/lessons.js`**

Reemplazar la línea 339:
```js
    const { pushProgress } = await import('./auth.js');
```
por:
```js
    const { pushProgress } = await import('./sync.js');
```

- [ ] **Step 4: Actualizar `js/home.js`**

Reemplazar el import de la línea 4:
```js
import { initAuthButton } from './auth.js';
```
por:
```js
import { initSyncButton } from './sync.js';
```

Reemplazar el botón de la línea 174:
```js
            <button class="btn-icon" id="home-auth" title="Cuenta">👤 <span class="auth-cta-text">Iniciar sesión</span></button>
```
por:
```js
            <button class="btn-icon" id="home-auth" title="Sincronización">☁️ <span class="auth-cta-text">Sync</span></button>
```

Reemplazar la llamada de la línea 211:
```js
  initAuthButton();
```
por:
```js
  initSyncButton();
```

- [ ] **Step 5: Quitar el script de Supabase de `index.html`**

Borrar la línea 16:
```html
  <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js"></script>
```

- [ ] **Step 6: Borrar los módulos de Supabase**

```bash
git rm js/auth.js js/supabase-client.js
```

- [ ] **Step 7: Verificar que no quedan referencias**

Buscar `auth.js`, `supabase`, `initAuthButton`, `getClient` en el código. Esperado: cero
resultados en `js/`, `index.html` (las menciones en `docs/` y `CLAUDE.md` se tratan en Task 8).

- [ ] **Step 8: Commit**

```bash
git add js/app.js js/exercise.js js/lessons.js js/home.js index.html
git commit -m "refactor: reemplazar Supabase por sync de archivo local en los importadores"
```

---

## Task 7: Verificación manual en Chrome/Edge

**Files:** ninguno (verificación).

> No automatizable: depende de picker, permisos y de OneDrive. Hugo lo ejecuta a mano.

- [ ] **Step 1: Smoke test de la app**

Servir local (`python3 -m http.server 8765`) o usar GitHub Pages tras push. Abrir la home.
Esperado: carga sin errores de consola; el botón "☁️ Sync" aparece donde antes estaba el de cuenta.

- [ ] **Step 2: Crear archivo (equipo primario)**

Pulsar ☁️ Sync → "Crear archivo" → guardar `progreso.json` dentro de la carpeta de OneDrive.
Esperado: el estado pasa a "Archivo conectado" y muestra hora de última sync. El archivo existe
en disco con `version`, `updatedAt` y `data`.

- [ ] **Step 3: Push silencioso**

Hacer una ronda de ejercicios y volver al home. Esperado: el archivo `progreso.json` cambia su
`updatedAt` (verificable abriéndolo). Sin errores en consola.

- [ ] **Step 4: Pull en "segundo equipo" (simulado)**

En una ventana de incógnito (localStorage vacío): pulsar ☁️ Sync → "Abrir existente" → elegir el
mismo `progreso.json`. Esperado: el progreso se carga (las estadísticas reflejan lo del paso 3).

- [ ] **Step 5: Pull silencioso al reabrir**

Recargar la pestaña (no incógnito) con el archivo ya conectado. Esperado: si el archivo es más
reciente que el último sync local, el progreso se actualiza solo (puede pedir un clic de permiso).

- [ ] **Step 6: Run de la suite de tests**

Abrir `http://localhost:8765/test/`. Esperado: toda la suite en verde, incluidos
`sync-core.test.js` e `idb-handle.test.js`.

- [ ] **Step 7: Registrar el resultado**

Si todo pasa, continuar. Si algo falla, aplicar `superpowers:systematic-debugging` antes de seguir.

---

## Task 8: Limpieza de CSS y actualización de documentación

**Files:**
- Modify: `css/styles.css`
- Modify: `CLAUDE.md`

- [ ] **Step 1: Limpiar CSS muerto (opcional, seguro)**

En `css/styles.css`, eliminar únicamente las reglas que solo usaba el formulario de login y que ya
no se referencian: `.auth-tabs`, `.auth-tab`, `.auth-field`, `.auth-input`, `.auth-btn-primary`,
`.auth-error`. **Conservar** `.auth-modal-overlay`, `.auth-modal`, `.auth-modal-header`,
`.auth-modal-title`, `.auth-user-info`, `.auth-user-email`, `.auth-sync-row`, `.auth-sync-status`,
`.auth-btn-secondary`, `.auth-btn-danger`, `.auth-confirm-msg`, `.auth-cta-text`, `.auth-logged-in`
(las usa el panel de sync).

Verificar con una búsqueda de cada clase en `js/` antes de borrarla.

- [ ] **Step 2: Actualizar `CLAUDE.md`**

En la restricción canónica nº 2, sustituir:
```
2. **Sin backend, sin cuentas, sin sync**. Progreso solo en `localStorage`; export/import manual a JSON.
```
por:
```
2. **Sin backend, sin cuentas**. Progreso en `localStorage`. Sync opcional **local** mediante un archivo en una carpeta del usuario (p.ej. OneDrive) vía File System Access API; nunca una BD de terceros. Export/import manual a JSON sigue disponible.
```

Añadir a la sección "Subsistemas" un bloque nuevo:
```
### `js/sync.js` + `js/sync-core.js` + `js/idb-handle.js` — sync de archivo local

Sustituye al antiguo Supabase. El progreso (`localStorage`, claves `jp_n5_*`) se sincroniza entre
equipos mediante un archivo `progreso.json` que el usuario coloca en una carpeta sincronizada por
OneDrive. `sync-core.js` es lógica pura (recolección/aplicación de claves, payload, regla
last-write-wins por `updatedAt` vs `jp_n5_last_sync_ms`). `idb-handle.js` persiste el
`FileSystemFileHandle` en IndexedDB. `sync.js` orquesta picker, permisos, push silencioso (al
terminar ejercicios/lección/volver al home) y pull (silencioso al abrir si hay permiso; manual si
no). Solo Chromium de escritorio (Chrome/Edge); en navegadores sin la API, el panel avisa y queda
el export/import manual.
```

- [ ] **Step 3: Commit**

```bash
git add css/styles.css CLAUDE.md
git commit -m "docs: actualizar CLAUDE.md y limpiar CSS de login para el sync de archivo"
```

---

## Self-review (rellenado por el autor del plan)

- **Cobertura del spec:** borrado de Supabase (Task 6) · módulo sync con archivo (Tasks 4-5) ·
  IndexedDB para el handle (Task 3) · botón/panel de sync en el home (Task 5-6) · push silencioso
  (Task 6 conserva las llamadas) · pull al abrir con fallback de permiso (Task 5 `initSyncButton`) ·
  last-write-wins (Task 2) · manejo de errores: navegador no soportado (Task 5), permiso/lectura
  fallida y JSON corrupto (Tasks 2 y 4 con try/catch silencioso) · tests de lógica pura (Tasks 1-3)
  y verificación manual (Task 7) · actualización de docs (Task 8). Sin huecos.
- **Placeholders:** ninguno; todo el código va explícito.
- **Consistencia de tipos:** `collectProgress`/`applyProgress`/`buildPayload`/`parsePayload`/
  `shouldApplyRemote` (sync-core) y `saveHandle`/`loadHandle`/`clearHandle` (idb-handle) se usan con
  las mismas firmas en `sync.js`. El botón sigue siendo `#home-auth` para reaprovechar handlers/CSS.
```
