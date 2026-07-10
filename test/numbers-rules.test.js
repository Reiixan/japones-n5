// test/numbers-rules.test.js
import { describe, it, assertEqual } from './runner.js';
import {
  cardinalToKana, counterReading, hourReading, dayOfMonthReading,
  formatExpression, randomDistractors, generateSessionItems,
} from '../js/numbers-rules.js?cache=numrules1';

describe('cardinalToKana — dígitos y decenas', () => {
  it('1 → いち', () => {
    assertEqual(cardinalToKana(1).kana, 'いち');
  });
  it('10 → じゅう (sin いち delante)', () => {
    assertEqual(cardinalToKana(10).kana, 'じゅう');
  });
  it('35 → さんじゅうご', () => {
    assertEqual(cardinalToKana(35).kana, 'さんじゅうご');
    assertEqual(cardinalToKana(35).romaji, 'sanjuugo');
  });
});

describe('cardinalToKana — excepciones de centenas', () => {
  it('100 → ひゃく (sin いち delante)', () => {
    assertEqual(cardinalToKana(100).kana, 'ひゃく');
  });
  it('300 → さんびゃく', () => {
    assertEqual(cardinalToKana(300).kana, 'さんびゃく');
  });
  it('600 → ろっぴゃく', () => {
    assertEqual(cardinalToKana(600).kana, 'ろっぴゃく');
  });
  it('800 → はっぴゃく', () => {
    assertEqual(cardinalToKana(800).kana, 'はっぴゃく');
  });
});

describe('cardinalToKana — excepciones de millares', () => {
  it('1000 → せん (sin いち delante)', () => {
    assertEqual(cardinalToKana(1000).kana, 'せん');
  });
  it('3000 → さんぜん', () => {
    assertEqual(cardinalToKana(3000).kana, 'さんぜん');
  });
  it('8000 → はっせん', () => {
    assertEqual(cardinalToKana(8000).kana, 'はっせん');
  });
});

describe('cardinalToKana — números compuestos', () => {
  it('1998 → せんきゅうひゃくきゅうじゅうはち', () => {
    assertEqual(cardinalToKana(1998).kana, 'せんきゅうひゃくきゅうじゅうはち');
  });
  it('9999 → きゅうせんきゅうひゃくきゅうじゅうきゅう', () => {
    assertEqual(cardinalToKana(9999).kana, 'きゅうせんきゅうひゃくきゅうじゅうきゅう');
  });
});

describe('cardinalToKana — rango inválido', () => {
  it('0 lanza RangeError', () => {
    let threw = false;
    try { cardinalToKana(0); } catch (e) { threw = e instanceof RangeError; }
    assertEqual(threw, true);
  });
  it('10000 lanza RangeError', () => {
    let threw = false;
    try { cardinalToKana(10000); } catch (e) { threw = e instanceof RangeError; }
    assertEqual(threw, true);
  });
});

describe('counterReading — つ (genérico, irregular completo 1-10)', () => {
  it('1つ → ひとつ', () => {
    assertEqual(counterReading(1, 'tsu').kana, 'ひとつ');
  });
  it('10つ → とお', () => {
    assertEqual(counterReading(10, 'tsu').kana, 'とお');
  });
  it('11 fuera de rango lanza RangeError', () => {
    let threw = false;
    try { counterReading(11, 'tsu'); } catch (e) { threw = e instanceof RangeError; }
    assertEqual(threw, true);
  });
});

describe('counterReading — 人 (standalone irregular vs compuesto regular)', () => {
  it('1人 → ひとり (standalone irregular)', () => {
    assertEqual(counterReading(1, 'nin').kana, 'ひとり');
  });
  it('2人 → ふたり (standalone irregular)', () => {
    assertEqual(counterReading(2, 'nin').kana, 'ふたり');
  });
  it('4人 → よにん (no よんにん)', () => {
    assertEqual(counterReading(4, 'nin').kana, 'よにん');
  });
  it('11人 → じゅういちにん (compuesto usa forma regular, no ひとり)', () => {
    assertEqual(counterReading(11, 'nin').kana, 'じゅういちにん');
  });
  it('12人 → じゅうににん (compuesto usa forma regular, no ふたり)', () => {
    assertEqual(counterReading(12, 'nin').kana, 'じゅうににん');
  });
  it('20人 → にじゅうにん', () => {
    assertEqual(counterReading(20, 'nin').kana, 'にじゅうにん');
  });
});

