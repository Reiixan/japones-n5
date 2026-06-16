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
