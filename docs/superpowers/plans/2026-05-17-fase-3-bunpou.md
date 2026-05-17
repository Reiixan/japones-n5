# Fase 3 — Bunpou completo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Añadir tres piezas de gramática N5: (A) bloque de verbos con 8 formas conjugadas y distractores algorítmicos, (B) bloque de adjetivos い/な con sus formas, (C) mejorar el bloque de kanji existente para mostrar ejemplo en contexto en lugar del kanji aislado.

**Architecture:**
- **Verbos**: un módulo `js/conjugation.js` aislado y testeable implementa las reglas de conjugación N5 (godan/ichidan/irregulares × 8 formas). `js/verbs.js` orquesta el ejercicio: presenta verbo+grupo+forma_pedida y pide elegir la conjugación correcta entre 4 opciones. Los distractores se generan aplicando reglas EQUIVOCADAS (p.ej. conjugar un ichidan con la regla godan), garantizando que siempre sean ortográficamente plausibles.
- **Adjetivos**: módulo análogo `js/adjective-forms.js` para i/な × 4 formas. `js/adjectives.js` orquesta. Distractores también algorítmicos.
- **Kanji en contexto**: edición localizada en `js/kanji.js`. La data ya tiene `example_word`/`example_reading`.

**Tech Stack:** Vanilla JS ES modules, localStorage. Sin nuevas dependencias.

**Sub-fases con tags intermedios:**
- A. Verbos → tag `fase-3-verbos`
- B. Adjetivos → tag `fase-3-adjetivos`
- C. Kanji en contexto → tag `fase-3-kanji`

Si interrumpimos a mitad de plan, cualquier sub-fase ya cerrada queda funcional en producción.

---

## File structure

**Sub-fase A (Verbos):**
- Create: `js/conjugation.js` (reglas puras, exportables, testeables).
- Create: `test/conjugation.test.js`.
- Create: `data/verbs-n5.json` (60 verbos).
- Create: `js/verbs.js` (módulo del bloque, sigue el patrón canónico).
- Modify: `js/app.js` (ruta `/verbs`), `js/home.js` (BLOCKS +1), `js/stats.js` (DECKS +1), `css/exercise.css` (estilos `.verb-*`).

**Sub-fase B (Adjetivos):**
- Create: `js/adjective-forms.js` + `test/adjective-forms.test.js`.
- Create: `data/adjectives-n5.json` (45 adjetivos).
- Create: `js/adjectives.js`.
- Modify: `js/app.js`, `js/home.js`, `js/stats.js`, `css/exercise.css`.

**Sub-fase C (Kanji en contexto):**
- Modify: `js/kanji.js` (renderPrompt actualizado).
- Modify: `css/exercise.css` (estilos `.kanji-example`).

---

# Sub-fase A — Verbos

## Task A1: Módulo `js/conjugation.js` (núcleo de reglas + tests)

**Files:**
- Create: `js/conjugation.js`
- Create: `test/conjugation.test.js`
- Modify: `test/index.html`

Este módulo es la pieza más sensible del plan. Implementa las reglas de conjugación japonesa N5 como funciones puras: `(dict, group, form) → string`. NO depende del DOM, NO toca localStorage. Testeable al detalle.

**Formas soportadas** (8): `masu`, `masen`, `mashita`, `masen_deshita`, `te`, `ta`, `nai`, `nakatta`.

**Grupos** (3): `godan`, `ichidan`, `irregular`. Los únicos irregulares N5 son `する` y `来る` (くる).

**API expuesta:**
```js
export function conjugate(dict, group, form)  // → string
export function generateDistractors(dict, group, form, n = 3)  // → array de 3 strings ortográficamente plausibles pero incorrectos
```

**Reglas (godan):**
- Última kana en `う段`. Detectar última sílaba: う,く,ぐ,す,つ,ぬ,ぶ,む,る (excluyendo ichidan).
- `masu`: última sílaba a い段 + ます (買う→買います, 書く→書きます, 話す→話します, 待つ→待ちます, 死ぬ→死にます, 遊ぶ→遊びます, 飲む→飲みます, 帰る→帰ります).
- `masen`/`mashita`/`masen_deshita`: derivados de masu.
- `te` (godan): depende de terminación:
  - く → いて (excepción: 行く → 行って)
  - ぐ → いで
  - す → して
  - つ/る/う → って
  - ぬ/ぶ/む → んで
- `ta`: misma regla que `te` pero con た/だ.
- `nai`: última sílaba a あ段 + ない. Excepción: う → わ (買う → 買わない). 行く → 行かない (no es excepción para nai).
- `nakatta`: derivado de nai (ない → なかった).

**Reglas (ichidan):**
- Quitar る final.
- `masu` = stem + ます.
- `te` = stem + て. `ta` = stem + た.
- `nai` = stem + ない. `nakatta` = stem + なかった.

**Reglas (irregular):**
- する: します/しません/しました/しませんでした/して/した/しない/しなかった.
- 来る (くる): きます/きません/きました/きませんでした/きて/きた/こない/こなかった.

**Compuestos con する** (勉強する, 結婚する): tratarlos como `irregular` con `dict` completo. La función debe usar el prefijo + la conjugación de する.

- [ ] **Step 1: Crear test/conjugation.test.js con tests exhaustivos por regla**

Crear `/home/hugo/japones-n5/test/conjugation.test.js`:

```js
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
```

- [ ] **Step 2: Añadir test/conjugation.test.js al runner**

Modify `test/index.html` añadiendo `<script type="module" src="./conjugation.test.js"></script>` siguiendo el estilo de los existentes.

- [ ] **Step 3: Verificar que los tests fallan**

Recargar `http://localhost:8765/test/`. Expected: todos los conjugation tests FALLAN porque el módulo aún no existe.

- [ ] **Step 4: Implementar `js/conjugation.js`**

Crear `/home/hugo/japones-n5/js/conjugation.js`:

```js
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
```

- [ ] **Step 5: Verificar tests pasan**

Recargar `http://localhost:8765/test/`. Expected: todos los conjugation tests PASAN (49 nuevos). Total app: 57+49 = 106 tests.

- [ ] **Step 6: Commit**

```bash
git add js/conjugation.js test/conjugation.test.js test/index.html
git commit -m "feat(conjugation): reglas N5 godan/ichidan/irregular para 8 formas + tests"
```

---

## Task A2: Data seed `data/verbs-n5.json` (10 verbos para validar el bloque)

**Files:**
- Create: `data/verbs-n5.json`

Una semilla de 10 verbos cubriendo godan (varias terminaciones), ichidan y los dos irregulares. Suficiente para construir y testear el bloque. Los otros 50 vienen en Task A7.

- [ ] **Step 1: Crear `data/verbs-n5.json`**

```json
[
  { "id": "vb_taberu", "dict": "食べる", "dict_kana": "たべる", "group": "ichidan", "meaning_es": "comer" },
  { "id": "vb_miru", "dict": "見る", "dict_kana": "みる", "group": "ichidan", "meaning_es": "ver, mirar" },
  { "id": "vb_kau", "dict": "買う", "dict_kana": "かう", "group": "godan", "meaning_es": "comprar" },
  { "id": "vb_kaku", "dict": "書く", "dict_kana": "かく", "group": "godan", "meaning_es": "escribir" },
  { "id": "vb_iku", "dict": "行く", "dict_kana": "いく", "group": "godan", "meaning_es": "ir" },
  { "id": "vb_hanasu", "dict": "話す", "dict_kana": "はなす", "group": "godan", "meaning_es": "hablar" },
  { "id": "vb_nomu", "dict": "飲む", "dict_kana": "のむ", "group": "godan", "meaning_es": "beber" },
  { "id": "vb_kaeru", "dict": "帰る", "dict_kana": "かえる", "group": "godan", "meaning_es": "volver a casa" },
  { "id": "vb_suru", "dict": "する", "dict_kana": "する", "group": "irregular", "meaning_es": "hacer" },
  { "id": "vb_kuru", "dict": "来る", "dict_kana": "くる", "group": "irregular", "meaning_es": "venir" }
]
```

- [ ] **Step 2: Validar con conjugation.js**

```bash
cd /home/hugo/japones-n5 && node --input-type=module -e "
import('./js/conjugation.js').then(({conjugate}) => {
  const fs = require('fs');
  const verbs = JSON.parse(fs.readFileSync('./data/verbs-n5.json'));
  const forms = ['masu','masen','mashita','masen_deshita','te','ta','nai','nakatta'];
  for (const v of verbs) {
    for (const f of forms) {
      const r = conjugate(v.dict, v.group, f);
      console.log(v.id, f, '→', r);
    }
  }
});
"
```
(Si node no acepta el import dinámico, ejecutar en el navegador desde la consola en `http://localhost:8765/`.)

- [ ] **Step 3: Commit**

```bash
git add data/verbs-n5.json
git commit -m "data: seed de 10 verbos N5 para validar bloque (godan/ichidan/irregular)"
```

---

## Task A3: Módulo `js/verbs.js` + tests

**Files:**
- Create: `js/verbs.js`
- Create: `test/verbs.test.js`

El módulo orquesta el ejercicio. Sigue el patrón canónico (igual que `js/listening.js`, `js/reading.js`). Para cada ítem (verbo), elige aleatoriamente UNA forma de las 8 y genera el ejercicio.

**Estructura del ítem efímero** (NO se guarda en JSON, se genera en runtime):
```js
{ verb: <objeto del JSON>, form: 'masu'|'te'|..., correct: <string>, distractors: [<3 strings>] }
```

**SRS**: caja por verbo (igual que vocab JP↔ES). `getItemId: it => it.verb.id`.

- [ ] **Step 1: Crear test/verbs.test.js**

```js
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
```

- [ ] **Step 2: Añadir verbs.test.js al runner**

Modify `test/index.html`.

- [ ] **Step 3: Verificar fallan**

- [ ] **Step 4: Crear `js/verbs.js`**