describe('counterReading — 本 (sokuon en 1,3,6,8,10)', () => {
  it('1本 → いっぽん', () => {
    assertEqual(counterReading(1, 'hon').kana, 'いっぽん');
  });
  it('3本 → さんぼん', () => {
    assertEqual(counterReading(3, 'hon').kana, 'さんぼん');
  });
  it('6本 → ろっぽん', () => {
    assertEqual(counterReading(6, 'hon').kana, 'ろっぽん');
  });
  it('8本 → はっぽん', () => {
    assertEqual(counterReading(8, 'hon').kana, 'はっぽん');
  });
  it('10本 → じゅっぽん', () => {
    assertEqual(counterReading(10, 'hon').kana, 'じゅっぽん');
  });
  it('20本 → にじゅっぽん (decena exacta reusa la irregularidad de 10)', () => {
    assertEqual(counterReading(20, 'hon').kana, 'にじゅっぽん');
  });
  it('21本 → にじゅういっぽん (compuesto: decena regular + unidad irregular)', () => {
    assertEqual(counterReading(21, 'hon').kana, 'にじゅういっぽん');
  });
});

describe('counterReading — 歳 (20歳 = はたち, excepción total)', () => {
  it('1歳 → いっさい', () => {
    assertEqual(counterReading(1, 'sai').kana, 'いっさい');
  });
  it('20歳 → はたち', () => {
    assertEqual(counterReading(20, 'sai').kana, 'はたち');
  });
  it('21歳 → にじゅういっさい (compuesto no usa はたち)', () => {
    assertEqual(counterReading(21, 'sai').kana, 'にじゅういっさい');
  });
});

describe('counterReading — 枚 (sin irregularidad fonética)', () => {
  it('4枚 → よんまい', () => {
    assertEqual(counterReading(4, 'mai').kana, 'よんまい');
  });
  it('99枚 → きゅうじゅうきゅうまい', () => {
    assertEqual(counterReading(99, 'mai').kana, 'きゅうじゅうきゅうまい');
  });
});

describe('counterReading — contador desconocido', () => {
  it('lanza RangeError', () => {
    let threw = false;
    try { counterReading(1, 'nope'); } catch (e) { threw = e instanceof RangeError; }
    assertEqual(threw, true);
  });
});

describe('hourReading — excepciones 4/7/9', () => {
  it('4時 → よじ (no よんじ)', () => {
    assertEqual(hourReading(4).kana, 'よじ');
  });
  it('7時 → しちじ (no ななじ)', () => {
    assertEqual(hourReading(7).kana, 'しちじ');
  });
  it('9時 → くじ (no きゅうじ)', () => {
    assertEqual(hourReading(9).kana, 'くじ');
  });
  it('1時 → いちじ (regular)', () => {
    assertEqual(hourReading(1).kana, 'いちじ');
  });
  it('12時 → じゅうにじ (regular)', () => {
    assertEqual(hourReading(12).kana, 'じゅうにじ');
  });
  it('13 fuera de rango lanza RangeError', () => {
    let threw = false;
    try { hourReading(13); } catch (e) { threw = e instanceof RangeError; }
    assertEqual(threw, true);
  });
});

describe('dayOfMonthReading — 1-10 irregulares', () => {
  it('1日 → ついたち', () => {
    assertEqual(dayOfMonthReading(1).kana, 'ついたち');
  });
  it('2日 → ふつか', () => {
    assertEqual(dayOfMonthReading(2).kana, 'ふつか');
  });
  it('10日 → とおか', () => {
    assertEqual(dayOfMonthReading(10).kana, 'とおか');
  });
});

