import { describe, it, assertEqual, assert } from './runner.js';

describe('adjectiveForm i-adjectives', () => {
  it('高い negative → 高くない', async () => {
    const { adjectiveForm } = await import('../js/adjective-forms.js?c=ai1');
    assertEqual(adjectiveForm('高い', 'i', 'negative'), '高くない');
  });
  it('高い past → 高かった', async () => {
    const { adjectiveForm } = await import('../js/adjective-forms.js?c=ai2');
    assertEqual(adjectiveForm('高い', 'i', 'past'), '高かった');
  });
  it('高い negative_past → 高くなかった', async () => {
    const { adjectiveForm } = await import('../js/adjective-forms.js?c=ai3');
    assertEqual(adjectiveForm('高い', 'i', 'negative_past'), '高くなかった');
  });
  it('いい negative → よくない (excepción)', async () => {
    const { adjectiveForm } = await import('../js/adjective-forms.js?c=ai4');
    assertEqual(adjectiveForm('いい', 'i', 'negative'), 'よくない');
  });
  it('いい past → よかった (excepción)', async () => {
    const { adjectiveForm } = await import('../js/adjective-forms.js?c=ai5');
    assertEqual(adjectiveForm('いい', 'i', 'past'), 'よかった');
  });
  it('良い negative → よくない (excepción con kanji)', async () => {
    const { adjectiveForm } = await import('../js/adjective-forms.js?c=ai6');
    assertEqual(adjectiveForm('良い', 'i', 'negative'), 'よくない');
  });
});

describe('adjectiveForm na-adjectives', () => {
  it('きれい negative → きれいじゃない', async () => {
    const { adjectiveForm } = await import('../js/adjective-forms.js?c=an1');
    assertEqual(adjectiveForm('きれい', 'na', 'negative'), 'きれいじゃない');
  });
  it('きれい past → きれいだった', async () => {
    const { adjectiveForm } = await import('../js/adjective-forms.js?c=an2');
    assertEqual(adjectiveForm('きれい', 'na', 'past'), 'きれいだった');
  });
  it('きれい negative_past → きれいじゃなかった', async () => {
    const { adjectiveForm } = await import('../js/adjective-forms.js?c=an3');
    assertEqual(adjectiveForm('きれい', 'na', 'negative_past'), 'きれいじゃなかった');
  });
  it('きれい noun_form → きれいな', async () => {
    const { adjectiveForm } = await import('../js/adjective-forms.js?c=an4');
    assertEqual(adjectiveForm('きれい', 'na', 'noun_form'), 'きれいな');
  });
  it('元気 noun_form → 元気な', async () => {
    const { adjectiveForm } = await import('../js/adjective-forms.js?c=an5');
    assertEqual(adjectiveForm('元気', 'na', 'noun_form'), '元気な');
  });
});

describe('generateAdjDistractors', () => {
  it('3 distractores únicos distintos a la respuesta correcta', async () => {
    const { adjectiveForm, generateAdjDistractors } = await import('../js/adjective-forms.js?c=ad1');
    const correct = adjectiveForm('高い', 'i', 'negative');
    const ds = generateAdjDistractors('高い', 'i', 'negative', 3);
    assertEqual(ds.length, 3);
    assertEqual(new Set(ds).size, 3);
    for (const d of ds) assert(d !== correct, `distractor === correct: ${d}`);
  });
});
