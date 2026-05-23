import { recordPracticeTick } from './daily.js';
import { renderSpeakButton, attachSpeakHandler } from './tts.js';

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
          <div class="lesson-example-jp">
            ${block.jp}
            ${renderSpeakButton(block.jp)}
          </div>
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
      const opts = [...ex.options].sort(() => Math.random() - 0.5);
      el.innerHTML = `
        <div class="lesson-exercise-prompt">${ex.prompt}${hint}</div>
        <div class="lesson-exercise-options">
          ${opts.map(o => `<button class="lesson-exercise-btn" data-value="${o}">${o}</button>`).join('')}
        </div>
        <div class="lesson-exercise-feedback"></div>`;
      attachOptionHandler(el, ex.answer, (isCorrect) => {
        answered++;
        if (isCorrect) correct++;
        if (isCorrect) recordPracticeTick();
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
        if (isCorrect) recordPracticeTick();
        if (answered === total) onAllAnswered(correct, total);
      });
    }

    if (ex.type === 'exercise-gap') {
      const hint = ex.hint ? `<div class="lesson-exercise-hint">Pista: ${ex.hint}</div>` : '';
      const opts = [...ex.options].sort(() => Math.random() - 0.5);
      el.innerHTML = `
        <div class="lesson-exercise-prompt">${ex.prompt}${hint}</div>
        <div class="lesson-exercise-options">
          ${opts.map(o => `<button class="lesson-exercise-btn" data-value="${o}">${o}</button>`).join('')}
        </div>
        <div class="lesson-exercise-feedback"></div>`;
      attachOptionHandler(el, ex.answer, (isCorrect) => {
        answered++;
        if (isCorrect) correct++;
        if (isCorrect) recordPracticeTick();
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

const PRACTICE_PATH = {
  hiragana:   { path: '/hiragana',           label: 'hiragana' },
  katakana:   { path: '/katakana',           label: 'katakana' },
  vocab:      { path: '/vocab/jp-es',        label: 'vocabulario' },
  kanji:      { path: '/kanji/practice',     label: 'kanji' },
  particles:  { path: '/particles/practice', label: 'partículas' },
  grammar:    { path: '/grammar/practice',   label: 'gramática' },
  verbs:      { path: '/verbs/practice',     label: 'verbos' },
  adjectives: { path: '/adjectives/practice',label: 'adjetivos' },
  listening:  { path: '/listening',          label: 'escucha' },
  reading:    { path: '/reading',            label: 'lectura' },
};

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

  const contentBlocks = blocks.filter(b => !b.type.startsWith('exercise-'));
  const exerciseBlocks = blocks.filter(b => b.type.startsWith('exercise-'));

  container.innerHTML = `
    <div class="lesson-wrap">
      <div class="lesson-header">
        <button class="btn-icon" id="lesson-back">←</button>
        <h1>${meta.title}</h1>
        <span class="lesson-topic-badge">${meta.topic}</span>
        <span class="lesson-progress-badge" id="lesson-progress"></span>
        <button class="btn-icon lesson-kana-btn" id="lesson-kana-btn" title="Ver tabla kana">あ</button>
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
          ${PRACTICE_PATH[meta.blockId] ? `<button class="btn-secondary" id="lesson-practice">Practicar ${PRACTICE_PATH[meta.blockId].label} →</button>` : ''}
          ${nextLesson ? `<button class="btn-primary" id="lesson-next" style="background:var(--c-teal)">Siguiente lección →</button>` : ''}
        </div>
      </div>
    </div>`;

  document.getElementById('lesson-back').addEventListener('click', () => window.navigate('/' + meta.blockId));
  document.getElementById('lesson-kana-btn').addEventListener('click', showKanaModal);
  attachSpeakHandler(document.getElementById('lesson-content'));

  // Read progress BEFORE setLessonStarted overwrites lastBlock
  const progress = getLessonProgress(id);
  setLessonStarted(id, 0);

  const exerciseContainer = document.getElementById('lesson-exercises');
  if (exerciseBlocks.length > 0) {
    renderExercises(exerciseBlocks, exerciseContainer, (correct, total) => {
      const scoreEl = document.getElementById('lesson-score');
      scoreEl.textContent = `${correct} / ${total}`;
      document.getElementById('lesson-completion').classList.add('visible');
    });
  } else {
    document.getElementById('lesson-score').textContent = '—';
    document.getElementById('lesson-completion').classList.add('visible');
  }

  document.getElementById('lesson-mark-done').addEventListener('click', () => {
    setLessonCompleted(id);
    document.getElementById('lesson-mark-done').textContent = '✓ Completada';
    document.getElementById('lesson-mark-done').disabled = true;
  });

  if (progress?.status === 'completed') {
    const btn = document.getElementById('lesson-mark-done');
    btn.textContent = '✓ Completada';
    btn.disabled = true;
  }

  const practiceBtn = document.getElementById('lesson-practice');
  if (practiceBtn) {
    practiceBtn.addEventListener('click', () => window.navigate(PRACTICE_PATH[meta.blockId].path));
  }

  const nextBtn = document.getElementById('lesson-next');
  if (nextBtn) {
    nextBtn.addEventListener('click', () => window.navigate(`/lessons/${nextLesson.id}`));
  }

  if (progress?.lastBlock > 0) {
    const allBlocks = container.querySelectorAll('.lesson-block');
    const target = allBlocks[Math.min(progress.lastBlock, allBlocks.length - 1)];
    if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  const allBlocks = container.querySelectorAll('.lesson-block');
  const progressEl = document.getElementById('lesson-progress');
  if (progressEl && allBlocks.length > 0) {
    progressEl.textContent = `1 / ${allBlocks.length}`;
  }
  if (allBlocks.length > 0 && 'IntersectionObserver' in window) {
    const obs = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const idx = Array.from(allBlocks).indexOf(entry.target);
          if (idx >= 0) {
            setLessonStarted(id, idx);
            if (progressEl) progressEl.textContent = `${idx + 1} / ${allBlocks.length}`;
          }
        }
      });
    }, { threshold: 0.3 });
    allBlocks.forEach(b => obs.observe(b));
  }
}

