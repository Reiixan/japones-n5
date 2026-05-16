const NS = 'jp_n5_v1';

function key(deck, itemId) {
  return `${NS}.${deck}.${itemId}`;
}

export function getProgress(deck, itemId) {
  const raw = localStorage.getItem(key(deck, itemId));
  return raw ? JSON.parse(raw) : { box: 0, lastSeen: null, correct: 0, wrong: 0 };
}

export function recordAnswer(deck, itemId, correct) {
  const p = getProgress(deck, itemId);
  p.lastSeen = Date.now();
  if (correct) {
    p.correct++;
    p.box = Math.min(p.box + 1, 4);
  } else {
    p.wrong++;
    p.box = 0;
  }
  localStorage.setItem(key(deck, itemId), JSON.stringify(p));
}

export function getDeckStats(deck, items) {
  const total = items.length;
  let dominados = 0;
  for (const item of items) {
    const p = getProgress(deck, item.id);
    if (p.box >= 4) dominados++;
  }
  return {
    total,
    dominados,
    pct: total > 0 ? Math.round((dominados / total) * 100) : 0,
  };
}

export function exportAll() {
  const data = {};
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k.startsWith(NS)) {
      data[k] = JSON.parse(localStorage.getItem(k));
    }
  }
  return JSON.stringify(data, null, 2);
}

export function importAll(jsonStr) {
  const data = JSON.parse(jsonStr);
  for (const [k, v] of Object.entries(data)) {
    if (k.startsWith(NS)) {
      localStorage.setItem(k, JSON.stringify(v));
    }
  }
}

export function resetDeck(deck) {
  const toRemove = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k.startsWith(`${NS}.${deck}.`)) toRemove.push(k);
  }
  toRemove.forEach(k => localStorage.removeItem(k));
}