```js
import { startExercise, showSessionConfig } from './exercise.js';
import { selectSession } from './srs.js';
import { speak } from './tts.js';
import { conjugate, generateDistractors } from './conjugation.js';

const DECK = 'verbs';

export const ALLOWED_FORMS = ['masu', 'masen', 'mashita', 'masen_deshita', 'te', 'ta', 'nai', 'nakatta'];

export const FORM_LABELS = {
  masu: 'presente afirmativo (~ます)',
  masen: 'presente negativo (~ません)',
  mashita: 'pasado afirmativo (~ました)',
  masen_deshita: 'pasado negativo (~ませんでした)',
  te: 'forma て',
  ta: 'forma た (pasado plain)',
  nai: 'forma ない (negativo plain)',
  nakatta: 'forma なかった (pasado negativo plain)',
};

const GROUP_LABELS = {
  godan: 'godan (五段)',
  ichidan: 'ichidan (一段)',
  irregular: 'irregular',
};

export function pickRandomForm() {
  return ALLOWED_FORMS[Math.floor(Math.random() * ALLOWED_FORMS.length)];
}

export function buildItem(verb, form) {
  const correct = conjugate(verb.dict, verb.group, form);
  const distractors = generateDistractors(verb.dict, verb.group, form, 3);
  return { verb, form, correct, distractors };
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function escapeAttr(s) {
  return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export async function start(container, allVerbs) {
  showSessionConfig(container, {
    title: 'Verbos 動詞',
    subtitle: 'Mira el verbo en diccionario, su grupo y la forma pedida. Elige la conjugación correcta.',
    onStart: (size) => {
      const verbs = selectSession(DECK, allVerbs, size);
      const items = verbs.map(v => buildItem(v, pickRandomForm()));
      runVerbs(container, items, allVerbs);
    },
  });
}

function runVerbs(container, items, allVerbs) {
  startExercise(container, {
    deck: DECK,
    items,
    allItems: allVerbs,
    getItemId: it => it.verb.id,
    renderPrompt(item, el) {
      const { verb, form } = item;
      el.innerHTML = `
        <div class="verb-prompt">
          <div class="verb-dict">
            <span class="verb-jp">${verb.dict}</span>
            <button type="button" class="btn-tts" data-tts-text="${escapeAttr(verb.dict_kana)}" aria-label="Escuchar">🔊</button>
          </div>
          <div class="verb-kana">${verb.dict_kana}</div>
          <div class="verb-meta">
            <span class="verb-group">${GROUP_LABELS[verb.group]}</span>
            <span class="verb-meaning">${verb.meaning_es}</span>
          </div>
          <div class="verb-form-target">Conjuga en <strong>${FORM_LABELS[form]}</strong></div>
        </div>
      `;
      el.addEventListener('click', e => {
        const btn = e.target.closest('.btn-tts');
        if (btn) { e.preventDefault(); speak(btn.dataset.ttsText); }
      });
    },
    renderInput(item, _all, el, onAnswer) {
      const options = shuffle([item.correct, ...item.distractors]);
      el.innerHTML = `<div class="choice-grid">
        ${options.map((o, i) => `<button class="choice-btn verb-choice" data-val="${escapeAttr(o)}" data-key="${i + 1}">
          <span class="choice-key">${i + 1}</span><span>${o}</span>
        </button>`).join('')}
      </div>`;
      const keyHandler = e => {
        const tag = e.target && e.target.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA') return;
        const n = parseInt(e.key);
        if (n >= 1 && n <= options.length) {
          const btn = el.querySelector(`[data-key="${n}"]`);
          if (btn && !btn.disabled) onAnswer(btn.dataset.val);
        }
      };
      document.addEventListener('keydown', keyHandler);
      el.addEventListener('click', e => {
        const btn = e.target.closest('.choice-btn');
        if (btn && !btn.disabled) onAnswer(btn.dataset.val);
      });
      return () => document.removeEventListener('keydown', keyHandler);
    },
    checkAnswer(item, answer) { return item.correct === answer; },
    getCorrectDisplay(item) { return `${item.correct}  (${item.verb.dict} → ${FORM_LABELS[item.form]})`; },
    getPromptSpeechText: item => item.verb.dict_kana,
    getAnswerSpeechText: item => item.correct,
  });
}
```

- [ ] **Step 5: Tests pasan (3 nuevos). Commit**

```bash
git add js/verbs.js test/verbs.test.js test/index.html
git commit -m "feat(verbs): bloque de conjugación con distractores algorítmicos"
```

---

## Task A4: CSS `.verb-*` en `css/exercise.css`

**Files:**
- Modify: `css/exercise.css`

- [ ] **Step 1: Añadir al final de `css/exercise.css`**

```css
/* ---- Verbos ---- */
.verb-prompt {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.6rem;
  text-align: center;
}
.verb-dict {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 2.4rem;
  font-family: "Noto Sans JP", sans-serif;
}
.verb-kana {
  font-size: 1rem;
  color: var(--text-muted);
  font-family: "Noto Sans JP", sans-serif;
}
.verb-meta {
  display: inline-flex;
  gap: 1rem;
  font-size: 0.9rem;
  color: var(--text-muted);
}
.verb-group {
  background: var(--bg-hover);
  border: 1px solid var(--border);
  padding: 0.15rem 0.55rem;
  border-radius: 999px;
}
.verb-meaning { font-style: italic; }
.verb-form-target {
  font-size: 1rem;
  background: var(--bg-hover);
  padding: 0.5rem 1rem;
  border-radius: 8px;
  border: 1px solid var(--border);
  margin-top: 0.4rem;
}
.verb-form-target strong { color: var(--c-blue); }
.verb-choice { font-family: "Noto Sans JP", sans-serif; }
```

- [ ] **Step 2: Commit**

```bash
git add css/exercise.css
git commit -m "style(verbs): estilos para bloque de conjugación"
```

---

## Task A5: Integración (app, home, stats)

