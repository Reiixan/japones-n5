# Lecciones (Libro interactivo) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Añadir un sistema de lecciones tipo libro a la webapp N5 — contenido narrativo con ejemplos intercalados y ejercicios al final, progreso persistido en localStorage.

**Architecture:** `js/lessons.js` es el módulo único que gestiona progreso en localStorage, renderiza el índice y cada lección individual. Los datos viven en `data/lessons/index.json` + `data/lessons/<id>.json`. Los ejercicios son inline (no usan el motor `startExercise`). La racha diaria se alimenta llamando a `recordPracticeTick()` una vez por ejercicio respondido correctamente.

**Tech Stack:** Vanilla JS ES modules, CSS custom properties (`styles.css`), localStorage, sin dependencias externas. Runner de tests casero en `test/`.

---

## Mapa de archivos

| Acción | Archivo | Responsabilidad |
|---|---|---|
| Crear | `js/lessons.js` | parseMd, progress storage, renderIndex, renderLesson, block renderers |
| Crear | `css/lessons.css` | Estilos de lecciones (layout, bloques, ejercicios inline) |
| Crear | `data/lessons/index.json` | Metadatos de las 8 lecciones en orden recomendado |
| Crear | `data/lessons/l01-hiragana.json` | Contenido lección 1 |
| Crear | `data/lessons/l02-katakana.json` | Contenido lección 2 |
| Crear | `data/lessons/l03-saludos.json` | Contenido lección 3 |
| Crear | `data/lessons/l04-numeros.json` | Contenido lección 4 |
| Crear | `data/lessons/l05-copula.json` | Contenido lección 5 |
| Crear | `data/lessons/l06-particulas.json` | Contenido lección 6 |
| Crear | `data/lessons/l07-verbos-masu.json` | Contenido lección 7 |
| Crear | `data/lessons/l08-adjetivos.json` | Contenido lección 8 |
| Crear | `test/lessons.test.js` | Tests de parseMd y progress storage |
| Modificar | `js/app.js` | Añadir rutas `/lessons` y `/lessons/<id>` |
| Modificar | `js/home.js` | Añadir tarjeta Lecciones + guard para bloque sin `file` |
| Modificar | `index.html` | Añadir `<link>` a `css/lessons.css` |
| Modificar | `test/index.html` | Registrar `lessons.test.js` |

---

## Task 1: Tests para parseMd (TDD — escribir primero)

**Files:**
- Create: `test/lessons.test.js`

- [ ] **Step 1: Crear `test/lessons.test.js` con tests para `parseMd`**

```js
import { describe, it, assertEqual } from './runner.js';

describe('parseMd — negrita', () => {
  it('**texto** → <strong>texto</strong>', async () => {
    const { parseMd } = await import('../js/lessons.js?c=md1');
    assertEqual(parseMd('**hola**'), '<p><strong>hola</strong></p>');
  });
  it('texto mixto con negrita', async () => {
    const { parseMd } = await import('../js/lessons.js?c=md2');
    assertEqual(parseMd('el **hiragana** es'), '<p>el <strong>hiragana</strong> es</p>');
  });
});

describe('parseMd — cursiva', () => {
  it('*texto* → <em>texto</em>', async () => {
    const { parseMd } = await import('../js/lessons.js?c=md3');
    assertEqual(parseMd('*nota*'), '<p><em>nota</em></p>');
  });
});

describe('parseMd — código inline', () => {
  it('`código` → <code>código</code>', async () => {
    const { parseMd } = await import('../js/lessons.js?c=md4');
    assertEqual(parseMd('usa `です`'), '<p>usa <code>です</code></p>');
  });
});

describe('parseMd — párrafos', () => {
  it('doble newline genera dos párrafos', async () => {
    const { parseMd } = await import('../js/lessons.js?c=md5');
    assertEqual(parseMd('uno\n\ndos'), '<p>uno</p><p>dos</p>');
  });
  it('salto simple dentro del mismo párrafo', async () => {
    const { parseMd } = await import('../js/lessons.js?c=md6');
    assertEqual(parseMd('uno\ndos'), '<p>uno\ndos</p>');
  });
});

describe('parseMd — listas', () => {
  it('líneas con "- " forman <ul><li>', async () => {
    const { parseMd } = await import('../js/lessons.js?c=md7');
    const result = parseMd('- alfa\n- beta');
    assertEqual(result, '<ul><li>alfa</li><li>beta</li></ul>');
  });
});
```

- [ ] **Step 2: Registrar en `test/index.html`**

En `test/index.html`, añadir antes de `await run()`:
```html
    await import('./lessons.test.js');
```

- [ ] **Step 3: Arrancar el servidor y abrir `http://localhost:8765/test/` — verificar que los tests de `parseMd` fallan con "lessons.js not found" o similar**

```bash
cd /home/hugo/japones-n5 && python3 -m http.server 8765 --bind 0.0.0.0 &
```

---

## Task 2: Tests para progress storage (TDD — escribir primero)

**Files:**
- Modify: `test/lessons.test.js`

- [ ] **Step 1: Añadir tests de progress storage al final de `test/lessons.test.js`**

```js
describe('getLessonProgress — sin datos', () => {
  it('devuelve null si no hay entrada en localStorage', async () => {
    localStorage.removeItem('jp_n5_lesson.l01-hiragana');
    const { getLessonProgress } = await import('../js/lessons.js?c=lp1');
    assertEqual(getLessonProgress('l01-hiragana'), null);
  });
});

describe('setLessonStarted / getLessonProgress', () => {
  it('graba status=started y lastBlock', async () => {
    localStorage.removeItem('jp_n5_lesson.test-abc');
    const { setLessonStarted, getLessonProgress } = await import('../js/lessons.js?c=lp2');
    setLessonStarted('test-abc', 3);
    const p = getLessonProgress('test-abc');
    assertEqual(p.status, 'started');
    assertEqual(p.lastBlock, 3);
    localStorage.removeItem('jp_n5_lesson.test-abc');
  });
});

describe('setLessonCompleted / getLessonProgress', () => {
  it('graba status=completed', async () => {
    localStorage.removeItem('jp_n5_lesson.test-xyz');
    const { setLessonCompleted, getLessonProgress } = await import('../js/lessons.js?c=lp3');
    setLessonCompleted('test-xyz');
    const p = getLessonProgress('test-xyz');
    assertEqual(p.status, 'completed');
    localStorage.removeItem('jp_n5_lesson.test-xyz');
  });
  it('setLessonCompleted preserva lastBlock si ya existía', async () => {
    localStorage.setItem('jp_n5_lesson.test-xyz2', JSON.stringify({ status: 'started', lastBlock: 5 }));
    const { setLessonCompleted, getLessonProgress } = await import('../js/lessons.js?c=lp4');
    setLessonCompleted('test-xyz2');
    const p = getLessonProgress('test-xyz2');
    assertEqual(p.status, 'completed');
    assertEqual(p.lastBlock, 5);
    localStorage.removeItem('jp_n5_lesson.test-xyz2');
  });
});
```

