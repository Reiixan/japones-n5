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

const COUNTER_TABLES = {
  tsu: {
    maxN: 10,
    standalone: [null,
      { kana: 'ひとつ', romaji: 'hitotsu' }, { kana: 'ふたつ', romaji: 'futatsu' }, { kana: 'みっつ', romaji: 'mittsu' },
      { kana: 'よっつ', romaji: 'yottsu' }, { kana: 'いつつ', romaji: 'itsutsu' }, { kana: 'むっつ', romaji: 'muttsu' },
      { kana: 'ななつ', romaji: 'nanatsu' }, { kana: 'やっつ', romaji: 'yattsu' }, { kana: 'ここのつ', romaji: 'kokonotsu' },
      { kana: 'とお', romaji: 'too' },
    ],
  },
  nin: {
    maxN: 99,
    standalone: [null,
      { kana: 'ひとり', romaji: 'hitori' }, { kana: 'ふたり', romaji: 'futari' }, { kana: 'さんにん', romaji: 'sannin' },
      { kana: 'よにん', romaji: 'yonin' }, { kana: 'ごにん', romaji: 'gonin' }, { kana: 'ろくにん', romaji: 'rokunin' },
      { kana: 'しちにん', romaji: 'shichinin' }, { kana: 'はちにん', romaji: 'hachinin' }, { kana: 'きゅうにん', romaji: 'kyuunin' },
      { kana: 'じゅうにん', romaji: 'juunin' },
    ],
    compoundUnit: [null,
      { kana: 'いちにん', romaji: 'ichinin' }, { kana: 'ににん', romaji: 'ninin' },
      null, null, null, null, null, null, null,
    ],
  },
  mai: {
    maxN: 99,
    standalone: [null,
      { kana: 'いちまい', romaji: 'ichimai' }, { kana: 'にまい', romaji: 'nimai' }, { kana: 'さんまい', romaji: 'sanmai' },
      { kana: 'よんまい', romaji: 'yonmai' }, { kana: 'ごまい', romaji: 'gomai' }, { kana: 'ろくまい', romaji: 'rokumai' },
      { kana: 'ななまい', romaji: 'nanamai' }, { kana: 'はちまい', romaji: 'hachimai' }, { kana: 'きゅうまい', romaji: 'kyuumai' },
      { kana: 'じゅうまい', romaji: 'juumai' },
    ],
  },
  hon: {
    maxN: 99,
    standalone: [null,
      { kana: 'いっぽん', romaji: 'ippon' }, { kana: 'にほん', romaji: 'nihon' }, { kana: 'さんぼん', romaji: 'sanbon' },
      { kana: 'よんほん', romaji: 'yonhon' }, { kana: 'ごほん', romaji: 'gohon' }, { kana: 'ろっぽん', romaji: 'roppon' },
      { kana: 'ななほん', romaji: 'nanahon' }, { kana: 'はっぽん', romaji: 'happon' }, { kana: 'きゅうほん', romaji: 'kyuuhon' },
      { kana: 'じゅっぽん', romaji: 'juppon' },
    ],
  },
  hiki: {
    maxN: 99,
    standalone: [null,
      { kana: 'いっぴき', romaji: 'ippiki' }, { kana: 'にひき', romaji: 'nihiki' }, { kana: 'さんびき', romaji: 'sanbiki' },
      { kana: 'よんひき', romaji: 'yonhiki' }, { kana: 'ごひき', romaji: 'gohiki' }, { kana: 'ろっぴき', romaji: 'roppiki' },
      { kana: 'ななひき', romaji: 'nanahiki' }, { kana: 'はっぴき', romaji: 'happiki' }, { kana: 'きゅうひき', romaji: 'kyuuhiki' },
      { kana: 'じゅっぴき', romaji: 'juppiki' },
    ],
  },
  dai: {
    maxN: 99,
    standalone: [null,
      { kana: 'いちだい', romaji: 'ichidai' }, { kana: 'にだい', romaji: 'nidai' }, { kana: 'さんだい', romaji: 'sandai' },
      { kana: 'よんだい', romaji: 'yondai' }, { kana: 'ごだい', romaji: 'godai' }, { kana: 'ろくだい', romaji: 'rokudai' },
      { kana: 'ななだい', romaji: 'nanadai' }, { kana: 'はちだい', romaji: 'hachidai' }, { kana: 'きゅうだい', romaji: 'kyuudai' },
      { kana: 'じゅうだい', romaji: 'juudai' },
    ],
  },
  satsu: {
    maxN: 99,
    standalone: [null,
      { kana: 'いっさつ', romaji: 'issatsu' }, { kana: 'にさつ', romaji: 'nisatsu' }, { kana: 'さんさつ', romaji: 'sansatsu' },
      { kana: 'よんさつ', romaji: 'yonsatsu' }, { kana: 'ごさつ', romaji: 'gosatsu' }, { kana: 'ろくさつ', romaji: 'rokusatsu' },
      { kana: 'ななさつ', romaji: 'nanasatsu' }, { kana: 'はっさつ', romaji: 'hassatsu' }, { kana: 'きゅうさつ', romaji: 'kyuusatsu' },
      { kana: 'じゅっさつ', romaji: 'jussatsu' },
    ],
  },
  sai: {
    maxN: 99,
    standalone: [null,
      { kana: 'いっさい', romaji: 'issai' }, { kana: 'にさい', romaji: 'nisai' }, { kana: 'さんさい', romaji: 'sansai' },
      { kana: 'よんさい', romaji: 'yonsai' }, { kana: 'ごさい', romaji: 'gosai' }, { kana: 'ろくさい', romaji: 'rokusai' },
      { kana: 'ななさい', romaji: 'nanasai' }, { kana: 'はっさい', romaji: 'hassai' }, { kana: 'きゅうさい', romaji: 'kyuusai' },
      { kana: 'じゅっさい', romaji: 'jussai' },
    ],
    exceptions: { 20: { kana: 'はたち', romaji: 'hatachi' } },
  },
  kai: {
    maxN: 99,
    standalone: [null,
      { kana: 'いっかい', romaji: 'ikkai' }, { kana: 'にかい', romaji: 'nikai' }, { kana: 'さんがい', romaji: 'sangai' },
      { kana: 'よんかい', romaji: 'yonkai' }, { kana: 'ごかい', romaji: 'gokai' }, { kana: 'ろっかい', romaji: 'rokkai' },
      { kana: 'ななかい', romaji: 'nanakai' }, { kana: 'はっかい', romaji: 'hakkai' }, { kana: 'きゅうかい', romaji: 'kyuukai' },
      { kana: 'じゅっかい', romaji: 'jukkai' },
    ],
  },
  en: {
    maxN: 99,
    standalone: [null,
      { kana: 'いちえん', romaji: 'ichien' }, { kana: 'にえん', romaji: 'nien' }, { kana: 'さんえん', romaji: 'sanen' },
      { kana: 'よんえん', romaji: 'yonen' }, { kana: 'ごえん', romaji: 'goen' }, { kana: 'ろくえん', romaji: 'rokuen' },
      { kana: 'ななえん', romaji: 'nanaen' }, { kana: 'はちえん', romaji: 'hachien' }, { kana: 'きゅうえん', romaji: 'kyuuen' },
      { kana: 'じゅうえん', romaji: 'juuen' },
    ],
  },
};

export function counterReading(n, counterId) {
  const table = COUNTER_TABLES[counterId];
  if (!table) throw new RangeError(`counterReading: contador desconocido "${counterId}"`);
  if (!Number.isInteger(n) || n < 1 || n > table.maxN) {
    throw new RangeError(`counterReading: n debe ser un entero entre 1 y ${table.maxN} para "${counterId}", recibido ${n}`);
  }
  if (table.exceptions && table.exceptions[n]) return table.exceptions[n];

  const tensDigit = Math.floor(n / 10);
  const unitsDigit = n % 10;

  if (tensDigit === 0) return table.standalone[unitsDigit];

  if (unitsDigit === 0) {
    if (tensDigit === 1) return table.standalone[10];
    return {
      kana: DIGIT_KANA[tensDigit] + table.standalone[10].kana,
      romaji: DIGIT_ROMAJI[tensDigit] + table.standalone[10].romaji,
    };
  }

  const unit = (table.compoundUnit && table.compoundUnit[unitsDigit]) || table.standalone[unitsDigit];
  return {
    kana: TENS_KANA[tensDigit] + unit.kana,
    romaji: TENS_ROMAJI[tensDigit] + unit.romaji,
  };
}

export { COUNTER_TABLES };