describe('dayOfMonthReading — excepciones en decenas', () => {
  it('14日 → じゅうよっか (no じゅうよんにち)', () => {
    assertEqual(dayOfMonthReading(14).kana, 'じゅうよっか');
  });
  it('19日 → じゅうくにち (no じゅうきゅうにち)', () => {
    assertEqual(dayOfMonthReading(19).kana, 'じゅうくにち');
  });
  it('20日 → はつか (irregular total)', () => {
    assertEqual(dayOfMonthReading(20).kana, 'はつか');
  });
  it('24日 → にじゅうよっか', () => {
    assertEqual(dayOfMonthReading(24).kana, 'にじゅうよっか');
  });
  it('29日 → にじゅうくにち', () => {
    assertEqual(dayOfMonthReading(29).kana, 'にじゅうくにち');
  });
});

describe('dayOfMonthReading — regulares', () => {
  it('15日 → じゅうごにち', () => {
    assertEqual(dayOfMonthReading(15).kana, 'じゅうごにち');
  });
  it('31日 → さんじゅういちにち', () => {
    assertEqual(dayOfMonthReading(31).kana, 'さんじゅういちにち');
  });
  it('32 fuera de rango lanza RangeError', () => {
    let threw = false;
    try { dayOfMonthReading(32); } catch (e) { threw = e instanceof RangeError; }
    assertEqual(threw, true);
  });
});

describe('formatExpression', () => {
  it('cardinal → solo el número', () => {
    assertEqual(formatExpression({ kind: 'cardinal', value: 35 }), '35');
  });
  it('counter → cantidad + kanji del contador', () => {
    assertEqual(formatExpression({ kind: 'counter', value: 3, counterKanji: '本' }), '3本');
  });
  it('hour → cantidad + 時', () => {
    assertEqual(formatExpression({ kind: 'hour', value: 4 }), '4時');
  });
  it('date → cantidad + 日', () => {
    assertEqual(formatExpression({ kind: 'date', value: 2 }), '2日');
  });
});

describe('randomDistractors', () => {
  it('cardinal: devuelve 3 distractores con valor distinto al correcto', () => {
    const item = { kind: 'cardinal', value: 35 };
    const distractors = randomDistractors(item);
    assertEqual(distractors.length, 3);
    distractors.forEach(d => {
      assertEqual(d.value === 35, false);
      assertEqual(typeof d.kana, 'string');
    });
  });
  it('counter: los distractores respetan el rango del contador', () => {
    const item = { kind: 'counter', value: 1, counterId: 'tsu', counterKanji: 'つ' };
    const distractors = randomDistractors(item);
    distractors.forEach(d => {
      assertEqual(d.value >= 1 && d.value <= 10, true);
      assertEqual(d.counterId, 'tsu');
    });
  });
  it('hour: los distractores están en 1-12', () => {
    const item = { kind: 'hour', value: 4 };
    const distractors = randomDistractors(item);
    distractors.forEach(d => assertEqual(d.value >= 1 && d.value <= 12, true));
  });
  it('date: los distractores están en 1-31', () => {
    const item = { kind: 'date', value: 20 };
    const distractors = randomDistractors(item);
    distractors.forEach(d => assertEqual(d.value >= 1 && d.value <= 31, true));
  });
});

describe('generateSessionItems', () => {
  const counters = [
    { id: 'tsu', kanji: 'つ', meaning_es: 'genérico' },
    { id: 'hon', kanji: '本', meaning_es: 'cilíndricos' },
  ];

  it('genera exactamente `size` ítems', () => {
    const items = generateSessionItems(['cardinal'], 15, counters);
    assertEqual(items.length, 15);
  });
  it('cada ítem tiene id único, kana, romaji y 3 distractores', () => {
    const items = generateSessionItems(['cardinal', 'hour'], 10, counters);
    const ids = new Set(items.map(it => it.id));
    assertEqual(ids.size, items.length);
    items.forEach(it => {
      assertEqual(typeof it.kana, 'string');
      assertEqual(typeof it.romaji, 'string');
      assertEqual(it.distractors.length, 3);
    });
  });
  it('solo genera las categorías pedidas', () => {
    const items = generateSessionItems(['date'], 10, counters);
    items.forEach(it => assertEqual(it.kind, 'date'));
  });
  it('sin categorías (null) usa las 4 por defecto', () => {
    const items = generateSessionItems(null, 40, counters);
    const kinds = new Set(items.map(it => it.kind));
    assertEqual(kinds.size > 1, true);
  });
});
