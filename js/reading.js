import { startExercise, showSessionConfig } from './exercise.js';
import { selectSession } from './srs.js';
import { recordAnswer } from './storage.js?v=2';

const DECK = 'reading';

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
