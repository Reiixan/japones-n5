# Fase 0 — Quick Wins (TTS + Vocab Reverso) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Añadir audio TTS (Web Speech API) a todos los bloques con texto japonés y un nuevo modo reverso ES→JP en el bloque Vocabulario.

**Architecture:** Nuevo módulo `js/tts.js` que envuelve `window.speechSynthesis` con selección de voz `ja-JP`, manejo de carga async (`voiceschanged`) y un helper para renderizar botones 🔊. Cada bloque existente añade un botón 🔊 en su `renderPrompt`. El bloque Vocabulario pasa a tener un submenú de modo (JP→ES / ES→JP) con SRS compartido por palabra. Se añade un toggle "auto-pronunciar" en la pantalla de Stats que dispara TTS automáticamente al mostrar el prompt.

**Tech Stack:** Vanilla JS (ES modules nativos), HTML, CSS. Sin build. Sin dependencias externas. Tests con runner vanilla casero (HTML que importa módulos y muestra asserts en DOM).

**Spec de referencia:** `docs/superpowers/specs/2026-05-16-mejoras-n5-design.md` (sección "Fase 0 — Quick wins").

---

## Mapa de archivos

**Crear:**
- `js/tts.js` — wrapper de `speechSynthesis` + helper `renderSpeakButton`
- `test/index.html` — test runner HTML que carga los `.test.js`
- `test/runner.js` — helpers `describe`/`it`/`assert` + render de resultados
- `test/tts.test.js` — tests unitarios de `tts.js`

**Modificar:**
- `js/kana/kana-typing.js` — añadir botón 🔊 al prompt (lee `item.kana`)
- `js/kana/kana-choice.js` — añadir botón 🔊 al prompt (lee `item.kana`)
- `js/vocab.js` — submenú modo + dos modos (JP→ES con TTS, ES→JP sin TTS)
- `js/kanji.js` — añadir botón 🔊 al prompt (lee `item.example_reading`)
- `js/grammar.js` — botón 🔊 por cada ejemplo (lee `example.jp`)
- `js/particles.js` — añadir botón 🔊 al prompt (lee la oración con la partícula correcta intercalada)
- `js/stats.js` — añadir toggle "auto-pronunciar al mostrar prompt"
- `js/app.js` — routing de `/vocab`, `/vocab/jp-es`, `/vocab/es-jp`
- `css/exercise.css` — estilos `.btn-tts`, `.tts-banner`

**Sin cambios:**
- `js/kana/kana-reverse.js` (el prompt es romaji, no JP)
- `js/exercise.js` (el TTS se invoca desde cada `renderPrompt`, no centralizado)
- `js/srs.js`, `js/storage.js`, `js/home.js`
- Todos los `data/*.json`

---

## Task 1: Infraestructura de tests vanilla

**Files:**
- Create: `test/index.html`
- Create: `test/runner.js`

- [ ] **Step 1: Crear `test/runner.js` con API mínima de tests**

```js
// test/runner.js
const suites = [];
let currentSuite = null;

export function describe(name, fn) {
  currentSuite = { name, tests: [] };
  suites.push(currentSuite);
  fn();
  currentSuite = null;
}

export function it(name, fn) {
  if (!currentSuite) throw new Error('it() outside describe()');
  currentSuite.tests.push({ name, fn });
}

export function assert(cond, message = 'assertion failed') {
  if (!cond) throw new Error(message);
}

export function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(message || `expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

export async function run() {
  const root = document.getElementById('results');
  let pass = 0, fail = 0;
  for (const suite of suites) {
    const s = document.createElement('section');
    s.innerHTML = `<h2>${suite.name}</h2>`;
    for (const t of suite.tests) {
      const line = document.createElement('div');
      try {
        await t.fn();
        line.textContent = `  ✓ ${t.name}`;
        line.style.color = 'green';
        pass++;
      } catch (e) {
        line.innerHTML = `  ✗ ${t.name} — <strong>${e.message}</strong>`;
        line.style.color = 'red';
        fail++;
      }
      s.appendChild(line);
    }
    root.appendChild(s);
  }
  const summary = document.createElement('h3');
  summary.textContent = `${pass} passed, ${fail} failed`;
  summary.style.color = fail === 0 ? 'green' : 'red';
  root.prepend(summary);
}
```

- [ ] **Step 2: Crear `test/index.html` que carga el runner y los test files**

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Tests japones-n5</title>
  <style>
    body { font-family: monospace; padding: 1rem; }
    section { margin-bottom: 1rem; }
    h2 { font-size: 1rem; margin: 0.5rem 0; }
    div { white-space: pre; }
  </style>
</head>
<body>
  <h1>Tests japones-n5</h1>
  <div id="results"></div>
  <script type="module">
    import { run } from './runner.js';
    await import('./tts.test.js');
    run();
  </script>
</body>
</html>
```

- [ ] **Step 3: Verificar que el runner muestra "0 passed, 0 failed" sin crashear**

Arranca un servidor desde la raíz del proyecto:

```bash
cd /home/hugo/japones-n5 && python3 -m http.server 8765
```

Abre `http://localhost:8765/test/index.html`. Como `tts.test.js` no existe aún, **espera ver un error en consola** del navegador (404 sobre `tts.test.js`). Esto es esperado — el siguiente task crea el archivo.

- [ ] **Step 4: Commit**

```bash
git -C /home/hugo/japones-n5 add test/runner.js test/index.html
git -C /home/hugo/japones-n5 commit -m "test: añadir runner de tests vanilla"
```

---

## Task 2: `tts.js` — API base con selección de voz

**Files:**
- Create: `js/tts.js`
- Create: `test/tts.test.js`

- [ ] **Step 1: Escribir `test/tts.test.js` con tests del API base**

