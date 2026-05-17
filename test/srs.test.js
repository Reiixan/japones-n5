import { describe, it, assertEqual, assert } from './runner.js';

describe('srs.dueAtFor', () => {
  it('box 0 → +10 min', async () => {
    const { dueAtFor } = await import('../js/srs.js?c=s1');
    const now = 1700000000000;
    assertEqual(dueAtFor(0, now), now + 10 * 60 * 1000);
  });
  it('box 1 → +1 día', async () => {
    const { dueAtFor } = await import('../js/srs.js?c=s2');
    const now = 1700000000000;
    assertEqual(dueAtFor(1, now), now + 24 * 60 * 60 * 1000);
  });
  it('box 2 → +3 días', async () => {
    const { dueAtFor } = await import('../js/srs.js?c=s3');
    const now = 1700000000000;
    assertEqual(dueAtFor(2, now), now + 3 * 24 * 60 * 60 * 1000);
  });
  it('box 3 → +7 días', async () => {
    const { dueAtFor } = await import('../js/srs.js?c=s4');
    const now = 1700000000000;
    assertEqual(dueAtFor(3, now), now + 7 * 24 * 60 * 60 * 1000);
  });
  it('box 4 → +21 días', async () => {
    const { dueAtFor } = await import('../js/srs.js?c=s5');
    const now = 1700000000000;
    assertEqual(dueAtFor(4, now), now + 21 * 24 * 60 * 60 * 1000);
  });
  it('box fuera de rango lanza error', async () => {
    const { dueAtFor } = await import('../js/srs.js?c=s6');
    let threw = false;
    try { dueAtFor(5, Date.now()); } catch (_) { threw = true; }
    assert(threw, 'debe lanzar para box 5');
  });
});

describe('srs.selectSession v2 - priorización dueAt', () => {
  it('prioriza ítems vencidos sobre dominados', async () => {
    // Limpia
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i);
      if (k && k.startsWith('jp_n5_v2.test.')) localStorage.removeItem(k);
    }
    const now = 2000000000000;
    // overdue
    localStorage.setItem('jp_n5_v2.test.due', JSON.stringify({ box: 2, lastSeen: 1, correct: 3, wrong: 1, dueAt: now - 1000 }));
    // not due yet
    localStorage.setItem('jp_n5_v2.test.fresh', JSON.stringify({ box: 4, lastSeen: 1, correct: 10, wrong: 0, dueAt: now + 1000000 }));
    // new
    localStorage.setItem('jp_n5_v2.test.new', JSON.stringify({ box: 0, lastSeen: null, correct: 0, wrong: 0, dueAt: null }));

    const items = [{ id: 'due' }, { id: 'fresh' }, { id: 'new' }];
    const { selectSession } = await import('../js/srs.js?c=ss1');
    // Forzar now
    const selected = selectSession('test', items, 2, now);
    const ids = selected.map(i => i.id);
    assert(ids.includes('due'), `'due' debería estar en la selección, hubo: ${ids}`);
    // Cleanup
    localStorage.removeItem('jp_n5_v2.test.due');
    localStorage.removeItem('jp_n5_v2.test.fresh');
    localStorage.removeItem('jp_n5_v2.test.new');
  });
});