**Files:**
- Modify: `js/app.js`, `js/home.js`, `js/stats.js`

- [ ] **Step 1: `js/app.js`**

Añadir import:
```js
import { start as startVerbs } from './verbs.js';
```

Y en `route()`, antes del `else` catch-all:
```js
    } else if (seg1 === 'verbs') {
      const allItems = await loadData('verbs-n5.json');
      await startVerbs(container, allItems);
```

- [ ] **Step 2: `js/home.js`**

Añadir entry al array `BLOCKS` (después de la entry de reading):
```js
  {
    id: 'verbs',
    label: 'Verbos',
    jp: '動詞',
    emoji: '🏃',
    file: 'verbs-n5.json',
    desc: 'Conjugación de los 8 tipos N5',
    color: 'var(--c-violet)',
    path: '/verbs',
  },
```

- [ ] **Step 3: `js/stats.js`**

Añadir entry al array `DECKS`:
```js
  { id: 'verbs', label: 'Verbos', file: 'verbs-n5.json' },
```

- [ ] **Step 4: Verificar manualmente en navegador**

Abrir `http://localhost:8765/`. Esperar tarjeta nueva 🏃 Verbos con `0% (0/10)`. Probar el ejercicio con los 10 seed.

- [ ] **Step 5: Commit**

```bash
git add js/app.js js/home.js js/stats.js
git commit -m "feat(verbs): integración con app, home y stats"
```

---

## Task A6: Generar 50 verbos adicionales (total 60)

**Files:**
- Modify: `data/verbs-n5.json`

Generar 50 verbos N5 adicionales. Mantener `group` correctamente clasificado. Atención: hay verbos que ortográficamente terminan en る pero son godan (帰る, 切る, 知る, 入る, 走る, 要る, 喋る) — clasificarlos como `godan`. Algunos típicos N5 que terminan en eru/iru y SÍ son ichidan: 見る, 食べる, 起きる, 寝る, 教える, 開ける, 閉める, 借りる, 始める.

**Verbos a incluir (lista de referencia, mínimo 50)**:
- godan: 飲む, 読む, 聞く, 話す, 待つ, 立つ, 持つ, 取る, 撮る, 作る, 売る, 走る, 切る, 知る, 入る, 死ぬ, 遊ぶ, 呼ぶ, 飛ぶ, 泳ぐ, 歌う, 笑う, 思う, 使う, 洗う, 出す, 押す, 貸す, 探す, 急ぐ, 脱ぐ
- ichidan: 起きる, 寝る, 出る, 教える, 開ける, 閉める, 借りる, 始める, 浴びる, 答える, 忘れる, 覚える, 着る, 降りる, 並べる, 並ぶ (¡godan!), 入れる
- irregular (compuestos con する): 勉強する, 仕事する, 結婚する, 旅行する, 運転する, 練習する, 散歩する

(Algunos de la lista pueden faltar — completar hasta 60 con los más frecuentes N5.)

- [ ] **Step 1: Editar `data/verbs-n5.json`** para que tenga 60 entries totales (los 10 originales + 50 nuevos), todos con la estructura:
```json
{ "id": "vb_<romaji_simple>", "dict": "<kanji/kana>", "dict_kana": "<kana>", "group": "godan|ichidan|irregular", "meaning_es": "<español>" }
```

- [ ] **Step 2: Validar grupos con conjugation.js**

Script Python que carga verbs-n5.json, llama a conjugate (no se puede desde Python — script JS en consola del browser). Alternativa: en `http://localhost:8765/`, abrir DevTools > Console, copiar-pegar:
```js
const verbs = await fetch('./data/verbs-n5.json').then(r=>r.json());
const { conjugate } = await import('./js/conjugation.js?val=1');
for (const v of verbs) {
  try {
    for (const f of ['masu','te','nai']) conjugate(v.dict, v.group, f);
  } catch (e) { console.error('FALLA', v.id, e.message); }
}
console.log('OK', verbs.length);
```

- [ ] **Step 3: Validar tamaño**

`python3 -c "import json; print(len(json.load(open('data/verbs-n5.json'))))"` → `60`.

- [ ] **Step 4: Commit**

```bash
git add data/verbs-n5.json
git commit -m "data: completar verbos N5 a 60 totales"
```

---

## Task A7: Docs + tag `fase-3-verbos`

- [ ] **Step 1: Modificar CLAUDE.md**

Cambiar el conteo de bloques de "8" a "9" donde aplique. Añadir fila a la tabla "Estado de fases":
```
| 3-A — Bunpou: verbos | ✅ | `fase-3-verbos` |
```

- [ ] **Step 2: Modificar spec**

Después de `## Fase 3 — Bunpou completo` añadir:
```
**Estado parcial**: ✅ 3.1 Verbos implementada el 2026-05-17 (tag `fase-3-verbos`). 60 verbos N5, 8 formas, distractores algorítmicos (js/conjugation.js). ⏳ 3.2 Adjetivos y 3.3 Kanji-contexto pendientes.
```

- [ ] **Step 3: Commit y tag**

```bash
git add CLAUDE.md docs/superpowers/specs/2026-05-16-mejoras-n5-design.md
git commit -m "docs: marcar 3.1 Verbos como implementada"
git tag fase-3-verbos
```

---

# Sub-fase B — Adjetivos