```js
// test/tts.test.js
import { describe, it, assert, assertEqual } from './runner.js';

// Mock helper: instala un speechSynthesis falso en window
function installMockSynthesis({ voices = [], firingVoicesChanged = false } = {}) {
  const utterances = [];
  let handler = null;
  window.speechSynthesis = {
    getVoices: () => voices,
    speak: u => utterances.push(u),
    cancel: () => {},
    addEventListener(event, cb) { if (event === 'voiceschanged') handler = cb; },
    removeEventListener() { handler = null; },
    _fireVoicesChanged() { if (handler) handler(); },
    _utterances: utterances,
  };
  window.SpeechSynthesisUtterance = class { constructor(text) { this.text = text; } };
  if (firingVoicesChanged) queueMicrotask(() => window.speechSynthesis._fireVoicesChanged());
}

function uninstallMockSynthesis() {
  delete window.speechSynthesis;
  delete window.SpeechSynthesisUtterance;
}

describe('tts.isAvailable', () => {
  it('devuelve false si no hay voces ja-JP', async () => {
    installMockSynthesis({ voices: [{ lang: 'en-US', name: 'Alex' }] });
    const { isAvailable, _resetForTests } = await import('../js/tts.js?cache=t2a');
    _resetForTests();
    assertEqual(isAvailable(), false);
    uninstallMockSynthesis();
  });

  it('devuelve true si hay al menos una voz ja-JP', async () => {
    installMockSynthesis({ voices: [{ lang: 'ja-JP', name: 'Kyoko' }] });
    const { isAvailable, _resetForTests } = await import('../js/tts.js?cache=t2b');
    _resetForTests();
    assertEqual(isAvailable(), true);
    uninstallMockSynthesis();
  });
});

describe('tts.speak', () => {
  it('llama a speechSynthesis.speak con la voz ja-JP seleccionada', async () => {
    const kyoko = { lang: 'ja-JP', name: 'Kyoko' };
    installMockSynthesis({ voices: [{ lang: 'en-US', name: 'Alex' }, kyoko] });
    const { speak, _resetForTests } = await import('../js/tts.js?cache=t2c');
    _resetForTests();
    speak('こんにちは');
    const u = window.speechSynthesis._utterances[0];
    assert(u, 'no se enviaron utterances');
    assertEqual(u.text, 'こんにちは');
    assertEqual(u.voice, kyoko);
    assertEqual(u.lang, 'ja-JP');
    uninstallMockSynthesis();
  });

  it('prefiere "Google 日本語" sobre otras ja-JP', async () => {
    const google = { lang: 'ja-JP', name: 'Google 日本語' };
    const kyoko = { lang: 'ja-JP', name: 'Kyoko' };
    installMockSynthesis({ voices: [kyoko, google] });
    const { speak, _resetForTests } = await import('../js/tts.js?cache=t2d');
    _resetForTests();
    speak('テスト');
    const u = window.speechSynthesis._utterances[0];
    assertEqual(u.voice, google);
    uninstallMockSynthesis();
  });

  it('no llama a speak si no hay voz ja-JP', async () => {
    installMockSynthesis({ voices: [{ lang: 'en-US', name: 'Alex' }] });
    const { speak, _resetForTests } = await import('../js/tts.js?cache=t2e');
    _resetForTests();
    speak('テスト');
    assertEqual(window.speechSynthesis._utterances.length, 0);
    uninstallMockSynthesis();
  });
});
```

> **Nota sobre el `?cache=...`:** los ES modules nativos en navegador cachean por URL. Como las pruebas instalan un mock distinto antes de cada `import` dinámico, añadimos un query string para forzar un módulo "fresco" en cada test. El módulo `tts.js` expone también `_resetForTests` que limpia su estado interno por si el navegador termina reusando un cache.

- [ ] **Step 2: Actualizar `test/index.html` para que importe `tts.test.js`**

Ya está importado en la versión escrita en Task 1 (`await import('./tts.test.js')`). Verificar.

- [ ] **Step 3: Ejecutar los tests y comprobar que fallan**

Recarga `http://localhost:8765/test/index.html`. Esperado: error 404 al importar `../js/tts.js` (aún no existe), los 4 tests aparecen en rojo con mensaje sobre módulo no encontrado.

- [ ] **Step 4: Crear `js/tts.js` con el API mínimo para que pasen los tests**

```js
// js/tts.js
let cachedVoice = null;
let resolved = false;

const PREFERRED_NAMES = ['Google 日本語', 'Kyoko', 'Otoya', 'Hattori'];

function pickVoice() {
  const synth = window.speechSynthesis;
  if (!synth) return null;
  const voices = synth.getVoices().filter(v => v.lang === 'ja-JP' || v.lang === 'ja_JP');
  if (voices.length === 0) return null;
  for (const name of PREFERRED_NAMES) {
    const match = voices.find(v => v.name.includes(name));
    if (match) return match;
  }
  return voices[0];
}

function resolveVoice() {
  if (resolved) return;
  cachedVoice = pickVoice();
  resolved = !!cachedVoice;
}

export function isAvailable() {
  resolveVoice();
  return !!cachedVoice;
}

export function speak(text) {
  if (!text) return;
  resolveVoice();
  if (!cachedVoice) return;
  const u = new window.SpeechSynthesisUtterance(text);
  u.voice = cachedVoice;
  u.lang = 'ja-JP';
  u.rate = 0.95;
  window.speechSynthesis.speak(u);
}

export function _resetForTests() {
  cachedVoice = null;
  resolved = false;
}
```

- [ ] **Step 5: Recargar `test/index.html` y verificar que pasan los 4 tests**

Esperado: "4 passed, 0 failed" en verde.

- [ ] **Step 6: Commit**

```bash
git -C /home/hugo/japones-n5 add js/tts.js test/tts.test.js
git -C /home/hugo/japones-n5 commit -m "feat: tts.js — wrapper de speechSynthesis con selección de voz ja-JP"
```

---

## Task 3: Manejar carga async de voces (`voiceschanged`)

**Files:**
- Modify: `js/tts.js`
- Modify: `test/tts.test.js`

- [ ] **Step 1: Añadir test para el caso "voces vacías al inicio, luego se cargan"**

Pega al final de `test/tts.test.js`:

