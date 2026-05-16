import { startExercise, showSessionConfig } from './exercise.js';
import { selectSession } from './srs.js';

const DECK = 'grammar';

export async function start(container, allItems) {
  showSessionConfig(container, {
    title: 'Gramática N5',
    subtitle: 'Aprende los patrones y pon a prueba tu comprensión.',
    onStart: (size) => {
      const items = selectSession(DECK, allItems, size);
      runGrammar(container, items, allItems);
    },
  });
}

function runGrammar(container, items, allItems) {
  startExercise(container, {
    deck: DECK,
    items,
    allItems,
    getItemId: it => it.id,
    renderPrompt(item, el) {
      const examples = item.examples.slice(0, 2).map(ex =>
        `<li><span class="ex-jp">${ex.jp}</span><span class="ex-es">${ex.es}</span></li>`
      ).join('');

      el.innerHTML = `
        <div class="grammar-pattern">${item.pattern}</div>
        <div class="grammar-meaning">${item.meaning_es}</div>
        <ul class="grammar-examples">${examples}</ul>
        <div class="grammar-exercise-prompt">${item.exercise.prompt}</div>
      `;
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
    checkAnswer(item, answer) {
      return item.exercise.answer === answer;
    },
    getCorrectDisplay(item) {
      return item.exercise.answer;
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
