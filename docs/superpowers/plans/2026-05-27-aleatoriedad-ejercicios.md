# Aleatoriedad en ejercicios — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** (1) "Otra ronda" llama al SRS para obtener ítems nuevos en todos los modos; (2) cada lección muestra N ejercicios aleatorios de un pool de ~50.

**Architecture:** Se añade `getItems?: () => Item[]` a la config de `startExercise`. Si está presente, se llama en cada ronda (inicial y reintento); si no, se barajan los ítems existentes como fallback. Para lecciones, se amplía el array de ejercicios en los JSON y `renderLesson` selecciona aleatoriamente los `meta.exerciseCount` primeros tras barajar.

**Tech Stack:** Vanilla JS ES modules, JSON data files. Sin build ni npm.

---

## Task 1: Actualizar el motor `exercise.js`

**Files:**
- Modify: `js/exercise.js`

- [ ] **Editar línea 1 del cuerpo de `startExercise`** — cambiar la desestructuración y convertir `items` en variable mutable:

```js
// ANTES (línea 31):
const { deck, items, allItems } = config;

// DESPUÉS:
const { deck, allItems } = config;
let items = config.getItems ? config.getItems() : [...(config.items ?? [])];
```

- [ ] **Añadir función `shuffle` al final del archivo** (antes del último `}`):

```js
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
```

- [ ] **Actualizar el handler de "Otra ronda"** en `showSummary` (línea ~207):

```js
// ANTES:
document.getElementById('sum-retry').addEventListener('click', () => {
  idx = 0; streak = 0; results = [];
  render();
});

// DESPUÉS:
document.getElementById('sum-retry').addEventListener('click', () => {
  items = config.getItems ? config.getItems() : shuffle(items);
  idx = 0; streak = 0; results = [];
  render();
});
```

- [ ] **Verificar en navegador**: abrir `http://localhost:8765`, ir a Hiragana → Opción múltiple → completar la sesión → "Otra ronda". Comprobar que aparecen ítems diferentes (puede solaparse alguno por azar, pero no todos en el mismo orden).

- [ ] **Commit:**

```
git add js/exercise.js
git commit -m "feat: exercise.js soporta getItems factory y nueva selección en retry"
```

---

## Task 2: Actualizar módulos kana que usan `startExercise`

**Files:**
- Modify: `js/kana/kana-typing.js`, `js/kana/kana-reverse.js`, `js/kana/kana-choice.js`, `js/kana/kana-audio.js`

Los cuatro archivos siguen el **mismo patrón exacto**. Para cada uno:

**a) En `onStart`, eliminar la variable `items` y pasar factory a la función `run*`:**

```js
// ANTES (kana-typing como ejemplo):
onStart: (size, groups) => {
  const filtered = groups ? allItems.filter(it => groups.includes(it.group)) : allItems;
  if (filtered.length === 0) { alert('Selecciona al menos un grupo.'); return; }
  const items = selectSession(deck, filtered, size);
  runTyping(container, deck, items, allItems);
},

// DESPUÉS:
onStart: (size, groups) => {
  const filtered = groups ? allItems.filter(it => groups.includes(it.group)) : allItems;
  if (filtered.length === 0) { alert('Selecciona al menos un grupo.'); return; }
  runTyping(container, deck, () => selectSession(deck, filtered, size), allItems);
},
```

Sustituir `runTyping` / `runReverse` / `runChoice` / `runAudio` según el archivo.

**b) En la función `run*`, cambiar la firma y la propiedad pasada a `startExercise`:**

```js
// ANTES:
function runTyping(container, deck, items, allItems) {
  startExercise(container, {
    deck,
    items,
    ...

// DESPUÉS:
function runTyping(container, deck, getItems, allItems) {
  startExercise(container, {
    deck,
    getItems,
    ...
```

- [ ] Aplicar en `kana-typing.js` (función `runTyping`)
- [ ] Aplicar en `kana-reverse.js` (función `runReverse`)
- [ ] Aplicar en `kana-choice.js` (función `runChoice`)
- [ ] Aplicar en `kana-audio.js` (función `runAudio`)

- [ ] **Commit:**

```
git add js/kana/kana-typing.js js/kana/kana-reverse.js js/kana/kana-choice.js js/kana/kana-audio.js
git commit -m "feat: kana modes usan getItems factory para nueva selección en retry"
```

---

## Task 3: Actualizar `kana-words.js`

**Files:**
- Modify: `js/kana/kana-words.js`

En `kana-words` el deck se llama `wordsDeck` (no `deck`) y no hay grupos. Mismo patrón:

```js
// ANTES en onStart:
onStart: (size) => {
  const items = selectSession(wordsDeck, filtered, size);
  runWords(container, wordsDeck, items, filtered);
},

// DESPUÉS:
onStart: (size) => {
  runWords(container, wordsDeck, () => selectSession(wordsDeck, filtered, size), filtered);
},
```

```js
// ANTES:
function runWords(container, deck, items, allItems) {
  startExercise(container, { deck, items, ...

// DESPUÉS:
function runWords(container, deck, getItems, allItems) {
  startExercise(container, { deck, getItems, ...
```

- [ ] Aplicar el cambio
- [ ] **Commit:**

```
git add js/kana/kana-words.js
git commit -m "feat: kana-words usa getItems factory"
```

---

## Task 4: Actualizar `vocab.js`

**Files:**
- Modify: `js/vocab.js`

Hay dos modos (`runJpEs` y `runEsJp`), ambos reciben `items` desde el mismo `onStart`.

```js
// ANTES en onStart de start():
onStart: (size) => {
  const items = selectSession(DECK, allItems, size);
  if (mode === 'jp-es') runJpEs(container, items, allItems);
  else runEsJp(container, items, allItems);
},

// DESPUÉS:
onStart: (size) => {
  const getItems = () => selectSession(DECK, allItems, size);
  if (mode === 'jp-es') runJpEs(container, getItems, allItems);
  else runEsJp(container, getItems, allItems);
},
```

```js
// ANTES runJpEs:
function runJpEs(container, items, allItems) {
  startExercise(container, { deck: DECK, items, ...

// DESPUÉS:
function runJpEs(container, getItems, allItems) {
  startExercise(container, { deck: DECK, getItems, ...
```

Ídem para `runEsJp`.

- [ ] Aplicar los 3 cambios en `vocab.js`
- [ ] **Commit:**

```
git add js/vocab.js
git commit -m "feat: vocab usa getItems factory"
```

---

## Task 5: Actualizar `kanji.js`, `particles.js`, `grammar.js`

**Files:**
- Modify: `js/kanji.js`, `js/particles.js`, `js/grammar.js`

Los tres siguen el patrón simple (una función `run*`, un `onStart`):

```js
// ANTES (kanji como ejemplo):
onStart: (size) => {
  const items = selectSession(DECK, allItems, size);
  runKanji(container, items, allItems);
},
// ...
function runKanji(container, items, allItems) {
  startExercise(container, { deck: DECK, items, ...

// DESPUÉS:
onStart: (size) => {
  runKanji(container, () => selectSession(DECK, allItems, size), allItems);
},
// ...
function runKanji(container, getItems, allItems) {
  startExercise(container, { deck: DECK, getItems, ...
```