## Task B1: Módulo `js/adjective-forms.js` (reglas i/な + tests)

**Files:**
- Create: `js/adjective-forms.js`
- Create: `test/adjective-forms.test.js`
- Modify: `test/index.html`

**Formas i** (terminan en い, excluyendo いい que es excepción):
- `negative`: い → くない (高い → 高くない)
- `past`: い → かった (高い → 高かった)
- `negative_past`: い → くなかった (高い → 高くなかった)

**Excepción** いい/良い: usa el stem de よい:
- negative: よくない, past: よかった, negative_past: よくなかった

**Formas な** (no terminan en い o terminan en い pero son な-adj: きれい, きらい):
- `negative`: + じゃない (きれい → きれいじゃない)
- `past`: + だった (きれい → きれいだった)
- `negative_past`: + じゃなかった
- `noun_form`: + な (きれいな → para usar antes de sustantivo: きれいな花)

**API:**
```js
export function adjectiveForm(jp, type, form)  // → string
export function generateAdjDistractors(jp, type, form, n = 3)
```

- [ ] **Step 1: test/adjective-forms.test.js**

```js
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
```

- [ ] **Step 2: Añadir al runner. Verificar fallan.**

- [ ] **Step 3: Implementar `js/adjective-forms.js`**

```js
const I_EXCEPT = new Set(['いい', '良い']);

export function adjectiveForm(jp, type, form) {
  if (type === 'i') {
    if (I_EXCEPT.has(jp)) {
      // base よ
      const stem = 'よ';
      switch (form) {
        case 'negative': return stem + 'くない';
        case 'past': return stem + 'かった';
        case 'negative_past': return stem + 'くなかった';
      }
      throw new Error(`Forma desconocida ${form} para i-adj excepción`);
    }
    // i-adj normal: quitar い final, añadir sufijo
    if (!jp.endsWith('い')) throw new Error(`i-adj no termina en い: ${jp}`);
    const stem = jp.slice(0, -1);
    switch (form) {
      case 'negative': return stem + 'くない';
      case 'past': return stem + 'かった';
      case 'negative_past': return stem + 'くなかった';
    }
    throw new Error(`Forma desconocida ${form} para i-adj`);
  }
  if (type === 'na') {
    switch (form) {
      case 'negative': return jp + 'じゃない';
      case 'past': return jp + 'だった';
      case 'negative_past': return jp + 'じゃなかった';
      case 'noun_form': return jp + 'な';
    }
    throw new Error(`Forma desconocida ${form} para na-adj`);
  }
  throw new Error(`Tipo desconocido: ${type}`);
}

export function generateAdjDistractors(jp, type, form, n = 3) {
  const correct = adjectiveForm(jp, type, form);
  const candidates = new Set();

  // 1. Aplicar reglas del otro tipo
  try {
    const wrong = type === 'i' ? 'na' : 'i';
    if (wrong === 'i' && jp.endsWith('い')) {
      candidates.add(adjectiveForm(jp, 'i', form === 'noun_form' ? 'negative' : form));
    } else if (wrong === 'na' && !I_EXCEPT.has(jp)) {
      // tratar el i-adj como na-adj (incorrecto)
      const naForm = form === 'noun_form' ? 'negative' : form;
      candidates.add(adjectiveForm(jp, 'na', naForm));
    }
  } catch (_) {}

  // 2. Cambiar el sufijo a otro de la misma familia
  if (type === 'i') {
    const stem = I_EXCEPT.has(jp) ? 'よ' : jp.slice(0, -1);
    const alts = ['くなかった', 'かった', 'くない', 'い'];
    for (const a of alts) {
      if (candidates.size >= n + 3) break;
      candidates.add(stem + a);
    }
  } else {
    const alts = ['じゃなかった', 'だった', 'じゃない', 'な', 'です'];
    for (const a of alts) {
      if (candidates.size >= n + 3) break;
      candidates.add(jp + a);
    }
  }

  candidates.delete(correct);
  return [...candidates].slice(0, n);
}
```

- [ ] **Step 4: Tests pasan. Commit**

```bash
git add js/adjective-forms.js test/adjective-forms.test.js test/index.html
git commit -m "feat(adjective-forms): reglas N5 i/な × 4 formas + tests"
```

---

## Task B2: Data seed `data/adjectives-n5.json` (10 adjetivos)

**Files:**
- Create: `data/adjectives-n5.json`

- [ ] **Step 1: Crear con 10 seed**

```json
[
  { "id": "aj_takai", "jp": "高い", "kana": "たかい", "type": "i", "meaning_es": "caro / alto" },
  { "id": "aj_yasui", "jp": "安い", "kana": "やすい", "type": "i", "meaning_es": "barato" },
  { "id": "aj_ookii", "jp": "大きい", "kana": "おおきい", "type": "i", "meaning_es": "grande" },
  { "id": "aj_chiisai", "jp": "小さい", "kana": "ちいさい", "type": "i", "meaning_es": "pequeño" },
  { "id": "aj_atsui", "jp": "暑い", "kana": "あつい", "type": "i", "meaning_es": "caluroso" },
  { "id": "aj_samui", "jp": "寒い", "kana": "さむい", "type": "i", "meaning_es": "frío (clima)" },
  { "id": "aj_ii", "jp": "いい", "kana": "いい", "type": "i", "meaning_es": "bueno" },
  { "id": "aj_kirei", "jp": "きれい", "kana": "きれい", "type": "na", "meaning_es": "bonito / limpio" },
  { "id": "aj_genki", "jp": "元気", "kana": "げんき", "type": "na", "meaning_es": "saludable / con energía" },
  { "id": "aj_shizuka", "jp": "静か", "kana": "しずか", "type": "na", "meaning_es": "tranquilo" }
]
```