- [ ] **Step 2: Verificar en el navegador que los tests nuevos fallan (lessons.js aún no existe)**

---

## Task 3: Crear `js/lessons.js` — parseMd + progress storage

**Files:**
- Create: `js/lessons.js`

- [ ] **Step 1: Crear `js/lessons.js` con parseMd y las funciones de progreso**

```js
import { recordPracticeTick } from './daily.js';

// ─── parseMd ──────────────────────────────────────────────────────────────────
// Markdown básico: **negrita**, *cursiva*, `código`, párrafos, listas con "- "
export function parseMd(text) {
  const paragraphs = text.split(/\n\n+/);
  return paragraphs.map(para => {
    const lines = para.split('\n');
    if (lines.every(l => l.startsWith('- '))) {
      const items = lines.map(l => `<li>${inlineMarkup(l.slice(2))}</li>`).join('');
      return `<ul>${items}</ul>`;
    }
    return `<p>${inlineMarkup(para)}</p>`;
  }).join('');
}

function inlineMarkup(text) {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code>$1</code>');
}

// ─── Progress storage ─────────────────────────────────────────────────────────
const KEY_PREFIX = 'jp_n5_lesson.';

export function getLessonProgress(id) {
  const raw = localStorage.getItem(KEY_PREFIX + id);
  return raw ? JSON.parse(raw) : null;
}

export function setLessonStarted(id, blockIndex) {
  const existing = getLessonProgress(id);
  const entry = { status: 'started', lastBlock: blockIndex };
  if (existing?.status === 'completed') return; // no retrogradar
  localStorage.setItem(KEY_PREFIX + id, JSON.stringify(entry));
}

export function setLessonCompleted(id) {
  const existing = getLessonProgress(id);
  const entry = { status: 'completed', lastBlock: existing?.lastBlock ?? 0 };
  localStorage.setItem(KEY_PREFIX + id, JSON.stringify(entry));
}
```

- [ ] **Step 2: Abrir `http://localhost:8765/test/` y confirmar que los tests de parseMd y progress storage pasan**

Los tests de los Tasks 1 y 2 deben pasar. El total de tests aumenta.

- [ ] **Step 3: Commit**

```bash
git add js/lessons.js test/lessons.test.js test/index.html
git commit -m "feat(lessons): parseMd + progress storage con tests"
```

---

## Task 4: CSS — `css/lessons.css`

**Files:**
- Create: `css/lessons.css`
- Modify: `index.html`

- [ ] **Step 1: Crear `css/lessons.css`**

```css
/* === Lesson wrapper === */
.lesson-wrap {
  max-width: 680px;
  margin: 0 auto;
  padding: 0 1.5rem 3rem;
}
@media (max-width: 600px) {
  .lesson-wrap { padding: 0 1rem 2rem; }
}

/* === Lesson header === */
.lesson-header {
  display: flex; align-items: center; gap: .75rem;
  padding: 1rem 0;
  border-bottom: 1px solid var(--border);
  margin-bottom: 1.5rem;
  position: sticky; top: 0;
  background: var(--bg);
  z-index: 10;
}
.lesson-header h1 {
  font-size: 1.1rem; font-weight: 700;
  flex: 1; margin: 0;
}
.lesson-topic-badge {
  font-size: .75rem; font-weight: 600;
  padding: .2rem .6rem;
  border-radius: 99px;
  background: var(--bg-hover);
  color: var(--text-muted);
}

/* === Content blocks === */
.lesson-block { margin-bottom: 1.25rem; }

.lesson-text { line-height: 1.75; }
.lesson-text p { margin-bottom: .75rem; }
.lesson-text ul { padding-left: 1.25rem; list-style: disc; }
.lesson-text li { margin-bottom: .3rem; line-height: 1.6; }
.lesson-text strong { font-weight: 700; }
.lesson-text em { font-style: italic; }
.lesson-text code {
  font-family: monospace;
  background: var(--bg-hover);
  padding: .1em .35em;
  border-radius: 4px;
  font-size: .95em;
}

.lesson-example {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: .85rem 1rem;
  display: flex; flex-direction: column; gap: .2rem;
}
.lesson-example-jp {
  font-family: var(--font-jp);
  font-size: 1.35rem;
  line-height: 1.5;
  color: var(--text);
}
.lesson-example-es { font-size: .9rem; color: var(--text-muted); }
.lesson-example-romaji { font-size: .8rem; color: var(--text-light); font-style: italic; }

.lesson-table { width: 100%; border-collapse: collapse; font-size: .9rem; }
.lesson-table th {
  text-align: left; font-weight: 700;
  padding: .45rem .65rem;
  border-bottom: 2px solid var(--border);
}
.lesson-table td {
  padding: .4rem .65rem;
  border-bottom: 1px solid var(--border);
  font-family: var(--font-jp);
}
.lesson-table tr:last-child td { border-bottom: none; }

.lesson-note {
  border-left: 3px solid var(--c-blue);
  background: color-mix(in srgb, var(--c-blue) 6%, var(--bg));
  padding: .7rem 1rem;
  border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
  font-size: .9rem;
  line-height: 1.65;
}
.lesson-note strong { font-weight: 700; }

/* === Exercises section === */
.lesson-exercises-title {
  font-size: .85rem; font-weight: 700; text-transform: uppercase;
  letter-spacing: .05em; color: var(--text-muted);
  margin: 2rem 0 1rem;
  padding-top: 1.5rem;
  border-top: 2px solid var(--border);
}

.lesson-exercise {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 1rem;
  margin-bottom: .75rem;
  transition: border-color .2s;
}
.lesson-exercise.correct { border-color: var(--c-green); }
.lesson-exercise.incorrect { border-color: var(--c-red); }

.lesson-exercise-prompt {
  font-size: .95rem; font-weight: 600;
  margin-bottom: .75rem;
  line-height: 1.5;
  font-family: var(--font-jp);
}
.lesson-exercise-hint { font-size: .8rem; color: var(--text-light); margin-top: .35rem; }

.lesson-exercise-options {
  display: flex; flex-wrap: wrap; gap: .5rem;
}
.lesson-exercise-btn {
  padding: .45rem .9rem;
  border: 1.5px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--bg);
  font-family: var(--font-jp);
  font-size: .95rem;
  cursor: pointer;
  transition: background .15s, border-color .15s, color .15s;
}
.lesson-exercise-btn:hover:not(:disabled) { background: var(--bg-hover); }
.lesson-exercise-btn.selected-correct {
  background: color-mix(in srgb, var(--c-green) 15%, var(--bg));
  border-color: var(--c-green);
  color: var(--c-green);
  font-weight: 700;
}
.lesson-exercise-btn.selected-incorrect {
  background: color-mix(in srgb, var(--c-red) 12%, var(--bg));
  border-color: var(--c-red);
  color: var(--c-red);
}
.lesson-exercise-btn.reveal-correct {
  border-color: var(--c-green);
  color: var(--c-green);
  font-weight: 700;
}
.lesson-exercise-btn:disabled { cursor: default; }

.lesson-exercise-feedback {
  margin-top: .6rem;
  font-size: .85rem;
  font-weight: 600;
}
.lesson-exercise-feedback.ok { color: var(--c-green); }
.lesson-exercise-feedback.ko { color: var(--c-red); }

/* === Completion bar === */
.lesson-completion {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 1.25rem;
  margin-top: 1.5rem;
  text-align: center;
  display: none;
}
.lesson-completion.visible { display: block; }
.lesson-completion-score {
  font-size: 1.5rem; font-weight: 800;
  margin-bottom: .5rem;
}
.lesson-completion-label { color: var(--text-muted); font-size: .9rem; margin-bottom: 1rem; }
.lesson-completion-actions { display: flex; gap: .75rem; justify-content: center; flex-wrap: wrap; }

/* === Lesson index === */
.lesson-index-wrap {
  max-width: 680px;
  margin: 0 auto;
  padding: 0 1.5rem 3rem;
}
.lesson-index-header {
  padding: 1rem 0 1.25rem;
  border-bottom: 1px solid var(--border);
  margin-bottom: 1.5rem;
  display: flex; align-items: center; gap: .75rem;
}
.lesson-index-header h1 { font-size: 1.1rem; font-weight: 700; margin: 0; flex: 1; }

.lesson-index-list { display: flex; flex-direction: column; gap: .6rem; }

.lesson-index-card {
  display: flex; align-items: center; gap: 1rem;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: .85rem 1rem;
  cursor: pointer;
  transition: background .15s, box-shadow .15s;
}
.lesson-index-card:hover { background: var(--bg-hover); }
.lesson-index-card:focus-visible { outline: 2px solid var(--c-blue); outline-offset: 2px; }

.lesson-index-status {
  width: 1.4rem; height: 1.4rem;
  border-radius: 50%;
  flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  font-size: .7rem;
}
.lesson-index-status.pending {
  border: 2px solid var(--text-light);
}
.lesson-index-status.started {
  border: 2px solid var(--c-orange);
  background: color-mix(in srgb, var(--c-orange) 20%, transparent);
}
.lesson-index-status.completed {
  background: var(--c-green);
  border: 2px solid var(--c-green);
}
.lesson-index-status.completed::after { content: '✓'; color: #fff; font-weight: 700; }

.lesson-index-info { flex: 1; min-width: 0; }
.lesson-index-title {
  font-weight: 600; font-size: .95rem;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.lesson-index-meta { font-size: .78rem; color: var(--text-light); margin-top: .15rem; }

.lesson-index-arrow { color: var(--text-light); font-size: .9rem; }
```

