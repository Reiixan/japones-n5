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
      attachOptionHandler(el, ex.answer, (isCorrect) => {
        answered++;
        if (isCorrect) correct++;
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
      attachOptionHandler(el, strAnswer, (isCorrect) => {
        answered++;
        if (isCorrect) correct++;
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
      attachOptionHandler(el, ex.answer, (isCorrect) => {
        answered++;
        if (isCorrect) correct++;
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

      const chosen = btn.dataset.value;
      const isCorrect = chosen === correctAnswer;

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
