// test/romaji.test.js
import { describe, it, assertEqual } from './runner.js';
import { kanaToRomaji, isRomajiOn, setRomajiOn } from '../js/romaji.js';

describe('kanaToRomaji — hiragana base', () => {
  it('vocales: あいうえお → aiueo', () => {
    assertEqual(kanaToRomaji('あいうえお'), 'aiueo');
  });
  it('fila K: かきくけこ → kakikukeko', () => {
    assertEqual(kanaToRomaji('かきくけこ'), 'kakikukeko');
  });
  it('shi/chi/tsu (Hepburn): しちつ → shichitsu', () => {
    assertEqual(kanaToRomaji('しちつ'), 'shichitsu');
  });
  it('fu (no hu): ふ → fu', () => {
    assertEqual(kanaToRomaji('ふ'), 'fu');
  });
  it('n final: にほん → nihon', () => {
    assertEqual(kanaToRomaji('にほん'), 'nihon');
  });
});

describe('kanaToRomaji — dakuten / handakuten', () => {
  it('dakuten G: がぎぐげご → gagigugego', () => {
    assertEqual(kanaToRomaji('がぎぐげご'), 'gagigugego');
  });
  it('dakuten J: じ → ji', () => {
    assertEqual(kanaToRomaji('じ'), 'ji');
  });
  it('handakuten P: ぱぴぷぺぽ → papipupepo', () => {
    assertEqual(kanaToRomaji('ぱぴぷぺぽ'), 'papipupepo');
  });
});

describe('kanaToRomaji — yōon', () => {
  it('きゃきゅきょ → kyakyukyo', () => {
    assertEqual(kanaToRomaji('きゃきゅきょ'), 'kyakyukyo');
  });
  it('しゃしゅしょ → shashusho', () => {
    assertEqual(kanaToRomaji('しゃしゅしょ'), 'shashusho');
  });
  it('じゃじゅじょ → jajujo', () => {
    assertEqual(kanaToRomaji('じゃじゅじょ'), 'jajujo');
  });
});

describe('kanaToRomaji — sokuon (っ)', () => {
  it('かった → katta', () => {
    assertEqual(kanaToRomaji('かった'), 'katta');
  });
  it('がっこう → gakkou', () => {
    assertEqual(kanaToRomaji('がっこう'), 'gakkou');
  });
  it('まっちゃ → matcha (chi → tcha)', () => {
    assertEqual(kanaToRomaji('まっちゃ'), 'matcha');
  });
});

describe('kanaToRomaji — n + vocal (apóstrofo)', () => {
  it("しんいち → shin'ichi", () => {
    assertEqual(kanaToRomaji('しんいち'), "shin'ichi");
  });
  it("ほんや → hon'ya", () => {
    assertEqual(kanaToRomaji('ほんや'), "hon'ya");
  });
  it("ほんき → honki (sin apóstrofo si va consonante)", () => {
    assertEqual(kanaToRomaji('ほんき'), 'honki');
  });
});

describe('kanaToRomaji — katakana', () => {
  it('カタカナ → katakana', () => {
    assertEqual(kanaToRomaji('カタカナ'), 'katakana');
  });
  it('chōonpu: コーヒー → koohii', () => {
    assertEqual(kanaToRomaji('コーヒー'), 'koohii');
  });
  it('Préstamo: ファイル → fairu', () => {
    assertEqual(kanaToRomaji('ファイル'), 'fairu');
  });
});

describe('kanaToRomaji — mixto', () => {
  it('Kanji se preserva: 一月 → 一月', () => {
    assertEqual(kanaToRomaji('一月'), '一月');
  });
  it('Mixto kana+kanji: 私は学生です。 → 私ha学生desu.', () => {
    // 私 y 学生 son kanji y se mantienen tal cual; el resto se romaniza.
    assertEqual(kanaToRomaji('私は学生です。'), '私ha学生desu.');
  });
  it('Cadena vacía → ""', () => {
    assertEqual(kanaToRomaji(''), '');
  });
  it('Null → ""', () => {
    assertEqual(kanaToRomaji(null), '');
  });
});

describe('romaji flag', () => {
  it('isRomajiOn() por defecto es false', () => {
    localStorage.removeItem('jp_n5_romaji_on');
    assertEqual(isRomajiOn(), false);
  });
  it('setRomajiOn(true) lo activa', () => {
    setRomajiOn(true);
    assertEqual(isRomajiOn(), true);
    localStorage.removeItem('jp_n5_romaji_on');
  });
  it('setRomajiOn(false) borra la clave', () => {
    localStorage.setItem('jp_n5_romaji_on', '1');
    setRomajiOn(false);
    assertEqual(localStorage.getItem('jp_n5_romaji_on'), null);
  });
});