- [ ] Aplicar en `kanji.js` (`runKanji`)
- [ ] Aplicar en `particles.js` (`runParticles`)
- [ ] Aplicar en `grammar.js` (`runGrammar`)

- [ ] **Commit:**

```
git add js/kanji.js js/particles.js js/grammar.js
git commit -m "feat: kanji, particles, grammar usan getItems factory"
```

---

## Task 6: Actualizar `verbs.js` y `adjectives.js`

**Files:**
- Modify: `js/verbs.js`, `js/adjectives.js`

Estos módulos construyen los ítems combinando `selectSession` + `buildItem` + `pickRandomForm`. La factory debe rehacer ambos pasos:

```js
// ANTES en verbs.js:
onStart: (size) => {
  const verbs = selectSession(DECK, allVerbs, size);
  const items = verbs.map(v => buildItem(v, pickRandomForm()));
  runVerbs(container, items, allVerbs);
},
// ...
function runVerbs(container, items, allVerbs) {
  startExercise(container, { deck: DECK, items, ...

// DESPUÉS:
onStart: (size) => {
  runVerbs(container, () => {
    const verbs = selectSession(DECK, allVerbs, size);
    return verbs.map(v => buildItem(v, pickRandomForm()));
  }, allVerbs);
},
// ...
function runVerbs(container, getItems, allVerbs) {
  startExercise(container, { deck: DECK, getItems, ...
```

Ídem para `adjectives.js` (usa `allAdj` en vez de `allVerbs`, y `pickRandomForm(a.type)`):

```js
// ANTES:
onStart: (size) => {
  const adjs = selectSession(DECK, allAdj, size);
  const items = adjs.map(a => buildItem(a, pickRandomForm(a.type)));
  runAdjectives(container, items, allAdj);
},

// DESPUÉS:
onStart: (size) => {
  runAdjectives(container, () => {
    const adjs = selectSession(DECK, allAdj, size);
    return adjs.map(a => buildItem(a, pickRandomForm(a.type)));
  }, allAdj);
},
```

- [ ] Aplicar en `verbs.js`
- [ ] Aplicar en `adjectives.js`
- [ ] **Commit:**

```
git add js/verbs.js js/adjectives.js
git commit -m "feat: verbs y adjectives usan getItems factory con selección SRS + forma aleatoria"
```

---

## Task 7: Actualizar `listening.js`

**Files:**
- Modify: `js/listening.js`

```js
// ANTES:
onStart: (size) => {
  const items = selectSession(DECK, allItems, size);
  runListening(container, items, allItems);
},
// ...
function runListening(container, items, allItems) {
  startExercise(container, { deck: DECK, items, ...

// DESPUÉS:
onStart: (size) => {
  runListening(container, () => selectSession(DECK, allItems, size), allItems);
},
// ...
function runListening(container, getItems, allItems) {
  startExercise(container, { deck: DECK, getItems, ...
```

- [ ] Aplicar el cambio
- [ ] **Prueba de regresión**: navegar a Escucha → completar sesión → "Otra ronda". Confirmar que carga sin errores y los ítems difieren.
- [ ] **Commit:**

```
git add js/listening.js
git commit -m "feat: listening usa getItems factory"
```

---

## Task 8: Actualizar `lessons.js` y `data/lessons/index.json`

**Files:**
- Modify: `js/lessons.js`
- Modify: `data/lessons/index.json`

**a) Añadir `shuffle` al final de `lessons.js`** (antes del cierre del archivo):

```js
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
```

**b) En `renderLesson`, cambiar las líneas de filtrado de ejercicios** (línea ~263):

```js
// ANTES:
const contentBlocks = blocks.filter(b => !b.type.startsWith('exercise-'));
const exerciseBlocks = blocks.filter(b => b.type.startsWith('exercise-'));

// DESPUÉS:
const contentBlocks = blocks.filter(b => !b.type.startsWith('exercise-'));
const allExercises = blocks.filter(b => b.type.startsWith('exercise-'));
const exerciseCount = meta.exerciseCount ?? 5;
const exerciseBlocks = shuffle(allExercises).slice(0, exerciseCount);
```

**c) Actualizar `data/lessons/index.json`** — añadir `"exerciseCount"` a cada entrada:

```json
[
  { "id": "l01-hiragana",        "blockId": "hiragana",   "title": "Hiragana: vocales y primeros sonidos",   "topic": "escritura",   "estimatedMin": 10, "exerciseCount": 5  },
  { "id": "l02-katakana",        "blockId": "katakana",   "title": "Katakana: para palabras extranjeras",    "topic": "escritura",   "estimatedMin": 8,  "exerciseCount": 5  },
  { "id": "l03-saludos",         "blockId": "vocab",      "title": "Saludos y presentaciones",               "topic": "vocabulario", "estimatedMin": 7,  "exerciseCount": 5  },
  { "id": "l04-numeros",         "blockId": "vocab",      "title": "Números del 1 al 100",                   "topic": "vocabulario", "estimatedMin": 8,  "exerciseCount": 7  },
  { "id": "l15-contadores",      "blockId": "vocab",      "title": "Contadores: ~つ, 人, 枚, 本 y más",       "topic": "vocabulario", "estimatedMin": 10, "exerciseCount": 10 },
  { "id": "l05-copula",          "blockId": "grammar",    "title": "La cópula: です y ではありません",          "topic": "gramática",   "estimatedMin": 9,  "exerciseCount": 5  },
  { "id": "l09-demostrativos",   "blockId": "grammar",    "title": "Demostrativos: こ/そ/あ/ど y posesivos",  "topic": "gramática",   "estimatedMin": 10, "exerciseCount": 5  },
  { "id": "l10-existencia",      "blockId": "grammar",    "title": "Existencia: あります e います",              "topic": "gramática",   "estimatedMin": 9,  "exerciseCount": 5  },
  { "id": "l14-interrogativos",  "blockId": "grammar",    "title": "Interrogativos: qué, quién, dónde…",     "topic": "gramática",   "estimatedMin": 10, "exerciseCount": 7  },
  { "id": "l06-particulas",      "blockId": "particles",  "title": "Partículas は、が、を、に、で",              "topic": "gramática",   "estimatedMin": 12, "exerciseCount": 10 },
  { "id": "l13-particulas-extra","blockId": "particles",  "title": "Partículas も、と、から、まで、で、へ",     "topic": "gramática",   "estimatedMin": 10, "exerciseCount": 10 },
  { "id": "l07-verbos-masu",     "blockId": "verbs",      "title": "Verbos en forma ます",                   "topic": "gramática",   "estimatedMin": 10, "exerciseCount": 10 },
  { "id": "l11-forma-te",        "blockId": "verbs",      "title": "La forma て: enlazar y pedir",           "topic": "gramática",   "estimatedMin": 11, "exerciseCount": 10 },
  { "id": "l12-deseos-negacion", "blockId": "verbs",      "title": "Deseos (~たい) y negación informal",     "topic": "gramática",   "estimatedMin": 10, "exerciseCount": 7  },
  { "id": "l08-adjetivos",       "blockId": "adjectives", "title": "Adjetivos い y な",                      "topic": "gramática",   "estimatedMin": 9,  "exerciseCount": 7  },
  { "id": "l16-kanji",           "blockId": "kanji",      "title": "Introducción a los kanji N5",           "topic": "escritura",   "estimatedMin": 12, "exerciseCount": 7  }
]
```

