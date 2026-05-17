import { describe, it, assertEqual, assert } from './runner.js';

describe('adjectives.pickRandomForm', () => {
  it('i-adj devuelve forma válida (3 opciones)', async () => {
    const { pickRandomForm, I_FORMS } = await import('../js/adjectives.js?c=p1');
    for (let k = 0; k < 30; k++) {
      const f = pickRandomForm('i');
      assert(I_FORMS.includes(f), `forma inválida para i: ${f}`);
    }
  });
  it('na-adj devuelve forma válida (4 opciones)', async () => {
    const { pickRandomForm, NA_FORMS } = await import('../js/adjectives.js?c=p2');
    for (let k = 0; k < 30; k++) {
      const f = pickRandomForm('na');
      assert(NA_FORMS.includes(f), `forma inválida para na: ${f}`);
    }
  });
});

describe('adjectives.buildItem', () => {
  it('produce un ítem con respuesta correcta y 3 distractores únicos', async () => {
    const { buildItem } = await import('../js/adjectives.js?c=b1');
    const adj = { id: 'aj_takai', jp: '高い', kana: 'たかい', type: 'i', meaning_es: 'caro' };
    const item = buildItem(adj, 'negative');
    assertEqual(item.adj.id, 'aj_takai');
    assertEqual(item.correct, '高くない');
    assertEqual(item.distractors.length, 3);
  });
});
