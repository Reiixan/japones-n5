# Modo examen JLPT N5 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Añadir un simulacro JLPT N5 cronometrado (`/exam`) que reúsa los renderers reales de cada bloque, con 3 secciones temporizadas, navegación prev/next intra-sección, tope de audio en Choukai y scoring fiel al N5.

**Architecture:** Cada bloque exporta su config de render (`examRenderer()`) sin cambiar la práctica. Un orquestador nuevo `js/exam.js` (independiente de `startExercise`) construye las secciones, gestiona el timer, renderiza cada pregunta de forma perezosa+cacheada y puntúa al final. No escribe SRS.

**Tech Stack:** Vanilla JS, ES modules nativos, sin build. Tests con el runner casero de `test/`.

**Spec:** `docs/superpowers/specs/2026-05-22-modo-examen-jlpt-design.md`

---

## File Structure

- **Modify** `js/vocab.js`, `js/kanji.js`, `js/particles.js`, `js/grammar.js` — extraer `examRenderer()` (refactor sin cambio de comportamiento).
- **Modify** `js/reading.js` — extraer `examRenderer()` (ítems compuestos).
- **Modify** `js/listening.js` — extraer `examRenderer({ maxPlays })` con tope de audio.
- **Create** `js/exam.js` — orquestador (lógica pura + DOM).
- **Create** `test/exam.test.js` — tests de las funciones puras.
- **Modify** `test/index.html` — registrar el nuevo test.
- **Modify** `js/app.js` — ruta `/exam`.
- **Modify** `js/home.js` — tarjeta "Simulacro JLPT N5".
- **Modify** `css/exercise.css` — estilos `exam-*`.
- **Modify** `CLAUDE.md` + spec maestro — marcar 4.2 / 4-D como ✅.

---

## Task 1: Extraer `examRenderer()` en vocab, kanji, particles, grammar

Refactor mecánico: sacar el config de render a una función exportada y que `runX()` lo consuma con spread. **El comportamiento de la práctica no debe cambiar.**

**Files:**
- Modify: `js/vocab.js`
- Modify: `js/kanji.js`
- Modify: `js/particles.js`
- Modify: `js/grammar.js`

- [ ] **Step 1: `js/vocab.js`** — añadir `examRenderer()` (dirección JP→ES) y reescribir `runJpEs` para usarlo. Reemplaza la función `runJpEs` actual (líneas 55-105) por:

```js
export function examRenderer() {
  return {
    renderPrompt(item, el) {
      el.innerHTML = `
        <div class="vocab-kanji">${item.kanji}</div>
        <div class="vocab-kana-row">
          <span class="vocab-kana">${item.kana}</span>
          ${renderSpeakButton(item.kana)}
        </div>
        ${isRomajiOn() ? `<div class="vocab-romaji">${item.romaji}</div>` : ''}
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
  };
}