- [ ] Aplicar cambios en `lessons.js`
- [ ] Reemplazar `data/lessons/index.json` con el contenido de arriba
- [ ] **Verificar**: abrir una lección, comprobar que solo aparecen N ejercicios y que al recargar cambia el subconjunto.
- [ ] **Commit:**

```
git add js/lessons.js data/lessons/index.json
git commit -m "feat: lessons selecciona N ejercicios aleatorios del pool"
```

---

## Task 9 — Task 24: Ampliar pools de ejercicios en los JSON de lecciones

**Objetivo por lección**: llevar el total de ejercicios a ~50 (actualmente ~7).  
**Formato válido**:
```json
{"type":"exercise-mc","prompt":"Pregunta","options":["A","B","C","D"],"answer":"A"}
{"type":"exercise-tf","statement":"Afirmación","answer":true}
{"type":"exercise-gap","prompt":"Frase con ___","options":["A","B","C","D"],"answer":"A","hint":"pista opcional"}
```
**Restricción**: solo léxico y gramática N5 ya presente en `data/vocab-n5.json`, `data/kanji-n5.json`, `data/grammar-n5.json`, `data/particles.json`.

Para cada lección, **añadir los nuevos ejercicios al final del array JSON, antes del cierre `]`**. Los ejercicios existentes se conservan.

---

### Task 9: `l01-hiragana.json` — añadir 43 ejercicios (target: 50 total)

**File:** `data/lessons/l01-hiragana.json`

Tema: lecturas de hiragana base, dakuten, handakuten, yōon, sokuon, vocales largas.

- [ ] Añadir al array los siguientes ejercicios:

```json
,{"type":"exercise-mc","prompt":"¿Cuál es la lectura de ね?","options":["ne","me","re","he"],"answer":"ne"}
,{"type":"exercise-mc","prompt":"¿Cuál es la lectura de ほ?","options":["ho","mo","no","ro"],"answer":"ho"}
,{"type":"exercise-mc","prompt":"¿Cuál es la lectura de ゆ?","options":["yu","ru","mu","nu"],"answer":"yu"}
,{"type":"exercise-mc","prompt":"¿Cuál es la lectura de ら?","options":["ra","la","na","wa"],"answer":"ra"}
,{"type":"exercise-mc","prompt":"¿Qué hiragana representa 'wa'?","options":["わ","れ","ろ","る"],"answer":"わ"}
,{"type":"exercise-mc","prompt":"¿Qué hiragana representa 'ko'?","options":["こ","く","か","き"],"answer":"こ"}
,{"type":"exercise-mc","prompt":"¿Cuál es la lectura de ぎ?","options":["gi","ki","ji","bi"],"answer":"gi"}
,{"type":"exercise-mc","prompt":"¿Cuál es la lectura de ぞ?","options":["zo","so","do","bo"],"answer":"zo"}
,{"type":"exercise-mc","prompt":"¿Cuál es la lectura de ぱ?","options":["pa","ba","ha","fa"],"answer":"pa"}
,{"type":"exercise-mc","prompt":"La combinación にゃ se lee:","options":["nya","nia","nna","mya"],"answer":"nya"}
,{"type":"exercise-mc","prompt":"La combinación りょ se lee:","options":["ryo","rio","rro","lyo"],"answer":"ryo"}
,{"type":"exercise-mc","prompt":"La combinación ちゃ se lee:","options":["cha","tya","sha","cia"],"answer":"cha"}
,{"type":"exercise-mc","prompt":"¿Cómo se escribe 'shi' en hiragana?","options":["し","さ","せ","す"],"answer":"し"}
,{"type":"exercise-mc","prompt":"¿Cómo se escribe 'chi' en hiragana?","options":["ち","て","た","つ"],"answer":"ち"}
,{"type":"exercise-mc","prompt":"¿Cómo se escribe 'tsu' en hiragana?","options":["つ","て","と","た"],"answer":"つ"}
,{"type":"exercise-mc","prompt":"¿Cómo se escribe 'fu' en hiragana?","options":["ふ","は","ひ","へ"],"answer":"ふ"}
,{"type":"exercise-mc","prompt":"¿Cuál es la lectura de きって?","options":["kitte","kite","kste","kitte"],"answer":"kitte"}
,{"type":"exercise-mc","prompt":"La っ pequeña indica:","options":["consonante doble","vocal larga","pausa suave","sílaba nueva"],"answer":"consonante doble"}
,{"type":"exercise-mc","prompt":"¿Con qué se escribe la vocal お larga en hiragana?","options":["おう","おお","うお","おe"],"answer":"おう"}
,{"type":"exercise-mc","prompt":"¿Cuántos caracteres base tiene el hiragana?","options":["46","50","48","42"],"answer":"46"}
,{"type":"exercise-mc","prompt":"La partícula は se pronuncia como:","options":["wa","ha","ba","pa"],"answer":"wa"}
,{"type":"exercise-mc","prompt":"¿Cuál es la lectura de じ?","options":["ji","zi","di","bi"],"answer":"ji"}
,{"type":"exercise-mc","prompt":"¿Cuál es la lectura de ぼ?","options":["bo","po","ho","do"],"answer":"bo"}
,{"type":"exercise-mc","prompt":"¿Cuál hiragana representa 'n' (nasal suelta)?","options":["ん","の","ぬ","な"],"answer":"ん"}
,{"type":"exercise-mc","prompt":"¿Cuál es la lectura de ぷ?","options":["pu","bu","fu","mu"],"answer":"pu"}
,{"type":"exercise-mc","prompt":"¿Cuál es la lectura de ひゃ?","options":["hya","hia","hha","hna"],"answer":"hya"}
,{"type":"exercise-mc","prompt":"¿Qué hiragana representa 'yo'?","options":["よ","ゆ","や","え"],"answer":"よ"}
,{"type":"exercise-mc","prompt":"¿Cuál es la lectura de で?","options":["de","te","be","ne"],"answer":"de"}
,{"type":"exercise-mc","prompt":"¿Cuál es la lectura de ぢ?","options":["ji","di","zi","chi"],"answer":"ji"}
,{"type":"exercise-tf","statement":"し se pronuncia 'si'.","answer":false}
,{"type":"exercise-tf","statement":"ち se pronuncia 'chi'.","answer":true}
,{"type":"exercise-tf","statement":"El dakuten (゛) sonoriza la consonante.","answer":true}
,{"type":"exercise-tf","statement":"ぢ y じ suenan diferente en japonés moderno estándar.","answer":false}
,{"type":"exercise-tf","statement":"En yōon, el segundo carácter (ゃ/ゅ/ょ) se escribe en tamaño normal.","answer":false}
,{"type":"exercise-tf","statement":"La ん es la única consonante que puede aparecer sola en japonés.","answer":true}
,{"type":"exercise-tf","statement":"Las vocales japonesas tienen el mismo acento tónico que en español.","answer":false}
,{"type":"exercise-tf","statement":"おとうさん (padre) se escribe con う para alargar la vocal o.","answer":true}
,{"type":"exercise-gap","prompt":"___ は「かさ」という意味です。(Este kana significa 'paraguas'.)","options":["か","さ","く","こ"],"answer":"か","hint":"primera sílaba de かさ"}
,{"type":"exercise-gap","prompt":"さ___しは「sashimi」と読みます。","options":["し","さ","す","せ"],"answer":"し","hint":"la sílaba 'shi'"}
,{"type":"exercise-gap","prompt":"き___てはkitteと読みます。(sello postal)","options":["っ","つ","て","と"],"answer":"っ","hint":"sokuon: consonante doble"}
,{"type":"exercise-gap","prompt":"___ゃは「sha」と読みます。","options":["し","さ","そ","す"],"answer":"し","hint":"yōon: し + ゃ"}
,{"type":"exercise-gap","prompt":"おとう___ん = padre (vocal o larga)","options":["さ","さん","し","ち"],"answer":"さ","hint":"おとうさん"}
,{"type":"exercise-gap","prompt":"___はカタカナではなくひらがなです。","options":["あ","ア","a","A"],"answer":"あ","hint":"forma redondeada, no angular"}
```

