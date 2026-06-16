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

describe('sync-core.buildPayload / parsePayload', () => {
  it('build genera version, updatedAt y data', async () => {
    const { buildPayload } = await import('../js/sync-core.js?c=c3');
    const p = buildPayload({ 'jp_n5_x': 1 }, 1718539200000);
    assertEqual(p.version, 1);
    assertEqual(p.updatedAt, 1718539200000);
    assertEqual(p.data['jp_n5_x'], 1);
  });
  it('parse acepta payload válido', async () => {
    const { parsePayload } = await import('../js/sync-core.js?c=c4');
    const text = JSON.stringify({ version: 1, updatedAt: 5, data: { a: 1 } });
    const p = parsePayload(text);
    assertEqual(p.updatedAt, 5);
    assertEqual(p.data.a, 1);
  });
  it('parse lanza con JSON corrupto', async () => {
    const { parsePayload } = await import('../js/sync-core.js?c=c5');
    let threw = false;
    try { parsePayload('{no es json'); } catch (_) { threw = true; }
    assert(threw, 'debe lanzar con JSON corrupto');
  });
  it('parse lanza si falta data', async () => {
    const { parsePayload } = await import('../js/sync-core.js?c=c6');
    let threw = false;
    try { parsePayload(JSON.stringify({ version: 1, updatedAt: 5 })); } catch (_) { threw = true; }
    assert(threw, 'debe lanzar si no hay data');
  });
});

describe('sync-core.shouldApplyRemote', () => {
  it('aplica si el remoto es más nuevo', async () => {
    const { shouldApplyRemote } = await import('../js/sync-core.js?c=c7');
    assert(shouldApplyRemote(100, 50) === true, 'remoto 100 > local 50');
  });
  it('no aplica si el remoto es igual o más viejo', async () => {
    const { shouldApplyRemote } = await import('../js/sync-core.js?c=c8');
    assert(shouldApplyRemote(50, 50) === false, 'igual no aplica');
    assert(shouldApplyRemote(10, 50) === false, 'más viejo no aplica');
  });
  it('aplica si no hay sync local previo (0)', async () => {
    const { shouldApplyRemote } = await import('../js/sync-core.js?c=c9');
    assert(shouldApplyRemote(10, 0) === true, 'sin sync previo, aplica');
  });
});