```js
describe('tts — voiceschanged async', () => {
  it('detecta voces tras el evento voiceschanged', async () => {
    let voices = [];
    let handler = null;
    window.speechSynthesis = {
      getVoices: () => voices,
      speak: () => {},
      addEventListener(e, cb) { if (e === 'voiceschanged') handler = cb; },
      removeEventListener() { handler = null; },
    };
    window.SpeechSynthesisUtterance = class { constructor(t) { this.text = t; } };

    const { isAvailable, onReady, _resetForTests } = await import('../js/tts.js?cache=t3a');
    _resetForTests();

    assertEqual(isAvailable(), false, 'al inicio no debe haber voz');

    // Simular carga async de voces
    voices = [{ lang: 'ja-JP', name: 'Kyoko' }];
    handler();  // dispara voiceschanged

    await new Promise(r => setTimeout(r, 0));
    assertEqual(isAvailable(), true, 'tras voiceschanged la voz debe estar disponible');

    delete window.speechSynthesis;
    delete window.SpeechSynthesisUtterance;
  });

  it('onReady resuelve cuando hay voz disponible inmediatamente', async () => {
    window.speechSynthesis = {
      getVoices: () => [{ lang: 'ja-JP', name: 'Kyoko' }],
      speak: () => {},
      addEventListener() {},
      removeEventListener() {},
    };
    window.SpeechSynthesisUtterance = class { constructor(t) { this.text = t; } };

    const { onReady, _resetForTests } = await import('../js/tts.js?cache=t3b');
    _resetForTests();

    const ready = await onReady();
    assertEqual(ready, true);

    delete window.speechSynthesis;
    delete window.SpeechSynthesisUtterance;
  });

  it('onReady resuelve a false tras timeout si nunca hay voz', async () => {
    window.speechSynthesis = {
      getVoices: () => [],
      speak: () => {},
      addEventListener() {},
      removeEventListener() {},
    };
    window.SpeechSynthesisUtterance = class { constructor(t) { this.text = t; } };

    const { onReady, _resetForTests } = await import('../js/tts.js?cache=t3c');
    _resetForTests();

    const ready = await onReady(50);  // timeout de 50ms
    assertEqual(ready, false);

    delete window.speechSynthesis;
    delete window.SpeechSynthesisUtterance;
  });
});
```

- [ ] **Step 2: Ejecutar tests, verificar que los 3 nuevos fallan**

Recarga `test/index.html`. Esperado: 4 verdes (los anteriores) + 3 rojos (los nuevos), con error sobre `onReady is not a function`.

- [ ] **Step 3: Implementar `onReady` y el listener `voiceschanged` en `js/tts.js`**

Reemplaza `js/tts.js` por:

```js
// js/tts.js
let cachedVoice = null;
let resolved = false;
let listenerAttached = false;

const PREFERRED_NAMES = ['Google 日本語', 'Kyoko', 'Otoya', 'Hattori'];

function pickVoice() {
  const synth = window.speechSynthesis;
  if (!synth) return null;
  const voices = synth.getVoices().filter(v => v.lang === 'ja-JP' || v.lang === 'ja_JP');
  if (voices.length === 0) return null;
  for (const name of PREFERRED_NAMES) {
    const match = voices.find(v => v.name.includes(name));
    if (match) return match;
  }
  return voices[0];
}

function attachListener() {
  if (listenerAttached) return;
  const synth = window.speechSynthesis;
  if (!synth || !synth.addEventListener) return;
  synth.addEventListener('voiceschanged', () => {
    cachedVoice = pickVoice();
    resolved = !!cachedVoice;
  });
  listenerAttached = true;
}

function resolveVoice() {
  if (resolved) return;
  cachedVoice = pickVoice();
  resolved = !!cachedVoice;
  if (!resolved) attachListener();
}

export function isAvailable() {
  resolveVoice();
  return !!cachedVoice;
}

export function speak(text) {
  if (!text) return;
  resolveVoice();
  if (!cachedVoice) return;
  const u = new window.SpeechSynthesisUtterance(text);
  u.voice = cachedVoice;
  u.lang = 'ja-JP';
  u.rate = 0.95;
  window.speechSynthesis.speak(u);
}

export function onReady(timeoutMs = 2000) {
  resolveVoice();
  if (resolved) return Promise.resolve(true);
  return new Promise(resolve => {
    const start = Date.now();
    const tick = () => {
      cachedVoice = pickVoice();
      resolved = !!cachedVoice;
      if (resolved) return resolve(true);
      if (Date.now() - start >= timeoutMs) return resolve(false);
      setTimeout(tick, 50);
    };
    tick();
  });
}

export function _resetForTests() {
  cachedVoice = null;
  resolved = false;
  listenerAttached = false;
}
```

- [ ] **Step 4: Ejecutar tests y verificar que pasan los 7 (4 + 3 nuevos)**

Recarga `test/index.html`. Esperado: "7 passed, 0 failed".

- [ ] **Step 5: Commit**

```bash
git -C /home/hugo/japones-n5 add js/tts.js test/tts.test.js
git -C /home/hugo/japones-n5 commit -m "feat: tts — manejar voiceschanged async y exponer onReady"
```

---

## Task 4: Helper `renderSpeakButton` + flag de auto-pronunciar

**Files:**
- Modify: `js/tts.js`
- Modify: `test/tts.test.js`

- [ ] **Step 1: Añadir tests para el helper de botón y el flag auto**

Pega al final de `test/tts.test.js`:

```js
describe('tts.renderSpeakButton', () => {
  it('devuelve HTML de un botón con data-tts-text escapado', async () => {
    const { renderSpeakButton } = await import('../js/tts.js?cache=t4a');
    const html = renderSpeakButton('こんにちは');
    assert(html.includes('class="btn-tts"'), 'falta class btn-tts');
    assert(html.includes('data-tts-text="こんにちは"'), 'falta data-tts-text');
    assert(html.includes('🔊'), 'falta icono 🔊');
  });

  it('escapa comillas dobles en el texto', async () => {
    const { renderSpeakButton } = await import('../js/tts.js?cache=t4b');
    const html = renderSpeakButton('a "b" c');
    assert(html.includes('data-tts-text="a &quot;b&quot; c"'), 'comillas no escapadas: ' + html);
  });
});

describe('tts auto flag', () => {
  it('isAutoOn devuelve false por defecto', async () => {
    localStorage.removeItem('jp_n5_tts_auto');
    const { isAutoOn } = await import('../js/tts.js?cache=t4c');
    assertEqual(isAutoOn(), false);
  });

  it('isAutoOn devuelve true cuando localStorage tiene "1"', async () => {
    localStorage.setItem('jp_n5_tts_auto', '1');
    const { isAutoOn } = await import('../js/tts.js?cache=t4d');
    assertEqual(isAutoOn(), true);
    localStorage.removeItem('jp_n5_tts_auto');
  });

  it('setAutoOn(true) escribe "1" en localStorage', async () => {
    localStorage.removeItem('jp_n5_tts_auto');
    const { setAutoOn } = await import('../js/tts.js?cache=t4e');
    setAutoOn(true);
    assertEqual(localStorage.getItem('jp_n5_tts_auto'), '1');
    localStorage.removeItem('jp_n5_tts_auto');
  });

  it('setAutoOn(false) borra la clave', async () => {
    localStorage.setItem('jp_n5_tts_auto', '1');
    const { setAutoOn } = await import('../js/tts.js?cache=t4f');
    setAutoOn(false);
    assertEqual(localStorage.getItem('jp_n5_tts_auto'), null);
  });
});
```