- [ ] **Commit:**

```
git add data/lessons/l01-hiragana.json
git commit -m "data: ampliar pool ejercicios l01-hiragana (50 total)"
```

---

### Task 10: `l02-katakana.json` — añadir 42 ejercicios (target: 50 total)

**File:** `data/lessons/l02-katakana.json`

Tema: lecturas de katakana base, dakuten, handakuten, yōon, chōonpu (ー), diferencias con hiragana.

- [ ] Añadir al array los siguientes ejercicios:

```json
,{"type":"exercise-mc","prompt":"¿Cuál es la lectura de ネ?","options":["ne","me","re","he"],"answer":"ne"}
,{"type":"exercise-mc","prompt":"¿Cuál es la lectura de ホ?","options":["ho","mo","no","ro"],"answer":"ho"}
,{"type":"exercise-mc","prompt":"¿Cuál es la lectura de ユ?","options":["yu","ru","mu","nu"],"answer":"yu"}
,{"type":"exercise-mc","prompt":"¿Cuál es la lectura de ラ?","options":["ra","la","na","wa"],"answer":"ra"}
,{"type":"exercise-mc","prompt":"¿Qué katakana representa 'wa'?","options":["ワ","レ","ロ","ル"],"answer":"ワ"}
,{"type":"exercise-mc","prompt":"¿Qué katakana representa 'ko'?","options":["コ","ク","カ","キ"],"answer":"コ"}
,{"type":"exercise-mc","prompt":"¿Cuál es la lectura de ギ?","options":["gi","ki","ji","bi"],"answer":"gi"}
,{"type":"exercise-mc","prompt":"¿Cuál es la lectura de ゾ?","options":["zo","so","do","bo"],"answer":"zo"}
,{"type":"exercise-mc","prompt":"¿Cuál es la lectura de パ?","options":["pa","ba","ha","fa"],"answer":"pa"}
,{"type":"exercise-mc","prompt":"La combinación ニャ se lee:","options":["nya","nia","nna","mya"],"answer":"nya"}
,{"type":"exercise-mc","prompt":"La combinación リョ se lee:","options":["ryo","rio","rro","lyo"],"answer":"ryo"}
,{"type":"exercise-mc","prompt":"La combinación チャ se lee:","options":["cha","tya","sha","cia"],"answer":"cha"}
,{"type":"exercise-mc","prompt":"¿Cómo se escribe 'shi' en katakana?","options":["シ","サ","セ","ス"],"answer":"シ"}
,{"type":"exercise-mc","prompt":"¿Cómo se escribe 'chi' en katakana?","options":["チ","テ","タ","ツ"],"answer":"チ"}
,{"type":"exercise-mc","prompt":"¿Cómo se escribe 'tsu' en katakana?","options":["ツ","テ","ト","タ"],"answer":"ツ"}
,{"type":"exercise-mc","prompt":"¿Qué significa el símbolo ー en katakana?","options":["alarga la vocal anterior","indica una pausa","es una consonante","equivale a っ"],"answer":"alarga la vocal anterior"}
,{"type":"exercise-mc","prompt":"コーヒー en romaji es:","options":["kōhī","kohi","kohii","kofii"],"answer":"kōhī"}
,{"type":"exercise-mc","prompt":"¿Para qué se usa principalmente el katakana?","options":["Palabras extranjeras y onomatopeyas","Partículas gramaticales","Conjugaciones verbales","Furigana sobre kanji"],"answer":"Palabras extranjeras y onomatopeyas"}
,{"type":"exercise-mc","prompt":"テレビ en español significa:","options":["televisión","teléfono","tabla","teclado"],"answer":"televisión"}
,{"type":"exercise-mc","prompt":"アイスクリーム en español significa:","options":["helado","agua fría","crema solar","licor"],"answer":"helado"}
,{"type":"exercise-mc","prompt":"¿Cuál es la lectura de ジ?","options":["ji","zi","di","bi"],"answer":"ji"}
,{"type":"exercise-mc","prompt":"¿Cuál es la lectura de ボ?","options":["bo","po","ho","do"],"answer":"bo"}
,{"type":"exercise-mc","prompt":"¿Cuál es la lectura de プ?","options":["pu","bu","fu","mu"],"answer":"pu"}
,{"type":"exercise-mc","prompt":"¿Cuál es la lectura de ヒャ?","options":["hya","hia","hha","hna"],"answer":"hya"}
,{"type":"exercise-mc","prompt":"¿Qué katakana representa 'yo'?","options":["ヨ","ユ","ヤ","エ"],"answer":"ヨ"}
,{"type":"exercise-mc","prompt":"バス en español significa:","options":["autobús","base","vaso","beso"],"answer":"autobús"}
,{"type":"exercise-mc","prompt":"ピザ en español significa:","options":["pizza","pisa","pinza","pieza"],"answer":"pizza"}
,{"type":"exercise-mc","prompt":"¿Cuántos katakana base hay?","options":["46","50","48","42"],"answer":"46"}
,{"type":"exercise-mc","prompt":"La partícula ヲ en katakana equivale al hiragana:","options":["を","わ","ん","の"],"answer":"を"}
,{"type":"exercise-tf","statement":"El katakana se usa principalmente para palabras de origen extranjero.","answer":true}
,{"type":"exercise-tf","statement":"シ se pronuncia 'si'.","answer":false}
,{"type":"exercise-tf","statement":"El símbolo ー (chōonpu) aparece solo en katakana, no en hiragana.","answer":true}
,{"type":"exercise-tf","statement":"チ se pronuncia 'chi'.","answer":true}
,{"type":"exercise-tf","statement":"ツ y ン son fáciles de confundir porque se parecen visualmente.","answer":true}
,{"type":"exercise-tf","statement":"El katakana y el hiragana tienen el mismo número de caracteres base.","answer":true}
,{"type":"exercise-tf","statement":"ソ y ン tienen la misma lectura.","answer":false}
,{"type":"exercise-gap","prompt":"テ___ビ = televisión","options":["レ","リ","ロ","ル"],"answer":"レ","hint":"テレビ"}
,{"type":"exercise-gap","prompt":"コー___ー = café","options":["ヒ","ハ","ヘ","ホ"],"answer":"ヒ","hint":"コーヒー"}
,{"type":"exercise-gap","prompt":"ア___スクリーム = helado","options":["イ","エ","ウ","オ"],"answer":"イ","hint":"アイスクリーム"}
,{"type":"exercise-gap","prompt":"___ザ = pizza","options":["ピ","パ","ペ","ポ"],"answer":"ピ","hint":"ピザ"}
,{"type":"exercise-gap","prompt":"バ___ = autobús","options":["ス","ズ","ツ","ヅ"],"answer":"ス","hint":"バス"}
,{"type":"exercise-gap","prompt":"ジュー___ = zumo (juice)","options":["ス","ズ","セ","ソ"],"answer":"ス","hint":"ジュース"}
```

