import { dueAtFor } from './intervals.js';

const NS = 'jp_n5_v2';
const NS_V1 = 'jp_n5_v1';
const MIGRATED_FLAG = 'jp_n5_v2_migrated';

function key(deck, itemId) {
  return `${NS}.${deck}.${itemId}`;
}

export function getProgress(deck, itemId) {
  const raw = localStorage.getItem(key(deck, itemId));
  return raw ? JSON.parse(raw) : { box: 0, lastSeen: null, correct: 0, wrong: 0, dueAt: null };
}

export function recordAnswer(deck, itemId, correct, now = Date.now()) {
  const p = getProgress(deck, itemId);
  p.lastSeen = now;
  if (correct) {
    p.correct = (p.correct || 0) + 1;
    p.box = Math.min((p.box || 0) + 1, 4);
  } else {
    p.wrong = (p.wrong || 0) + 1;
    p.box = 0;
  }
  p.dueAt = dueAtFor(p.box, now);
  localStorage.setItem(key(deck, itemId), JSON.stringify(p));
}

export function migrateV1ToV2(now = Date.now()) {
  if (localStorage.getItem(MIGRATED_FLAG) === '1') return 0;
  const v1Keys = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith(`${NS_V1}.`)) v1Keys.push(k);
  }
  let migrated = 0;
  for (const v1k of v1Keys) {
    const raw = localStorage.getItem(v1k);
    if (!raw) continue;
    try {
      const data = JSON.parse(raw);
      const fromTime = data.lastSeen != null ? data.lastSeen : now;
      const newData = {
        box: data.box || 0,
        lastSeen: data.lastSeen,
        correct: data.correct || 0,
        wrong: data.wrong || 0,
        dueAt: dueAtFor(data.box || 0, fromTime),
      };
      const suffix = v1k.slice(NS_V1.length + 1); // <deck>.<id>
      localStorage.setItem(`${NS}.${suffix}`, JSON.stringify(newData));
      localStorage.removeItem(v1k);
      migrated += 1;
    } catch (e) {
      console.error('Error migrando', v1k, e);
    }
  }
  localStorage.setItem(MIGRATED_FLAG, '1');
  return migrated;
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

const TIMING_PREFIX = `${NS}.timing.`;
const TIMING_MAX = 100;

export function recordTimings(deck, msArray) {
  if (!msArray || msArray.length === 0) return;
  const key = `${TIMING_PREFIX}${deck}`;
  const existing = JSON.parse(localStorage.getItem(key) || '[]');
  const combined = [...existing, ...msArray].slice(-TIMING_MAX);
  localStorage.setItem(key, JSON.stringify(combined));
}

export function getAvgTiming(deck) {
  const key = `${TIMING_PREFIX}${deck}`;
  const arr = JSON.parse(localStorage.getItem(key) || '[]');
  if (arr.length === 0) return null;
  return Math.round(arr.reduce((s, x) => s + x, 0) / arr.length);
}
