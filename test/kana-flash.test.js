import { describe, it, assertEqual } from './runner.js';

describe('kana-flash constants', () => {
  it('TIMEOUT_MS es 3000ms', async () => {
    const { TIMEOUT_MS } = await import('../js/kana/kana-flash.js?c=kf1');
    assertEqual(TIMEOUT_MS, 3000);
  });

  it('FEEDBACK_MS es 400ms', async () => {
    const { FEEDBACK_MS } = await import('../js/kana/kana-flash.js?c=kf2');
    assertEqual(FEEDBACK_MS, 400);
  });
});

describe('kana-flash.isCorrect', () => {
  it('acierto si romaji coincide', async () => {
    const { isCorrect } = await import('../js/kana/kana-flash.js?c=kf3');
    assertEqual(isCorrect({ romaji: 'ka' }, 'ka'), true);
  });

  it('fallo si romaji no coincide', async () => {
    const { isCorrect } = await import('../js/kana/kana-flash.js?c=kf4');
    assertEqual(isCorrect({ romaji: 'ka' }, 'ki'), false);
  });

  it('fallo si answer es __timeout__', async () => {
    const { isCorrect } = await import('../js/kana/kana-flash.js?c=kf5');
    assertEqual(isCorrect({ romaji: 'ka' }, '__timeout__'), false);
  });
});
