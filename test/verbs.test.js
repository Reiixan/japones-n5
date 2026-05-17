import { describe, it, assertEqual, assert } from './runner.js';

describe('verbs.pickRandomForm', () => {
  it('devuelve una forma de la lista permitida', async () => {
    const { pickRandomForm, ALLOWED_FORMS } = await import('../js/verbs.js?c=v1');
    for (let i = 0; i < 50; i++) {
      const f = pickRandomForm();
      assert(ALLOWED_FORMS.includes(f), `forma inválida: ${f}`);
    }
  });
});

describe('verbs.buildItem', () => {
  it('produce un ítem con la respuesta correcta y 3 distractores únicos', async () => {
    const { buildItem } = await import('../js/verbs.js?c=v2');
    const verb = { id: 'vb_taberu', dict: '食べる', dict_kana: 'たべる', group: 'ichidan', meaning_es: 'comer' };
    const item = buildItem(verb, 'masu');
    assertEqual(item.verb.id, 'vb_taberu');
    assertEqual(item.form, 'masu');
    assertEqual(item.correct, '食べます');
    assertEqual(item.distractors.length, 3);
    assertEqual(new Set(item.distractors).size, 3, 'distractores únicos');
    for (const d of item.distractors) {
      assert(d !== item.correct, `distractor === correct: ${d}`);
    }
  });
});

describe('verbs.FORM_LABELS', () => {
  it('tiene una etiqueta español para cada forma', async () => {
    const { ALLOWED_FORMS, FORM_LABELS } = await import('../js/verbs.js?c=v3');
    for (const f of ALLOWED_FORMS) {
      assert(typeof FORM_LABELS[f] === 'string' && FORM_LABELS[f].length > 0, `falta label de ${f}`);
    }
  });
});
