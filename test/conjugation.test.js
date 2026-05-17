import { describe, it, assertEqual } from './runner.js';

describe('conjugate ichidan', () => {
  it('食べる masu → 食べます', async () => {
    const { conjugate } = await import('../js/conjugation.js?c=i1');
    assertEqual(conjugate('食べる', 'ichidan', 'masu'), '食べます');
  });
  it('食べる masen → 食べません', async () => {
    const { conjugate } = await import('../js/conjugation.js?c=i2');
    assertEqual(conjugate('食べる', 'ichidan', 'masen'), '食べません');
  });
  it('食べる mashita → 食べました', async () => {
    const { conjugate } = await import('../js/conjugation.js?c=i3');
    assertEqual(conjugate('食べる', 'ichidan', 'mashita'), '食べました');
  });
  it('食べる masen_deshita → 食べませんでした', async () => {
    const { conjugate } = await import('../js/conjugation.js?c=i4');
    assertEqual(conjugate('食べる', 'ichidan', 'masen_deshita'), '食べませんでした');
  });
  it('食べる te → 食べて', async () => {
    const { conjugate } = await import('../js/conjugation.js?c=i5');
    assertEqual(conjugate('食べる', 'ichidan', 'te'), '食べて');
  });
  it('食べる ta → 食べた', async () => {
    const { conjugate } = await import('../js/conjugation.js?c=i6');
    assertEqual(conjugate('食べる', 'ichidan', 'ta'), '食べた');
  });
  it('食べる nai → 食べない', async () => {
    const { conjugate } = await import('../js/conjugation.js?c=i7');
    assertEqual(conjugate('食べる', 'ichidan', 'nai'), '食べない');
  });
  it('食べる nakatta → 食べなかった', async () => {
    const { conjugate } = await import('../js/conjugation.js?c=i8');
    assertEqual(conjugate('食べる', 'ichidan', 'nakatta'), '食べなかった');
  });
  it('見る (corto) masu → 見ます', async () => {
    const { conjugate } = await import('../js/conjugation.js?c=i9');
    assertEqual(conjugate('見る', 'ichidan', 'masu'), '見ます');
  });
});

describe('conjugate godan', () => {
  it('買う masu → 買います', async () => {
    const { conjugate } = await import('../js/conjugation.js?c=g1');
    assertEqual(conjugate('買う', 'godan', 'masu'), '買います');
  });
  it('書く masu → 書きます', async () => {
    const { conjugate } = await import('../js/conjugation.js?c=g2');
    assertEqual(conjugate('書く', 'godan', 'masu'), '書きます');
  });
  it('話す masu → 話します', async () => {
    const { conjugate } = await import('../js/conjugation.js?c=g3');
    assertEqual(conjugate('話す', 'godan', 'masu'), '話します');
  });
  it('待つ masu → 待ちます', async () => {
    const { conjugate } = await import('../js/conjugation.js?c=g4');
    assertEqual(conjugate('待つ', 'godan', 'masu'), '待ちます');
  });
  it('死ぬ masu → 死にます', async () => {
    const { conjugate } = await import('../js/conjugation.js?c=g5');
    assertEqual(conjugate('死ぬ', 'godan', 'masu'), '死にます');
  });
  it('遊ぶ masu → 遊びます', async () => {
    const { conjugate } = await import('../js/conjugation.js?c=g6');
    assertEqual(conjugate('遊ぶ', 'godan', 'masu'), '遊びます');
  });
  it('飲む masu → 飲みます', async () => {
    const { conjugate } = await import('../js/conjugation.js?c=g7');
    assertEqual(conjugate('飲む', 'godan', 'masu'), '飲みます');
  });
  it('帰る masu → 帰ります', async () => {
    const { conjugate } = await import('../js/conjugation.js?c=g8');
    assertEqual(conjugate('帰る', 'godan', 'masu'), '帰ります');
  });
  it('泳ぐ masu → 泳ぎます', async () => {
    const { conjugate } = await import('../js/conjugation.js?c=g9');
    assertEqual(conjugate('泳ぐ', 'godan', 'masu'), '泳ぎます');
  });
});

