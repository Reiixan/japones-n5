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
