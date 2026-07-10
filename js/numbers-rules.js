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

const HOUR_KANA = [null,
  'いちじ', 'にじ', 'さんじ', 'よじ', 'ごじ', 'ろくじ', 'しちじ', 'はちじ', 'くじ', 'じゅうじ', 'じゅういちじ', 'じゅうにじ',
];
const HOUR_ROMAJI = [null,
  'ichiji', 'niji', 'sanji', 'yoji', 'goji', 'rokuji', 'shichiji', 'hachiji', 'kuji', 'juuji', 'juuichiji', 'juuniji',
];

export function hourReading(h) {
  if (!Number.isInteger(h) || h < 1 || h > 12) {
    throw new RangeError(`hourReading: h debe ser un entero entre 1 y 12, recibido ${h}`);
  }
  return { kana: HOUR_KANA[h], romaji: HOUR_ROMAJI[h] };
}

const DAY_KANA = [null,
  'ついたち', 'ふつか', 'みっか', 'よっか', 'いつか', 'むいか', 'なのか', 'ようか', 'ここのか', 'とおか',
  'じゅういちにち', 'じゅうににち', 'じゅうさんにち', 'じゅうよっか', 'じゅうごにち', 'じゅうろくにち', 'じゅうしちにち', 'じゅうはちにち', 'じゅうくにち', 'はつか',
  'にじゅういちにち', 'にじゅうににち', 'にじゅうさんにち', 'にじゅうよっか', 'にじゅうごにち', 'にじゅうろくにち', 'にじゅうしちにち', 'にじゅうはちにち', 'にじゅうくにち', 'さんじゅうにち',
  'さんじゅういちにち',
];
const DAY_ROMAJI = [null,
  'tsuitachi', 'futsuka', 'mikka', 'yokka', 'itsuka', 'muika', 'nanoka', 'youka', 'kokonoka', 'tooka',
  'juuichinichi', 'juuninichi', 'juusannichi', 'juuyokka', 'juugonichi', 'juurokunichi', 'juushichinichi', 'juuhachinichi', 'juukunichi', 'hatsuka',
  'nijuuichinichi', 'nijuuninichi', 'nijuusannichi', 'nijuuyokka', 'nijuugonichi', 'nijuurokunichi', 'nijuushichinichi', 'nijuuhachinichi', 'nijuukunichi', 'sanjuunichi',
  'sanjuuichinichi',
];

export function dayOfMonthReading(d) {
  if (!Number.isInteger(d) || d < 1 || d > 31) {
    throw new RangeError(`dayOfMonthReading: d debe ser un entero entre 1 y 31, recibido ${d}`);
  }
  return { kana: DAY_KANA[d], romaji: DAY_ROMAJI[d] };
}

export function formatExpression(item) {
  if (item.kind === 'cardinal') return String(item.value);
  if (item.kind === 'counter') return `${item.value}${item.counterKanji}`;
  if (item.kind === 'hour') return `${item.value}時`;
  if (item.kind === 'date') return `${item.value}日`;
  throw new RangeError(`formatExpression: kind desconocido "${item.kind}"`);
}

function neighborValues(correctValue, min, max, count) {
  const candidates = new Set();
  const deltas = [1, -1, 2, -2, 10, -10, 5, -5];
  for (const d of deltas) {
    const v = correctValue + d;
    if (v >= min && v <= max && v !== correctValue) candidates.add(v);
  }
  const arr = shuffle([...candidates]);
  return arr.slice(0, count);
}

export function randomDistractors(item) {
  const min = 1;
  let max, readingFn;
  if (item.kind === 'cardinal') {
    max = 9999;
    readingFn = cardinalToKana;
  } else if (item.kind === 'counter') {
    const table = COUNTER_TABLES[item.counterId];
    max = table.maxN;
    readingFn = v => counterReading(v, item.counterId);
  } else if (item.kind === 'hour') {
    max = 12;
    readingFn = hourReading;
  } else if (item.kind === 'date') {
    max = 31;
    readingFn = dayOfMonthReading;
  } else {
    throw new RangeError(`randomDistractors: kind desconocido "${item.kind}"`);
  }

  const neighborNs = neighborValues(item.value, min, max, 3);
  while (neighborNs.length < 3) {
    const v = min + Math.floor(Math.random() * max);
    if (v !== item.value && !neighborNs.includes(v)) neighborNs.push(v);
  }

  return neighborNs.map(v => ({
    kind: item.kind,
    value: v,
    counterId: item.counterId,
    counterKanji: item.counterKanji,
    ...readingFn(v),
  }));
}

function randomCardinal() {
  const r = Math.random();
  if (r < 0.7) return 1 + Math.floor(Math.random() * 100);
  if (r < 0.9) return 101 + Math.floor(Math.random() * 899);
  return 1000 + Math.floor(Math.random() * 9000);
}

export function generateSessionItems(categories, size, counters) {
  const cats = categories && categories.length > 0 ? categories : ['cardinal', 'counter', 'hour', 'date'];
  const items = [];
  for (let i = 0; i < size; i++) {
    const kind = cats[Math.floor(Math.random() * cats.length)];
    let item;
    if (kind === 'cardinal') {
      const n = randomCardinal();
      item = { kind: 'cardinal', value: n, ...cardinalToKana(n) };
    } else if (kind === 'counter') {
      const counter = counters[Math.floor(Math.random() * counters.length)];
      const table = COUNTER_TABLES[counter.id];
      const n = 1 + Math.floor(Math.random() * table.maxN);
      item = { kind: 'counter', value: n, counterId: counter.id, counterKanji: counter.kanji, ...counterReading(n, counter.id) };
    } else if (kind === 'hour') {
      const h = 1 + Math.floor(Math.random() * 12);
      item = { kind: 'hour', value: h, ...hourReading(h) };
    } else {
      const d = 1 + Math.floor(Math.random() * 31);
      item = { kind: 'date', value: d, ...dayOfMonthReading(d) };
    }
    item.id = `gen_${i}_${item.kind}_${item.value}${item.counterId ? '_' + item.counterId : ''}`;
    item.distractors = randomDistractors(item);
    items.push(item);
  }
  return items;
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
