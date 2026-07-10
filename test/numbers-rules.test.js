// test/numbers-rules.test.js
import { describe, it, assertEqual } from './runner.js';
import { cardinalToKana } from '../js/numbers-rules.js?cache=numrules1';

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
