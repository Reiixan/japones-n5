import { getProgress } from './storage.js';

// Leitner 5-box system: box 0 = new/failed, box 4 = mastered
// Weight: box 0 → 5, box 1 → 4, ..., box 4 → 1
function weightOf(box) {
  return 5 - box;
}

export function selectSession(deck, allItems, sessionSize) {
  if (sessionSize === 'all') sessionSize = allItems.length;

  const pool = allItems.map(item => ({
    item,
    progress: getProgress(deck, item.id),
  }));

  const selected = [];
  const remaining = [...pool];
  const n = Math.min(sessionSize, allItems.length);

  while (selected.length < n && remaining.length > 0) {
    const totalWeight = remaining.reduce((s, e) => s + weightOf(e.progress.box), 0);
    let rand = Math.random() * totalWeight;
    for (let i = 0; i < remaining.length; i++) {
      rand -= weightOf(remaining[i].progress.box);
      if (rand <= 0) {
        selected.push(remaining[i].item);
        remaining.splice(i, 1);
        break;
      }
    }
  }

  return shuffle(selected);
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