- [ ] **Step 2: Añadir el link CSS en `index.html`** — insertar antes del cierre `</head>`:

```html
  <link rel="stylesheet" href="css/lessons.css">
```

- [ ] **Step 3: Commit**

```bash
git add css/lessons.css index.html
git commit -m "feat(lessons): añadir CSS de lecciones"
```

---

## Task 5: Block renderers en `js/lessons.js`

**Files:**
- Modify: `js/lessons.js`

- [ ] **Step 1: Añadir funciones `renderBlock` y `renderBlocks` tras las funciones de progreso**

```js
// ─── Block renderers ──────────────────────────────────────────────────────────

function renderBlock(block) {
  switch (block.type) {
    case 'text':
      return `<div class="lesson-block lesson-text">${parseMd(block.md)}</div>`;

    case 'example': {
      const romaji = block.romaji
        ? `<div class="lesson-example-romaji">${block.romaji}</div>`
        : '';
      return `
        <div class="lesson-block lesson-example">
          <div class="lesson-example-jp">${block.jp}</div>
          <div class="lesson-example-es">${block.es}</div>
          ${romaji}
        </div>`;
    }

    case 'table': {
      const headers = block.headers.map(h => `<th>${h}</th>`).join('');
      const rows = block.rows.map(row =>
        `<tr>${row.map(cell => `<td>${cell}</td>`).join('')}</tr>`
      ).join('');
      return `
        <div class="lesson-block">
          <table class="lesson-table">
            <thead><tr>${headers}</tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </div>`;
    }

    case 'note':
      return `<div class="lesson-block lesson-note">${parseMd(block.md)}</div>`;

    default:
      return '';
  }
}
```

- [ ] **Step 2: Verificar que la función está exportable. No se puede probar en browser todavía (no hay ruta), pero el módulo no debe dar errores de sintaxis. Verificar abriendo la consola de herramientas de developer del browser y haciendo `import('/js/lessons.js').then(m => console.log(Object.keys(m)))`**

---

## Task 6: Exercise renderers + score en `js/lessons.js`

**Files:**
- Modify: `js/lessons.js`

- [ ] **Step 1: Añadir `renderExercises` al módulo**

Esta función renderiza todos los ejercicios de una lección dentro de un contenedor dado. Gestiona score y llama al callback `onAllAnswered(score, total)` cuando todos están respondidos.

