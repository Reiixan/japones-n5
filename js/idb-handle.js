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