- [ ] **Step 2: Commit**

```bash
git add data/adjectives-n5.json
git commit -m "data: seed de 10 adjetivos N5 (i/な)"
```

---

## Task B3: Módulo `js/adjectives.js` + tests + CSS

**Files:**
- Create: `js/adjectives.js`
- Create: `test/adjectives.test.js`
- Modify: `css/exercise.css`

Análogo a verbs.js. Diferencia: los i-adj solo tienen 3 formas, los na-adj tienen 4. `pickRandomForm(type)` debe respetar.

- [ ] **Step 1: test/adjectives.test.js**

```js
import { describe, it, assertEqual, assert } from './runner.js';

describe('adjectives.pickRandomForm', () => {
  it('i-adj devuelve forma válida (3 opciones)', async () => {
    const { pickRandomForm, I_FORMS } = await import('../js/adjectives.js?c=p1');
    for (let k = 0; k < 30; k++) {
      const f = pickRandomForm('i');
      assert(I_FORMS.includes(f), `forma inválida para i: ${f}`);
    }
  });
  it('na-adj devuelve forma válida (4 opciones)', async () => {
    const { pickRandomForm, NA_FORMS } = await import('../js/adjectives.js?c=p2');
    for (let k = 0; k < 30; k++) {
      const f = pickRandomForm('na');
      assert(NA_FORMS.includes(f), `forma inválida para na: ${f}`);
    }
  });
});

describe('adjectives.buildItem', () => {
  it('produce un ítem con respuesta correcta y 3 distractores únicos', async () => {
    const { buildItem } = await import('../js/adjectives.js?c=b1');
    const adj = { id: 'aj_takai', jp: '高い', kana: 'たかい', type: 'i', meaning_es: 'caro' };
    const item = buildItem(adj, 'negative');
    assertEqual(item.adj.id, 'aj_takai');
    assertEqual(item.correct, '高くない');
    assertEqual(item.distractors.length, 3);
  });
});
```

- [ ] **Step 2: Crear `js/adjectives.js`**

```js
import { startExercise, showSessionConfig } from './exercise.js';
import { selectSession } from './srs.js';
import { speak } from './tts.js';
import { adjectiveForm, generateAdjDistractors } from './adjective-forms.js';

const DECK = 'adjectives';

export const I_FORMS = ['negative', 'past', 'negative_past'];
export const NA_FORMS = ['negative', 'past', 'negative_past', 'noun_form'];

export const FORM_LABELS = {
  negative: 'negativo (~ない / じゃない)',
  past: 'pasado (~かった / だった)',
  negative_past: 'pasado negativo',
  noun_form: 'forma para modificar sustantivo (+ な)',
};

const TYPE_LABELS = { i: 'い-adjetivo', na: 'な-adjetivo' };

export function pickRandomForm(type) {
  const arr = type === 'i' ? I_FORMS : NA_FORMS;
  return arr[Math.floor(Math.random() * arr.length)];
}

export function buildItem(adj, form) {
  const correct = adjectiveForm(adj.jp, adj.type, form);
  const distractors = generateAdjDistractors(adj.jp, adj.type, form, 3);
  return { adj, form, correct, distractors };
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function escapeAttr(s) {
  return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export async function start(container, allAdj) {
  showSessionConfig(container, {
    title: 'Adjetivos 形容詞',
    subtitle: 'Mira el adjetivo, su tipo y la forma pedida. Elige la conjugación correcta.',
    onStart: (size) => {
      const adjs = selectSession(DECK, allAdj, size);
      const items = adjs.map(a => buildItem(a, pickRandomForm(a.type)));
      runAdjectives(container, items, allAdj);
    },
  });
}

function runAdjectives(container, items, allAdj) {
  startExercise(container, {
    deck: DECK,
    items,
    allItems: allAdj,
    getItemId: it => it.adj.id,
    renderPrompt(item, el) {
      const { adj, form } = item;
      el.innerHTML = `
        <div class="adj-prompt">
          <div class="adj-jp">
            <span class="adj-text">${adj.jp}</span>
            <button type="button" class="btn-tts" data-tts-text="${escapeAttr(adj.kana)}" aria-label="Escuchar">🔊</button>
          </div>
          <div class="adj-kana">${adj.kana}</div>
          <div class="adj-meta">
            <span class="adj-type">${TYPE_LABELS[adj.type]}</span>
            <span class="adj-meaning">${adj.meaning_es}</span>
          </div>
          <div class="adj-form-target">Conjuga en <strong>${FORM_LABELS[form]}</strong></div>
        </div>
      `;
      el.addEventListener('click', e => {
        const btn = e.target.closest('.btn-tts');
        if (btn) { e.preventDefault(); speak(btn.dataset.ttsText); }
      });
    },
    renderInput(item, _all, el, onAnswer) {
      const options = shuffle([item.correct, ...item.distractors]);
      el.innerHTML = `<div class="choice-grid">
        ${options.map((o, i) => `<button class="choice-btn adj-choice" data-val="${escapeAttr(o)}" data-key="${i + 1}">
          <span class="choice-key">${i + 1}</span><span>${o}</span>
        </button>`).join('')}
      </div>`;
      const keyHandler = e => {
        const tag = e.target && e.target.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA') return;
        const n = parseInt(e.key);
        if (n >= 1 && n <= options.length) {
          const btn = el.querySelector(`[data-key="${n}"]`);
          if (btn && !btn.disabled) onAnswer(btn.dataset.val);
        }
      };
      document.addEventListener('keydown', keyHandler);
      el.addEventListener('click', e => {
        const btn = e.target.closest('.choice-btn');
        if (btn && !btn.disabled) onAnswer(btn.dataset.val);
      });
      return () => document.removeEventListener('keydown', keyHandler);
    },
    checkAnswer(item, answer) { return item.correct === answer; },
    getCorrectDisplay(item) { return `${item.correct}  (${item.adj.jp} → ${FORM_LABELS[item.form]})`; },
    getPromptSpeechText: item => item.adj.kana,
    getAnswerSpeechText: item => item.correct,
  });
}
```

