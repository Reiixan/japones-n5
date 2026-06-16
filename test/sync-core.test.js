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