```js
// ─── Exercise renderers ───────────────────────────────────────────────────────

function renderExercises(exercises, container, onAllAnswered) {
  let answered = 0;
  let correct = 0;
  const total = exercises.length;

  const wrapEl = document.createElement('div');
  wrapEl.innerHTML = `<div class="lesson-exercises-title">Ejercicios</div>`;

  exercises.forEach((ex, i) => {
    const el = document.createElement('div');
    el.className = 'lesson-exercise';
    el.dataset.index = i;

    if (ex.type === 'exercise-mc') {
      const hint = ex.hint ? `<div class="lesson-exercise-hint">${ex.hint}</div>` : '';
      el.innerHTML = `
        <div class="lesson-exercise-prompt">${ex.prompt}${hint}</div>
        <div class="lesson-exercise-options">
          ${ex.options.map(o => `<button class="lesson-exercise-btn" data-value="${o}">${o}</button>`).join('')}
        </div>
        <div class="lesson-exercise-feedback"></div>`;
      attachOptionHandler(el, ex.answer, () => {
        answered++;
        if (checkOption(el, ex.answer)) correct++;
        recordPracticeTick();
        if (answered === total) onAllAnswered(correct, total);
      });
    }

    if (ex.type === 'exercise-tf') {
      el.innerHTML = `
        <div class="lesson-exercise-prompt">${ex.statement}</div>
        <div class="lesson-exercise-options">
          <button class="lesson-exercise-btn" data-value="true">Verdadero</button>
          <button class="lesson-exercise-btn" data-value="false">Falso</button>
        </div>
        <div class="lesson-exercise-feedback"></div>`;
      const strAnswer = String(ex.answer);
      attachOptionHandler(el, strAnswer, () => {
        answered++;
        if (checkOption(el, strAnswer)) correct++;
        recordPracticeTick();
        if (answered === total) onAllAnswered(correct, total);
      });
    }

    if (ex.type === 'exercise-gap') {
      const hint = ex.hint ? `<div class="lesson-exercise-hint">Pista: ${ex.hint}</div>` : '';
      el.innerHTML = `
        <div class="lesson-exercise-prompt">${ex.prompt}${hint}</div>
        <div class="lesson-exercise-options">
          ${ex.options.map(o => `<button class="lesson-exercise-btn" data-value="${o}">${o}</button>`).join('')}
        </div>
        <div class="lesson-exercise-feedback"></div>`;
      attachOptionHandler(el, ex.answer, () => {
        answered++;
        if (checkOption(el, ex.answer)) correct++;
        recordPracticeTick();
        if (answered === total) onAllAnswered(correct, total);
      });
    }

    wrapEl.appendChild(el);
  });

  container.appendChild(wrapEl);
}

function attachOptionHandler(exerciseEl, correctAnswer, onAnswered) {
  const btns = exerciseEl.querySelectorAll('.lesson-exercise-btn');
  btns.forEach(btn => {
    btn.addEventListener('click', () => {
      if (exerciseEl.dataset.answered) return;
      exerciseEl.dataset.answered = '1';
      btns.forEach(b => b.disabled = true);
      onAnswered();
    });
  });
}

function checkOption(exerciseEl, correctAnswer) {
  const btns = exerciseEl.querySelectorAll('.lesson-exercise-btn');
  const feedback = exerciseEl.querySelector('.lesson-exercise-feedback');
  let isCorrect = false;

  btns.forEach(btn => {
    if (btn.dataset.value === correctAnswer) {
      btn.classList.add('reveal-correct');
    }
  });

  // Find which button was the last clicked (we mark it via event)
  // Instead, we compare disabled buttons that aren't the correct one
  // Actually we need to know which was clicked — use a closure approach:
  // Re-implement: attach handler returns the clicked value
  // See Task 6 Step 2 for the corrected pattern
  return isCorrect;
}
```

- [ ] **Step 2: La función `checkOption` necesita saber qué botón fue pulsado. Reescribir `attachOptionHandler` y `checkOption` con el patrón correcto:**

```js
function attachOptionHandler(exerciseEl, correctAnswer, onAnswered) {
  const btns = exerciseEl.querySelectorAll('.lesson-exercise-btn');
  btns.forEach(btn => {
    btn.addEventListener('click', () => {
      if (exerciseEl.dataset.answered) return;
      exerciseEl.dataset.answered = '1';
      btns.forEach(b => b.disabled = true);

      const chosen = btn.dataset.value;
      const isCorrect = chosen === correctAnswer;

      // Visual feedback on buttons
      btns.forEach(b => {
        if (b.dataset.value === correctAnswer) b.classList.add('reveal-correct');
      });
      if (!isCorrect) btn.classList.add('selected-incorrect');
      else btn.classList.add('selected-correct');

      const feedback = exerciseEl.querySelector('.lesson-exercise-feedback');
      if (isCorrect) {
        feedback.textContent = '✓ Correcto';
        feedback.className = 'lesson-exercise-feedback ok';
        exerciseEl.classList.add('correct');
      } else {
        feedback.textContent = '✗ Incorrecto';
        feedback.className = 'lesson-exercise-feedback ko';
        exerciseEl.classList.add('incorrect');
      }

      onAnswered(isCorrect);
    });
  });
}
```

Y actualizar `renderExercises` para recibir `isCorrect` del callback:

```js
// Reemplazar los bloques attachOptionHandler(..., () => { ... }) por:
attachOptionHandler(el, ex.answer, (isCorrect) => {
  answered++;
  if (isCorrect) correct++;
  recordPracticeTick();
  if (answered === total) onAllAnswered(correct, total);
});
```

Borrar la función `checkOption` anterior (ya no se usa — la lógica está en `attachOptionHandler`).

- [ ] **Step 3: El módulo completo de `js/lessons.js` en este punto debe tener:**
  - `export function parseMd(text)`
  - `export function getLessonProgress(id)`
  - `export function setLessonStarted(id, blockIndex)`
  - `export function setLessonCompleted(id)`
  - `function renderBlock(block)` (interna)
  - `function renderExercises(exercises, container, onAllAnswered)` (interna)
  - `function attachOptionHandler(exerciseEl, correctAnswer, onAnswered)` (interna)

- [ ] **Step 4: Commit**

```bash
git add js/lessons.js
git commit -m "feat(lessons): block renderers y motor de ejercicios inline"
```

---

## Task 7: `renderLessonIndex` y `renderLesson`

**Files:**
- Modify: `js/lessons.js`

- [ ] **Step 1: Añadir `renderLessonIndex` al módulo**

```js
// ─── renderLessonIndex ────────────────────────────────────────────────────────

export async function renderLessonIndex(container) {
  const index = await fetch('./data/lessons/index.json').then(r => r.json());

  container.innerHTML = `
    <div class="lesson-index-wrap">
      <div class="lesson-index-header">
        <button class="btn-icon" id="lessons-back">←</button>
        <h1>レッスン — Lecciones</h1>
      </div>
      <div class="lesson-index-list">
        ${index.map((lesson, i) => {
          const p = getLessonProgress(lesson.id);
          const statusClass = p?.status === 'completed' ? 'completed'
            : p?.status === 'started' ? 'started' : 'pending';
          return `
            <div class="lesson-index-card" data-id="${lesson.id}"
                 role="button" tabindex="0" aria-label="${lesson.title}">
              <div class="lesson-index-status ${statusClass}"></div>
              <div class="lesson-index-info">
                <div class="lesson-index-title">${i + 1}. ${lesson.title}</div>
                <div class="lesson-index-meta">${lesson.topic} · ~${lesson.estimatedMin} min</div>
              </div>
              <div class="lesson-index-arrow">→</div>
            </div>`;
        }).join('')}
      </div>
    </div>`;

  document.getElementById('lessons-back').addEventListener('click', () => window.navigate('/'));

  container.querySelectorAll('.lesson-index-card').forEach(card => {
    const go = () => window.navigate(`/lessons/${card.dataset.id}`);
    card.addEventListener('click', go);
    card.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); }
    });
  });
}
```

- [ ] **Step 2: Añadir `renderLesson` al módulo**

