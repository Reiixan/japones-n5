import { describe, it, assertEqual, assert } from './runner.js';

describe('review-today.collectDueItems', () => {
  it('devuelve items con dueAt <= now', async () => {
    // Sembrar v2 keys
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i);
      if (k && k.startsWith('jp_n5_v2.testreview.')) localStorage.removeItem(k);
    }
    const now = 2000000000000;
    localStorage.setItem('jp_n5_v2.testreview.due1', JSON.stringify({ box: 2, lastSeen: 1, correct: 3, wrong: 0, dueAt: now - 1000 }));
    localStorage.setItem('jp_n5_v2.testreview.fresh1', JSON.stringify({ box: 3, lastSeen: 1, correct: 5, wrong: 0, dueAt: now + 10000 }));
    localStorage.setItem('jp_n5_v2.testreview.new1', JSON.stringify({ box: 0, lastSeen: null, correct: 0, wrong: 0, dueAt: null }));

    const items = [{ id: 'due1' }, { id: 'fresh1' }, { id: 'new1' }];
    const { collectDueItems } = await import('../js/review-today.js?c=rt1');
    const due = collectDueItems('testreview', items, now);
    assertEqual(due.length, 1);
    assertEqual(due[0].id, 'due1');
    // Cleanup
    ['due1','fresh1','new1'].forEach(id => localStorage.removeItem(`jp_n5_v2.testreview.${id}`));
  });
});
