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
