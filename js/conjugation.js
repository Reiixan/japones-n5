// Reglas de conjugación N5: godan, ichidan, irregular × 8 formas.
// Función pura: (dict, group, form) → string. No depende del DOM ni de storage.

const HIRA = 'あいうえおかきくけこがぎぐげごさしすせそざじずぜぞたちつてとだぢづでどなにぬねのはひふへほばびぶべぼぱぴぷぺぽまみむめもやゆよらりるれろわをん';

// Mapa: kana godan última sílaba (う段) → su contraparte en otras filas
// Para cada terminación godan, almacenamos (i段, a段, e段, masu_suffix_full)
const GODAN_MAP = {
  'う': { i: 'い', a: 'わ' },  // う→わ para nai (excepción)
  'く': { i: 'き', a: 'か' },
  'ぐ': { i: 'ぎ', a: 'が' },
  'す': { i: 'し', a: 'さ' },
  'つ': { i: 'ち', a: 'た' },
  'ぬ': { i: 'に', a: 'な' },
  'ぶ': { i: 'び', a: 'ば' },
  'む': { i: 'み', a: 'ま' },
  'る': { i: 'り', a: 'ら' },
};

// te-form sufijos por terminación godan (incluye dakuten para ぐ/ぬ/ぶ/む)
const TE_MAP = {
  'く': 'いて',
  'ぐ': 'いで',
  'す': 'して',
  'つ': 'って',
  'る': 'って',
  'う': 'って',
  'ぬ': 'んで',
  'ぶ': 'んで',
  'む': 'んで',
};
// ta-form: paralelo a te-form
const TA_MAP = Object.fromEntries(
  Object.entries(TE_MAP).map(([k, v]) => [k, v.replace(/て$/, 'た').replace(/で$/, 'だ')])
);

// Excepción 行く: usa って/った en vez de いて/いた
function isIku(dict) {
  return dict === '行く' || dict.endsWith('行く');
}

function godanLast(dict) {
  return dict.slice(-1);
}

function godanStem(dict) {
  // todo menos la última kana
  return dict.slice(0, -1);
}

function godanIForm(dict) {
  return godanStem(dict) + GODAN_MAP[godanLast(dict)].i;
}

function godanAForm(dict) {
  return godanStem(dict) + GODAN_MAP[godanLast(dict)].a;
}

function godanTe(dict) {
  if (isIku(dict)) return godanStem(dict) + 'って';
  return godanStem(dict) + TE_MAP[godanLast(dict)];
}

function godanTa(dict) {
  if (isIku(dict)) return godanStem(dict) + 'った';
  return godanStem(dict) + TA_MAP[godanLast(dict)];
}

function ichidanStem(dict) {
  return dict.slice(0, -1); // quita る
}

// Tabla irregulares. Para compuestos con する (勉強する), el prefijo se conserva.
const SURU_FORMS = {
  masu: 'します', masen: 'しません', mashita: 'しました', masen_deshita: 'しませんでした',
  te: 'して', ta: 'した', nai: 'しない', nakatta: 'しなかった',
};
const KURU_FORMS = {
  masu: '来ます', masen: '来ません', mashita: '来ました', masen_deshita: '来ませんでした',
  te: '来て', ta: '来た', nai: '来ない', nakatta: '来なかった',
};

function isKuru(dict) {
  return dict === '来る' || dict === 'くる';
}