- [ ] **Commit:**

```
git add data/lessons/l02-katakana.json
git commit -m "data: ampliar pool ejercicios l02-katakana (50 total)"
```

---

### Task 11: `l03-saludos.json` — añadir 43 ejercicios (target: 50 total)

**File:** `data/lessons/l03-saludos.json`

Tema: saludos según hora, despedidas, ir/volver a casa, gratitud, presentaciones.

- [ ] Añadir al array:

```json
,{"type":"exercise-mc","prompt":"¿Qué dices al entrar a una tienda y el empleado dice いらっしゃいませ?","options":["No se responde, es solo para el empleado","ただいま","いってきます","おかえり"],"answer":"No se responde, es solo para el empleado"}
,{"type":"exercise-mc","prompt":"¿Cuál es el saludo informal de mañana?","options":["おはよう","おはようございます","こんにちは","おやすみ"],"answer":"おはよう"}
,{"type":"exercise-mc","prompt":"¿Qué dice quien se queda cuando otro sale de casa?","options":["いってらっしゃい","いってきます","おかえり","ただいま"],"answer":"いってらっしゃい"}
,{"type":"exercise-mc","prompt":"¿Cómo se dice 'de nada' en japonés?","options":["どういたしまして","ありがとうございます","すみません","ごめんなさい"],"answer":"どういたしまして"}
,{"type":"exercise-mc","prompt":"¿Qué expresión usas para llamar la atención de un camarero?","options":["すみません","ごめんなさい","はじめまして","おやすみ"],"answer":"すみません"}
,{"type":"exercise-mc","prompt":"¿Cómo se dice 'buenas noches' al irse a dormir (formal)?","options":["おやすみなさい","こんばんは","さようなら","またね"],"answer":"おやすみなさい"}
,{"type":"exercise-mc","prompt":"¿Qué expresión cierra una presentación formal?","options":["よろしくおねがいします","はじめまして","ありがとう","どうぞ"],"answer":"よろしくおねがいします"}
,{"type":"exercise-mc","prompt":"¿Cómo se dice 'lo siento' de forma informal entre amigos?","options":["ごめん","ごめんなさい","すみません","しつれいします"],"answer":"ごめん"}
,{"type":"exercise-mc","prompt":"La respuesta formal a 'おげんきですか' es:","options":["おかげさまで","ありがとう","はじめまして","どういたしまして"],"answer":"おかげさまで"}
,{"type":"exercise-mc","prompt":"¿Qué dice el empleado al despedirte de una tienda?","options":["ありがとうございました","ありがとうございます","いらっしゃいませ","おかえり"],"answer":"ありがとうございました"}
,{"type":"exercise-mc","prompt":"さようなら se usa para:","options":["Despedida formal o definitiva","Despedida informal entre amigos","Saludo de mañana","Saludo de noche"],"answer":"Despedida formal o definitiva"}
,{"type":"exercise-mc","prompt":"¿Qué significa またね?","options":["Hasta luego (informal)","Adiós para siempre","Buenas noches","Me voy"],"answer":"Hasta luego (informal)"}
,{"type":"exercise-mc","prompt":"¿Cómo preguntas el nombre de alguien de forma cortés?","options":["おなまえは？","なにですか？","どこですか？","だれですか？"],"answer":"おなまえは？"}
,{"type":"exercise-mc","prompt":"¿Qué saludo usas entre las 18h y la hora de dormir?","options":["こんばんは","こんにちは","おはようございます","おやすみなさい"],"answer":"こんばんは"}
,{"type":"exercise-mc","prompt":"Para presentarse muy formalmente, se usa:","options":["～と申します","～といいます","～です","～だ"],"answer":"～と申します"}
,{"type":"exercise-mc","prompt":"¿Qué significa いらっしゃいませ?","options":["Bienvenido/a (empleado)","Encantado de conocerle","Hasta luego","De nada"],"answer":"Bienvenido/a (empleado)"}
,{"type":"exercise-mc","prompt":"¿Cuál de estas NO es una despedida?","options":["はじめまして","さようなら","またね","じゃね"],"answer":"はじめまして"}
,{"type":"exercise-tf","statement":"こんにちは se escribe con は aunque se pronuncia 'wa'.","answer":true}
,{"type":"exercise-tf","statement":"おやすみなさい es un saludo de entrada, no de despedida.","answer":false}
,{"type":"exercise-tf","statement":"ただいま lo dice quien regresa a casa.","answer":true}
,{"type":"exercise-tf","statement":"ごめんなさい y すみません significan exactamente lo mismo.","answer":false}
,{"type":"exercise-tf","statement":"はじめまして se usa solo la primera vez que conoces a alguien.","answer":true}
,{"type":"exercise-tf","statement":"ありがとうございました (pasado) lo dice el cliente al pagar.","answer":false}
,{"type":"exercise-tf","statement":"おかえりなさい lo dice quien estaba en casa al recibir al que vuelve.","answer":true}
,{"type":"exercise-tf","statement":"よろしくおねがいします puede usarse también para pedir un favor.","answer":true}
,{"type":"exercise-tf","statement":"さようなら es la despedida más informal del japonés.","answer":false}
,{"type":"exercise-gap","prompt":"___ 、田中といいます。","options":["はじめまして","こんにちは","ありがとう","さようなら"],"answer":"はじめまして","hint":"primera vez que se conocen"}
,{"type":"exercise-gap","prompt":"すみません、お水を___。","options":["ください","います","あります","できます"],"answer":"ください","hint":"pedir algo educadamente"}
,{"type":"exercise-gap","prompt":"いって___！(Que te vaya bien, al quedarse en casa)","options":["らっしゃい","きます","ただいま","おかえり"],"answer":"らっしゃい","hint":"いってらっしゃい"}
,{"type":"exercise-gap","prompt":"おはよう___。(formal)","options":["ございます","ください","います","あります"],"answer":"ございます","hint":"forma más respetuosa"}
,{"type":"exercise-gap","prompt":"___はマリアといいます。","options":["わたし","あなた","かれ","これ"],"answer":"わたし","hint":"yo"}
,{"type":"exercise-gap","prompt":"ありがとう___。(pasado, al recibir un servicio)","options":["ございました","ございます","ください","なさい"],"answer":"ございました","hint":"el empleado al despedirte"}
```