```js
// ─── renderLesson ─────────────────────────────────────────────────────────────

export async function renderLesson(container, id) {
  const [index, blocks] = await Promise.all([
    fetch('./data/lessons/index.json').then(r => r.json()),
    fetch(`./data/lessons/${id}.json`).then(r => r.json()),
  ]);

  const meta = index.find(l => l.id === id);
  if (!meta) { window.navigate('/lessons'); return; }

  const currentIdx = index.findIndex(l => l.id === id);
  const nextLesson = index[currentIdx + 1] ?? null;

  // Separar bloques de contenido y ejercicios
  const contentBlocks = blocks.filter(b => !b.type.startsWith('exercise-'));
  const exerciseBlocks = blocks.filter(b => b.type.startsWith('exercise-'));

  container.innerHTML = `
    <div class="lesson-wrap">
      <div class="lesson-header">
        <button class="btn-icon" id="lesson-back">←</button>
        <h1>${meta.title}</h1>
        <span class="lesson-topic-badge">${meta.topic}</span>
      </div>
      <div id="lesson-content">
        ${contentBlocks.map(renderBlock).join('')}
      </div>
      <div id="lesson-exercises"></div>
      <div class="lesson-completion" id="lesson-completion">
        <div class="lesson-completion-score" id="lesson-score"></div>
        <div class="lesson-completion-label">ejercicios completados</div>
        <div class="lesson-completion-actions">
          <button class="btn-primary" id="lesson-mark-done">Marcar como completada ✓</button>
          ${nextLesson ? `<button class="btn-primary" id="lesson-next" style="background:var(--c-teal)">Siguiente lección →</button>` : ''}
        </div>
      </div>
    </div>`;

  document.getElementById('lesson-back').addEventListener('click', () => window.navigate('/lessons'));

  // Marcar como empezada al abrir
  setLessonStarted(id, 0);

  // Renderizar ejercicios (si los hay)
  const exerciseContainer = document.getElementById('lesson-exercises');
  if (exerciseBlocks.length > 0) {
    renderExercises(exerciseBlocks, exerciseContainer, (correct, total) => {
      const scoreEl = document.getElementById('lesson-score');
      scoreEl.textContent = `${correct} / ${total}`;
      document.getElementById('lesson-completion').classList.add('visible');
    });
  } else {
    // Sin ejercicios: mostrar completion directamente
    document.getElementById('lesson-score').textContent = '—';
    document.getElementById('lesson-completion').classList.add('visible');
  }

  // Botón marcar completada
  document.getElementById('lesson-mark-done').addEventListener('click', () => {
    setLessonCompleted(id);
    document.getElementById('lesson-mark-done').textContent = '✓ Completada';
    document.getElementById('lesson-mark-done').disabled = true;
  });

  // Botón siguiente
  const nextBtn = document.getElementById('lesson-next');
  if (nextBtn) {
    nextBtn.addEventListener('click', () => window.navigate(`/lessons/${nextLesson.id}`));
  }

  // Restaurar posición si había progreso
  const progress = getLessonProgress(id);
  if (progress?.lastBlock > 0) {
    const allBlocks = container.querySelectorAll('.lesson-block');
    const target = allBlocks[Math.min(progress.lastBlock, allBlocks.length - 1)];
    if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // IntersectionObserver para actualizar lastBlock al hacer scroll
  const allBlocks = container.querySelectorAll('.lesson-block');
  if (allBlocks.length > 0 && 'IntersectionObserver' in window) {
    const obs = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const idx = Array.from(allBlocks).indexOf(entry.target);
          if (idx >= 0) setLessonStarted(id, idx);
        }
      });
    }, { threshold: 0.3 });
    allBlocks.forEach(b => obs.observe(b));
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add js/lessons.js
git commit -m "feat(lessons): renderLessonIndex y renderLesson"
```

---

## Task 8: Integración — `app.js`, `home.js`

**Files:**
- Modify: `js/app.js`
- Modify: `js/home.js`

- [ ] **Step 1: Añadir ruta en `js/app.js`**

Añadir el import al principio del archivo (junto al resto de imports):
```js
import { renderLessonIndex, renderLesson } from './lessons.js';
```

Añadir la rama de ruta dentro del bloque `try` de `route()`, antes del `else` final:
```js
    } else if (seg1 === 'lessons') {
      if (!seg2) {
        await renderLessonIndex(container);
      } else {
        await renderLesson(container, seg2);
      }
```

- [ ] **Step 2: Añadir tarjeta Lecciones en `js/home.js`**

En el array `BLOCKS`, añadir al final (antes del cierre `]`):
```js
  {
    id: 'lessons',
    label: 'Lecciones',
    jp: 'レッスン',
    file: null,
    desc: 'Cargando…',
    color: 'var(--c-teal)',
    path: '/lessons',
  },
```

En el array `SECTIONS`, añadir `'lessons'` en la sección que corresponda. Añadirla en una nueva sección "Libro" antes del grid principal — o, más sencillo, añadirla a la sección 'Escritura' (o crear una sección propia). La opción más limpia es añadirla en una nueva sección:

```js
  { label: 'Libro',       ids: ['lessons'] },
```

Añadir esta entrada como **primera** en el array `SECTIONS`:
```js
const SECTIONS = [
  { label: 'Libro',       ids: ['lessons'] },
  { label: 'Escritura',   ids: ['hiragana', 'katakana'] },
  { label: 'Vocabulario', ids: ['vocab', 'kanji'] },
  { label: 'Gramática',   ids: ['particles', 'grammar', 'verbs', 'adjectives'] },
  { label: 'Comprensión', ids: ['listening', 'reading'] },
];
```

- [ ] **Step 3: Guardar con guard para bloques sin `file` en los dos loops de `home.js`**

En el loop de stats (buscar `await Promise.all(BLOCKS.map(async (block) => {` — el primero):
```js
  await Promise.all(BLOCKS.map(async (block) => {
    if (!block.file) return;   // ← añadir esta línea
    const items = await loadData(block.file);
    ...
```

En el loop de due items (el segundo `Promise.all`):
```js
  await Promise.all(BLOCKS.map(async block => {
    if (!block.file) return;   // ← añadir esta línea
    const items = await loadData(block.file);
    ...
```

- [ ] **Step 4: Actualizar la desc de la tarjeta Lecciones asíncronamente**

Añadir al final de `renderHome`, después de los dos loops de `Promise.all`, el siguiente bloque:

```js
  // Actualizar tarjeta Lecciones con progreso real
  const lessonsCard = container.querySelector('.block-card[data-id="lessons"]');
  if (lessonsCard) {
    try {
      const lessonIndex = await loadData('lessons/index.json');
      const completed = lessonIndex.filter(l => {
        const raw = localStorage.getItem('jp_n5_lesson.' + l.id);
        return raw && JSON.parse(raw).status === 'completed';
      }).length;
      lessonsCard.classList.remove('loading');
      lessonsCard.querySelector('.block-desc').textContent =
        `${completed} / ${lessonIndex.length} completadas`;
      // Ocultar barra de progreso SRS (no aplica a lecciones)
      lessonsCard.querySelector('.block-progress').style.display = 'none';
    } catch (_) { /* index.json aún no existe */ }
  }
```

- [ ] **Step 5: Commit**

```bash
git add js/app.js js/home.js
git commit -m "feat(lessons): integrar rutas y tarjeta en el home"
```

---

## Task 9: Datos — `data/lessons/index.json` y 8 lecciones

**Files:**
- Create: `data/lessons/index.json`
- Create: `data/lessons/l01-hiragana.json` … `data/lessons/l08-adjetivos.json`

