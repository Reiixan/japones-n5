import { startExercise, showSessionConfig } from './exercise.js';
import { selectSession, pickWrong } from './srs.js';

const DECK = 'vocab';

export async function start(container, allItems) {
  showSessionConfig(container, {
    title: 'Vocabulario N5',
    subtitle: 'Ve la palabra japonesa y elige su significado en español.',
    onStart: (size) => {
      const items = selectSession(DECK, allItems, size);
      runVocab(container, items, allItems);
    },
  });
}

function runVocab(container, items, allItems) {
  startExercise(container, {
    deck: DECK,
    items,
    allItems,
    getItemId: it => it.id,
    renderPrompt(item, el) {
      el.innerHTML = `
        <div class="vocab-kanji">${item.kanji}</div>
        <div class="vocab-kana">${item.kana}</div>
        <div class="vocab-category">${item.category}</div>
      `;
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
    checkAnswer(item, answer) {
      return item.meaning_es === answer;
    },
    getCorrectDisplay(item) {
      return item.meaning_es;
    },
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
