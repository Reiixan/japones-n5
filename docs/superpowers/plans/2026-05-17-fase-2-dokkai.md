# Fase 2 — Dokkai (lectura) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Añadir el bloque Dokkai (lectura comprensiva) — 30 textos JLPT N5 (20 cortos + 10 medios) con preguntas en español, SRS por texto (no por pregunta), toggle furigana persistido y vocabulario sugerido colapsable.

**Architecture:** Cada texto es la unidad SRS. `js/reading.js` selecciona N textos vía `selectSession('reading', allTexts, size)`, los expande a ítems lineales `(texto, pregunta_idx)` y los pasa a `startExercise` (motor compartido). El motor renderiza el texto en el prompt y la pregunta + 4 opciones en el input. Para no romper la semántica "fallar cualquier pregunta del texto = box 0", se añade un hook opcional `recordResult(item, correct)` al motor que reading.js implementa agregando por `text_id` antes de llamar a `recordAnswer`. Furigana se renderiza con HTML5 `<ruby><rt>` desde un array `text_ruby` de tokens `{base, ruby}` en cada JSON.

**Tech Stack:** Vanilla JS ES modules, HTML5 `<ruby>`, localStorage. Sin nuevas dependencias.

---

## File structure

**Nuevos:**
- `data/reading-n5.json` — array de textos (esquema en Task 1).
- `js/reading.js` — módulo del bloque. Expone `start(container, allTexts)`. Selecciona textos vía SRS, expande a ítems lineales, delega en `startExercise` con hooks de render/check/recordResult.
- `test/reading.test.js` — tests unitarios de la lógica de reading.js (expansión, agregación SRS, render furigana).

**Modificados:**
- `js/exercise.js` — añadir hook opcional `recordResult` que sustituye al `recordAnswer` por defecto cuando está definido (3 líneas en `handleAnswer`).
- `js/app.js` — ruta nueva `else if (seg1 === 'reading')` y nuevo import.
- `js/home.js` — entry en el array `BLOCKS` para Dokkai.
- `js/stats.js` — entry en el array `DECKS` para Dokkai.
- `css/exercise.css` — estilos para `.reading-text` (texto grande), `<ruby>/<rt>` (furigana) y `.reading-vocab-hints` (colapsable).

---

## Task 1: Esquema y seed inicial (2 textos)

**Files:**
- Create: `data/reading-n5.json`

Empezar con DOS textos seed (1 short + 1 medium) para que el resto de tasks puedan testearse end-to-end sin esperar al contenido final. Los 28 restantes se generan en Task 7.

- [ ] **Step 1: Crear `data/reading-n5.json` con dos textos seed**

```json
[
  {
    "id": "r_001",
    "type": "short",
    "title_es": "El fin de semana de Yamada",
    "text_jp": "山田さんは土曜日に映画を見ました。日曜日は友達とレストランで昼ご飯を食べました。",
    "text_ruby": [
      {"base": "山田", "ruby": "やまだ"},
      {"base": "さんは", "ruby": null},
      {"base": "土曜日", "ruby": "どようび"},
      {"base": "に", "ruby": null},
      {"base": "映画", "ruby": "えいが"},
      {"base": "を", "ruby": null},
      {"base": "見", "ruby": "み"},
      {"base": "ました。", "ruby": null},
      {"base": "日曜日", "ruby": "にちようび"},
      {"base": "は", "ruby": null},
      {"base": "友達", "ruby": "ともだち"},
      {"base": "と", "ruby": null},
      {"base": "レストラン", "ruby": null},
      {"base": "で", "ruby": null},
      {"base": "昼", "ruby": "ひる"},
      {"base": "ご飯", "ruby": "ごはん"},
      {"base": "を", "ruby": null},
      {"base": "食", "ruby": "た"},
      {"base": "べました。", "ruby": null}
    ],
    "vocabulary_hints": [
      {"jp": "映画", "kana": "えいが", "es": "película"},
      {"jp": "昼ご飯", "kana": "ひるごはん", "es": "comida del mediodía"}
    ],
    "questions": [
      {
        "q_es": "¿Qué hizo Yamada el sábado?",
        "options_es": ["Vio una película", "Cenó con amigos", "Estudió japonés", "Fue al parque"],
        "answer_es": "Vio una película"
      }
    ]
  },
  {
    "id": "r_002",
    "type": "medium",
    "title_es": "Mi familia",
    "text_jp": "私の家族は四人です。父と母と妹と私です。父は会社員で、毎日電車で会社に行きます。母は先生です。妹はまだ学生です。私たちは日曜日にいっしょに公園へ行きます。",
    "text_ruby": [
      {"base": "私", "ruby": "わたし"},
      {"base": "の", "ruby": null},
      {"base": "家族", "ruby": "かぞく"},
      {"base": "は", "ruby": null},
      {"base": "四人", "ruby": "よにん"},
      {"base": "です。", "ruby": null},
      {"base": "父", "ruby": "ちち"},
      {"base": "と", "ruby": null},
      {"base": "母", "ruby": "はは"},
      {"base": "と", "ruby": null},
      {"base": "妹", "ruby": "いもうと"},
      {"base": "と", "ruby": null},
      {"base": "私", "ruby": "わたし"},
      {"base": "です。", "ruby": null},
      {"base": "父", "ruby": "ちち"},
      {"base": "は", "ruby": null},
      {"base": "会社員", "ruby": "かいしゃいん"},
      {"base": "で、", "ruby": null},
      {"base": "毎日", "ruby": "まいにち"},
      {"base": "電車", "ruby": "でんしゃ"},
      {"base": "で", "ruby": null},
      {"base": "会社", "ruby": "かいしゃ"},
      {"base": "に", "ruby": null},
      {"base": "行", "ruby": "い"},
      {"base": "きます。", "ruby": null},
      {"base": "母", "ruby": "はは"},
      {"base": "は", "ruby": null},
      {"base": "先生", "ruby": "せんせい"},
      {"base": "です。", "ruby": null},
      {"base": "妹", "ruby": "いもうと"},
      {"base": "は", "ruby": null},
      {"base": "まだ", "ruby": null},
      {"base": "学生", "ruby": "がくせい"},
      {"base": "です。", "ruby": null},
      {"base": "私", "ruby": "わたし"},
      {"base": "たちは", "ruby": null},
      {"base": "日曜日", "ruby": "にちようび"},
      {"base": "に", "ruby": null},
      {"base": "いっしょに", "ruby": null},
      {"base": "公園", "ruby": "こうえん"},
      {"base": "へ", "ruby": null},
      {"base": "行", "ruby": "い"},
      {"base": "きます。", "ruby": null}
    ],
    "vocabulary_hints": [
      {"jp": "会社員", "kana": "かいしゃいん", "es": "empleado de empresa"},
      {"jp": "公園", "kana": "こうえん", "es": "parque"}
    ],
    "questions": [
      {
        "q_es": "¿Cuántas personas hay en la familia?",
        "options_es": ["Tres", "Cuatro", "Cinco", "Seis"],
        "answer_es": "Cuatro"
      },
      {
        "q_es": "¿Cómo va el padre al trabajo?",
        "options_es": ["En coche", "En tren", "En bicicleta", "Andando"],
        "answer_es": "En tren"
      },
      {
        "q_es": "¿Qué hace la familia los domingos?",
        "options_es": ["Va al parque", "Ve películas", "Cena fuera", "Visita a los abuelos"],
        "answer_es": "Va al parque"
      }
    ]
  }
]
```