- [ ] **Step 1: Crear `data/lessons/index.json`**

```json
[
  { "id": "l01-hiragana",    "title": "Hiragana: vocales y primeros sonidos", "topic": "escritura",    "estimatedMin": 10 },
  { "id": "l02-katakana",    "title": "Katakana: para palabras extranjeras",  "topic": "escritura",    "estimatedMin": 8  },
  { "id": "l03-saludos",     "title": "Saludos y presentaciones",             "topic": "vocabulario",  "estimatedMin": 7  },
  { "id": "l04-numeros",     "title": "Números del 1 al 100",                 "topic": "vocabulario",  "estimatedMin": 8  },
  { "id": "l05-copula",      "title": "La cópula: です y ではありません",       "topic": "gramática",    "estimatedMin": 9  },
  { "id": "l06-particulas",  "title": "Partículas は、が、を、に、で",           "topic": "gramática",    "estimatedMin": 12 },
  { "id": "l07-verbos-masu", "title": "Verbos en forma ます",                 "topic": "gramática",    "estimatedMin": 10 },
  { "id": "l08-adjetivos",   "title": "Adjetivos い y な",                    "topic": "gramática",    "estimatedMin": 9  }
]
```

- [ ] **Step 2: Crear `data/lessons/l01-hiragana.json`**

```json
[
  {"type":"text","md":"El **hiragana** (ひらがな) es el sistema de escritura más básico del japonés. Se usa para palabras nativas, partículas gramaticales y conjugaciones verbales.\n\nTiene 46 caracteres base. Cada carácter representa una sílaba (mora)."},
  {"type":"table","headers":["Kana","Romaji","Ejemplo"],"rows":[["あ","a","あめ (lluvia)"],["い","i","いぬ (perro)"],["う","u","うた (canción)"],["え","e","えき (estación)"],["お","o","おかし (dulce)"]]},
  {"type":"note","md":"En japonés, cada sílaba tiene la misma duración. No hay acento de intensidad como en español."},
  {"type":"table","headers":["Kana","Romaji","Ejemplo"],"rows":[["か","ka","かさ (paraguas)"],["き","ki","きって (sello)"],["く","ku","くつ (zapato)"],["け","ke","けさ (esta mañana)"],["こ","ko","こども (niño)"]]},
  {"type":"example","jp":"これはいぬです。","es":"Esto es un perro.","romaji":"Kore wa inu desu."},
  {"type":"example","jp":"あめがふります。","es":"Llueve.","romaji":"Ame ga furimasu."},
  {"type":"exercise-mc","prompt":"¿Cómo se escribe la sílaba 'ka' en hiragana?","options":["か","カ","が","こ"],"answer":"か"},
  {"type":"exercise-mc","prompt":"¿Qué significa いぬ?","options":["perro","gato","libro","lluvia"],"answer":"perro"},
  {"type":"exercise-mc","prompt":"¿Cuál de estos es el hiragana para 'e'?","options":["え","エ","お","あ"],"answer":"え"},
  {"type":"exercise-tf","statement":"El hiragana あ se pronuncia 'a'.","answer":true},
  {"type":"exercise-tf","statement":"El hiragana こ representa la sílaba 'go'.","answer":false}
]
```

- [ ] **Step 3: Crear `data/lessons/l02-katakana.json`**

```json
[
  {"type":"text","md":"El **katakana** (カタカナ) tiene los mismos sonidos que el hiragana, pero se usa para palabras de origen extranjero (préstamos), nombres extranjeros y onomatopeyas.\n\nLos caracteres son más angulares que los del hiragana."},
  {"type":"table","headers":["Hiragana","Katakana","Romaji"],"rows":[["あ","ア","a"],["い","イ","i"],["う","ウ","u"],["え","エ","e"],["お","オ","o"]]},
  {"type":"example","jp":"テレビ","es":"televisión","romaji":"terebi"},
  {"type":"example","jp":"コーヒー","es":"café","romaji":"kōhī"},
  {"type":"example","jp":"アイスクリーム","es":"helado","romaji":"aisu kurīmu"},
  {"type":"note","md":"La raya larga **ー** (chōonpu) alarga la vocal anterior. コーヒー → kōhī (no kōhi)."},
  {"type":"exercise-mc","prompt":"¿Para qué se usa principalmente el katakana?","options":["Palabras extranjeras","Partículas gramaticales","Verbos conjugados","Kanji antiguos"],"answer":"Palabras extranjeras"},
  {"type":"exercise-mc","prompt":"¿Cómo se escribe 'terebi' (televisión) en katakana?","options":["テレビ","てれび","テレベ","トレビ"],"answer":"テレビ"},
  {"type":"exercise-mc","prompt":"El katakana ア equivale al hiragana…","options":["あ","お","え","い"],"answer":"あ"},
  {"type":"exercise-tf","statement":"El katakana se usa para escribir palabras de origen extranjero.","answer":true},
  {"type":"exercise-tf","statement":"コーヒー se pronuncia 'kohi' sin alargar vocales.","answer":false}
]
```

- [ ] **Step 4: Crear `data/lessons/l03-saludos.json`**

```json
[
  {"type":"text","md":"Los **saludos** son las primeras palabras que aprendes en japonés. El japonés formal usa ございます para mayor cortesía."},
  {"type":"example","jp":"おはようございます。","es":"Buenos días. (formal)","romaji":"Ohayō gozaimasu."},
  {"type":"example","jp":"こんにちは。","es":"Hola / Buenas tardes.","romaji":"Konnichiwa."},
  {"type":"example","jp":"こんばんは。","es":"Buenas noches.","romaji":"Konbanwa."},
  {"type":"example","jp":"ありがとうございます。","es":"Muchas gracias. (formal)","romaji":"Arigatō gozaimasu."},
  {"type":"example","jp":"すみません。","es":"Perdón / Disculpe.","romaji":"Sumimasen."},
  {"type":"example","jp":"はじめまして。","es":"Mucho gusto. (primer encuentro)","romaji":"Hajimemashite."},
  {"type":"note","md":"**おはよう** (sin ございます) es la versión informal, para amigos y familia. Con desconocidos siempre se usa la forma formal."},
  {"type":"exercise-mc","prompt":"¿Cómo se dice 'buenas noches' en japonés?","options":["こんばんは","こんにちは","おはようございます","さようなら"],"answer":"こんばんは"},
  {"type":"exercise-mc","prompt":"¿Cuál de estas expresiones significa 'mucho gusto' (primer encuentro)?","options":["はじめまして","ありがとう","すみません","おはよう"],"answer":"はじめまして"},
  {"type":"exercise-gap","prompt":"___ (Buenos días, formal)","options":["おはようございます","こんにちは","こんばんは","ありがとう"],"answer":"おはようございます","hint":"empieza por おはよう"},
  {"type":"exercise-gap","prompt":"___ (Muchas gracias, formal)","options":["ありがとうございます","すみません","はじめまして","おはようございます"],"answer":"ありがとうございます","hint":"empieza por ありがとう"}
]
```