- [ ] **Commit:**

```
git add data/lessons/l03-saludos.json
git commit -m "data: ampliar pool ejercicios l03-saludos (50 total)"
```

---

### Task 12: `l04-numeros.json` — añadir 43 ejercicios (target: 50 total)

**File:** `data/lessons/l04-numeros.json`

Tema: números del 1 al 100 (ichi, ni, san, shi/yon, go, roku, nana/shichi, hachi, ku/kyuu, juu), decenas, combinaciones.

- [ ] Añadir al array 43 ejercicios sobre:
  - Lectura de números del 1 al 10 (tanto kanji como kana)
  - Decenas (20=にじゅう, 30=さんじゅう…100=ひゃく)
  - Combinaciones como 15, 27, 43, 68, 99
  - Lecturas alternativas (4=し/よん, 7=しち/なな, 9=く/きゅう)
  - Verdadero/Falso sobre reglas numéricas
  - Gaps con números en contexto (edades, precios)

  **Formato de referencia** (primeros 5 de los 43):
  ```json
  ,{"type":"exercise-mc","prompt":"¿Cómo se dice '7' en japonés?","options":["なな / しち","ろく","はち","きゅう"],"answer":"なな / しち"}
  ,{"type":"exercise-mc","prompt":"¿Cuánto es じゅうご?","options":["15","50","14","16"],"answer":"15"}
  ,{"type":"exercise-mc","prompt":"¿Cómo se escribe 47 en japonés?","options":["よんじゅうなな","しじゅうなな","よんじゅうしち","ごじゅうなな"],"answer":"よんじゅうなな"}
  ,{"type":"exercise-tf","statement":"4 solo se puede leer como 'shi' en japonés.","answer":false}
  ,{"type":"exercise-gap","prompt":"にじゅう___ = 25","options":["ご","に","さん","し"],"answer":"ご","hint":"にじゅう + 5"}
  ```
  Genera 38 ejercicios más siguiendo este patrón hasta completar los 43.

- [ ] **Commit:**

```
git add data/lessons/l04-numeros.json
git commit -m "data: ampliar pool ejercicios l04-numeros (50 total)"
```

---

### Task 13: `l05-copula.json` — añadir 43 ejercicios (target: 50 total)

**File:** `data/lessons/l05-copula.json`

Tema: です (afirmativo formal), ではありません (negativo formal), じゃありません (negativo informal), だ (plain), ですか (pregunta).

- [ ] Añadir 43 ejercicios. **Primeros 5 de referencia:**

  ```json
  ,{"type":"exercise-mc","prompt":"¿Cómo se forma la negación formal de です?","options":["ではありません","じゃない","ではない","ありません"],"answer":"ではありません"}
  ,{"type":"exercise-mc","prompt":"「これは本___。」(formal afirmativo)","options":["です","だ","ある","います"],"answer":"です"}
  ,{"type":"exercise-mc","prompt":"¿Cuál es el equivalente plain/informal de です?","options":["だ","は","が","の"],"answer":"だ"}
  ,{"type":"exercise-tf","statement":"じゃありません es más formal que ではありません.","answer":false}
  ,{"type":"exercise-gap","prompt":"これはペン___。(¿Es esto un bolígrafo?)","options":["ですか","です","だ","ません"],"answer":"ですか","hint":"pregunta formal"}
  ```
  Genera 38 más siguiendo este patrón.

- [ ] **Commit:**

```
git add data/lessons/l05-copula.json
git commit -m "data: ampliar pool ejercicios l05-copula (50 total)"
```

---

### Task 14: `l06-particulas.json` — añadir 43 ejercicios (target: 50 total)

**File:** `data/lessons/l06-particulas.json`

Tema: は (tema), が (sujeto/énfasis), を (objeto directo), に (dirección/tiempo/destino), で (lugar de acción/medio).

- [ ] Añadir 43 ejercicios. **Primeros 5 de referencia:**

  ```json
  ,{"type":"exercise-mc","prompt":"「わたし___がくせいです。」¿Qué partícula va en el espacio?","options":["は","が","を","に"],"answer":"は"}
  ,{"type":"exercise-mc","prompt":"「バス___がっこうに行きます。」¿Qué partícula indica el medio de transporte?","options":["で","に","を","が"],"answer":"で"}
  ,{"type":"exercise-mc","prompt":"「ほん___よみます。」¿Qué partícula marca el objeto directo?","options":["を","は","が","で"],"answer":"を"}
  ,{"type":"exercise-tf","statement":"La partícula に siempre indica dirección de movimiento.","answer":false}
  ,{"type":"exercise-gap","prompt":"としょかん___べんきょうします。(Estudio en la biblioteca.)","options":["で","に","を","が"],"answer":"で","hint":"lugar de la acción"}
  ```
  Genera 38 más.

- [ ] **Commit:**

```
git add data/lessons/l06-particulas.json
git commit -m "data: ampliar pool ejercicios l06-particulas (50 total)"
```

---

### Task 15: `l07-verbos-masu.json` — añadir 43 ejercicios (target: 50 total)

**File:** `data/lessons/l07-verbos-masu.json`

Tema: forma ます (presente), ません (negativo), ました (pasado), ませんでした (pasado negativo), grupos verbales godan/ichidan.

- [ ] Añadir 43 ejercicios. **Primeros 5 de referencia:**

  ```json
  ,{"type":"exercise-mc","prompt":"「たべます」en pasado negativo es:","options":["たべませんでした","たべません","たべました","たべた"],"answer":"たべませんでした"}
  ,{"type":"exercise-mc","prompt":"¿Cuál es la forma ます de 'miru' (ver)?","options":["みます","みます","みます","みます"],"answer":"みます"}
  ,{"type":"exercise-mc","prompt":"「のみません」significa:","options":["No bebo","Bebo","Bebí","No bebí"],"answer":"No bebo"}
  ,{"type":"exercise-tf","statement":"Los verbos ichidan terminan en -iru o -eru y se conjugan añadiendo ます directamente al stem.","answer":true}
  ,{"type":"exercise-gap","prompt":"まいにちコーヒーを___。(Bebo café todos los días.)","options":["のみます","のみません","のみました","のみます"],"answer":"のみます","hint":"presente afirmativo"}
  ```
  Genera 38 más.