// ─── Kana modal ───────────────────────────────────────────────────────────────

const HIRAGANA = [
  ['あ','い','う','え','お'],
  ['か','き','く','け','こ'],
  ['さ','し','す','せ','そ'],
  ['た','ち','つ','て','と'],
  ['な','に','ぬ','ね','の'],
  ['は','ひ','ふ','へ','ほ'],
  ['ま','み','む','め','も'],
  ['や','','ゆ','','よ'],
  ['ら','り','る','れ','ろ'],
  ['わ','','','','を'],
  ['ん','','','',''],
];

const KATAKANA = [
  ['ア','イ','ウ','エ','オ'],
  ['カ','キ','ク','ケ','コ'],
  ['サ','シ','ス','セ','ソ'],
  ['タ','チ','ツ','テ','ト'],
  ['ナ','ニ','ヌ','ネ','ノ'],
  ['ハ','ヒ','フ','ヘ','ホ'],
  ['マ','ミ','ム','メ','モ'],
  ['ヤ','','ユ','','ヨ'],
  ['ラ','リ','ル','レ','ロ'],
  ['ワ','','','','ヲ'],
  ['ン','','','',''],
];

const ROMAJI = [
  ['a','i','u','e','o'],
  ['ka','ki','ku','ke','ko'],
  ['sa','shi','su','se','so'],
  ['ta','chi','tsu','te','to'],
  ['na','ni','nu','ne','no'],
  ['ha','hi','fu','he','ho'],
  ['ma','mi','mu','me','mo'],
  ['ya','','yu','','yo'],
  ['ra','ri','ru','re','ro'],
  ['wa','','','','wo'],
  ['n','','','',''],
];