Convenciones del esquema:
- `id`: string `r_NNN` con padding a 3 dígitos.
- `type`: `"short"` o `"medium"`.
- `title_es`: título descriptivo en español (no se muestra durante el ejercicio, solo en summary/admin).
- `text_jp`: texto plano JP sin furigana.
- `text_ruby`: array ORDENADO de tokens `{base, ruby}`. Concatenar los `base` reproduce `text_jp`. `ruby: null` para tokens sin furigana (kana puro, partículas, signos de puntuación).
- `vocabulary_hints`: array de `{jp, kana, es}`. Solo palabras del texto que merecen ayuda — no incluir vocabulario básico de los primeros 50 N5.
- `questions`: array de objetos `{q_es, options_es, answer_es}`. `options_es` siempre 4 elementos; `answer_es` debe ser exactamente uno de ellos (string match).

- [ ] **Step 2: Validar el JSON localmente**

Run: `cd /home/hugo/japones-n5 && python3 -c "import json; print(len(json.load(open('data/reading-n5.json'))))"`
Expected: `2`

- [ ] **Step 3: Commit**

```bash
git add data/reading-n5.json
git commit -m "data: añadir esquema y seed inicial (2 textos) para Dokkai"
```

---

## Task 2: Hook `recordResult` en el motor

**Files:**
- Modify: `js/exercise.js` (alrededor de líneas 99-112, dentro de `handleAnswer`)
- Test: `test/exercise.test.js` (NUEVO — solo para esta función)

Añadir un hook opcional `recordResult(item, correct)` a la config de `startExercise`. Si está definido, se llama en vez de `recordAnswer(deck, getItemId(item), correct)`. Si no está, el comportamiento actual no cambia.

- [ ] **Step 1: Crear `test/exercise.test.js` con el caso de uso**

Crear `/home/hugo/japones-n5/test/exercise.test.js`:

```js
import { describe, it, assert } from './runner.js';

const cacheBust = `?cache=t${Math.random()}`;

describe('exercise.recordResult hook', () => {
  it('usa recordResult cuando está definido y no llama a recordAnswer estándar', async () => {
    // Mock localStorage para detectar si recordAnswer fue llamado.
    const storeWrites = [];
    const origSetItem = localStorage.setItem.bind(localStorage);
    localStorage.setItem = (k, v) => {
      if (k.startsWith('jp_n5_v1.testdeck.')) storeWrites.push({ k, v });
      origSetItem(k, v);
    };

    try {
      const { startExercise } = await import('../js/exercise.js' + cacheBust);

      const container = document.createElement('div');
      document.body.appendChild(container);

      const recordResultCalls = [];
      const items = [{ id: 'i1' }, { id: 'i2' }];

      startExercise(container, {
        deck: 'testdeck',
        items,
        allItems: items,
        getItemId: it => it.id,
        renderPrompt: (item, el) => { el.textContent = item.id; },
        renderInput: (item, _all, el, onAnswer) => {
          el.innerHTML = '<button class="b-yes">yes</button><button class="b-no">no</button>';
          el.querySelector('.b-yes').addEventListener('click', () => onAnswer('yes'));
          el.querySelector('.b-no').addEventListener('click', () => onAnswer('no'));
          return () => {};
        },
        checkAnswer: (_item, answer) => answer === 'yes',
        getCorrectDisplay: () => 'yes',
        recordResult: (item, correct) => recordResultCalls.push({ id: item.id, correct }),
      });

      // Responder primera pregunta correctamente
      container.querySelector('.b-yes').click();

      assert(recordResultCalls.length === 1, 'recordResult debería llamarse 1 vez');
      assert(recordResultCalls[0].id === 'i1', 'recordResult con id correcto');
      assert(recordResultCalls[0].correct === true, 'recordResult con correct=true');
      assert(storeWrites.length === 0, `recordAnswer estándar NO debería llamarse, pero se escribió: ${JSON.stringify(storeWrites)}`);

      container.remove();
    } finally {
      localStorage.setItem = origSetItem;
    }
  });

  it('llama a recordAnswer estándar cuando recordResult no está definido', async () => {
    const storeWrites = [];
    const origSetItem = localStorage.setItem.bind(localStorage);
    localStorage.setItem = (k, v) => {
      if (k.startsWith('jp_n5_v1.testdeck2.')) storeWrites.push({ k, v });
      origSetItem(k, v);
    };

    try {
      const { startExercise } = await import('../js/exercise.js' + cacheBust + '2');

      const container = document.createElement('div');
      document.body.appendChild(container);

      const items = [{ id: 'j1' }];

      startExercise(container, {
        deck: 'testdeck2',
        items,
        allItems: items,
        getItemId: it => it.id,
        renderPrompt: (item, el) => { el.textContent = item.id; },
        renderInput: (_item, _all, el, onAnswer) => {
          el.innerHTML = '<button class="b">go</button>';
          el.querySelector('.b').addEventListener('click', () => onAnswer('go'));
          return () => {};
        },
        checkAnswer: () => true,
        getCorrectDisplay: () => 'go',
      });

      container.querySelector('.b').click();

      assert(storeWrites.length === 1, `recordAnswer debería escribir 1 entrada, hubo: ${storeWrites.length}`);
      assert(storeWrites[0].k === 'jp_n5_v1.testdeck2.j1', `key esperada jp_n5_v1.testdeck2.j1, hubo: ${storeWrites[0].k}`);

      container.remove();
      localStorage.removeItem('jp_n5_v1.testdeck2.j1');
    } finally {
      localStorage.setItem = origSetItem;
    }
  });
});
```