- [ ] **Step 3: CSS — añadir al final de `css/exercise.css`**

```css
/* ---- Adjetivos ---- */
.adj-prompt {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.6rem;
  text-align: center;
}
.adj-jp {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 2.4rem;
  font-family: "Noto Sans JP", sans-serif;
}
.adj-kana {
  font-size: 1rem;
  color: var(--text-muted);
  font-family: "Noto Sans JP", sans-serif;
}
.adj-meta {
  display: inline-flex;
  gap: 1rem;
  font-size: 0.9rem;
  color: var(--text-muted);
}
.adj-type {
  background: var(--bg-hover);
  border: 1px solid var(--border);
  padding: 0.15rem 0.55rem;
  border-radius: 999px;
}
.adj-meaning { font-style: italic; }
.adj-form-target {
  font-size: 1rem;
  background: var(--bg-hover);
  padding: 0.5rem 1rem;
  border-radius: 8px;
  border: 1px solid var(--border);
  margin-top: 0.4rem;
}
.adj-form-target strong { color: var(--c-pink); }
.adj-choice { font-family: "Noto Sans JP", sans-serif; }
```

- [ ] **Step 4: Tests pasan. Commit**

```bash
git add js/adjectives.js test/adjectives.test.js test/index.html css/exercise.css
git commit -m "feat(adjectives): bloque de conjugación i/な con distractores algorítmicos"
```

---

## Task B4: Integración (app, home, stats)

- [ ] **Step 1: `js/app.js`**

```js
import { start as startAdjectives } from './adjectives.js';
```

En `route()`:
```js
    } else if (seg1 === 'adjectives') {
      const allItems = await loadData('adjectives-n5.json');
      await startAdjectives(container, allItems);
```

- [ ] **Step 2: `js/home.js`**

Entry al `BLOCKS`:
```js
  {
    id: 'adjectives',
    label: 'Adjetivos',
    jp: '形容詞',
    emoji: '🎨',
    file: 'adjectives-n5.json',
    desc: 'い/な adjetivos N5',
    color: 'var(--c-pink)',
    path: '/adjectives',
  },
```

- [ ] **Step 3: `js/stats.js`**

```js
  { id: 'adjectives', label: 'Adjetivos', file: 'adjectives-n5.json' },
```

- [ ] **Step 4: Manual check + commit**

```bash
git add js/app.js js/home.js js/stats.js
git commit -m "feat(adjectives): integración con app, home y stats"
```

---

## Task B5: Generar 35 adjetivos adicionales (total 45)

**Files:**
- Modify: `data/adjectives-n5.json`

Lista de referencia N5 (i + な mezclados, sin garantía completa — completar hasta 45 con los más comunes):

**i-adj N5**: 高い, 安い, 大きい, 小さい, 暑い, 寒い, 涼しい, 暖かい, 新しい, 古い, 多い, 少ない, 早い, 遅い, おいしい, まずい, 楽しい, 面白い, つまらない, 難しい, やさしい, 長い, 短い, 重い, 軽い, 強い, 弱い, 白い, 黒い, 赤い, 青い, 黄色い, 明るい, 暗い, 近い, 遠い, 速い, 広い, 狭い, 低い, 痛い, いい, 悪い, 忙しい, 若い, かわいい, 汚い

**na-adj N5**: きれい, 元気, 静か, にぎやか, 親切, 有名, 便利, 不便, ひま, 大変, 大切, 大丈夫, 好き, 嫌い, 上手, 下手, 簡単, 同じ, いろいろ

- [ ] **Step 1: Extender el JSON a 45 entries**

- [ ] **Step 2: Validar tamaño**

`python3 -c "import json; d=json.load(open('data/adjectives-n5.json')); print(len(d), 'i:', sum(1 for x in d if x['type']=='i'), 'na:', sum(1 for x in d if x['type']=='na'))"` → `45 i: ~30 na: ~15`

- [ ] **Step 3: Commit**

```bash
git add data/adjectives-n5.json
git commit -m "data: completar adjetivos N5 a 45 totales"
```

---

## Task B6: Docs + tag `fase-3-adjetivos`

- [ ] **Step 1: CLAUDE.md**

