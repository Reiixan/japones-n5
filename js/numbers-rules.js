// js/numbers-rules.js
export const DIGIT_KANA = ['', 'いち', 'に', 'さん', 'よん', 'ご', 'ろく', 'なな', 'はち', 'きゅう'];
export const DIGIT_ROMAJI = ['', 'ichi', 'ni', 'san', 'yon', 'go', 'roku', 'nana', 'hachi', 'kyuu'];

export const TENS_KANA = ['', 'じゅう', 'にじゅう', 'さんじゅう', 'よんじゅう', 'ごじゅう', 'ろくじゅう', 'ななじゅう', 'はちじゅう', 'きゅうじゅう'];
export const TENS_ROMAJI = ['', 'juu', 'nijuu', 'sanjuu', 'yonjuu', 'gojuu', 'rokujuu', 'nanajuu', 'hachijuu', 'kyuujuu'];

const HYAKU_KANA = ['', 'ひゃく', 'にひゃく', 'さんびゃく', 'よんひゃく', 'ごひゃく', 'ろっぴゃく', 'ななひゃく', 'はっぴゃく', 'きゅうひゃく'];
const HYAKU_ROMAJI = ['', 'hyaku', 'nihyaku', 'sanbyaku', 'yonhyaku', 'gohyaku', 'roppyaku', 'nanahyaku', 'happyaku', 'kyuuhyaku'];

const SEN_KANA = ['', 'せん', 'にせん', 'さんぜん', 'よんせん', 'ごせん', 'ろくせん', 'ななせん', 'はっせん', 'きゅうせん'];
const SEN_ROMAJI = ['', 'sen', 'nisen', 'sanzen', 'yonsen', 'gosen', 'rokusen', 'nanasen', 'hassen', 'kyuusen'];

export function cardinalToKana(n) {
  if (!Number.isInteger(n) || n < 1 || n > 9999) {
    throw new RangeError(`cardinalToKana: n debe ser un entero entre 1 y 9999, recibido ${n}`);
  }
  const thousands = Math.floor(n / 1000);
  const hundreds = Math.floor((n % 1000) / 100);
  const tens = Math.floor((n % 100) / 10);
  const units = n % 10;

  let kana = '';
  let romaji = '';
  if (thousands > 0) { kana += SEN_KANA[thousands]; romaji += SEN_ROMAJI[thousands]; }
  if (hundreds > 0) { kana += HYAKU_KANA[hundreds]; romaji += HYAKU_ROMAJI[hundreds]; }
  if (tens > 0) { kana += TENS_KANA[tens]; romaji += TENS_ROMAJI[tens]; }
  if (units > 0) { kana += DIGIT_KANA[units]; romaji += DIGIT_ROMAJI[units]; }

  return { kana, romaji };
}