- [ ] **Step 5: Crear `data/lessons/l04-numeros.json`**

```json
[
  {"type":"text","md":"El japonés usa un sistema decimal estándar. Los números del 1 al 10 se memorizan individualmente; del 11 en adelante se combinan (じゅういち = 10+1 = 11)."},
  {"type":"table","headers":["Número","Kanji","Lectura"],"rows":[["1","一","いち"],["2","二","に"],["3","三","さん"],["4","四","し / よん"],["5","五","ご"],["6","六","ろく"],["7","七","しち / なな"],["8","八","はち"],["9","九","く / きゅう"],["10","十","じゅう"]]},
  {"type":"note","md":"4 y 7 tienen dos lecturas. **よん** y **なな** son más comunes en el habla cotidiana porque し y しち pueden confundirse."},
  {"type":"example","jp":"じゅうに","es":"12 (10+2)","romaji":"jūni"},
  {"type":"example","jp":"にじゅうご","es":"25 (2×10+5)","romaji":"nijūgo"},
  {"type":"example","jp":"ひゃく","es":"100","romaji":"hyaku"},
  {"type":"exercise-mc","prompt":"¿Cómo se dice '7' en japonés (forma más común)?","options":["なな","し","ご","はち"],"answer":"なな"},
  {"type":"exercise-mc","prompt":"¿Qué número es じゅうご?","options":["15","50","5","51"],"answer":"15"},
  {"type":"exercise-mc","prompt":"¿Cómo se escribe 3 en kanji?","options":["三","二","四","五"],"answer":"三"},
  {"type":"exercise-gap","prompt":"8 en japonés: ___","options":["はち","ろく","く","さん"],"answer":"はち","hint":"suena a 'hachi'"},
  {"type":"exercise-gap","prompt":"にじゅう significa: ___","options":["20","12","2","200"],"answer":"20","hint":"に=2, じゅう=10"}
]
```

- [ ] **Step 6: Crear `data/lessons/l05-copula.json`**

```json
[
  {"type":"text","md":"La **cópula** es el equivalente japonés del verbo 'ser/estar'. La forma formal es **です** y su negación es **ではありません** (o **じゃないです** en registro informal)."},
  {"type":"example","jp":"私は学生です。","es":"Soy estudiante.","romaji":"Watashi wa gakusei desu."},
  {"type":"example","jp":"これは本です。","es":"Esto es un libro.","romaji":"Kore wa hon desu."},
  {"type":"example","jp":"田中さんは先生ではありません。","es":"El señor Tanaka no es profesor.","romaji":"Tanaka-san wa sensei dewa arimasen."},
  {"type":"table","headers":["Forma","Japonés","Uso"],"rows":[["Presente afirmativo","～です","Es / soy / eres"],["Presente negativo","～ではありません","No es / no soy"],["Pasado afirmativo","～でした","Era / fue"],["Pasado negativo","～ではありませんでした","No era / no fue"]]},
  {"type":"note","md":"La partícula **は** (se lee 'wa') marca el tema de la oración. No es el sonido 'ha' en este contexto — es una excepción ortográfica del japonés."},
  {"type":"exercise-mc","prompt":"¿Cómo se dice 'No soy médico' en japonés?","options":["医者ではありません","医者です","医者でした","医者がありません"],"answer":"医者ではありません"},
  {"type":"exercise-mc","prompt":"¿Cuál es el pasado afirmativo de です?","options":["でした","ではありません","です","じゃないです"],"answer":"でした"},
  {"type":"exercise-gap","prompt":"これは ___ です。 (Esto es un libro.)","options":["本","水","山","川"],"answer":"本","hint":"hon = libro"},
  {"type":"exercise-gap","prompt":"私は学生 ___。 (Soy estudiante, formal)","options":["です","でした","ではありません","じゃない"],"answer":"です","hint":"presente afirmativo formal"}
]
```

- [ ] **Step 7: Crear `data/lessons/l06-particulas.json`**

```json
[
  {"type":"text","md":"Las **partículas** son pequeñas palabras que indican la función gramatical de cada elemento en la oración. No tienen equivalente directo en español."},
  {"type":"example","jp":"私は学生です。","es":"(Yo) soy estudiante. [は = tema]","romaji":"Watashi wa gakusei desu."},
  {"type":"example","jp":"猫がいます。","es":"Hay un gato. [が = sujeto]","romaji":"Neko ga imasu."},
  {"type":"example","jp":"本を読みます。","es":"Leo un libro. [を = objeto directo]","romaji":"Hon wo yomimasu."},
  {"type":"example","jp":"学校に行きます。","es":"Voy a la escuela. [に = destino]","romaji":"Gakkō ni ikimasu."},
  {"type":"example","jp":"公園で遊びます。","es":"Juego en el parque. [で = lugar de acción]","romaji":"Kōen de asobimasu."},
  {"type":"note","md":"**は vs が**: は marca el *tema* (lo que ya conocemos); が marca el *sujeto* nuevo o contrastado. Esta distinción es sutil y se adquiere con la práctica."},
  {"type":"exercise-mc","prompt":"¿Qué partícula marca el objeto directo de la acción?","options":["を","は","が","で"],"answer":"を"},
  {"type":"exercise-mc","prompt":"学校___ 行きます。(Voy a la escuela) — ¿qué partícula?","options":["に","を","は","で"],"answer":"に"},
  {"type":"exercise-mc","prompt":"¿Qué partícula indica el lugar donde ocurre una acción?","options":["で","に","を","が"],"answer":"で"},
  {"type":"exercise-gap","prompt":"本___ 読みます。(Leo un libro)","options":["を","は","が","で"],"answer":"を","hint":"objeto directo"},
  {"type":"exercise-gap","prompt":"私___ 学生です。(Soy estudiante — hablo de mí)","options":["は","が","を","に"],"answer":"は","hint":"partícula de tema"}
]
```

- [ ] **Step 8: Crear `data/lessons/l07-verbos-masu.json`**