Actualizar conteo a "10 bloques" donde aplique. Añadir fila a la tabla de fases:
```
| 3-B — Bunpou: adjetivos | ✅ | `fase-3-adjetivos` |
```

- [ ] **Step 2: spec**

Modificar la línea de Estado parcial para indicar:
```
**Estado parcial**: ✅ 3.1 Verbos (tag `fase-3-verbos`) + ✅ 3.2 Adjetivos (tag `fase-3-adjetivos`) implementadas el 2026-05-17. ⏳ 3.3 Kanji-contexto pendiente.
```

- [ ] **Step 3: Commit y tag**

```bash
git add CLAUDE.md docs/superpowers/specs/2026-05-16-mejoras-n5-design.md
git commit -m "docs: marcar 3.2 Adjetivos como implementada"
git tag fase-3-adjetivos
```

---

# Sub-fase C — Kanji en contexto

## Task C1: Mejorar renderPrompt en `js/kanji.js`

**Files:**
- Modify: `js/kanji.js`
- Modify: `css/exercise.css`

Leer `js/kanji.js` actual. Localizar la función `renderPrompt`. Sustituir el render del kanji aislado por kanji + ejemplo de palabra usando los campos `example_word` y `example_reading` (que ya existen en `data/kanji-n5.json`).

- [ ] **Step 1: Leer `js/kanji.js` y `data/kanji-n5.json`** (primeras 5 entries para conocer la estructura del campo example).

- [ ] **Step 2: Modificar `renderPrompt`** en `js/kanji.js`. La nueva estructura del prompt:

```html
<div class="kanji-prompt">
  <div class="kanji-display">${item.kanji}</div>
  <div class="kanji-example">
    <span class="kanji-example-word">${item.example_word}</span>
    <span class="kanji-example-reading">(${item.example_reading})</span>
  </div>
</div>
```

(Si `example_word` o `example_reading` no existen para algún ítem, hacer fallback al render anterior solo con `kanji-display`.)

- [ ] **Step 3: Añadir CSS al final de `css/exercise.css`**

```css
/* ---- Kanji en contexto ---- */
.kanji-prompt {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.7rem;
}
.kanji-example {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  gap: 0.2rem;
  font-family: "Noto Sans JP", sans-serif;
}
.kanji-example-word {
  font-size: 1.4rem;
}
.kanji-example-reading {
  font-size: 0.95rem;
  color: var(--text-muted);
}
```

- [ ] **Step 4: Manual check en navegador**

Ir a `/kanji`, ver que el prompt muestra el kanji grande + la palabra de ejemplo debajo + la lectura en kana. El resto del ejercicio (opciones de significado/lectura) sin cambios.

- [ ] **Step 5: Commit**

```bash
git add js/kanji.js css/exercise.css
git commit -m "feat(kanji): mostrar ejemplo en contexto bajo el kanji"
```

---

## Task C2: Docs + tag `fase-3-kanji`

- [ ] **Step 1: CLAUDE.md**

Tabla fases: añadir `| 3-C — Bunpou: kanji-contexto | ✅ | `fase-3-kanji` |`.

- [ ] **Step 2: spec**

Cambiar el "Estado parcial" final a:
```
**Estado**: ✅ Implementada completa el 2026-05-17 (tags `fase-3-verbos`, `fase-3-adjetivos`, `fase-3-kanji`). Verbos: 60 con 8 formas; adjetivos: 45 con i/な × 3-4 formas; kanji en contexto con palabra de ejemplo bajo el kanji.
```

- [ ] **Step 3: Actualizar auto-memory**

Modify `/home/hugo/.claude/projects/-home-hugo/memory/project_japones_n5.md`:

Cambiar "Bloques (8)" a "Bloques (10)" y añadir ", Verbos, Adjetivos" al final de la lista. Marcar Fase 3 como ✅ con los 3 tags. Mover "siguiente recomendada" a Fase 4.

- [ ] **Step 4: Commit y tag**

```bash
git add CLAUDE.md docs/superpowers/specs/2026-05-16-mejoras-n5-design.md
git commit -m "docs: marcar Fase 3 completa (Bunpou)"
git tag fase-3-kanji
```

---

## Self-review checklist (controlador)

Antes de empezar:

- [x] Cobertura spec: 3.1 Verbos (60, 8 formas, distractores), 3.2 Adjetivos (45, i/な, formas correctas), 3.3 Kanji-contexto. ✅
- [x] Sin placeholders: todos los steps tienen código completo o lista concreta.
- [x] Tipos coherentes: `conjugate(dict, group, form) → string`, `generateDistractors(dict, group, form, n) → string[]`, `adjectiveForm(jp, type, form) → string`. Coherentes a lo largo del plan.
- [x] Receta de CLAUDE.md respetada: cada bloque nuevo modifica app.js + home.js + stats.js + css.
- [x] TDD: cada función nueva tiene tests primero.
- [x] Tags intermedios definidos: `fase-3-verbos`, `fase-3-adjetivos`, `fase-3-kanji`.

**Total tasks: 13** (A1-A7 = 7, B1-B6 = 6, C1-C2 = 2 — pero C2 es solo docs, así que 13 implementaciones).

**Tests al final**: ~75+ nuevos (49 conjugation + 3 verbs + ~12 adjective-forms + ~3 adjectives + alguna integración). Total app: ~130 tests.
