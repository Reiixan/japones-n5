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