- [ ] **Step 2: Añadir `exercise.test.js` al runner**

Modify: `test/index.html` — añadir `<script type="module" src="./exercise.test.js"></script>` junto a los otros test scripts. Leer primero la posición exacta de los `<script>` existentes.

- [ ] **Step 3: Servir y ejecutar tests, verificar que los 2 nuevos FALLAN**

Run: `cd /home/hugo/japones-n5 && python3 -m http.server 8765 --bind 0.0.0.0` en background.
Abrir `http://localhost:8765/test/` en navegador.
Expected: 2 tests nuevos FALLAN con error sobre `recordResult` no usado (recordAnswer estándar se llama igualmente).

- [ ] **Step 4: Implementar el hook en `js/exercise.js`**

Localizar la función `handleAnswer` (alrededor de líneas 99-112). Encontrar:

```js
  function handleAnswer(answer) {
    if (inputCleanup) { inputCleanup(); inputCleanup = null; }
    answered = true;
    detachSpaceRepeat();
    const item = items[idx];
    const correct = config.checkAnswer(item, answer);
    recordAnswer(deck, config.getItemId(item), correct);
    results.push({ item, correct, answer });
```

Reemplazar la línea `recordAnswer(deck, config.getItemId(item), correct);` por:

```js
    if (config.recordResult) {
      config.recordResult(item, correct);
    } else {
      recordAnswer(deck, config.getItemId(item), correct);
    }
```

Y actualizar el bloque de comentarios al inicio del archivo (líneas 5-17) añadiendo después de la línea `//   menuPath?: string  // si el bloque tiene submenú, ruta del menú (ej '/vocab')`:

```
//   recordResult?: (item, correct) => void  // si está definido, sustituye al recordAnswer estándar (útil para SRS por grupo, ej Dokkai por texto)
```

- [ ] **Step 5: Recargar tests, verificar que los 2 pasan**

Refresh `http://localhost:8765/test/`.
Expected: 2 nuevos tests PASAN, 43 anteriores siguen pasando = 45 total.

- [ ] **Step 6: Commit**

```bash
git add js/exercise.js test/exercise.test.js test/index.html
git commit -m "feat(exercise): añadir hook recordResult para SRS por grupo (Dokkai)"
```

---

## Task 3: Módulo `js/reading.js` (núcleo)

**Files:**
- Create: `js/reading.js`
- Test: `test/reading.test.js`

Crear el módulo del bloque siguiendo el patrón canónico de `js/listening.js`, con la lógica de:
1. Selección de textos vía `selectSession('reading', allTexts, size)`.
2. Expansión: cada texto con N preguntas se convierte en N ítems lineales `{text, q_idx}` consecutivos.
3. Agregación SRS por texto: tracking interno de aciertos por `text_id`, commit con `recordAnswer('reading', text_id, allCorrect)` al ver la última pregunta del texto.

Esta task implementa **solo la lógica core sin UI** — la UI (render del texto + furigana + hints) viene en Task 4.

- [ ] **Step 1: Crear `test/reading.test.js` con tests de la lógica pura**

Crear `/home/hugo/japones-n5/test/reading.test.js`:

```js
import { describe, it, assert, assertEqual } from './runner.js';

const cacheBust = `?cache=t${Math.random()}`;

describe('reading.expandTextsToItems', () => {
  it('expande un texto con 1 pregunta a 1 ítem', async () => {
    const { expandTextsToItems } = await import('../js/reading.js' + cacheBust);
    const texts = [{ id: 'r_001', questions: [{ q_es: 'a', options_es: ['x','y','z','w'], answer_es: 'x' }] }];
    const items = expandTextsToItems(texts);
    assertEqual(items.length, 1);
    assertEqual(items[0].text.id, 'r_001');
    assertEqual(items[0].q_idx, 0);
  });

  it('expande un texto con 3 preguntas a 3 ítems consecutivos', async () => {
    const { expandTextsToItems } = await import('../js/reading.js' + cacheBust + '2');
    const texts = [{
      id: 'r_002',
      questions: [
        { q_es: 'a', options_es: ['1','2','3','4'], answer_es: '1' },
        { q_es: 'b', options_es: ['1','2','3','4'], answer_es: '2' },
        { q_es: 'c', options_es: ['1','2','3','4'], answer_es: '3' },
      ],
    }];
    const items = expandTextsToItems(texts);
    assertEqual(items.length, 3);
    assertEqual(items[0].q_idx, 0);
    assertEqual(items[1].q_idx, 1);
    assertEqual(items[2].q_idx, 2);
    assert(items.every(it => it.text.id === 'r_002'), 'todos comparten text.id');
  });

  it('mantiene preguntas del mismo texto agrupadas y en orden', async () => {
    const { expandTextsToItems } = await import('../js/reading.js' + cacheBust + '3');
    const texts = [
      { id: 'a', questions: [{ q_es: 'a1', options_es: ['1','2','3','4'], answer_es: '1' }, { q_es: 'a2', options_es: ['1','2','3','4'], answer_es: '1' }] },
      { id: 'b', questions: [{ q_es: 'b1', options_es: ['1','2','3','4'], answer_es: '1' }] },
    ];
    const items = expandTextsToItems(texts);
    assertEqual(items.map(it => `${it.text.id}:${it.q_idx}`).join(','), 'a:0,a:1,b:0');
  });
});

describe('reading.createTextSrsAggregator', () => {
  it('llama recordFn con true solo si todas las preguntas del texto son correctas', async () => {
    const { createTextSrsAggregator } = await import('../js/reading.js' + cacheBust + '4');
    const calls = [];
    const items = [
      { text: { id: 'r_001' }, q_idx: 0 },
      { text: { id: 'r_001' }, q_idx: 1 },
      { text: { id: 'r_001' }, q_idx: 2 },
    ];
    const agg = createTextSrsAggregator(items, (id, correct) => calls.push({ id, correct }));
    agg(items[0], true);
    agg(items[1], true);
    assertEqual(calls.length, 0, 'no commit hasta la última pregunta del texto');
    agg(items[2], true);
    assertEqual(calls.length, 1);
    assertEqual(calls[0].id, 'r_001');
    assertEqual(calls[0].correct, true);
  });

  it('llama recordFn con false si CUALQUIER pregunta del texto falla', async () => {
    const { createTextSrsAggregator } = await import('../js/reading.js' + cacheBust + '5');
    const calls = [];
    const items = [
      { text: { id: 'r_001' }, q_idx: 0 },
      { text: { id: 'r_001' }, q_idx: 1 },
      { text: { id: 'r_001' }, q_idx: 2 },
    ];
    const agg = createTextSrsAggregator(items, (id, correct) => calls.push({ id, correct }));
    agg(items[0], true);
    agg(items[1], false); // <-- fallo
    agg(items[2], true);
    assertEqual(calls.length, 1);
    assertEqual(calls[0].correct, false);
  });

  it('procesa varios textos independientemente', async () => {
    const { createTextSrsAggregator } = await import('../js/reading.js' + cacheBust + '6');
    const calls = [];
    const items = [
      { text: { id: 'a' }, q_idx: 0 },
      { text: { id: 'a' }, q_idx: 1 },
      { text: { id: 'b' }, q_idx: 0 },
    ];
    const agg = createTextSrsAggregator(items, (id, correct) => calls.push({ id, correct }));
    agg(items[0], true);
    agg(items[1], false);
    agg(items[2], true);
    assertEqual(calls.length, 2);
    assertEqual(calls[0].id, 'a');
    assertEqual(calls[0].correct, false);
    assertEqual(calls[1].id, 'b');
    assertEqual(calls[1].correct, true);
  });
});
```

- [ ] **Step 2: Añadir `reading.test.js` al runner**

Modify: `test/index.html` — añadir `<script type="module" src="./reading.test.js"></script>`.

- [ ] **Step 3: Verificar que los tests fallan**

Refresh tests. Expected: 7 tests nuevos FALLAN con "Failed to fetch dynamically imported module" o "expandTextsToItems is not a function".

- [ ] **Step 4: Crear `js/reading.js` con la lógica core (sin UI completa todavía)**

Crear `/home/hugo/japones-n5/js/reading.js`:

```js
import { startExercise, showSessionConfig } from './exercise.js';
import { selectSession } from './srs.js';
import { recordAnswer } from './storage.js';

const DECK = 'reading';

export function expandTextsToItems(texts) {
  const items = [];
  for (const text of texts) {
    text.questions.forEach((_, q_idx) => {
      items.push({ text, q_idx });
    });
  }
  return items;
}

export function createTextSrsAggregator(items, recordFn) {
  const totalByText = new Map();
  const stateByText = new Map();
  for (const it of items) {
    totalByText.set(it.text.id, (totalByText.get(it.text.id) || 0) + 1);
  }
  return function aggregate(item, correct) {
    const id = item.text.id;
    const prev = stateByText.get(id) || { seen: 0, allCorrect: true };
    prev.seen += 1;
    prev.allCorrect = prev.allCorrect && correct;
    stateByText.set(id, prev);
    if (prev.seen === totalByText.get(id)) {
      recordFn(id, prev.allCorrect);
      stateByText.delete(id);
    }
  };
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export async function start(container, allTexts) {
  showSessionConfig(container, {
    title: 'Comprensión lectora 読解',
    subtitle: 'Lee el texto y responde las preguntas. Activa furigana si lo necesitas.',
    onStart: (size) => {
      const texts = selectSession(DECK, allTexts, size);
      const items = expandTextsToItems(texts);
      runReading(container, items);
    },
  });
}

function runReading(container, items) {
  const aggregate = createTextSrsAggregator(items, (textId, correct) => {
    recordAnswer(DECK, textId, correct);
  });

  startExercise(container, {
    deck: DECK,
    items,
    allItems: items,
    getItemId: it => `${it.text.id}:${it.q_idx}`,
    renderPrompt(item, el) {
      // UI completa en Task 4. Stub mínimo para test manual.
      el.innerHTML = `<div class="reading-text">${item.text.text_jp}</div>`;
    },
    renderInput(item, _all, el, onAnswer) {
      const q = item.text.questions[item.q_idx];
      const opts = shuffle([...q.options_es]);
      el.innerHTML = `<div class="choice-grid">
        ${opts.map((o, i) => `<button class="choice-btn" data-val="${o.replace(/"/g, '&quot;')}" data-key="${i + 1}">
          <span class="choice-key">${i + 1}</span><span>${o}</span>
        </button>`).join('')}
        <div class="reading-q">${q.q_es}</div>
      </div>`;
      const keyHandler = e => {
        const tag = e.target && e.target.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA') return;
        const n = parseInt(e.key);
        if (n >= 1 && n <= opts.length) {
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
    checkAnswer(item, answer) {
      return item.text.questions[item.q_idx].answer_es === answer;
    },
    getCorrectDisplay(item) {
      return item.text.questions[item.q_idx].answer_es;
    },
    recordResult(item, correct) {
      aggregate(item, correct);
    },
  });
}
```

- [ ] **Step 5: Verificar que los 7 tests pasan**

Refresh `http://localhost:8765/test/`.
Expected: 52 tests pasan (45 anteriores + 7 nuevos).

- [ ] **Step 6: Commit**