- [ ] **Commit:**

```
git add data/lessons/l07-verbos-masu.json
git commit -m "data: ampliar pool ejercicios l07-verbos-masu (50 total)"
```

---

### Task 16: `l08-adjetivos.json` — añadir 43 ejercicios (target: 50 total)

**File:** `data/lessons/l08-adjetivos.json`

Tema: adjetivos い (たかい, おおきい…) y な (きれいな, しずかな…), negativo, pasado, modificar sustantivos.

- [ ] Añadir 43 ejercicios. **Primeros 5 de referencia:**

  ```json
  ,{"type":"exercise-mc","prompt":"El negativo de たかい (caro) es:","options":["たかくない","たかじゃない","たかくありません","たかない"],"answer":"たかくない"}
  ,{"type":"exercise-mc","prompt":"¿Cómo modifica きれいな a un sustantivo?","options":["きれいなへや","きれいへや","きれいいへや","きれいのへや"],"answer":"きれいなへや"}
  ,{"type":"exercise-mc","prompt":"El pasado de おおきい es:","options":["おおきかった","おおきった","おおきだった","おおきくた"],"answer":"おおきかった"}
  ,{"type":"exercise-tf","statement":"Los adjetivos な pierden la な cuando modifican a un sustantivo.","answer":false}
  ,{"type":"exercise-gap","prompt":"このへやは___です。(Esta habitación es tranquila.)","options":["しずか","しずかな","しずかい","しずく"],"answer":"しずか","hint":"adjetivo な predicativo"}
  ```
  Genera 38 más.

- [ ] **Commit:**

```
git add data/lessons/l08-adjetivos.json
git commit -m "data: ampliar pool ejercicios l08-adjetivos (50 total)"
```

---

### Task 17: `l09-demostrativos.json` — añadir 43 ejercicios (target: 50 total)

**File:** `data/lessons/l09-demostrativos.json`

Tema: この/その/あの/どの (modificadores), これ/それ/あれ/どれ (pronombres), ここ/そこ/あそこ/どこ (lugares), の (posesivo).

- [ ] Añadir 43 ejercicios. **Primeros 5 de referencia:**

  ```json
  ,{"type":"exercise-mc","prompt":"「___はわたしのかばんです。」(Este es mi bolso — el objeto está cerca del hablante)","options":["これ","それ","あれ","どれ"],"answer":"これ"}
  ,{"type":"exercise-mc","prompt":"¿Cuál se usa para preguntar 'cuál (de varios)'?","options":["どれ","どこ","どの","どう"],"answer":"どれ"}
  ,{"type":"exercise-mc","prompt":"「___ほんはだれのですか。」(¿De quién es ese libro — cerca del oyente?)","options":["その","この","あの","どの"],"answer":"その"}
  ,{"type":"exercise-tf","statement":"この、その、あの y どの siempre van seguidos de un sustantivo.","answer":true}
  ,{"type":"exercise-gap","prompt":"トイレは___ですか？(¿Dónde está el baño?)","options":["どこ","どれ","どの","どう"],"answer":"どこ","hint":"pregunta por lugar"}
  ```
  Genera 38 más.

- [ ] **Commit:**

```
git add data/lessons/l09-demostrativos.json
git commit -m "data: ampliar pool ejercicios l09-demostrativos (50 total)"
```

---

### Task 18: `l10-existencia.json` — añadir 43 ejercicios (target: 50 total)

**File:** `data/lessons/l10-existencia.json`

Tema: あります (cosas inanimadas), います (seres animados), posición (うえ/した/まえ/うしろ/となり/なか).

- [ ] Añadir 43 ejercicios. **Primeros 5 de referencia:**

  ```json
  ,{"type":"exercise-mc","prompt":"「ねこが___。」(Hay un gato.)","options":["います","あります","です","する"],"answer":"います"}
  ,{"type":"exercise-mc","prompt":"「つくえのうえに本が___。」(Hay un libro sobre la mesa.)","options":["あります","います","です","ある"],"answer":"あります"}
  ,{"type":"exercise-mc","prompt":"¿Cuál se usa para decir que hay una persona?","options":["います","あります","です","ある"],"answer":"います"}
  ,{"type":"exercise-tf","statement":"あります se usa para objetos inanimados e います para personas y animales.","answer":true}
  ,{"type":"exercise-gap","prompt":"えきの___にコンビニがあります。(Hay un conbini delante de la estación.)","options":["まえ","うしろ","うえ","した"],"answer":"まえ","hint":"delante de"}
  ```
  Genera 38 más.

- [ ] **Commit:**

```
git add data/lessons/l10-existencia.json
git commit -m "data: ampliar pool ejercicios l10-existencia (50 total)"
```

---

### Task 19: `l11-forma-te.json` — añadir 43 ejercicios (target: 50 total)

**File:** `data/lessons/l11-forma-te.json`

Tema: formación de la forma て por grupo verbal, ~てください, ~ている (acción en progreso), enlazar acciones.

- [ ] Añadir 43 ejercicios. **Primeros 5 de referencia:**

  ```json
  ,{"type":"exercise-mc","prompt":"La forma て de たべる es:","options":["たべて","たべって","たべ","たべた"],"answer":"たべて"}
  ,{"type":"exercise-mc","prompt":"La forma て de のむ es:","options":["のんで","のみて","のんて","のんだ"],"answer":"のんで"}
  ,{"type":"exercise-mc","prompt":"「まどをあけて___。」(Por favor, abre la ventana.)","options":["ください","います","あります","みます"],"answer":"ください"}
  ,{"type":"exercise-tf","statement":"~ている siempre indica una acción en progreso en este momento.","answer":false}
  ,{"type":"exercise-gap","prompt":"いまなに___いますか？(¿Qué estás haciendo ahora?)","options":["をして","がして","にして","でして"],"answer":"をして","hint":"~をしている"}
  ```
  Genera 38 más.

- [ ] **Commit:**

```
git add data/lessons/l11-forma-te.json
git commit -m "data: ampliar pool ejercicios l11-forma-te (50 total)"
```

---

### Task 20: `l12-deseos-negacion.json` — añadir 44 ejercicios (target: 50 total)

**File:** `data/lessons/l12-deseos-negacion.json`

Tema: ~たい (querer hacer), ~ない (negativo plain), ~ましょう (propuesta), ~ましょうか (oferta/sugerencia).

- [ ] Añadir 44 ejercicios. **Primeros 5 de referencia:**

  ```json
  ,{"type":"exercise-mc","prompt":"「すしを___。」(Quiero comer sushi.)","options":["たべたいです","たべています","たべました","たべません"],"answer":"たべたいです"}
  ,{"type":"exercise-mc","prompt":"La forma ない de のむ es:","options":["のまない","のみない","のんない","のむない"],"answer":"のまない"}
  ,{"type":"exercise-mc","prompt":"「いっしょに___か。」(¿Vamos juntos?)","options":["いきましょう","いきます","いきました","いきたい"],"answer":"いきましょう"}
  ,{"type":"exercise-tf","statement":"~たい solo se puede usar para hablar de los propios deseos, no de los de otros.","answer":true}
  ,{"type":"exercise-gap","prompt":"きょうはべんきょうし___。(Hoy no estudio — plain negativo)","options":["ない","ません","なかった","ないです"],"answer":"ない","hint":"forma plain negativa"}
  ```
  Genera 39 más.