export function conjugate(dict, group, form) {
  if (group === 'irregular') {
    if (isKuru(dict)) return KURU_FORMS[form];
    // suru o compuesto con する
    if (dict.endsWith('する')) {
      const prefix = dict.slice(0, -2);
      return prefix + SURU_FORMS[form];
    }
    throw new Error(`Verbo irregular no soportado: ${dict}`);
  }

  if (group === 'ichidan') {
    const stem = ichidanStem(dict);
    switch (form) {
      case 'masu': return stem + 'ます';
      case 'masen': return stem + 'ません';
      case 'mashita': return stem + 'ました';
      case 'masen_deshita': return stem + 'ませんでした';
      case 'te': return stem + 'て';
      case 'ta': return stem + 'た';
      case 'nai': return stem + 'ない';
      case 'nakatta': return stem + 'なかった';
    }
  }

  if (group === 'godan') {
    switch (form) {
      case 'masu': return godanIForm(dict) + 'ます';
      case 'masen': return godanIForm(dict) + 'ません';
      case 'mashita': return godanIForm(dict) + 'ました';
      case 'masen_deshita': return godanIForm(dict) + 'ませんでした';
      case 'te': return godanTe(dict);
      case 'ta': return godanTa(dict);
      case 'nai': return godanAForm(dict) + 'ない';
      case 'nakatta': return godanAForm(dict) + 'なかった';
    }
  }

  throw new Error(`Grupo desconocido: ${group}`);
}

// Genera distractores aplicando reglas EQUIVOCADAS.
// Estrategia:
//   1. Aplicar la regla del otro grupo (ichidan→godan o godan→ichidan).
//   2. Aplicar la regla godan tratando la última kana como si fuera otra (p.ej. う como る).
//   3. Mezclar form: usar conjugación de otra forma cercana.
// Devuelve EXACTAMENTE n strings únicos, ortográficamente plausibles, distintos a la respuesta correcta.
export function generateDistractors(dict, group, form, n = 3) {
  const correct = conjugate(dict, group, form);
  const candidates = new Set();

  // Estrategia 1: aplicar regla del otro grupo
  try {
    const wrongGroup = group === 'godan' ? 'ichidan' : 'godan';
    if (wrongGroup === 'ichidan' && dict.endsWith('る')) {
      candidates.add(conjugate(dict, 'ichidan', form));
    } else if (wrongGroup === 'godan' && GODAN_MAP[dict.slice(-1)]) {
      candidates.add(conjugate(dict, 'godan', form));
    }
  } catch (_) { /* ignore */ }

  // Estrategia 2: forma "equivocada" — usar masu cuando piden te, etc.
  const swapForms = {
    masu: 'mashita', mashita: 'masu',
    masen: 'masen_deshita', masen_deshita: 'masen',
    te: 'ta', ta: 'te',
    nai: 'nakatta', nakatta: 'nai',
  };
  if (swapForms[form]) {
    try { candidates.add(conjugate(dict, group, swapForms[form])); } catch (_) {}
  }

  // Estrategia 3: para verbos godan, aplicar regla de OTRA terminación
  // Ej: para 買う masu (買います), error: aplicar como 'る' godan → 買ります
  if (group === 'godan' && form === 'masu') {
    const stem = godanStem(dict);
    // últimas alternativas según partida fonética
    const alts = ['い', 'き', 'し', 'ち', 'に', 'び', 'み', 'り'];
    for (const a of alts) {
      if (candidates.size >= n + 3) break;
      candidates.add(stem + a + 'ます');
    }
  }

  // Estrategia 4 (catch-all): variaciones del stem
  if (group === 'ichidan' && form === 'masu') {
    // 食べる → 食べります (regla godan equivocada)
    candidates.add(ichidanStem(dict) + 'ります');
  }
  if (group === 'ichidan' && form === 'te') {
    candidates.add(ichidanStem(dict) + 'って');
  }
  if (group === 'ichidan' && form === 'nai') {
    candidates.add(ichidanStem(dict) + 'らない');
  }

  candidates.delete(correct);

  // Recoger en orden estable. Si faltan, completar con variantes mínimas.
  const arr = [...candidates];
  while (arr.length < n) {
    // catch-all: cambia última kana por otra
    const variant = correct.slice(0, -1) + (correct.endsWith('す') ? 'る' : 'す');
    if (variant !== correct && !arr.includes(variant)) arr.push(variant);
    else break;
  }
  return arr.slice(0, n);
}