```bash
git add js/reading.js test/reading.test.js test/index.html
git commit -m "feat(reading): núcleo de Dokkai con SRS por texto y expansión a ítems"
```

---

## Task 4: UI completa — render de texto, furigana, vocab hints, CSS

**Files:**
- Modify: `js/reading.js` (función `renderPrompt`)
- Modify: `css/exercise.css` (añadir bloque al final)
- Test: `test/reading.test.js` (añadir tests de renderRubyHtml y toggle)

- [ ] **Step 1: Añadir tests de utilidades de UI**

Modify `test/reading.test.js` — añadir al final, antes del último `});` de cierre del archivo (si el archivo termina con un describe, lo siguiente va FUERA de él):

```js
describe('reading.renderRubyHtml', () => {
  it('devuelve texto plano si furigana off', async () => {
    const { renderRubyHtml } = await import('../js/reading.js?cache=ui1');
    const ruby = [
      { base: '山田', ruby: 'やまだ' },
      { base: 'さん', ruby: null },
    ];
    const html = renderRubyHtml(ruby, false);
    assert(!html.includes('<ruby>'), 'no debe contener <ruby> con furigana off');
    assert(html.includes('山田'), 'debe contener base');
    assert(html.includes('さん'), 'debe contener base sin ruby');
  });

  it('devuelve HTML con <ruby><rt> si furigana on', async () => {
    const { renderRubyHtml } = await import('../js/reading.js?cache=ui2');
    const ruby = [
      { base: '山田', ruby: 'やまだ' },
      { base: 'さん', ruby: null },
    ];
    const html = renderRubyHtml(ruby, true);
    assert(html.includes('<ruby>山田<rt>やまだ</rt></ruby>'), `esperaba <ruby>山田<rt>やまだ</rt></ruby>, html: ${html}`);
    assert(html.includes('さん'), 'tokens sin ruby siguen apareciendo');
    assert(!html.match(/<ruby>さん/), 'tokens sin ruby NO deben envolverse en <ruby>');
  });
});

describe('reading.isFuriganaOn / setFuriganaOn', () => {
  it('default off', async () => {
    localStorage.removeItem('jp_n5_reading_furigana_on');
    const { isFuriganaOn } = await import('../js/reading.js?cache=fur1');
    assertEqual(isFuriganaOn(), false);
  });

  it('setFuriganaOn(true) persiste y isFuriganaOn lo lee', async () => {
    const { isFuriganaOn, setFuriganaOn } = await import('../js/reading.js?cache=fur2');
    setFuriganaOn(true);
    assertEqual(isFuriganaOn(), true);
    assertEqual(localStorage.getItem('jp_n5_reading_furigana_on'), '1');
    setFuriganaOn(false);
    assertEqual(isFuriganaOn(), false);
    localStorage.removeItem('jp_n5_reading_furigana_on');
  });
});
```

- [ ] **Step 2: Verificar que los nuevos tests fallan**

Refresh tests. Expected: 5 nuevos tests FALLAN porque `renderRubyHtml`, `isFuriganaOn` y `setFuriganaOn` aún no se exportan.

- [ ] **Step 3: Implementar utilidades de UI y mejorar renderPrompt en `js/reading.js`**

Modify `js/reading.js`:

1. Añadir cerca del inicio del archivo, después del `import` y antes de `export function expandTextsToItems`:

```js
const FURIGANA_KEY = 'jp_n5_reading_furigana_on';

export function isFuriganaOn() {
  return localStorage.getItem(FURIGANA_KEY) === '1';
}

export function setFuriganaOn(on) {
  if (on) localStorage.setItem(FURIGANA_KEY, '1');
  else localStorage.removeItem(FURIGANA_KEY);
}

function escapeHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function renderRubyHtml(tokens, furiganaOn) {
  return tokens.map(t => {
    const base = escapeHtml(t.base);
    if (furiganaOn && t.ruby) {
      return `<ruby>${base}<rt>${escapeHtml(t.ruby)}</rt></ruby>`;
    }
    return base;
  }).join('');
}
```

2. Sustituir la función `renderPrompt` del config dentro de `runReading` por:

```js
    renderPrompt(item, el) {
      const text = item.text;
      const total = text.questions.length;
      const qNum = item.q_idx + 1;
      const hints = text.vocabulary_hints && text.vocabulary_hints.length > 0
        ? `<details class="reading-vocab-hints">
            <summary>Vocabulario sugerido (${text.vocabulary_hints.length})</summary>
            <ul>
              ${text.vocabulary_hints.map(h => `<li><strong>${escapeHtml(h.jp)}</strong> <span class="hint-kana">(${escapeHtml(h.kana)})</span> — ${escapeHtml(h.es)}</li>`).join('')}
            </ul>
          </details>`
        : '';
      el.innerHTML = `
        <div class="reading-block">
          <div class="reading-toolbar">
            <label class="reading-furigana-toggle">
              <input type="checkbox" id="reading-furigana-cb" ${isFuriganaOn() ? 'checked' : ''}>
              <span>Mostrar furigana</span>
            </label>
            <span class="reading-qcount">Pregunta ${qNum} / ${total}</span>
          </div>
          <div class="reading-text" id="reading-text">${renderRubyHtml(text.text_ruby, isFuriganaOn())}</div>
          ${hints}
        </div>
      `;
      const cb = el.querySelector('#reading-furigana-cb');
      cb.addEventListener('change', () => {
        setFuriganaOn(cb.checked);
        const textEl = el.querySelector('#reading-text');
        textEl.innerHTML = renderRubyHtml(text.text_ruby, cb.checked);
      });
    },
```

3. Actualizar la función `renderInput` para mover la `<div class="reading-q">` al inicio (antes de las opciones), porque ahora el prompt ya muestra "Pregunta X / Y" y la pregunta debe ir junto a las opciones:

```js
    renderInput(item, _all, el, onAnswer) {
      const q = item.text.questions[item.q_idx];
      const opts = shuffle([...q.options_es]);
      el.innerHTML = `<div class="reading-input">
        <div class="reading-q">${escapeHtml(q.q_es)}</div>
        <div class="choice-grid">
          ${opts.map((o, i) => `<button class="choice-btn" data-val="${escapeHtml(o)}" data-key="${i + 1}">
            <span class="choice-key">${i + 1}</span><span>${escapeHtml(o)}</span>
          </button>`).join('')}
        </div>
      </div>`;
      const keyHandler = e => {
        const tag = e.target && e.target.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA') return;
        const n = parseInt(e.key);
        if (n >= 1 && n <= opts.length) {
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
```

- [ ] **Step 4: Añadir estilos al final de `css/exercise.css`**

Modify: `css/exercise.css` — añadir al final del archivo:

```css
/* ---- Dokkai (reading) ---- */
.reading-block {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  max-width: 640px;
  margin: 0 auto;
}
.reading-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.85rem;
  color: var(--text-muted);
}
.reading-furigana-toggle {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  cursor: pointer;
  user-select: none;
}
.reading-furigana-toggle input { margin: 0; }
.reading-qcount { font-variant-numeric: tabular-nums; }
.reading-text {
  font-size: 1.15rem;
  line-height: 2.0;
  padding: 1rem;
  background: var(--bg-hover);
  border-radius: 8px;
  border: 1px solid var(--border);
  font-family: "Noto Sans JP", sans-serif;
}
.reading-text ruby rt {
  font-size: 0.55em;
  color: var(--text-muted);
  font-weight: 400;
  user-select: none;
}
.reading-vocab-hints {
  font-size: 0.85rem;
  background: var(--bg-hover);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 0.4rem 0.75rem;
}
.reading-vocab-hints summary {
  cursor: pointer;
  color: var(--text-muted);
  padding: 0.2rem 0;
}
.reading-vocab-hints ul {
  margin: 0.4rem 0 0 0;
  padding-left: 1.2rem;
}
.reading-vocab-hints li { margin: 0.15rem 0; }
.reading-vocab-hints .hint-kana { color: var(--text-muted); }
.reading-input { display: flex; flex-direction: column; gap: 0.75rem; }
.reading-q {
  font-size: 1rem;
  font-weight: 600;
  text-align: center;
}
```

- [ ] **Step 5: Verificar que los 5 tests UI nuevos pasan**

Refresh tests.
Expected: 57 tests pasan (52 anteriores + 5 nuevos).

- [ ] **Step 6: Commit**

```bash
git add js/reading.js css/exercise.css test/reading.test.js
git commit -m "feat(reading): UI con furigana toggle, vocab hints colapsable y estilos"
```

---

## Task 5: Integración (app, home, stats)

**Files:**
- Modify: `js/app.js`
- Modify: `js/home.js`
- Modify: `js/stats.js`

- [ ] **Step 1: Modificar `js/app.js` para añadir la ruta de reading**

Añadir, junto al resto de imports al inicio (después de la línea `import { start as startListening } from './listening.js';`):

```js
import { start as startReading } from './reading.js';
```

Y dentro de `route()`, después del bloque de `listening` (el `else if (seg1 === 'listening')` y antes del `else { window.navigate('/'); }`), insertar:

```js
    } else if (seg1 === 'reading') {
      const allItems = await loadData('reading-n5.json');
      await startReading(container, allItems);
```

- [ ] **Step 2: Modificar `js/home.js` para añadir la tarjeta de Dokkai**

En el array `BLOCKS` (líneas 3-74), añadir al final del array (después del entry `listening`):

```js
  {
    id: 'reading',
    label: 'Comprensión lectora',
    jp: '読解',
    emoji: '📚',
    file: 'reading-n5.json',
    desc: 'Textos cortos y medios con preguntas',
    color: 'var(--c-orange)',
    path: '/reading',
  },
```

- [ ] **Step 3: Modificar `js/stats.js` para añadir reading al deck list**

En el array `DECKS` (líneas 5-13), añadir al final:

```js
  { id: 'reading', label: 'Comprensión lectora', file: 'reading-n5.json' },
```

- [ ] **Step 4: Verificar manualmente en navegador**

Abrir `http://localhost:8765/`. Esperar:
- En la home aparece una tarjeta nueva "Comprensión lectora 読解" con emoji 📚 y "0% (0/2)".
- Click en la tarjeta → muestra session config con título "Comprensión lectora 読解".
- Comenzar → muestra primer texto con toggle furigana (off por defecto), pregunta y 4 opciones.
- Activar furigana → reaparecen 山田 con やまだ encima.
- Click en "Vocabulario sugerido" → expande hints.
- Acertar la pregunta del texto corto → siguiente ítem.
- Si el siguiente es del medium con 3 preguntas, fallar 1 a propósito y completar las 3 → ir a `localStorage` (DevTools) y verificar que `jp_n5_v1.reading.r_002` tiene `box: 0` (porque hubo un fallo entre las 3).
- Volver a entrar, acertar TODAS las 3 del medium → verificar que `jp_n5_v1.reading.r_002` tiene `box: 1`.
- En la pantalla `/stats`: aparece fila "Comprensión lectora" con dominados/total.

- [ ] **Step 5: Verificar que los tests siguen pasando**

Refresh tests.
Expected: 57 tests siguen pasando (integración no añade tests automatizados, sí pruebas manuales).

- [ ] **Step 6: Commit**

```bash
git add js/app.js js/home.js js/stats.js
git commit -m "feat(reading): integración con app, home y stats"
```

---

## Task 6: Tests de integración del flujo SRS

**Files:**
- Modify: `test/reading.test.js`

Añadir tests que ejerciten el flujo completo: aggregator + recordAnswer real sobre localStorage, simulando un texto con 3 preguntas y verificando la caja final.

- [ ] **Step 1: Añadir tests de integración al final de `test/reading.test.js`**

Modify `test/reading.test.js` añadiendo al final:

```js
describe('reading SRS por texto - integración', () => {
  it('3 preguntas todas correctas → box sube de 0 a 1', async () => {
    const KEY = 'jp_n5_v1.reading.r_test_a';
    localStorage.removeItem(KEY);
    const { createTextSrsAggregator } = await import('../js/reading.js?cache=int1');
    const { recordAnswer } = await import('../js/storage.js?cache=int1');
    const items = [
      { text: { id: 'r_test_a' }, q_idx: 0 },
      { text: { id: 'r_test_a' }, q_idx: 1 },
      { text: { id: 'r_test_a' }, q_idx: 2 },
    ];
    const agg = createTextSrsAggregator(items, (id, correct) => recordAnswer('reading', id, correct));
    agg(items[0], true);
    agg(items[1], true);
    agg(items[2], true);
    const stored = JSON.parse(localStorage.getItem(KEY));
    assertEqual(stored.box, 1);
    assertEqual(stored.correct, 1);
    assertEqual(stored.wrong, 0);
    localStorage.removeItem(KEY);
  });

  it('3 preguntas con 1 fallo → box queda en 0 y wrong=1', async () => {
    const KEY = 'jp_n5_v1.reading.r_test_b';
    localStorage.removeItem(KEY);
    // Pre-set en box 2 para verificar que un fallo lo baja a 0
    localStorage.setItem(KEY, JSON.stringify({ box: 2, lastSeen: null, correct: 5, wrong: 0 }));
    const { createTextSrsAggregator } = await import('../js/reading.js?cache=int2');
    const { recordAnswer } = await import('../js/storage.js?cache=int2');
    const items = [
      { text: { id: 'r_test_b' }, q_idx: 0 },
      { text: { id: 'r_test_b' }, q_idx: 1 },
      { text: { id: 'r_test_b' }, q_idx: 2 },
    ];
    const agg = createTextSrsAggregator(items, (id, correct) => recordAnswer('reading', id, correct));
    agg(items[0], true);
    agg(items[1], false);
    agg(items[2], true);
    const stored = JSON.parse(localStorage.getItem(KEY));
    assertEqual(stored.box, 0);
    assertEqual(stored.wrong, 1);
    localStorage.removeItem(KEY);
  });
});
```

- [ ] **Step 2: Verificar que los 2 tests pasan**

Refresh tests.
Expected: 59 tests pasan (57 anteriores + 2 nuevos).

- [ ] **Step 3: Commit**

```bash
git add test/reading.test.js
git commit -m "test(reading): integración SRS por texto con recordAnswer real"
```

---

## Task 7: Generar el contenido completo (28 textos restantes)

**Files:**
- Modify: `data/reading-n5.json`

Generar 19 textos cortos adicionales (r_003 a r_021) y 9 medios adicionales (r_023 a r_031). Total final: 30 textos (20 short + 10 medium).

**Restricciones de contenido (inviolables):**
- Solo léxico presente en `data/vocab-n5.json`, `data/kanji-n5.json`, `data/grammar-n5.json`, `data/particles.json`. Si una palabra no está en esos archivos, no se usa.
- Solo kanji presente en `data/kanji-n5.json` (103 kanji oficiales).
- Solo patrones gramaticales presentes en `data/grammar-n5.json`.
- Frases sencillas tipo JLPT N5: presente/pasado de です・ます, partículas básicas, conjunciones simples (そして, でも), expresiones temporales N5.
- Textos cortos: ~50-80 caracteres JP, 1 pregunta.
- Textos medios: ~150-250 caracteres JP, 2-3 preguntas.

**Temas sugeridos (variar para que no sea monótono):**
- Rutinas diarias (mañana, tarde, noche).
- Familia, amigos, compañeros de clase/trabajo.
- Comida japonesa y de otros países.
- Tiempo libre: deporte, lectura, música, cine.
- Tiempo meteorológico y estaciones.
- Compras y dinero.
- Direcciones simples (a la derecha, recto…).
- Viajes nacionales (Tokio, Osaka, Kioto).
- Estudios y trabajo (estudiante, profesor, empleado).
- Hospitales/médico sencillo (estoy enfermo, fiebre).

**Variedad de preguntas:**
- ¿Quién? ¿Qué? ¿Cuándo? ¿Dónde? ¿Cuánto?
- Comprensión literal (algo dicho explícitamente en el texto).
- Inferencia básica (no dicho pero claramente implicado).
- Cantidades, horas y fechas.

- [ ] **Step 1: Leer los JSON de vocabulario, kanji y gramática N5 para conocer el corpus**

Run:
```bash
cd /home/hugo/japones-n5 && python3 -c "
import json
v = json.load(open('data/vocab-n5.json'))
k = json.load(open('data/kanji-n5.json'))
g = json.load(open('data/grammar-n5.json'))
print('vocab:', len(v), 'muestras:', [x.get('jp') for x in v[:10]])
print('kanji:', len(k), 'muestras:', [x.get('kanji') for x in k[:10]])
print('grammar:', len(g), 'muestras:', [x.get('pattern') for x in g[:10]])
"
```

- [ ] **Step 2: Generar los 28 textos siguiendo el esquema de Task 1**

Editar `data/reading-n5.json` añadiendo entries entre el actual `r_002` y el cierre `]`. Los IDs deben ser `r_003` a `r_030` consecutivos. Distribución final:
- r_001 a r_020 → `type: "short"` (20 textos, 1 pregunta cada uno).
- r_021 a r_030 → `type: "medium"` (10 textos, 2-3 preguntas cada uno).

Como el seed inicial `r_002` era medium, tras este step debe quedar:
- r_001 short
- r_003 a r_020 = 18 short más (los 19 que faltan… pero ya hay r_001 short, así que faltan 19 short. Total: r_001 + r_003..r_020 = 19 short. Falta 1 short más → mover r_002 al final como r_030 medium, y añadir r_002 short nuevo).

**Simplificación**: en lugar de mover, renumerar al final:
1. Renombrar el actual `r_002` (medium) a `r_021` (primer medium).
2. Añadir 19 nuevos shorts como r_002 a r_020.
3. Añadir 9 nuevos mediums como r_022 a r_030.

Cada entry debe tener todos los campos del esquema: `id`, `type`, `title_es`, `text_jp`, `text_ruby` (tokenizado), `vocabulary_hints` (puede ser `[]` si todo el texto es vocab básico), `questions` (1 para short, 2-3 para medium).

