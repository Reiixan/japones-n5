import { getProgress } from './storage.js?v=2';

// Leitner 5-box system: box 0 = new/failed, box 4 = mastered
// Weight: box 0 → 5, box 1 → 4, ..., box 4 → 1
function weightOf(box) {
  return 5 - box;
}

export function selectSession(deck, allItems, sessionSize, now = Date.now()) {
  if (sessionSize === 'all') sessionSize = allItems.length;
  const n = Math.min(sessionSize, allItems.length);

  // Clasificar items en 3 grupos
  const overdue = [];
  const fresh = [];
  const rest = [];
  for (const item of allItems) {
    const p = getProgress(deck, item.id);
    if (p.dueAt != null && p.dueAt <= now) overdue.push({ item, p });
    else if (p.lastSeen == null) fresh.push({ item, p });
    else rest.push({ item, p });
  }

  const result = [];
  // 1. Llenar con vencidos primero (los más vencidos primero)
  overdue.sort((a, b) => (a.p.dueAt || 0) - (b.p.dueAt || 0));
  for (const x of overdue) {
    if (result.length >= n) break;
    result.push(x.item);
  }
  // 2. Después nuevos
  for (const x of shuffle(fresh)) {
    if (result.length >= n) break;
    result.push(x.item);
  }
  // 3. Si aún quedan plazas, llenar con resto mezclado por peso (menor caja → más peso)
  if (result.length < n) {
    const weighted = [...rest];
    while (result.length < n && weighted.length > 0) {
      const totalWeight = weighted.reduce((s, e) => s + (5 - e.p.box), 0);
      let rand = Math.random() * totalWeight;
      for (let i = 0; i < weighted.length; i++) {
        rand -= (5 - weighted[i].p.box);
        if (rand <= 0) {
          result.push(weighted[i].item);
          weighted.splice(i, 1);
          break;
        }
      }
    }
  }
  return shuffle(result);
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function pickWrong(allItems, correctItem, getKey, count = 3) {
  const correctKey = getKey(correctItem);
  const pool = allItems.filter(it => getKey(it) !== correctKey);
  const shuffled = shuffle(pool);
  return shuffled.slice(0, count);
}

// Re-export de intervals.js para mantener compatibilidad con tests existentes
// que importan desde srs.js. La fuente de verdad está en intervals.js para
// romper la dependencia circular con storage.js.
export { BOX_INTERVALS_MS, dueAtFor } from './intervals.js';