```json
[
  {"type":"text","md":"Los verbos japoneses en registro formal usan la terminación **ます** (presente/futuro). La negación es **ません**, el pasado **ました** y el pasado negativo **ませんでした**."},
  {"type":"table","headers":["Forma","Terminación","Ejemplo (食べる = comer)"],"rows":[["Presente/futuro afirmativo","～ます","食べます (como)"],["Presente/futuro negativo","～ません","食べません (no como)"],["Pasado afirmativo","～ました","食べました (comí)"],["Pasado negativo","～ませんでした","食べませんでした (no comí)"]]},
  {"type":"example","jp":"毎日日本語を勉強します。","es":"Estudio japonés todos los días.","romaji":"Mainichi nihongo wo benkyō shimasu."},
  {"type":"example","jp":"昨日、映画を見ませんでした。","es":"Ayer no vi ninguna película.","romaji":"Kinō, eiga wo mimasendeshita."},
  {"type":"note","md":"La forma ます siempre va al **final** de la oración. El objeto directo va antes del verbo, marcado con を."},
  {"type":"exercise-mc","prompt":"¿Cómo se dice 'no como' en japonés (presente, formal)?","options":["食べません","食べます","食べました","食べませんでした"],"answer":"食べません"},
  {"type":"exercise-mc","prompt":"¿Qué terminación indica pasado afirmativo en forma ます?","options":["～ました","～ます","～ません","～ませんでした"],"answer":"～ました"},
  {"type":"exercise-mc","prompt":"毎日日本語を___ します。¿Qué verbo completa 'Estudio japonés todos los días'?","options":["勉強","食べ","見","行き"],"answer":"勉強"},
  {"type":"exercise-gap","prompt":"昨日、映画を見___ 。(Ayer vi una película)","options":["ました","ます","ません","ませんでした"],"answer":"ました","hint":"pasado afirmativo"},
  {"type":"exercise-gap","prompt":"明日、学校に行___ 。(Mañana iré a la escuela)","options":["きます","きました","きません","きませんでした"],"answer":"きます","hint":"presente/futuro afirmativo"}
]
```

- [ ] **Step 9: Crear `data/lessons/l08-adjetivos.json`**

```json
[
  {"type":"text","md":"El japonés tiene dos tipos de adjetivos:\n\n- **Adjetivos い**: terminan en い. Se conjugan directamente.\n- **Adjetivos な**: se comportan como sustantivos. Necesitan な antes del nombre que modifican."},
  {"type":"table","headers":["Tipo","Ejemplo","Significado","Negativo"],"rows":[["い","たかい","caro","たかくない"],["い","おおきい","grande","おおきくない"],["な","しずか(な)","tranquilo","しずかではない"],["な","きれい(な)","bonito","きれいではない"]]},
  {"type":"example","jp":"この本はたかいです。","es":"Este libro es caro.","romaji":"Kono hon wa takai desu."},
  {"type":"example","jp":"しずかな部屋です。","es":"Es una habitación tranquila.","romaji":"Shizuka na heya desu."},
  {"type":"note","md":"**きれい** termina en い pero es adjetivo **な**, no い. Es una excepción frecuente que hay que memorizar."},
  {"type":"exercise-mc","prompt":"¿Cuál es el negativo de たかい (caro)?","options":["たかくない","たかじゃない","たかない","たかくないです"],"answer":"たかくない"},
  {"type":"exercise-mc","prompt":"¿Qué tipo de adjetivo es しずか?","options":["Adjetivo な","Adjetivo い","Verbo","Sustantivo"],"answer":"Adjetivo な"},
  {"type":"exercise-tf","statement":"Los adjetivos い forman la negación terminando en くない.","answer":true},
  {"type":"exercise-tf","statement":"きれい es un adjetivo い porque termina en い.","answer":false},
  {"type":"exercise-gap","prompt":"___ 部屋です。(Es una habitación tranquila)","options":["しずかな","しずかの","しずかが","しずかを"],"answer":"しずかな","hint":"adjetivo な antes de sustantivo"}
]
```

- [ ] **Step 10: Commit todos los datos**

```bash
git add data/lessons/
git commit -m "data: 8 lecciones N5 (hiragana, katakana, saludos, números, cópula, partículas, verbos, adjetivos)"
```

---

## Task 10: Verificación final en el navegador

**Files:** ninguno (solo lectura)

- [ ] **Step 1: Arrancar el servidor si no está corriendo**

```bash
cd /home/hugo/japones-n5 && python3 -m http.server 8765 --bind 0.0.0.0
```

- [ ] **Step 2: Abrir `http://localhost:8765/test/` — todos los tests deben pasar**

El total de tests debería ser 145 (existentes) + 11 nuevos = 156. Si alguno falla, corregir antes de continuar.

- [ ] **Step 3: Verificar el home — la tarjeta "Lecciones" aparece en la sección "Libro"**

Abrir `http://localhost:8765/` y confirmar que la tarjeta Lecciones aparece, con el texto "0 / 8 completadas" (o similar).

- [ ] **Step 4: Verificar el índice de lecciones**

Navegar a `#/lessons`. La lista de 8 lecciones debe aparecer con indicadores ○ (pendiente).

- [ ] **Step 5: Verificar una lección completa**

Hacer clic en "Hiragana: vocales y primeros sonidos". Verificar:
- Contenido: texto, tablas, ejemplos y nota aparecen correctamente
- Ejercicios al final: 3 mc + 2 tf
- Al responder un ejercicio: feedback inmediato (verde/rojo)
- Al responder todos: aparece "X / 5 ejercicios completados" + botón "Marcar como completada"
- Al pulsar "Marcar como completada": botón se desactiva con ✓
- Al volver al índice: el indicador de la lección 1 pasa a ●

- [ ] **Step 6: Verificar que la tarjeta en el home actualiza el contador**

Volver al home. La tarjeta Lecciones debe mostrar "1 / 8 completadas".

- [ ] **Step 7: Commit final con tag**

```bash
git add -A
git commit -m "feat(lessons): sistema completo de lecciones tipo libro"
git tag fase-5-lecciones
```

---

## Self-review del plan

**Cobertura del spec:**

| Requisito del spec | Tarea que lo implementa |
|---|---|
| `data/lessons/index.json` con id/title/topic/estimatedMin | Task 9, Step 1 |
| Tipos de bloque: text, example, table, note | Task 5 |
| Tipos de ejercicio: mc, tf, gap | Task 6 |
| `getLessonProgress`, `setLessonStarted`, `setLessonCompleted` | Task 3 |
| Feedback inmediato en ejercicios | Task 6 |
| Score + botón "Marcar como completada" + link siguiente | Task 7 |
| `recordPracticeTick()` para racha diaria | Task 6 |
| `renderLessonIndex` con indicadores ○◑● | Task 7 |
| Scroll restore con `lastBlock` | Task 7 |
| CSS: layout 680px, bloques, ejercicios inline | Task 4 |
| Integración `app.js` rutas `/lessons` y `/lessons/<id>` | Task 8 |
| Integración `home.js` tarjeta + guard sin `file` | Task 8 |
| `index.html` link CSS | Task 4 |
| 8 lecciones con contenido N5 real | Task 9 |
| Tests parseMd (TDD) | Tasks 1, 3 |
| Tests progress storage (TDD) | Tasks 2, 3 |

**Sin placeholders ni TBDs**: verificado.

**Consistencia de nombres:**
- `getLessonProgress` / `setLessonStarted` / `setLessonCompleted` — usados consistentemente en Tasks 3, 7, 8.
- `renderLessonIndex` / `renderLesson` — definidos en Task 7, importados en Task 8.
- `parseMd` — definida en Task 3, testeada en Task 1.
- `renderBlock` / `renderExercises` / `attachOptionHandler` — todas internas (no exportadas), definidas en Tasks 5–6, usadas en Task 7.
