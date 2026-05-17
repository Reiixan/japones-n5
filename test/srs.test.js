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