- [ ] **Step 2: Ejecutar y verificar que fallan los 6 nuevos**

Recarga `test/index.html`. Esperado: 7 verdes + 6 rojos (con errores sobre `renderSpeakButton/isAutoOn/setAutoOn is not a function`).

- [ ] **Step 3: Añadir `renderSpeakButton`, `isAutoOn`, `setAutoOn`, `attachSpeakHandler` a `js/tts.js`**

Añade al final de `js/tts.js`:

```js
function escapeAttr(s) {
  return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function renderSpeakButton(text) {
  return `<button type="button" class="btn-tts" data-tts-text="${escapeAttr(text)}" aria-label="Pronunciar" title="Pronunciar">🔊</button>`;
}

// Adjunta un único delegated listener al elemento `root` (idempotente — usa flag en el propio elemento).
// Cualquier clic en un .btn-tts dentro de root llama speak() con su data-tts-text.
export function attachSpeakHandler(root) {
  if (!root || root.__ttsHandlerAttached) return;
  root.addEventListener('click', e => {
    const btn = e.target.closest('.btn-tts');
    if (!btn) return;
    e.preventDefault();
    e.stopPropagation();
    speak(btn.dataset.ttsText);
  });
  root.__ttsHandlerAttached = true;
}

const AUTO_KEY = 'jp_n5_tts_auto';

export function isAutoOn() {
  return localStorage.getItem(AUTO_KEY) === '1';
}

export function setAutoOn(on) {
  if (on) localStorage.setItem(AUTO_KEY, '1');
  else localStorage.removeItem(AUTO_KEY);
}
```

- [ ] **Step 4: Ejecutar tests y verificar que pasan los 13 (7 + 6 nuevos)**

Recarga `test/index.html`. Esperado: "13 passed, 0 failed".

- [ ] **Step 5: Commit**

```bash
git -C /home/hugo/japones-n5 add js/tts.js test/tts.test.js
git -C /home/hugo/japones-n5 commit -m "feat: tts — renderSpeakButton, attachSpeakHandler y flag auto-pronunciar"
```

---

## Task 5: Estilos CSS del botón 🔊 y banner sin voz

**Files:**
- Modify: `css/exercise.css`

- [ ] **Step 1: Leer el final actual de `css/exercise.css` para añadir al final sin duplicar reglas**

Lee el archivo entero y localiza la última línea para añadir tras ella. Si ya existe alguna regla `.btn-tts` (no debería), edítala en lugar de duplicar.

- [ ] **Step 2: Añadir al final de `css/exercise.css`:**

```css
/* === TTS button === */
.btn-tts {
  background: none;
  border: 1.5px solid var(--c-border, #ddd);
  border-radius: 999px;
  width: 36px;
  height: 36px;
  font-size: 1rem;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  margin-left: 0.5rem;
  transition: background-color 0.15s, transform 0.1s;
  vertical-align: middle;
}
.btn-tts:hover { background: var(--c-hover, #f0f0f0); }
.btn-tts:active { transform: scale(0.92); }
.btn-tts[disabled], .btn-tts.disabled { opacity: 0.35; cursor: not-allowed; }

/* Inline pequeño dentro de listas largas (gramática, partículas) */
.btn-tts-sm {
  width: 26px;
  height: 26px;
  font-size: 0.85rem;
  margin-left: 0.35rem;
}

/* Banner cuando no hay voz ja-JP disponible */
.tts-banner {
  background: var(--c-warning-bg, #fff5e0);
  color: var(--c-warning-fg, #6b4a00);
  border: 1px solid var(--c-warning-border, #e0c070);
  border-radius: 8px;
  padding: 0.75rem 1rem;
  margin: 0.5rem 0;
  font-size: 0.9rem;
  display: flex;
  align-items: center;
  gap: 0.75rem;
}
.tts-banner button {
  margin-left: auto;
  background: none;
  border: none;
  cursor: pointer;
  font-size: 1.1rem;
  padding: 0 0.25rem;
}
```

- [ ] **Step 3: Verificar manualmente que los estilos no rompen nada**

Arranca el servidor (si no lo está):

```bash
cd /home/hugo/japones-n5 && python3 -m http.server 8765
```

Abre `http://localhost:8765/`. Esperado: la home se ve exactamente igual que antes. Entra en cualquier bloque (p.ej. Hiragana → Opción Múltiple) y haz una pregunta — todo debe verse como antes (aún no hay botón 🔊 visible, solo añadimos estilos).

- [ ] **Step 4: Commit**

```bash
git -C /home/hugo/japones-n5 add css/exercise.css
git -C /home/hugo/japones-n5 commit -m "style: estilos para botón TTS y banner de aviso"
```

---

## Task 6: Botón 🔊 en kana typing y choice

**Files:**
- Modify: `js/kana/kana-typing.js`
- Modify: `js/kana/kana-choice.js`

> **Nota:** `kana-reverse.js` NO se toca — el prompt en ese modo es romaji, no japonés.

- [ ] **Step 1: Modificar `js/kana/kana-typing.js`**

Cambia el import de la línea 1 para añadir `tts.js`:

```js
import { startExercise, showSessionConfig } from '../exercise.js';
import { selectSession } from '../srs.js';
import { renderSpeakButton, attachSpeakHandler, isAutoOn, speak } from '../tts.js';
```

Reemplaza la función `renderPrompt` (líneas 31-33) por:

```js
    renderPrompt(item, el) {
      el.innerHTML = `<div class="kana-display">${item.kana}</div>${renderSpeakButton(item.kana)}`;
      attachSpeakHandler(el);
      if (isAutoOn()) speak(item.kana);
    },
```

- [ ] **Step 2: Modificar `js/kana/kana-choice.js`**

Cambia el import de la línea 1-2 para añadir `tts.js`:

```js
import { startExercise, showSessionConfig } from '../exercise.js';
import { selectSession, pickWrong } from '../srs.js';
import { renderSpeakButton, attachSpeakHandler, isAutoOn, speak } from '../tts.js';
```

Reemplaza la función `renderPrompt` (líneas 31-33) por:

```js
    renderPrompt(item, el) {
      el.innerHTML = `<div class="kana-display">${item.kana}</div>${renderSpeakButton(item.kana)}`;
      attachSpeakHandler(el);
      if (isAutoOn()) speak(item.kana);
    },
```

- [ ] **Step 3: Verificación manual**

Abre `http://localhost:8765/`. Entra en Hiragana → Escribir Romaji → comienza una sesión.

Esperado:
- Aparece el kana (p.ej. あ) y al lado un botón 🔊
- Al pulsar 🔊, suena el kana en japonés (si tu navegador tiene voz ja-JP)
- El foco sigue en el campo de texto tras pulsar 🔊 (el listener delegado hace `stopPropagation`)
- Si tu navegador no tiene voz ja-JP, no suena nada y no aparece error en consola

Lo mismo en Hiragana → Opción Múltiple. Entra y verifica.

NO se toca Modo Inverso — el prompt allí es romaji.

- [ ] **Step 4: Commit**

```bash
git -C /home/hugo/japones-n5 add js/kana/kana-typing.js js/kana/kana-choice.js
git -C /home/hugo/japones-n5 commit -m "feat: botón TTS en kana typing y choice"
```

---

## Task 7: Botón 🔊 en kanji

**Files:**
- Modify: `js/kanji.js`

- [ ] **Step 1: Modificar imports al inicio de `js/kanji.js`**

Reemplaza líneas 1-2 por:

```js
import { startExercise, showSessionConfig } from './exercise.js';
import { selectSession, pickWrong } from './srs.js';
import { renderSpeakButton, attachSpeakHandler, isAutoOn, speak } from './tts.js';
```

- [ ] **Step 2: Reemplazar la función `renderPrompt` (líneas 29-33 del archivo original)**

```js
    renderPrompt(item, el) {
      const reading = item.example_reading;
      el.innerHTML = `
        <div class="kanji-display">${item.kanji}</div>
        <div class="kanji-example">
          <span class="kanji-example-word">${item.example_word}</span>
          <span class="kanji-example-reading">${reading}</span>
          ${renderSpeakButton(reading)}
        </div>
      `;
      attachSpeakHandler(el);
      if (isAutoOn()) speak(reading);
    },
```

- [ ] **Step 3: Añadir estilos para `.kanji-example` al final de `css/exercise.css`**

```css
.kanji-example {
  margin-top: 0.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  font-size: 1.1rem;
  opacity: 0.85;
}
.kanji-example-word { font-weight: 700; }
.kanji-example-reading { font-style: italic; color: var(--c-muted, #888); }
```

- [ ] **Step 4: Verificación manual**

Recarga `http://localhost:8765/`, entra en Kanji → comienza una sesión.

Esperado:
- El kanji se muestra grande y debajo aparece la palabra de ejemplo (p.ej. 一月) con su lectura (いちがつ) y un botón 🔊
- Al pulsar 🔊 suena la lectura del ejemplo
- Las 4 opciones de respuesta siguen funcionando igual

- [ ] **Step 5: Commit**

```bash
git -C /home/hugo/japones-n5 add js/kanji.js css/exercise.css
git -C /home/hugo/japones-n5 commit -m "feat: botón TTS en kanji + ejemplo visible en prompt"
```

---

## Task 8: Botón 🔊 por cada ejemplo en gramática

**Files:**
- Modify: `js/grammar.js`

- [ ] **Step 1: Modificar imports al inicio de `js/grammar.js`**

Reemplaza líneas 1-2 por:

```js
import { startExercise, showSessionConfig } from './exercise.js';
import { selectSession } from './srs.js';
import { renderSpeakButton, attachSpeakHandler, isAutoOn, speak } from './tts.js';
```

- [ ] **Step 2: Reemplazar la función `renderPrompt` (líneas 23-34 del archivo original)**

```js
    renderPrompt(item, el) {
      const examples = item.examples.slice(0, 2).map(ex => `
        <li>
          <span class="ex-jp">${ex.jp}</span>
          <button type="button" class="btn-tts btn-tts-sm" data-tts-text="${ex.jp.replace(/"/g, '&quot;')}" aria-label="Pronunciar" title="Pronunciar">🔊</button>
          <span class="ex-es">${ex.es}</span>
        </li>
      `).join('');

      el.innerHTML = `
        <div class="grammar-pattern">${item.pattern}</div>
        <div class="grammar-meaning">${item.meaning_es}</div>
        <ul class="grammar-examples">${examples}</ul>
        <div class="grammar-exercise-prompt">${item.exercise.prompt}</div>
      `;
      attachSpeakHandler(el);
      if (isAutoOn() && item.examples[0]) speak(item.examples[0].jp);
    },
```

- [ ] **Step 3: Verificación manual**

Recarga `http://localhost:8765/`, entra en Gramática → comienza una sesión.

Esperado:
- Cada uno de los dos ejemplos JP tiene su propio botón 🔊 pequeño al lado
- Al pulsar 🔊 de un ejemplo suena solo ese ejemplo
- Si "auto-pronunciar" está activo (lo activaremos en Task 11), suena el primer ejemplo al mostrar la pregunta
- Las 4 opciones de respuesta del ejercicio siguen funcionando

- [ ] **Step 4: Commit**

```bash
git -C /home/hugo/japones-n5 add js/grammar.js
git -C /home/hugo/japones-n5 commit -m "feat: botón TTS por ejemplo en gramática"
```

---

## Task 9: Botón 🔊 en partículas

**Files:**
- Modify: `js/particles.js`

- [ ] **Step 1: Modificar imports al inicio de `js/particles.js`**

Reemplaza líneas 1-2 por:

```js
import { startExercise, showSessionConfig } from './exercise.js';
import { selectSession } from './srs.js';
import { renderSpeakButton, attachSpeakHandler, isAutoOn, speak } from './tts.js';
```

- [ ] **Step 2: Añadir helper para construir la frase con la partícula correcta intercalada**

Pega justo antes de `function runParticles` (después de la función `buildSentence`, antes de `runParticles`):

```js
function fullSentenceWithAnswer(item) {
  return item.parts.map(p => p === '[  ]' ? item.answer : p).join('');
}
```