**Tokenización de `text_ruby`**: dividir el texto en segmentos donde cada segmento agrupa: o bien un bloque de kanji con su lectura, o bien una secuencia continua de kana/puntuación sin lectura. NO mezclar kanji y kana en un mismo token con `ruby` set: si un token tiene `ruby`, su `base` debe ser SOLO kanji.

Ejemplo: `毎日電車で会社に行きます` se tokeniza:
- `{base: "毎日", ruby: "まいにち"}`
- `{base: "電車", ruby: "でんしゃ"}`
- `{base: "で", ruby: null}`
- `{base: "会社", ruby: "かいしゃ"}`
- `{base: "に", ruby: null}`
- `{base: "行", ruby: "い"}`
- `{base: "きます", ruby: null}`

- [ ] **Step 3: Validar el JSON**

Run:
```bash
cd /home/hugo/japones-n5 && python3 -c "
import json
data = json.load(open('data/reading-n5.json'))
print('total:', len(data))
shorts = [d for d in data if d['type'] == 'short']
mediums = [d for d in data if d['type'] == 'medium']
print('shorts:', len(shorts), 'mediums:', len(mediums))
assert len(data) == 30, f'esperaba 30, hay {len(data)}'
assert len(shorts) == 20, f'esperaba 20 shorts, hay {len(shorts)}'
assert len(mediums) == 10, f'esperaba 10 mediums, hay {len(mediums)}'

# Verificar IDs únicos y consecutivos
ids = [d['id'] for d in data]
assert len(set(ids)) == 30, 'IDs duplicados'

# Verificar que cada question.answer_es está en options_es
for d in data:
    for q in d['questions']:
        assert q['answer_es'] in q['options_es'], f'{d[\"id\"]}: answer no está en options'
        assert len(q['options_es']) == 4, f'{d[\"id\"]}: opciones no son 4'

# Verificar que concatenar text_ruby reproduce text_jp
for d in data:
    reconstructed = ''.join(t['base'] for t in d['text_ruby'])
    assert reconstructed == d['text_jp'], f'{d[\"id\"]}: text_ruby no reconstruye text_jp\\n  ruby: {reconstructed}\\n  jp:   {d[\"text_jp\"]}'

print('OK — esquema válido')
"
```
Expected: `total: 30 ... OK — esquema válido`

- [ ] **Step 4: Probar manualmente en navegador algunos textos**

Abrir `http://localhost:8765/#/reading`, comenzar sesión de tamaño "Todo" o 20, navegar por varios textos comprobando:
- Furigana se renderiza correctamente cuando se activa.
- Las preguntas tienen sentido y la respuesta correcta es coherente.
- No aparecen kanji fuera de N5 (revisión visual).

- [ ] **Step 5: Commit**

```bash
git add data/reading-n5.json
git commit -m "data: 28 textos adicionales para Dokkai (30 totales: 20 short + 10 medium)"
```

---

## Task 8: Actualizar documentación y tag

**Files:**
- Modify: `CLAUDE.md`
- Modify: `docs/superpowers/specs/2026-05-16-mejoras-n5-design.md`
- Modify: `/home/hugo/.claude/projects/-home-hugo/memory/project_japones_n5.md`

- [ ] **Step 1: Actualizar `CLAUDE.md`**

En la sección "Arquitectura en 30 segundos" actualizar el conteo de bloques de "(hiragana, katakana, vocab, kanji, partículas, gramática, listening)" a "(hiragana, katakana, vocab, kanji, partículas, gramática, listening, reading)".

En la tabla "Estado de fases" cambiar la fila de Fase 2:
```
| 2 — Dokkai (lectura) | ✅ | `fase-2` |
```

En la sección Tests, actualizar el conteo total de "43 tests pasando" al nuevo total (debería ser 59 tras esta fase).

- [ ] **Step 2: Actualizar el spec**

Modify `docs/superpowers/specs/2026-05-16-mejoras-n5-design.md`. Encontrar la línea `## Fase 2 — Dokkai (lectura)` y añadir inmediatamente después:

```
**Estado**: ✅ Implementada el 2026-05-17 (tag `fase-2`). 30 textos (20 short + 10 medium) con furigana opcional, vocabulario sugerido colapsable y SRS por texto. Nuevo hook `recordResult` en exercise.js para agregar resultados por grupo.
```

- [ ] **Step 3: Actualizar auto-memory**

Modify `/home/hugo/.claude/projects/-home-hugo/memory/project_japones_n5.md`:

En "Bloques" cambiar "(7)" a "(8)" y añadir ", Comprensión lectora (Dokkai)" al final de la lista.

En "Estado fases" cambiar la línea de Fase 2 de:
```
- ⏳ Fase 2 Dokkai (lectura) — siguiente recomendada
```
a:
```
- ✅ Fase 2 Dokkai (30 textos, SRS por texto, furigana toggle) — tag `fase-2`
```

Y la línea siguiente (Fase 3) marcarla como la "siguiente recomendada".

- [ ] **Step 4: Commit y tag**

```bash
git add CLAUDE.md docs/superpowers/specs/2026-05-16-mejoras-n5-design.md
git commit -m "docs: marcar Fase 2 Dokkai como implementada"
git tag fase-2
```

Nota: La auto-memory NO se commitea (vive fuera del repo, en `~/.claude/projects/...`).

---

## Self-review checklist (controlador)

Antes de empezar la ejecución, verificar:

- [x] Cobertura del spec: shorts y mediums (Fase 2 §1), esquema con `text_ruby` y `vocabulary_hints` (§Datos), UI con texto grande + furigana off por defecto + vocab colapsable (§UI), SRS por texto (§SRS), 20+10 textos (§Contenido), archivos esperados todos cubiertos (§Archivos).
- [x] Sin placeholders: todos los snippets tienen código completo.
- [x] Tipos coherentes: `text_ruby` es siempre array de `{base, ruby}` con `ruby: null` para tokens sin lectura. `recordResult` siempre toma `(item, correct)`. `expandTextsToItems` siempre devuelve `[{text, q_idx}, ...]`.
- [x] Receta de integración de CLAUDE.md respetada: app.js + home.js + stats.js modificados.
- [x] Tests TDD: cada función nueva tiene tests antes de implementarse.
