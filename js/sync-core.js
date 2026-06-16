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