- [ ] **Step 3: Reemplazar la función `renderPrompt` (líneas 34-38 del archivo original)**

```js
    renderPrompt(item, el) {
      const fullText = fullSentenceWithAnswer(item);
      el.innerHTML = `
        <div class="particle-sentence">${buildSentence(item.parts, null)}</div>
        <div class="particle-tts-row">${renderSpeakButton(fullText)}<span class="particle-tts-hint">Escuchar oración con respuesta</span></div>
      `;
      attachSpeakHandler(el);
      // NO auto-pronunciamos aquí: revelaría la respuesta correcta antes de responder.
    },
```

> **Decisión consciente**: no se auto-pronuncia el prompt aunque el flag esté activo, porque haría trampa (la frase completa contiene la partícula correcta). El usuario puede pulsar 🔊 manualmente si quiere — es su decisión.

- [ ] **Step 4: Añadir estilos al final de `css/exercise.css`**

```css
.particle-tts-row {
  margin-top: 0.75rem;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  opacity: 0.75;
}
.particle-tts-hint { font-size: 0.85rem; color: var(--c-muted, #888); }
```

- [ ] **Step 5: Verificación manual**

Recarga `http://localhost:8765/`, entra en Partículas → comienza una sesión.

Esperado:
- Aparece la frase con `[  ]` como hueco (visualmente igual que antes)
- Debajo, un botón 🔊 con texto "Escuchar oración con respuesta"
- Al pulsar 🔊 suena la frase **completa** con la partícula correcta intercalada (te puede ayudar si dudas — leerla en voz alta natural revela la opción que suena)
- Auto-pronunciar NO se dispara aquí aunque esté activo

- [ ] **Step 6: Commit**

```bash
git -C /home/hugo/japones-n5 add js/particles.js css/exercise.css
git -C /home/hugo/japones-n5 commit -m "feat: botón TTS opcional en partículas (sin auto)"
```

---

## Task 10: Botón 🔊 en vocab (modo actual JP→ES)

**Files:**
- Modify: `js/vocab.js`

> **Nota:** Esta task solo añade el botón en el modo actual. La introducción del submenú y el modo reverso ES→JP va en Task 12.

- [ ] **Step 1: Modificar imports al inicio de `js/vocab.js`**

Reemplaza líneas 1-2 por:

```js
import { startExercise, showSessionConfig } from './exercise.js';
import { selectSession, pickWrong } from './srs.js';
import { renderSpeakButton, attachSpeakHandler, isAutoOn, speak } from './tts.js';
```

- [ ] **Step 2: Reemplazar la función `renderPrompt` (líneas 23-29 del archivo original)**

```js
    renderPrompt(item, el) {
      el.innerHTML = `
        <div class="vocab-kanji">${item.kanji}</div>
        <div class="vocab-kana-row">
          <span class="vocab-kana">${item.kana}</span>
          ${renderSpeakButton(item.kana)}
        </div>
        <div class="vocab-category">${item.category}</div>
      `;
      attachSpeakHandler(el);
      if (isAutoOn()) speak(item.kana);
    },
```

- [ ] **Step 3: Añadir estilos al final de `css/exercise.css`**

```css
.vocab-kana-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}
```

- [ ] **Step 4: Verificación manual**

Recarga `http://localhost:8765/`, entra en Vocabulario → comienza una sesión.

Esperado:
- Aparece el kanji, debajo el kana con un botón 🔊 al lado, debajo la categoría
- Al pulsar 🔊 suena la palabra en japonés
- Las 4 opciones de respuesta en español siguen funcionando

- [ ] **Step 5: Commit**

```bash
git -C /home/hugo/japones-n5 add js/vocab.js css/exercise.css
git -C /home/hugo/japones-n5 commit -m "feat: botón TTS en vocab JP→ES"
```

---

## Task 11: Toggle "auto-pronunciar" en Stats

**Files:**
- Modify: `js/stats.js`

- [ ] **Step 1: Modificar imports al inicio de `js/stats.js`**

Reemplaza línea 1 por:

```js
import { getDeckStats, exportAll, importAll, resetDeck } from './storage.js';
import { isAvailable, isAutoOn, setAutoOn } from './tts.js';
```

- [ ] **Step 2: Añadir un bloque de preferencias en la página de stats**

Localiza en `renderStats` el bloque actual (líneas 21-37 originales) que tiene esta forma:

```js
container.innerHTML = `
  <div class="page">
    <header class="page-header">
      <button class="btn-icon" id="stats-back">←</button>
      <h1>Estadísticas</h1>
    </header>
    <main class="stats-body">
      <div id="stats-table-wrap">Cargando...</div>
      <div class="stats-actions">
        <button class="btn-secondary" id="btn-export">Exportar progreso</button>
        <button class="btn-secondary" id="btn-import">Importar progreso</button>
        <input type="file" id="import-file" accept=".json" hidden>
      </div>
    </main>
  </div>
`;
```

Reemplázalo por (añade el bloque `<section class="stats-prefs">`):

```js
const ttsAvailable = isAvailable();
const ttsAutoChecked = isAutoOn() ? 'checked' : '';
container.innerHTML = `
  <div class="page">
    <header class="page-header">
      <button class="btn-icon" id="stats-back">←</button>
      <h1>Estadísticas</h1>
    </header>
    <main class="stats-body">
      <div id="stats-table-wrap">Cargando...</div>
      <section class="stats-prefs">
        <h2>Preferencias</h2>
        <label class="pref-row">
          <input type="checkbox" id="pref-tts-auto" ${ttsAutoChecked} ${ttsAvailable ? '' : 'disabled'}>
          <span>Auto-pronunciar al mostrar pregunta${ttsAvailable ? '' : ' (no hay voz japonesa disponible en este navegador)'}</span>
        </label>
      </section>
      <div class="stats-actions">
        <button class="btn-secondary" id="btn-export">Exportar progreso</button>
        <button class="btn-secondary" id="btn-import">Importar progreso</button>
        <input type="file" id="import-file" accept=".json" hidden>
      </div>
    </main>
  </div>
`;
```

- [ ] **Step 3: Añadir el listener del checkbox**

Justo después de `document.getElementById('stats-back').addEventListener('click', () => window.navigate('/'));` (línea 39 original), añade:

```js
const prefTtsAuto = document.getElementById('pref-tts-auto');
if (prefTtsAuto) {
  prefTtsAuto.addEventListener('change', () => setAutoOn(prefTtsAuto.checked));
}
```

- [ ] **Step 4: Añadir estilos al final de `css/styles.css`**

```css
.stats-prefs {
  margin-top: 1.5rem;
  padding: 1rem;
  border: 1px solid var(--c-border, #ddd);
  border-radius: 8px;
}
.stats-prefs h2 {
  margin: 0 0 0.5rem 0;
  font-size: 1rem;
}
.pref-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
}
.pref-row input[disabled] + span { opacity: 0.55; }
```

- [ ] **Step 5: Verificación manual**

Recarga `http://localhost:8765/`, pulsa 📊 (stats). Esperado:
- Aparece la sección "Preferencias" entre la tabla y los botones de export/import
- Hay un checkbox "Auto-pronunciar al mostrar pregunta"
- Si tu navegador tiene voz ja-JP: el checkbox está habilitado y al marcarlo se guarda
- Si no: aparece el texto "(no hay voz japonesa disponible en este navegador)" y está deshabilitado
- Activa el checkbox, ve a Hiragana → Opción Múltiple → comienza sesión. Esperado: al mostrar cada pregunta suena el kana automáticamente

- [ ] **Step 6: Commit**

```bash
git -C /home/hugo/japones-n5 add js/stats.js css/styles.css
git -C /home/hugo/japones-n5 commit -m "feat: toggle auto-pronunciar en preferencias de Stats"
```

---

## Task 12: Submenú modo de vocab + modo reverso ES→JP

**Files:**
- Modify: `js/app.js`
- Modify: `js/vocab.js`

> **Nota sobre SRS**: la decisión del spec es **caja única por palabra**. Ambos modos comparten la clave `jp_n5_v1.vocab.<id>`. Acertar en cualquiera sube caja, fallar baja a 0. Esto ya pasa automáticamente porque ambos modos pasarán `deck: 'vocab'` y `getItemId: it => it.id`, sin sufijos.

- [ ] **Step 1: Modificar `js/app.js` para soportar el subpath en vocab**

Localiza el bloque `else if (seg1 === 'vocab')` (líneas 49-51 originales):

```js
    } else if (seg1 === 'vocab') {
      const allItems = await loadData('vocab-n5.json');
      await startVocab(container, allItems);
```

Reemplázalo por:

```js
    } else if (seg1 === 'vocab') {
      const allItems = await loadData('vocab-n5.json');
      if (!seg2) {
        await startVocab(container, allItems, null);
      } else if (seg2 === 'jp-es' || seg2 === 'es-jp') {
        await startVocab(container, allItems, seg2);
      } else {
        window.navigate('/vocab');
      }
```

- [ ] **Step 2: Reemplazar `js/vocab.js` completo**

```js
import { startExercise, showSessionConfig } from './exercise.js';
import { selectSession, pickWrong } from './srs.js';
import { renderSpeakButton, attachSpeakHandler, isAutoOn, speak } from './tts.js';

const DECK = 'vocab';

// mode: null (mostrar menú), 'jp-es', o 'es-jp'
export async function start(container, allItems, mode) {
  if (!mode) {
    renderModeMenu(container);
    return;
  }
  showSessionConfig(container, {
    title: mode === 'jp-es' ? 'Vocabulario · JP → ES' : 'Vocabulario · ES → JP',
    subtitle: mode === 'jp-es'
      ? 'Ve la palabra japonesa y elige su significado en español.'
      : 'Ve el significado en español y elige la palabra japonesa.',
    onStart: (size) => {
      const items = selectSession(DECK, allItems, size);
      if (mode === 'jp-es') runJpEs(container, items, allItems);
      else runEsJp(container, items, allItems);
    },
  });
}

function renderModeMenu(container) {
  const MODES = [
    { mode: 'jp-es', icon: '🇯🇵→🇪🇸', label: 'JP → ES', desc: 'Lees la palabra japonesa y eliges el significado' },
    { mode: 'es-jp', icon: '🇪🇸→🇯🇵', label: 'ES → JP', desc: 'Lees el significado y eliges la palabra japonesa' },
  ];
  container.innerHTML = `
    <div class="page">
      <header class="page-header">
        <button class="btn-icon" id="vocab-menu-back">←</button>
        <h1>Vocabulario N5</h1>
      </header>
      <main class="mode-grid">
        ${MODES.map(m => `
          <div class="mode-card" data-mode="${m.mode}">
            <div class="mode-icon">${m.icon}</div>
            <div class="mode-label">${m.label}</div>
            <div class="mode-desc">${m.desc}</div>
          </div>
        `).join('')}
      </main>
    </div>
  `;
  document.getElementById('vocab-menu-back').addEventListener('click', () => window.navigate('/'));
  container.querySelectorAll('.mode-card').forEach(card => {
    card.addEventListener('click', () => window.navigate(`/vocab/${card.dataset.mode}`));
  });
}

function runJpEs(container, items, allItems) {
  startExercise(container, {
    deck: DECK,
    items,
    allItems,
    getItemId: it => it.id,
    renderPrompt(item, el) {
      el.innerHTML = `
        <div class="vocab-kanji">${item.kanji}</div>
        <div class="vocab-kana-row">
          <span class="vocab-kana">${item.kana}</span>
          ${renderSpeakButton(item.kana)}
        </div>
        <div class="vocab-category">${item.category}</div>
      `;
      attachSpeakHandler(el);
      if (isAutoOn()) speak(item.kana);
    },
    renderInput(item, all, el, onAnswer) {
      const wrongs = pickWrong(all, item, it => it.meaning_es, 3);
      const options = shuffle([item, ...wrongs]);
      el.innerHTML = `<div class="choice-grid vocab-grid">
        ${options.map((opt, i) => `
          <button class="choice-btn vocab-choice" data-val="${opt.meaning_es}" data-key="${i + 1}">
            <span class="choice-key">${i + 1}</span>
            ${opt.meaning_es}
          </button>
        `).join('')}
      </div>`;
      const keyHandler = e => {
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
    checkAnswer(item, answer) { return item.meaning_es === answer; },
    getCorrectDisplay(item) { return item.meaning_es; },
  });
}

function runEsJp(container, items, allItems) {
  startExercise(container, {
    deck: DECK,
    items,
    allItems,
    getItemId: it => it.id,
    renderPrompt(item, el) {
      el.innerHTML = `
        <div class="vocab-meaning-prompt">${item.meaning_es}</div>
        <div class="vocab-category">${item.category}</div>
      `;
      // No TTS en ES→JP: el prompt es español.
    },
    renderInput(item, all, el, onAnswer) {
      const wrongs = pickWrong(all, item, it => it.id, 3);
      const options = shuffle([item, ...wrongs]);
      el.innerHTML = `<div class="choice-grid vocab-grid-jp">
        ${options.map((opt, i) => `
          <button class="choice-btn vocab-choice-jp" data-val="${opt.id}" data-key="${i + 1}">
            <span class="choice-key">${i + 1}</span>
            <span class="choice-jp-kana">${opt.kana}</span>
            <span class="choice-jp-kanji">${opt.kanji}</span>
          </button>
        `).join('')}
      </div>`;
      const keyHandler = e => {
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
    checkAnswer(item, answer) { return item.id === answer; },
    getCorrectDisplay(item) { return `${item.kana} (${item.kanji}) — ${item.meaning_es}`; },
  });
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
```