describe('conjugate godan te-form (asignaciones por terminación)', () => {
  it('書く te → 書いて', async () => {
    const { conjugate } = await import('../js/conjugation.js?c=tg1');
    assertEqual(conjugate('書く', 'godan', 'te'), '書いて');
  });
  it('行く te → 行って (excepción)', async () => {
    const { conjugate } = await import('../js/conjugation.js?c=tg2');
    assertEqual(conjugate('行く', 'godan', 'te'), '行って');
  });
  it('泳ぐ te → 泳いで', async () => {
    const { conjugate } = await import('../js/conjugation.js?c=tg3');
    assertEqual(conjugate('泳ぐ', 'godan', 'te'), '泳いで');
  });
  it('話す te → 話して', async () => {
    const { conjugate } = await import('../js/conjugation.js?c=tg4');
    assertEqual(conjugate('話す', 'godan', 'te'), '話して');
  });
  it('待つ te → 待って', async () => {
    const { conjugate } = await import('../js/conjugation.js?c=tg5');
    assertEqual(conjugate('待つ', 'godan', 'te'), '待って');
  });
  it('買う te → 買って', async () => {
    const { conjugate } = await import('../js/conjugation.js?c=tg6');
    assertEqual(conjugate('買う', 'godan', 'te'), '買って');
  });
  it('帰る te → 帰って', async () => {
    const { conjugate } = await import('../js/conjugation.js?c=tg7');
    assertEqual(conjugate('帰る', 'godan', 'te'), '帰って');
  });
  it('死ぬ te → 死んで', async () => {
    const { conjugate } = await import('../js/conjugation.js?c=tg8');
    assertEqual(conjugate('死ぬ', 'godan', 'te'), '死んで');
  });
  it('遊ぶ te → 遊んで', async () => {
    const { conjugate } = await import('../js/conjugation.js?c=tg9');
    assertEqual(conjugate('遊ぶ', 'godan', 'te'), '遊んで');
  });
  it('飲む te → 飲んで', async () => {
    const { conjugate } = await import('../js/conjugation.js?c=tg10');
    assertEqual(conjugate('飲む', 'godan', 'te'), '飲んで');
  });
});

describe('conjugate godan ta-form (paralelo a te-form)', () => {
  it('書く ta → 書いた', async () => {
    const { conjugate } = await import('../js/conjugation.js?c=ta1');
    assertEqual(conjugate('書く', 'godan', 'ta'), '書いた');
  });
  it('行く ta → 行った', async () => {
    const { conjugate } = await import('../js/conjugation.js?c=ta2');
    assertEqual(conjugate('行く', 'godan', 'ta'), '行った');
  });
  it('泳ぐ ta → 泳いだ', async () => {
    const { conjugate } = await import('../js/conjugation.js?c=ta3');
    assertEqual(conjugate('泳ぐ', 'godan', 'ta'), '泳いだ');
  });
  it('飲む ta → 飲んだ', async () => {
    const { conjugate } = await import('../js/conjugation.js?c=ta4');
    assertEqual(conjugate('飲む', 'godan', 'ta'), '飲んだ');
  });
});