function runJpEs(container, items, allItems) {
  startExercise(container, {
    deck: DECK,
    items,
    allItems,
    getItemId: it => it.id,
    ...examRenderer(),
    getPromptSpeechText: item => item.kana,
    getAnswerSpeechText: item => item.kana,
    menuPath: '/vocab',
  });
}
```

(`runEsJp` y el resto del archivo se quedan igual.)

- [ ] **Step 2: `js/kanji.js`** — añadir `examRenderer()` y reescribir `runKanji` (líneas 25-83) para usarlo:

```js
export function examRenderer() {
  return {
    renderPrompt(item, el) {
      const reading = item.example_reading;
      const romaji = isRomajiOn() ? `<span class="kanji-example-romaji">${kanaToRomaji(reading)}</span>` : '';
      const exampleHtml = (item.example_word && item.example_reading)
        ? `<div class="kanji-example">
            <span class="kanji-example-word">${item.example_word}</span>
            <span class="kanji-example-reading">(${reading})</span>
            ${romaji}
            ${renderSpeakButton(reading)}
          </div>`
        : '';
      el.innerHTML = `<div class="kanji-prompt"><div class="kanji-display">${item.kanji}</div>${exampleHtml}</div>`;
      attachSpeakHandler(el);
      if (isAutoOn()) speak(reading);
    },
    renderInput(item, all, el, onAnswer) {
      const wrongs = pickWrong(all, item, it => it.id, 3);
      const options = shuffle([item, ...wrongs]);
      el.innerHTML = `<div class="choice-grid kanji-grid">
        ${options.map((opt, i) => `
          <button class="choice-btn kanji-choice" data-val="${opt.id}" data-key="${i + 1}">
            <span class="choice-key">${i + 1}</span>
            <span class="kanji-meaning">${opt.meaning_es}</span>
            <span class="kanji-readings">${opt.kunyomi.join('・') || '—'} / ${opt.onyomi.join('・') || '—'}</span>
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
    getCorrectDisplay(item) { return displayFor(item); },
  };
}

function runKanji(container, items, allItems) {
  startExercise(container, {
    deck: DECK,
    items,
    allItems,
    getItemId: it => it.id,
    ...examRenderer(),
    getPromptSpeechText: item => item.example_reading,
    getAnswerSpeechText: item => item.example_reading,
  });
}
```

- [ ] **Step 3: `js/particles.js`** — añadir `examRenderer()` y reescribir `runParticles` (líneas 33-83):

```js
export function examRenderer() {
  return {
    renderPrompt(item, el) {
      const fullText = fullSentenceWithAnswer(item);
      el.innerHTML = `
        <div class="particle-sentence">${buildSentence(item.parts, null)}</div>
        <div class="particle-tts-row">${renderSpeakButton(fullText)}<span class="particle-tts-hint">Escuchar oración con respuesta</span></div>
      `;
      attachSpeakHandler(el);
    },
    renderInput(item, _all, el, onAnswer) {
      const options = shuffle([...item.options]);
      el.innerHTML = `<div class="choice-grid particle-grid">
        ${options.map((opt, i) => `
          <button class="choice-btn particle-btn" data-val="${opt}" data-key="${i + 1}">
            <span class="choice-key">${i + 1}</span>
            <span class="particle-opt">${opt}</span>
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
    checkAnswer(item, answer) { return item.answer === answer; },
    getCorrectDisplay(item) { return `${item.answer} — ${item.explanation}`; },
  };
}

function runParticles(container, items, allItems) {
  startExercise(container, {
    deck: DECK,
    items,
    allItems,
    getItemId: it => it.id,
    ...examRenderer(),
    getAnswerSpeechText: item => fullSentenceWithAnswer(item),
  });
}
```

- [ ] **Step 4: `js/grammar.js`** — añadir `examRenderer()` y reescribir `runGrammar` (líneas 18-77):

```js
export function examRenderer() {
  return {
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
    renderInput(item, _all, el, onAnswer) {
      const options = shuffle([...item.exercise.options]);
      el.innerHTML = `<div class="choice-grid grammar-grid">
        ${options.map((opt, i) => `
          <button class="choice-btn grammar-btn" data-val="${opt}" data-key="${i + 1}">
            <span class="choice-key">${i + 1}</span>
            <span>${opt}</span>
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
    checkAnswer(item, answer) { return item.exercise.answer === answer; },
    getCorrectDisplay(item) { return item.exercise.answer; },
  };
}

function runGrammar(container, items, allItems) {
  startExercise(container, {
    deck: DECK,
    items,
    allItems,
    getItemId: it => it.id,
    ...examRenderer(),
    getPromptSpeechText: item => item.examples[0] ? item.examples[0].jp : null,
    getAnswerSpeechText: item => item.exercise.answer,
  });
}
```

- [ ] **Step 5: Verificar la práctica en navegador.** Servir y comprobar que vocab (JP→ES), kanji, partículas y gramática funcionan exactamente igual que antes (prompt, opciones, feedback, audio).

Run: `cd /home/hugo/japones-n5 && python3 -m http.server 8765 --bind 0.0.0.0`
Abrir `http://localhost:8765/`, entrar en cada bloque y responder una pregunta.
Expected: comportamiento idéntico al actual.

- [ ] **Step 6: Verificar que la suite de tests sigue verde.** Abrir `http://localhost:8765/test/`.
Expected: 145 passed, 0 failed.

- [ ] **Step 7: Commit**

```bash
cd /home/hugo/japones-n5
git add js/vocab.js js/kanji.js js/particles.js js/grammar.js
git commit -m "refactor: exportar examRenderer() en vocab/kanji/particles/grammar para reuso en examen"
```

---

## Task 2: Extraer `examRenderer()` en reading

Reading tiene ítems compuestos `{text, q_idx}`. El `examRenderer()` expone solo render+check (NO el agregador SRS, que es de la sesión de práctica).

**Files:**
- Modify: `js/reading.js`

- [ ] **Step 1:** Añadir `examRenderer()` y reescribir `runReading` (líneas 82-161) para consumirlo. `examRenderer` contiene `renderPrompt`/`renderInput`/`checkAnswer`/`getCorrectDisplay`; `runReading` añade aparte `getItemId` y `recordResult` (el agregador). Reemplaza desde `function runReading` por:

```js
export function examRenderer() {
  return {
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
    checkAnswer(item, answer) {
      return item.text.questions[item.q_idx].answer_es === answer;
    },
    getCorrectDisplay(item) {
      return item.text.questions[item.q_idx].answer_es;
    },
  };
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
    ...examRenderer(),
    recordResult(item, correct) {
      aggregate(item, correct);
    },
  });
}
```

- [ ] **Step 2: Verificar la práctica de dokkai en navegador.** `http://localhost:8765/#/reading` → responder preguntas de un texto; furigana toggle funciona; el SRS por texto sigue registrando.
Expected: comportamiento idéntico al actual.

- [ ] **Step 3: Verificar tests.** `http://localhost:8765/test/` → 145 passed (incluye `reading.test.js`).

- [ ] **Step 4: Commit**

```bash
cd /home/hugo/japones-n5
git add js/reading.js
git commit -m "refactor: exportar examRenderer() en reading (separado del agregador SRS)"
```

---

## Task 3: `examRenderer({ maxPlays })` en listening con tope de audio

El render de Choukai debe limitar las reproducciones cuando se pasa `maxPlays`. Sin `maxPlays` (práctica) el comportamiento es el actual: auto-play una vez y repeticiones ilimitadas.

**Files:**
- Modify: `js/listening.js`

- [ ] **Step 1:** Añadir `examRenderer({ maxPlays } = {})` y reescribir `runListening` (líneas 31-104). El `renderPrompt` centraliza la reproducción en `tryPlay()` con contador por pregunta. Reemplaza desde `function runListening` por:

```js
export function examRenderer({ maxPlays } = {}) {
  return {
    renderPrompt(item, el) {
      el.innerHTML = `
        <div class="listen-prompt">
          <button type="button" class="btn-listen" data-listen-text="${escapeAttr(item.audio_text)}" aria-label="Escuchar">
            <span class="listen-icon">▶</span>
            <span class="listen-label">Escuchar</span>
          </button>
          <button type="button" class="btn-listen-repeat" data-listen-text="${escapeAttr(item.audio_text)}" aria-label="Repetir" title="Repetir">↻</button>
        </div>
        <details class="listen-reveal">
          <summary>Ver texto japonés</summary>
          <div class="listen-text">${item.audio_text}</div>
          <div class="listen-kana">${item.audio_kana}</div>
        </details>
        <div class="listen-question">${item.prompt_es}</div>
      `;
      let plays = 0;
      const tryPlay = () => {
        if (maxPlays != null && plays >= maxPlays) return;
        plays++;
        speak(item.audio_text);
        if (maxPlays != null && plays >= maxPlays) {
          el.querySelectorAll('.btn-listen, .btn-listen-repeat').forEach(b => {
            b.disabled = true;
            b.classList.add('disabled');
          });
        }
      };
      el.addEventListener('click', e => {
        const btn = e.target.closest('[data-listen-text]');
        if (!btn || btn.disabled) return;
        e.preventDefault();
        tryPlay();
      });
      // Auto-pronunciar la primera vez (cuenta hacia el tope si lo hay).
      tryPlay();
    },
    renderInput(item, _all, el, onAnswer) {
      const isResponse = item.type === 'response';
      const opts = isResponse ? item.options_jp : item.options_es;
      const options = shuffle([...opts]);
      el.innerHTML = `<div class="choice-grid listen-grid ${isResponse ? 'listen-grid-jp' : ''}">
        ${options.map((opt, i) => `
          <button class="choice-btn listen-choice" data-val="${escapeAttr(opt)}" data-key="${i + 1}">
            <span class="choice-key">${i + 1}</span>
            <span>${opt}</span>
          </button>
        `).join('')}
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
    checkAnswer(item, answer) {
      const correct = item.type === 'response' ? item.answer_jp : item.answer_es;
      return correct === answer;
    },
    getCorrectDisplay(item) {
      const correct = item.type === 'response' ? item.answer_jp : item.answer_es;
      return `${correct}  ·  ${item.audio_text} (${item.audio_kana})`;
    },
  };
}

function runListening(container, items, allItems) {
  startExercise(container, {
    deck: DECK,
    items,
    allItems,
    getItemId: it => it.id,
    ...examRenderer(),
    getPromptSpeechText: item => item.audio_text,
    getAnswerSpeechText: item => item.audio_text,
  });
}
```

- [ ] **Step 2: Verificar la práctica de Choukai en navegador.** `http://localhost:8765/#/listening` → el audio suena solo al aparecer, ▶ y ↻ repiten sin límite (práctica), las opciones funcionan.
Expected: comportamiento idéntico al actual (sin tope).

- [ ] **Step 3: Commit**

```bash
cd /home/hugo/japones-n5
git add js/listening.js
git commit -m "refactor: examRenderer({maxPlays}) en listening — tope de audio opcional para examen"
```

---

## Task 4: `js/exam.js` — lógica pura + tests (TDD)

Funciones puras testeables: `formatTime`, `buildSections`, `scoreSections`, `diagnose`. La parte DOM se añade en Task 5.

**Files:**
- Create: `js/exam.js`
- Create: `test/exam.test.js`
- Modify: `test/index.html`

- [ ] **Step 1: Escribir el test que falla** — `test/exam.test.js`:

```js
import { describe, it, assert, assertEqual } from './runner.js';

describe('exam.formatTime', () => {
  it('formatea mm:ss', async () => {
    const { formatTime } = await import('../js/exam.js?c=f1');
    assertEqual(formatTime(90000), '1:30');
    assertEqual(formatTime(20 * 60000), '20:00');
    assertEqual(formatTime(5000), '0:05');
  });
  it('clamp a 0:00 con negativos', async () => {
    const { formatTime } = await import('../js/exam.js?c=f2');
    assertEqual(formatTime(-5000), '0:00');
    assertEqual(formatTime(0), '0:00');
  });
});

describe('exam.buildSections', () => {
  function fakeDecks() {
    const arr = (prefix, n, extra = () => ({})) =>
      Array.from({ length: n }, (_, i) => ({ id: `${prefix}${i}`, ...extra(i) }));
    return {
      vocab: arr('v', 30, () => ({ kanji: 'x', kana: 'x', romaji: 'x', category: 'c', meaning_es: 'm' })),
      kanji: arr('k', 30, () => ({ kanji: '日', onyomi: [], kunyomi: [], meaning_es: 'm' })),
      particles: arr('p', 30, () => ({ parts: ['[  ]'], options: ['a', 'b'], answer: 'a', explanation: 'e' })),
      grammar: arr('g', 30, () => ({ pattern: 'p', meaning_es: 'm', examples: [], exercise: { prompt: '', options: ['a'], answer: 'a' } })),
      listening: arr('l', 30, () => ({ type: 'info', audio_text: 'a', audio_kana: 'a', prompt_es: 'p', options_es: ['a'], answer_es: 'a' })),
      reading: arr('r', 10, () => ({ text_ruby: [], questions: [{ q_es: 'q', options_es: ['a'], answer_es: 'a' }] })),
    };
  }

  it('produce 3 secciones con los conteos correctos', async () => {
    const { buildSections } = await import('../js/exam.js?c=b1');
    const s = buildSections(fakeDecks());
    assertEqual(s.length, 3);
    assertEqual(s[0].id, 'moji-goi');
    assertEqual(s[0].questions.length, 20);
    assertEqual(s[1].id, 'bunpou-dokkai');
    assertEqual(s[1].questions.length, 16);
    assertEqual(s[2].id, 'choukai');
    assertEqual(s[2].questions.length, 7);
  });

  it('mapea cada sección a su grupo de puntuación', async () => {
    const { buildSections } = await import('../js/exam.js?c=b2');
    const s = buildSections(fakeDecks());
    assertEqual(s[0].group, 1);
    assertEqual(s[1].group, 1);
    assertEqual(s[2].group, 2);
  });
});

describe('exam.scoreSections / diagnose', () => {
  const renderer = { checkAnswer: (item, ans) => item.correct === ans };
  function fakeSections() {
    return [
      { id: 'moji-goi', label: 'Moji-Goi', group: 1, minutes: 20, questions: [
        { deck: 'vocab', item: { correct: 'a' }, renderer },
        { deck: 'kanji', item: { correct: 'b' }, renderer },
      ] },
      { id: 'bunpou-dokkai', label: 'Bunpou', group: 1, minutes: 40, questions: [
        { deck: 'grammar', item: { correct: 'c' }, renderer },
      ] },
      { id: 'choukai', label: 'Choukai', group: 2, minutes: 30, questions: [
        { deck: 'listening', item: { correct: 'd' }, renderer },
      ] },
    ];
  }

  it('puntúa por sección, grupo, deck y total', async () => {
    const { scoreSections } = await import('../js/exam.js?c=s1');
    const answers = new Map([['0:0', 'a'], ['0:1', 'wrong'], ['1:0', 'c'], ['2:0', 'd']]);
    const r = scoreSections(fakeSections(), answers);
    assertEqual(r.overall.correct, 3);
    assertEqual(r.overall.total, 4);
    assertEqual(r.sections[0].correct, 1); // moji-goi: a ok, kanji wrong
    assertEqual(r.groups.find(g => g.group === 1).correct, 2); // 1 + 1
    assertEqual(r.groups.find(g => g.group === 2).correct, 1);
  });

  it('respuesta ausente cuenta como incorrecta', async () => {
    const { scoreSections } = await import('../js/exam.js?c=s2');
    const r = scoreSections(fakeSections(), new Map());
    assertEqual(r.overall.correct, 0);
    assertEqual(r.passed, false);
  });

  it('aprueba solo si global>=44% y cada grupo>=32%', async () => {
    const { scoreSections } = await import('../js/exam.js?c=s3');
    // todo correcto -> aprueba
    const all = new Map([['0:0', 'a'], ['0:1', 'b'], ['1:0', 'c'], ['2:0', 'd']]);
    assertEqual(scoreSections(fakeSections(), all).passed, true);
    // grupo 2 a 0% -> no aprueba aunque global alto
    const noChoukai = new Map([['0:0', 'a'], ['0:1', 'b'], ['1:0', 'c'], ['2:0', 'wrong']]);
    assertEqual(scoreSections(fakeSections(), noChoukai).passed, false);
  });

  it('diagnose devuelve el deck más flojo con su path', async () => {
    const { scoreSections, diagnose } = await import('../js/exam.js?c=d1');
    // kanji 0%, resto 100%
    const answers = new Map([['0:0', 'a'], ['0:1', 'wrong'], ['1:0', 'c'], ['2:0', 'd']]);
    const worst = diagnose(scoreSections(fakeSections(), answers));
    assertEqual(worst.deck, 'kanji');
    assertEqual(worst.path, '/kanji');
    assertEqual(worst.pct, 0);
  });
});
```

- [ ] **Step 2: Registrar el test** en `test/index.html` — añadir antes de `await run();`:

```js
    await import('./exam.test.js');
```

- [ ] **Step 3: Ejecutar y ver que falla.** Servir y abrir `http://localhost:8765/test/`.
Expected: FAIL — `exam.js` no existe (errores de import en los `describe` de exam).

- [ ] **Step 4: Crear `js/exam.js`** con la lógica pura:

```js
import { examRenderer as vocabRenderer } from './vocab.js';
import { examRenderer as kanjiRenderer } from './kanji.js';
import { examRenderer as particlesRenderer } from './particles.js';
import { examRenderer as grammarRenderer } from './grammar.js';
import { examRenderer as listeningRenderer } from './listening.js';
import { examRenderer as readingRenderer, expandTextsToItems } from './reading.js';

const PASS_OVERALL = 0.44;
const PASS_GROUP = 0.32;

const DECK_META = {
  vocab: { label: 'Vocabulario', path: '/vocab' },
  kanji: { label: 'Kanji', path: '/kanji' },
  particles: { label: 'Partículas', path: '/particles' },
  grammar: { label: 'Gramática', path: '/grammar' },
  reading: { label: 'Comprensión lectora', path: '/reading' },
  listening: { label: 'Comprensión auditiva', path: '/listening' },
};

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function sample(arr, n) {
  return shuffle(arr).slice(0, n);
}

function pct(c, t) {
  return t ? Math.round((c / t) * 100) : 0;
}

export function formatTime(ms) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function buildSections(decks) {
  const vocabR = vocabRenderer();
  const kanjiR = kanjiRenderer();
  const particlesR = particlesRenderer();
  const grammarR = grammarRenderer();
  const readingR = readingRenderer();
  const listeningR = listeningRenderer({ maxPlays: 2 });

  const q = (deck, item, allItems, renderer) => ({ deck, item, allItems, renderer });

  const mojiGoi = [
    ...sample(decks.vocab, 12).map(it => q('vocab', it, decks.vocab, vocabR)),
    ...sample(decks.kanji, 8).map(it => q('kanji', it, decks.kanji, kanjiR)),
  ];

  // Hasta 6 textos -> expandir -> recortar a 7 preguntas dokkai.
  const readingTexts = sample(decks.reading, Math.min(decks.reading.length, 6));
  const readingItems = expandTextsToItems(readingTexts).slice(0, 7);
  const bunpouDokkai = [
    ...sample(decks.particles, 5).map(it => q('particles', it, decks.particles, particlesR)),
    ...sample(decks.grammar, 4).map(it => q('grammar', it, decks.grammar, grammarR)),
    ...readingItems.map(it => q('reading', it, decks.reading, readingR)),
  ];

  const choukai = sample(decks.listening, 7).map(it => q('listening', it, decks.listening, listeningR));

  return [
    { id: 'moji-goi', label: 'Moji-Goi 文字・語彙', group: 1, minutes: 20, questions: mojiGoi },
    { id: 'bunpou-dokkai', label: 'Bunpou-Dokkai 文法・読解', group: 1, minutes: 40, questions: bunpouDokkai },
    { id: 'choukai', label: 'Choukai 聴解', group: 2, minutes: 30, questions: choukai },
  ];
}

export function scoreSections(sections, answers) {
  const sectionScores = [];
  const deckAgg = {};
  const groupAgg = { 1: { correct: 0, total: 0 }, 2: { correct: 0, total: 0 } };
  let overallCorrect = 0, overallTotal = 0;

  sections.forEach((section, sIdx) => {
    let correct = 0;
    section.questions.forEach((question, qIdx) => {
      const ans = answers.get(`${sIdx}:${qIdx}`);
      const ok = ans != null && question.renderer.checkAnswer(question.item, ans);
      if (ok) correct++;
      const d = deckAgg[question.deck] || (deckAgg[question.deck] = { correct: 0, total: 0 });
      d.total++;
      if (ok) d.correct++;
    });
    const total = section.questions.length;
    sectionScores.push({ id: section.id, label: section.label, correct, total, pct: pct(correct, total) });
    overallCorrect += correct;
    overallTotal += total;
    groupAgg[section.group].correct += correct;
    groupAgg[section.group].total += total;
  });

  const groups = [1, 2].map(g => ({
    group: g,
    correct: groupAgg[g].correct,
    total: groupAgg[g].total,
    pct: pct(groupAgg[g].correct, groupAgg[g].total),
  }));

  const frac = (o) => (o.total ? o.correct / o.total : 0);
  const overall = { correct: overallCorrect, total: overallTotal, pct: pct(overallCorrect, overallTotal) };
  const passed =
    (overallTotal ? overallCorrect / overallTotal : 0) >= PASS_OVERALL &&
    frac(groupAgg[1]) >= PASS_GROUP &&
    frac(groupAgg[2]) >= PASS_GROUP;

  const byDeck = Object.keys(deckAgg).map(deck => ({
    deck,
    label: DECK_META[deck].label,
    path: DECK_META[deck].path,
    correct: deckAgg[deck].correct,
    total: deckAgg[deck].total,
    pct: pct(deckAgg[deck].correct, deckAgg[deck].total),
  }));

  return { sections: sectionScores, groups, byDeck, overall, passed };
}

export function diagnose(scored) {
  if (!scored.byDeck.length) return null;
  return scored.byDeck.reduce((worst, d) => (d.pct < worst.pct ? d : worst), scored.byDeck[0]);
}
```

- [ ] **Step 5: Ejecutar y ver que pasa.** Recargar `http://localhost:8765/test/`.
Expected: PASS — los 9 tests nuevos de exam verdes; total 154 passed, 0 failed.

- [ ] **Step 6: Commit**

```bash
cd /home/hugo/japones-n5
git add js/exam.js test/exam.test.js test/index.html
git commit -m "feat(exam): lógica pura del simulacro (buildSections, scoreSections, diagnose, formatTime) + tests"
```

---

## Task 5: `js/exam.js` — orquestador DOM (intro, secciones, timer, resultados)

Añade la parte de interfaz al final de `js/exam.js`. Se verifica en navegador (DOM/timer/audio, regla CLAUDE.md).

**Files:**
- Modify: `js/exam.js`

- [ ] **Step 1: Añadir el orquestador** al final de `js/exam.js`:

```js
// ---- Orquestador DOM (verificado en navegador) ----
let container = null;
let state = null;
let timerId = null;
let keyHandler = null;

export function start(rootEl, decks) {
  teardown();
  container = rootEl;
  state = {
    sections: buildSections(decks),
    sectionIdx: 0,
    questionIdx: 0,
    answers: new Map(),
    cache: new Map(),
    deadlineAt: 0,
    phase: 'intro',
  };
  installKeyHandler();
  renderIntro();
}

function installKeyHandler() {
  keyHandler = (e) => {
    if (!state || state.phase !== 'section') return;
    const n = parseInt(e.key);
    if (!(n >= 1 && n <= 9)) return;
    const panel = container.querySelector('.exam-qpanel');
    const btn = panel && panel.querySelector(`.exam-input .choice-btn[data-key="${n}"]`);
    if (btn && !btn.disabled) btn.click();
  };
  document.addEventListener('keydown', keyHandler);
}

function teardown() {
  if (timerId) { clearInterval(timerId); timerId = null; }
  if (keyHandler) { document.removeEventListener('keydown', keyHandler); keyHandler = null; }
}

function renderIntro() {
  state.phase = 'intro';
  const rows = state.sections.map(s =>
    `<tr><td>${s.label}</td><td>${s.minutes} min</td><td>${s.questions.length}</td></tr>`).join('');
  const totalQ = state.sections.reduce((n, s) => n + s.questions.length, 0);
  const totalMin = state.sections.reduce((n, s) => n + s.minutes, 0);
  container.innerHTML = `
    <div class="page exam-intro">
      <header class="page-header">
        <button class="btn-icon" id="exam-back">←</button>
        <h1>Simulacro JLPT N5</h1>
      </header>
      <main>
        <p class="exam-intro-text">Examen completo cronometrado. No puedes volver a una sección anterior. No cuenta para tu progreso (SRS).</p>
        <table class="exam-section-table">
          <thead><tr><th>Sección</th><th>Tiempo</th><th>Preguntas</th></tr></thead>
          <tbody>${rows}</tbody>
          <tfoot><tr><td>Total</td><td>${totalMin} min</td><td>${totalQ}</td></tr></tfoot>
        </table>
        <p class="exam-intro-note">Aprobado: ≥44% global y ≥32% en cada grupo (Lengua+Lectura / Choukai).</p>
        <button class="btn-start" id="exam-start">Comenzar simulacro →</button>
      </main>
    </div>
  `;
  document.getElementById('exam-back').addEventListener('click', () => { teardown(); window.navigate('/'); });
  document.getElementById('exam-start').addEventListener('click', () => enterSection(0));
}

function enterSection(idx) {
  state.sectionIdx = idx;
  state.questionIdx = 0;
  state.phase = 'section';
  const section = state.sections[idx];
  state.deadlineAt = Date.now() + section.minutes * 60000;
  if (timerId) clearInterval(timerId);
  timerId = setInterval(tick, 1000);
  renderQuestion();
}

function tick() {
  const remaining = state.deadlineAt - Date.now();
  const timerEl = container.querySelector('#exam-timer');
  if (timerEl) {
    timerEl.textContent = formatTime(remaining);
    timerEl.classList.toggle('warning', remaining <= 30000);
  }
  if (remaining <= 0) finishSection();
}

function finishSection() {
  if (timerId) { clearInterval(timerId); timerId = null; }
  if (state.sectionIdx + 1 < state.sections.length) {
    enterSection(state.sectionIdx + 1);
  } else {
    renderResults();
  }
}

function markSelected(inputEl, val) {
  inputEl.querySelectorAll('.choice-btn').forEach(b =>
    b.classList.toggle('selected', b.dataset.val === String(val)));
}

function getQuestionNode(sIdx, qIdx) {
  const key = `${sIdx}:${qIdx}`;
  if (state.cache.has(key)) return state.cache.get(key);
  const question = state.sections[sIdx].questions[qIdx];
  const node = document.createElement('div');
  node.className = 'exam-qpanel';
  const promptEl = document.createElement('div');
  promptEl.className = 'ex-prompt exam-prompt';
  const inputEl = document.createElement('div');
  inputEl.className = 'ex-input exam-input';
  node.append(promptEl, inputEl);
  question.renderer.renderPrompt(question.item, promptEl);
  const cleanup = question.renderer.renderInput(question.item, question.allItems, inputEl, (val) => {
    state.answers.set(key, val);
    markSelected(inputEl, val);
  });
  // El cleanup de cada bloque solo elimina su keydown de document; el click sobre
  // inputEl permanece. exam.js gestiona el teclado con un único handler global.
  if (typeof cleanup === 'function') cleanup();
  if (state.answers.has(key)) markSelected(inputEl, state.answers.get(key));
  state.cache.set(key, node);
  return node;
}

function renderQuestion() {
  const sIdx = state.sectionIdx;
  const qIdx = state.questionIdx;
  const section = state.sections[sIdx];
  const remaining = state.deadlineAt - Date.now();
  container.innerHTML = `
    <div class="ex-wrap exam-wrap">
      <header class="ex-header exam-header">
        <div class="exam-section-label">${section.label}</div>
        <div class="exam-timer" id="exam-timer">${formatTime(remaining)}</div>
        <div class="exam-progress">${qIdx + 1}/${section.questions.length}</div>
      </header>
      <main class="ex-body exam-body" id="exam-body"></main>
      <footer class="exam-nav">
        <button class="btn-secondary" id="exam-prev" ${qIdx === 0 ? 'disabled' : ''}>← Anterior</button>
        <button class="btn-secondary" id="exam-finish">Terminar sección</button>
        <button class="btn-secondary" id="exam-next" ${qIdx === section.questions.length - 1 ? 'disabled' : ''}>Siguiente →</button>
      </footer>
    </div>
  `;
  document.getElementById('exam-body').appendChild(getQuestionNode(sIdx, qIdx));
  document.getElementById('exam-prev').addEventListener('click', () => {
    if (state.questionIdx > 0) { state.questionIdx--; renderQuestion(); }
  });
  document.getElementById('exam-next').addEventListener('click', () => {
    if (state.questionIdx < section.questions.length - 1) { state.questionIdx++; renderQuestion(); }
  });
  document.getElementById('exam-finish').addEventListener('click', () => {
    if (confirm('¿Terminar esta sección? No podrás volver.')) finishSection();
  });
}

function renderResults() {
  state.phase = 'results';
  teardown();
  const scored = scoreSections(state.sections, state.answers);
  const worst = diagnose(scored);
  const sectionRows = scored.sections.map(s =>
    `<tr><td>${s.label}</td><td>${s.correct}/${s.total}</td><td>${s.pct}%</td></tr>`).join('');
  const g1 = scored.groups.find(g => g.group === 1);
  const g2 = scored.groups.find(g => g.group === 2);
  const groupLine = (g, name, min) =>
    `<li>${name}: ${g.correct}/${g.total} (${g.pct}%) ${g.pct >= min ? '✅' : `❌ &lt; ${min}%`}</li>`;
  container.innerHTML = `
    <div class="page exam-results">
      <header class="page-header"><h1>Resultado del simulacro</h1></header>
      <main>
        <div class="exam-final-score ${scored.passed ? 'pass' : 'fail'}">
          <div class="exam-pct">${scored.overall.pct}%</div>
          <div class="exam-verdict">${scored.passed ? 'APROBADO ✅' : 'NO APROBADO ❌'}
            <small>(corte: 44% global · 32% por grupo)</small></div>
        </div>
        <table class="exam-section-table">
          <thead><tr><th>Sección</th><th>Aciertos</th><th>%</th></tr></thead>
          <tbody>${sectionRows}</tbody>
        </table>
        <ul class="exam-groups">
          ${groupLine(g1, 'Lengua + Lectura', 32)}
          ${groupLine(g2, 'Choukai', 32)}
        </ul>
        ${worst ? `<div class="exam-diagnosis">
          Tu punto más flojo: <strong>${worst.label}</strong> (${worst.pct}%).
          <button class="btn-secondary" id="exam-practice">Practicar ${worst.label} →</button>
        </div>` : ''}
        <div class="exam-actions">
          <button class="btn-secondary" id="exam-home">Inicio</button>
          <button class="btn-primary" id="exam-retry">Otro simulacro</button>
        </div>
      </main>
    </div>
  `;
  document.getElementById('exam-home').addEventListener('click', () => window.navigate('/'));
  document.getElementById('exam-retry').addEventListener('click', () => window.navigate('/exam'));
  if (worst) {
    document.getElementById('exam-practice').addEventListener('click', () => window.navigate(worst.path));
  }
}
```

- [ ] **Step 2: Verificar tests siguen verdes.** `http://localhost:8765/test/` — el añadido DOM no debe romper los tests puros.
Expected: 154 passed, 0 failed.

- [ ] **Step 3: Commit**

```bash
cd /home/hugo/japones-n5
git add js/exam.js
git commit -m "feat(exam): orquestador DOM — intro, secciones cronometradas, prev/next, resultados"
```

---

## Task 6: Integración — ruta, tarjeta en home y CSS

**Files:**
- Modify: `js/app.js`
- Modify: `js/home.js`
- Modify: `css/exercise.css`

- [ ] **Step 1: `js/app.js`** — añadir el import tras la línea 16 (`import { start as startAdjectives }...`):

```js
import { start as startExam } from './exam.js';
```

- [ ] **Step 2: `js/app.js`** — añadir la ruta. Tras el bloque `else if (seg1 === 'review')` (líneas 95-96), antes del `else` final, insertar:

```js
    } else if (seg1 === 'exam') {
      const [vocab, kanji, particles, grammar, listening, reading] = await Promise.all([
        loadData('vocab-n5.json'),
        loadData('kanji-n5.json'),
        loadData('particles.json'),
        loadData('grammar-n5.json'),
        loadData('listening-n5.json'),
        loadData('reading-n5.json'),
      ]);
      await startExam(container, { vocab, kanji, particles, grammar, listening, reading });
```

- [ ] **Step 3: `js/home.js`** — añadir la tarjeta. Tras el cierre del `</div>` de `.review-card` (línea 181), antes de `<main class="home-grid"...>`, insertar:

```html
        <div class="exam-card" data-path="/exam" style="animation-delay:.12s">
          <div class="exam-card-icon">📝</div>
          <div class="exam-card-text">
            <div class="exam-card-title">Simulacro JLPT N5</div>
            <div class="exam-card-sub">90 min · 43 preguntas · cronometrado</div>
          </div>
          <div class="exam-card-arrow">→</div>
        </div>
```

- [ ] **Step 4: `js/home.js`** — añadir el handler de click. Tras el bloque de `.review-card` click (líneas 192-193):

```js
  container.querySelector('.exam-card')
    ?.addEventListener('click', () => window.navigate('/exam'));
```

- [ ] **Step 5: `css/exercise.css`** — añadir al final del archivo:

```css
/* ===== Modo examen ===== */
.exam-card {
  display: flex; align-items: center; gap: 0.8rem;
  padding: 0.9rem 1.1rem;
  background: linear-gradient(135deg, var(--c-blue), var(--c-teal));
  color: #fff; border-radius: 12px; margin: 0 0 1rem;
  cursor: pointer; box-shadow: 0 2px 16px rgba(79,70,229,.2);
  transition: transform .15s ease, box-shadow .15s ease;
  animation: cardEnter .4s ease both;
}
.exam-card:hover { transform: translateY(-2px); box-shadow: 0 6px 24px rgba(79,70,229,.28); }
.exam-card-icon { font-size: 2rem; }
.exam-card-text { flex: 1; }
.exam-card-title { font-weight: 700; font-size: 1.05rem; }
.exam-card-sub { font-size: 0.85rem; opacity: 0.9; }
.exam-card-arrow { font-size: 1.4rem; opacity: 0.85; }

.exam-intro main { padding: 0 .25rem; display: flex; flex-direction: column; gap: 1rem; }
.exam-intro-text { color: var(--text-muted); font-size: .95rem; line-height: 1.5; }
.exam-intro-note { font-size: .85rem; color: var(--text-muted); }

.exam-header { justify-content: space-between; }
.exam-section-label { font-weight: 700; }
.exam-timer {
  font-variant-numeric: tabular-nums; font-weight: 700;
  background: var(--bg-hover); padding: .2rem .7rem; border-radius: 999px;
}
.exam-timer.warning { background: #fef2f2; color: var(--c-red); }
[data-theme="dark"] .exam-timer.warning { background: #450a0a; }
.exam-progress { color: var(--text-muted); font-variant-numeric: tabular-nums; }

.exam-nav {
  display: flex; gap: .5rem; padding: .75rem 1rem;
  border-top: 1px solid var(--border); background: var(--bg);
}
.exam-nav .btn-secondary { flex: 1; }

.exam-section-table { width: 100%; border-collapse: collapse; }
.exam-section-table th, .exam-section-table td {
  padding: .5rem .6rem; text-align: left; border-bottom: 1px solid var(--border);
}
.exam-section-table tfoot td { font-weight: 700; }

.exam-final-score {
  text-align: center; padding: 1.5rem; border-radius: 12px; margin-bottom: 1rem;
}
.exam-final-score.pass { background: rgba(22,163,74,.12); }
.exam-final-score.fail { background: rgba(220,38,38,.10); }
.exam-pct { font-size: 3rem; font-weight: 900; line-height: 1; }
.exam-verdict { font-size: 1.1rem; margin-top: .4rem; }
.exam-verdict small { display: block; color: var(--text-muted); font-weight: 400; margin-top: .2rem; }
.exam-groups { margin: 1rem 0; display: flex; flex-direction: column; gap: .4rem; }
.exam-diagnosis {
  background: var(--bg-hover); padding: 1rem; border-radius: 8px; margin: 1rem 0;
  display: flex; flex-direction: column; gap: .6rem; align-items: flex-start;
}
.exam-actions { display: flex; gap: .75rem; justify-content: center; margin-top: 1rem; }

/* La opción elegida durante el examen (sin feedback ✓/✗) */
.exam-input .choice-btn.selected {
  border-color: var(--c-blue); background: #eef2ff; color: var(--c-blue);
}
[data-theme="dark"] .exam-input .choice-btn.selected { background: #1e1b4b; }
```

- [ ] **Step 6: Verificación manual completa en navegador.** `http://localhost:8765/` → tarjeta "Simulacro JLPT N5" visible arriba. Click → intro. "Comenzar":
  - Moji-Goi: 20 preguntas, timer corriendo, prev/next navega y conserva la opción elegida (resaltada).
  - Teclas 1-9 seleccionan la opción del panel visible.
  - "Terminar sección" pide confirmación y salta a Bunpou-Dokkai.
  - Bunpou-Dokkai: incluye textos dokkai (con furigana) + partículas + gramática.
  - Choukai: el audio suena solo al ver la pregunta; ▶/↻ permiten 1 repetición y luego se deshabilitan (máx 2 total). Al volver con ←/→ no se vuelve a reproducir.
  - Resultados: % global, veredicto con cortes, tabla por sección, líneas de los 2 grupos, diagnóstico del bloque más flojo con enlace, botones Inicio / Otro simulacro.

- [ ] **Step 7: Verificar que el examen NO escribe SRS.** Antes de empezar, anota el % de un bloque en el home. Haz un simulacro completo. Vuelve al home.
Expected: los % de los bloques no cambian (el examen es evaluativo).

- [ ] **Step 8: Commit**

```bash
cd /home/hugo/japones-n5
git add js/app.js js/home.js css/exercise.css
git commit -m "feat(exam): ruta /exam, tarjeta 'Simulacro JLPT N5' en home y estilos"
```

---

## Task 7: Docs + tag `fase-4-examen`

**Files:**
- Modify: `CLAUDE.md`
- Modify: `docs/superpowers/specs/2026-05-16-mejoras-n5-design.md`

- [ ] **Step 1: `CLAUDE.md`** — en la tabla de fases, cambiar la fila `4-D` de `⏳ pendiente` a `✅` con tag `fase-4-examen`. En "Pendientes conocidos", eliminar el bloque "Modo examen JLPT (4-D)" (ya implementado) o marcarlo como hecho.

- [ ] **Step 2: spec maestro** — en `docs/superpowers/specs/2026-05-16-mejoras-n5-design.md` §4.2 y en la línea de estado de la fase 4, marcar el modo examen como ✅ implementado (tag `fase-4-examen`), notando el scoring fiel (44% global + 32% por grupo) y los renderers reusados.

- [ ] **Step 3: Verificar tests por última vez.** `http://localhost:8765/test/`.
Expected: 154 passed, 0 failed.

- [ ] **Step 4: Commit + tag**

```bash
cd /home/hugo/japones-n5
git add CLAUDE.md docs/superpowers/specs/2026-05-16-mejoras-n5-design.md
git commit -m "docs: marcar modo examen JLPT (4-D) como implementado"
git tag fase-4-examen
```

---

## Notas de verificación / riesgos

- **Acoplamiento del cleanup**: `exam.js` llama al `cleanup` de cada `renderInput` justo tras renderizar, asumiendo que solo elimina el keydown de `document` (cierto en los 6 bloques). Si un bloque futuro hiciera más en su cleanup, revisar `getQuestionNode`.
- **IDs duplicados en reading**: cada panel dokkai usa `#reading-furigana-cb`/`#reading-text`, pero el render perezoso mantiene un solo panel en el DOM a la vez y reading usa `el.querySelector` (no `getElementById`), así que no colisionan.
- **DOM/timer/audio sin tests unitarios**: se verifican en navegador real (regla CLAUDE.md). Los tests cubren solo lógica pura.
- **`audio/manifest.json`**: el examen no añade cadenas JP nuevas (reúsa contenido existente), así que no hace falta `generate-audio.py`.