- [ ] **Step 3: Añadir estilos al final de `css/exercise.css`**

```css
.vocab-meaning-prompt {
  font-size: 1.6rem;
  font-weight: 500;
  text-align: center;
  padding: 0.5rem 0;
}
.vocab-grid-jp { grid-template-columns: 1fr 1fr; }
.vocab-choice-jp {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
  padding: 1rem;
}
.choice-jp-kana { font-size: 1.5rem; font-weight: 700; }
.choice-jp-kanji { font-size: 1.1rem; opacity: 0.75; }
```

- [ ] **Step 4: Verificación manual end-to-end**

Recarga `http://localhost:8765/`.

**Flujo A — menú de modo:**
- Click en tarjeta "Vocabulario" → debe aparecer una pantalla con dos tarjetas: "JP → ES" y "ES → JP"
- Click en flecha ← debe volver al home
- Click en "JP → ES" → pantalla de configuración de sesión, igual que antes
- Comienza sesión, verifica que aparece el kanji + kana + botón 🔊 + opciones en ES. **Tras responder algunas preguntas correctamente**, pulsa ✕ para volver al home.
- Anota el porcentaje del bloque vocab en el home (visible en la tarjeta).

**Flujo B — modo reverso:**
- Click en "Vocabulario" → "ES → JP" → comienza sesión
- Esperado: prompt es una palabra/frase en español (p.ej. "uno (1)") y debajo la categoría
- Las 4 opciones son palabras japonesas (kana grande + kanji debajo)
- Responde correctamente → vuelve al home. **Verifica que el porcentaje del bloque vocab subió o se mantuvo**, NO bajó. Esto confirma que SRS comparte caja.

**Flujo C — atajo de teclado:**
- En cualquiera de los dos modos verifica que pulsar 1-4 en el teclado selecciona la opción correspondiente.

- [ ] **Step 5: Commit**

```bash
git -C /home/hugo/japones-n5 add js/app.js js/vocab.js css/exercise.css
git -C /home/hugo/japones-n5 commit -m "feat: vocab submenú con modos JP→ES y ES→JP (SRS compartido)"
```

---

## Task 13: Verificación final end-to-end de Fase 0

**Files:** ninguno (solo verificación)

- [ ] **Step 1: Pasar todos los tests unitarios**

Abre `http://localhost:8765/test/index.html`.
Esperado: "13 passed, 0 failed".

- [ ] **Step 2: Checklist manual completa**

Recorre los siguientes flujos. Marca cada uno tras verificar:

- [ ] Home se ve igual que antes, las 6 tarjetas presentes
- [ ] Hiragana → Escribir Romaji: prompt muestra kana + 🔊. 🔊 funciona si hay voz
- [ ] Hiragana → Opción Múltiple: idem
- [ ] Hiragana → Modo Inverso: prompt muestra romaji, **sin** 🔊 (intencional)
- [ ] Katakana: mismos 3 modos, mismo comportamiento
- [ ] Vocab → muestra submenú con 2 tarjetas
- [ ] Vocab → JP → ES: prompt con 🔊, sesión normal funciona
- [ ] Vocab → ES → JP: prompt en ES, opciones en JP (kana + kanji)
- [ ] Kanji: prompt muestra kanji + palabra ejemplo + 🔊 (lee la lectura del ejemplo)
- [ ] Partículas: prompt con frase + 🔊 que lee la oración con respuesta intercalada
- [ ] Gramática: cada uno de los 2 ejemplos tiene su 🔊 pequeño
- [ ] 📊 Stats: aparece sección "Preferencias" con toggle auto-pronunciar
- [ ] Activar auto-pronunciar y verificar que en Hiragana/Vocab/Kanji/Gramática suena al mostrar la pregunta
- [ ] Auto-pronunciar NO se dispara en Partículas (sería trampa)
- [ ] En navegador sin voz ja-JP (puedes probar en Firefox o desactivando las voces): el toggle aparece deshabilitado con el texto explicativo

- [ ] **Step 3: Verificar que no hay errores en consola**

Abre DevTools → Consola → recorre 1 pregunta de cada bloque. Esperado: ninguna excepción ni `404`. (Es esperado ver mensajes de TTS si tu navegador no tiene voz; eso no es error, solo info.)

- [ ] **Step 4: Verificar el log de git**

```bash
git -C /home/hugo/japones-n5 log --oneline
```

Esperado: ~13 commits desde el `Initial commit`, uno por task más el spec/init que ya existían.

- [ ] **Step 5: Crear tag para marcar fin de fase**

```bash
git -C /home/hugo/japones-n5 tag -a fase-0 -m "Fin de Fase 0: TTS + vocab reverso"
```

- [ ] **Step 6: Actualizar el spec para reflejar el estado** (opcional, solo si quieres marcarlo)

Edita `docs/superpowers/specs/2026-05-16-mejoras-n5-design.md` y añade al final de la sección "Fase 0":

```markdown
**Estado**: ✅ Implementada el 2026-05-16 (tag `fase-0`).
```

Commit:

```bash
git -C /home/hugo/japones-n5 add docs/superpowers/specs/2026-05-16-mejoras-n5-design.md
git -C /home/hugo/japones-n5 commit -m "docs: marcar Fase 0 como implementada"
```
