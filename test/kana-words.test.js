import { describe, it, assertEqual, assert } from './runner.js';

describe('kana-words.filterWords', () => {
  it('retorna palabras con kana puro hiragana', async () => {
    const { filterWords } = await import('../js/kana/kana-words.js?c=kw1');
    const vocab = [
      { id: 'v1', kana: 'いぬ', romaji: 'inu' },
      { id: 'v2', kana: 'ネコ', romaji: 'neko' },
      { id: 'v3', kana: 'し／よん', romaji: 'shi/yon' },
    ];
    const result = filterWords(vocab, 'hiragana');
    assertEqual(result.length, 1);
    assertEqual(result[0].id, 'v1');
  });

  it('retorna palabras con kana puro katakana', async () => {
    const { filterWords } = await import('../js/kana/kana-words.js?c=kw2');
    const vocab = [
      { id: 'v1', kana: 'いぬ', romaji: 'inu' },
      { id: 'v2', kana: 'ネコ', romaji: 'neko' },
    ];
    const result = filterWords(vocab, 'katakana');
    assertEqual(result.length, 1);
    assertEqual(result[0].id, 'v2');
  });

  it('excluye palabras con / en kana (lecturas múltiples)', async () => {
    const { filterWords } = await import('../js/kana/kana-words.js?c=kw3');
    const vocab = [
      { id: 'v1', kana: 'し／よん', romaji: 'shi/yon' },
      { id: 'v2', kana: 'なな／しち', romaji: 'nana/shichi' },
      { id: 'v3', kana: 'さん', romaji: 'san' },
    ];
    const result = filterWords(vocab, 'hiragana');
    assertEqual(result.length, 1);
    assertEqual(result[0].id, 'v3');
  });

  it('acepta kana con っ y ー y ッ', async () => {
    const { filterWords } = await import('../js/kana/kana-words.js?c=kw4');
    const vocab = [
      { id: 'v1', kana: 'コーヒー', romaji: 'koohii' },
      { id: 'v2', kana: 'きって', romaji: 'kitte' },
    ];
    assertEqual(filterWords(vocab, 'katakana').length, 1);
    assertEqual(filterWords(vocab, 'hiragana').length, 1);
  });

  it('retorna array vacío si no hay palabras del tipo', async () => {
    const { filterWords } = await import('../js/kana/kana-words.js?c=kw5');
    const vocab = [{ id: 'v1', kana: 'いぬ', romaji: 'inu', meaning_es: 'perro' }];
    assertEqual(filterWords(vocab, 'katakana').length, 0);
  });
});
