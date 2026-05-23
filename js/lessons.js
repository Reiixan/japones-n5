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