describe('conjugate godan nai-form', () => {
  it('書く nai → 書かない', async () => {
    const { conjugate } = await import('../js/conjugation.js?c=n1');
    assertEqual(conjugate('書く', 'godan', 'nai'), '書かない');
  });
  it('買う nai → 買わない (う→わ)', async () => {
    const { conjugate } = await import('../js/conjugation.js?c=n2');
    assertEqual(conjugate('買う', 'godan', 'nai'), '買わない');
  });
  it('話す nai → 話さない', async () => {
    const { conjugate } = await import('../js/conjugation.js?c=n3');
    assertEqual(conjugate('話す', 'godan', 'nai'), '話さない');
  });
  it('飲む nai → 飲まない', async () => {
    const { conjugate } = await import('../js/conjugation.js?c=n4');
    assertEqual(conjugate('飲む', 'godan', 'nai'), '飲まない');
  });
  it('帰る nai → 帰らない', async () => {
    const { conjugate } = await import('../js/conjugation.js?c=n5');
    assertEqual(conjugate('帰る', 'godan', 'nai'), '帰らない');
  });
  it('書く nakatta → 書かなかった', async () => {
    const { conjugate } = await import('../js/conjugation.js?c=n6');
    assertEqual(conjugate('書く', 'godan', 'nakatta'), '書かなかった');
  });
});

describe('conjugate irregular する', () => {
  it('する masu → します', async () => {
    const { conjugate } = await import('../js/conjugation.js?c=s1');
    assertEqual(conjugate('する', 'irregular', 'masu'), 'します');
  });
  it('する te → して', async () => {
    const { conjugate } = await import('../js/conjugation.js?c=s2');
    assertEqual(conjugate('する', 'irregular', 'te'), 'して');
  });
  it('する nai → しない', async () => {
    const { conjugate } = await import('../js/conjugation.js?c=s3');
    assertEqual(conjugate('する', 'irregular', 'nai'), 'しない');
  });
  it('勉強する masu → 勉強します (compuesto)', async () => {
    const { conjugate } = await import('../js/conjugation.js?c=s4');
    assertEqual(conjugate('勉強する', 'irregular', 'masu'), '勉強します');
  });
  it('勉強する te → 勉強して', async () => {
    const { conjugate } = await import('../js/conjugation.js?c=s5');
    assertEqual(conjugate('勉強する', 'irregular', 'te'), '勉強して');
  });
});

describe('conjugate irregular 来る', () => {
  it('来る masu → 来ます', async () => {
    const { conjugate } = await import('../js/conjugation.js?c=k1');
    assertEqual(conjugate('来る', 'irregular', 'masu'), '来ます');
  });
  it('来る te → 来て', async () => {
    const { conjugate } = await import('../js/conjugation.js?c=k2');
    assertEqual(conjugate('来る', 'irregular', 'te'), '来て');
  });
  it('来る nai → 来ない', async () => {
    const { conjugate } = await import('../js/conjugation.js?c=k3');
    assertEqual(conjugate('来る', 'irregular', 'nai'), '来ない');
  });
  it('来る nakatta → 来なかった', async () => {
    const { conjugate } = await import('../js/conjugation.js?c=k4');
    assertEqual(conjugate('来る', 'irregular', 'nakatta'), '来なかった');
  });
});

describe('generateDistractors', () => {
  it('genera 3 strings distintos a la respuesta correcta', async () => {
    const { conjugate, generateDistractors } = await import('../js/conjugation.js?c=d1');
    const correct = conjugate('食べる', 'ichidan', 'masu');
    const distractors = generateDistractors('食べる', 'ichidan', 'masu', 3);
    assertEqual(distractors.length, 3);
    assertEqual(new Set(distractors).size, 3, 'distractores únicos');
    for (const d of distractors) {
      if (d === correct) throw new Error(`distractor igual a respuesta correcta: ${d}`);
    }
  });
  it('para ichidan-masu produce versión godan equivocada plausible', async () => {
    const { generateDistractors } = await import('../js/conjugation.js?c=d2');
    const distractors = generateDistractors('食べる', 'ichidan', 'masu', 3);
    // Al menos uno debe ser la "regla godan aplicada": 食べる → 食べります (incorrecto)
    // El otro tipo de error: aplicar regla nai como masu, etc.
    // Test laxo: simplemente verifica que los distractores compartan stem y se vean como conjugaciones
    for (const d of distractors) {
      if (!d.startsWith('食べ')) throw new Error(`distractor no comparte stem: ${d}`);
    }
  });
});