function showKanaModal() {
  if (document.getElementById('kana-modal')) return;

  let activeTab = 'hiragana';

  function buildTable(kanaRows) {
    return kanaRows.map((row, ri) =>
      `<tr>${row.map((k, ci) => k
        ? `<td><span class="kana-modal-char">${k}</span><span class="kana-modal-rom">${ROMAJI[ri][ci]}</span></td>`
        : '<td></td>'
      ).join('')}</tr>`
    ).join('');
  }

  function html(tab) {
    const rows = tab === 'hiragana' ? HIRAGANA : KATAKANA;
    return `
      <div class="kana-modal-overlay" id="kana-modal">
        <div class="kana-modal-panel" role="dialog" aria-modal="true" aria-label="Tabla kana">
          <div class="kana-modal-header">
            <div class="kana-modal-tabs">
              <button class="kana-tab${tab === 'hiragana' ? ' active' : ''}" data-tab="hiragana">Hiragana ひ</button>
              <button class="kana-tab${tab === 'katakana' ? ' active' : ''}" data-tab="katakana">Katakana カ</button>
            </div>
            <button class="btn-icon" id="kana-modal-close">✕</button>
          </div>
          <div class="kana-modal-body">
            <table class="kana-modal-table">
              <thead><tr><th>a</th><th>i</th><th>u</th><th>e</th><th>o</th></tr></thead>
              <tbody>${buildTable(rows)}</tbody>
            </table>
          </div>
        </div>
      </div>`;
  }

  document.body.insertAdjacentHTML('beforeend', html(activeTab));

  function close() {
    document.getElementById('kana-modal')?.remove();
    document.removeEventListener('keydown', onKey);
  }

  function onKey(e) { if (e.key === 'Escape') close(); }
  document.addEventListener('keydown', onKey);

  document.getElementById('kana-modal-close').addEventListener('click', close);
  document.getElementById('kana-modal').addEventListener('click', e => {
    if (e.target.id === 'kana-modal') close();
  });

  document.querySelectorAll('.kana-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      activeTab = btn.dataset.tab;
      document.getElementById('kana-modal').remove();
      document.body.insertAdjacentHTML('beforeend', html(activeTab));
      document.getElementById('kana-modal-close').addEventListener('click', close);
      document.getElementById('kana-modal').addEventListener('click', e => {
        if (e.target.id === 'kana-modal') close();
      });
      document.querySelectorAll('.kana-tab').forEach(b2 => {
        b2.addEventListener('click', () => {
          activeTab = b2.dataset.tab;
          document.getElementById('kana-modal').remove();
          document.body.insertAdjacentHTML('beforeend', html(activeTab));
          // Re-attach all handlers by re-calling showKanaModal logic inline
          attachKanaModalHandlers(close, onKey);
        });
      });
    });
  });
}

function attachKanaModalHandlers(close, onKey) {
  document.getElementById('kana-modal-close').addEventListener('click', close);
  document.getElementById('kana-modal').addEventListener('click', e => {
    if (e.target.id === 'kana-modal') close();
  });
  document.querySelectorAll('.kana-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.tab;
      const ROWS = tab === 'hiragana' ? HIRAGANA : KATAKANA;
      function buildTable(kanaRows) {
        return kanaRows.map((row, ri) =>
          `<tr>${row.map((k, ci) => k
            ? `<td><span class="kana-modal-char">${k}</span><span class="kana-modal-rom">${ROMAJI[ri][ci]}</span></td>`
            : '<td></td>'
          ).join('')}</tr>`
        ).join('');
      }
      const newHtml = `
        <div class="kana-modal-overlay" id="kana-modal">
          <div class="kana-modal-panel" role="dialog" aria-modal="true" aria-label="Tabla kana">
            <div class="kana-modal-header">
              <div class="kana-modal-tabs">
                <button class="kana-tab${tab === 'hiragana' ? ' active' : ''}" data-tab="hiragana">Hiragana ひ</button>
                <button class="kana-tab${tab === 'katakana' ? ' active' : ''}" data-tab="katakana">Katakana カ</button>
              </div>
              <button class="btn-icon" id="kana-modal-close">✕</button>
            </div>
            <div class="kana-modal-body">
              <table class="kana-modal-table">
                <thead><tr><th>a</th><th>i</th><th>u</th><th>e</th><th>o</th></tr></thead>
                <tbody>${buildTable(ROWS)}</tbody>
              </table>
            </div>
          </div>
        </div>`;
      document.getElementById('kana-modal').remove();
      document.body.insertAdjacentHTML('beforeend', newHtml);
      attachKanaModalHandlers(close, onKey);
    });
  });
}