- [ ] **Commit:**

```
git add data/lessons/l12-deseos-negacion.json
git commit -m "data: ampliar pool ejercicios l12-deseos-negacion (50 total)"
```

---

### Task 21: `l13-particulas-extra.json` — añadir 43 ejercicios (target: 50 total)

**File:** `data/lessons/l13-particulas-extra.json`

Tema: も (también/tampoco), と (y/con), から (desde/porque), まで (hasta), へ (dirección), で (medio/causa en contexto).

- [ ] Añadir 43 ejercicios. **Primeros 5 de referencia:**

  ```json
  ,{"type":"exercise-mc","prompt":"「わたし___いきます。」(Yo también voy.)","options":["も","と","から","まで"],"answer":"も"}
  ,{"type":"exercise-mc","prompt":"「とうきょう___おおさかまで」(De Tokio a Osaka) — ¿qué partícula va en el espacio?","options":["から","まで","へ","で"],"answer":"から"}
  ,{"type":"exercise-mc","prompt":"「でんしゃ___きました。」(Vine en tren.)","options":["で","に","を","が"],"answer":"で"}
  ,{"type":"exercise-tf","statement":"へ y に son completamente intercambiables al indicar destino.","answer":false}
  ,{"type":"exercise-gap","prompt":"くじ___ごじまで。(De las 9 a las 5.)","options":["から","まで","に","で"],"answer":"から","hint":"punto de inicio"}
  ```
  Genera 38 más.

- [ ] **Commit:**

```
git add data/lessons/l13-particulas-extra.json
git commit -m "data: ampliar pool ejercicios l13-particulas-extra (50 total)"
```

---

### Task 22: `l14-interrogativos.json` — añadir 43 ejercicios (target: 50 total)

**File:** `data/lessons/l14-interrogativos.json`

Tema: 何 (なに/なん), 誰 (だれ), どこ, いつ, いくら, いくつ, どう, どうして, なぜ.

- [ ] Añadir 43 ejercicios. **Primeros 5 de referencia:**

  ```json
  ,{"type":"exercise-mc","prompt":"¿Qué interrogativo se usa para preguntar el precio?","options":["いくら","いくつ","なに","どこ"],"answer":"いくら"}
  ,{"type":"exercise-mc","prompt":"「___ですか？」(¿Quién es?)","options":["だれ","どこ","いつ","なに"],"answer":"だれ"}
  ,{"type":"exercise-mc","prompt":"「いつ」pregunta por:","options":["tiempo","lugar","persona","precio"],"answer":"tiempo"}
  ,{"type":"exercise-tf","statement":"なに y なん son siempre intercambiables.","answer":false}
  ,{"type":"exercise-gap","prompt":"これは___ですか？(¿Qué es esto?)","options":["なに","だれ","どこ","いつ"],"answer":"なに","hint":"pregunta por objeto"}
  ```
  Genera 38 más.

- [ ] **Commit:**

```
git add data/lessons/l14-interrogativos.json
git commit -m "data: ampliar pool ejercicios l14-interrogativos (50 total)"
```

---

### Task 23: `l15-contadores.json` — añadir 43 ejercicios (target: 50 total)

**File:** `data/lessons/l15-contadores.json`

Tema: ~つ (cosas genéricas 1-9), ~人 (ひとり/ふたり/…にん), ~枚 (まい, cosas planas), ~本 (ほん, objetos largos), ~冊 (さつ, libros), ~台 (だい, máquinas), ~匹 (ひき, animales pequeños).

- [ ] Añadir 43 ejercicios. **Primeros 5 de referencia:**

  ```json
  ,{"type":"exercise-mc","prompt":"¿Cómo se dice '2 personas'?","options":["ふたり","にほん","にまい","につ"],"answer":"ふたり"}
  ,{"type":"exercise-mc","prompt":"¿Qué contador se usa para libros?","options":["さつ","まい","ほん","だい"],"answer":"さつ"}
  ,{"type":"exercise-mc","prompt":"'3 bolígrafos' en japonés es:","options":["さんぼん","さんまい","さんこ","みっつ"],"answer":"さんぼん"}
  ,{"type":"exercise-tf","statement":"~つ puede usarse para contar prácticamente cualquier objeto cuando no se sabe el contador específico.","answer":true}
  ,{"type":"exercise-gap","prompt":"りんごを___ください。(3 manzanas, por favor — contador genérico)","options":["みっつ","さんまい","さんほん","さんだい"],"answer":"みっつ","hint":"~つ genérico para objetos"}
  ```
  Genera 38 más.

- [ ] **Commit:**

```
git add data/lessons/l15-contadores.json
git commit -m "data: ampliar pool ejercicios l15-contadores (50 total)"
```

---

### Task 24: `l16-kanji.json` — añadir 43 ejercicios (target: 50 total)

**File:** `data/lessons/l16-kanji.json`

Tema: kanji N5 básicos (日・月・山・川・人・口・手・目・耳・火・水・木・金・土・大・小・中・上・下・本), lecturas on/kun, significados.

- [ ] Añadir 43 ejercicios. **Primeros 5 de referencia:**

  ```json
  ,{"type":"exercise-mc","prompt":"¿Cuál es la lectura kun de 山?","options":["やま","さん","うみ","かわ"],"answer":"やま"}
  ,{"type":"exercise-mc","prompt":"¿Qué kanji significa 'agua'?","options":["水","火","木","土"],"answer":"水"}
  ,{"type":"exercise-mc","prompt":"¿Cuál es la lectura on de 日 (sol/día)?","options":["にち / じつ","ひ","つき","ほし"],"answer":"にち / じつ"}
  ,{"type":"exercise-tf","statement":"本 significa 'libro' y también se usa como contador de objetos largos.","answer":true}
  ,{"type":"exercise-gap","prompt":"___ようびはmonday. (lunes)","options":["月","日","火","水"],"answer":"月","hint":"月 = luna = lunes"}
  ```
  Genera 38 más.

- [ ] **Commit:**

```
git add data/lessons/l16-kanji.json
git commit -m "data: ampliar pool ejercicios l16-kanji (50 total)"
```

---

## Commit final y verificación global

- [ ] **Verificar el conjunto completo:**
  1. Abrir `http://localhost:8765`
  2. Ir a cualquier modo de práctica → completar sesión → "Otra ronda": confirmar ítems distintos
  3. Ir a cada lección: recargar varias veces y comprobar que los ejercicios cambian
  4. Comprobar que el número de ejercicios mostrado coincide con `exerciseCount` del `index.json`

- [ ] **Tag del commit final:**

```
git tag aleatoriedad-ejercicios
git push origin main --tags
```
