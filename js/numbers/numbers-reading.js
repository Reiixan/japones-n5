// js/numbers/numbers-reading.js
import { startExercise, showSessionConfig } from '../exercise.js';
import { generateSessionItems, formatExpression } from '../numbers-rules.js';

const CATEGORIES = [
  { value: 'cardinal', label: 'Cardinales (1–9999)' },
  { value: 'counter', label: 'Contadores (つ・人・枚…)' },
  { value: 'hour', label: 'Horas (1–12時)' },
  { value: 'date', label: 'Fechas (1–31日)' },
];

export async function start(container, allItems) {
  showSessionConfig(container, {
    title: 'Número → Lectura',
    subtitle: 'Ve el número y elige su lectura correcta.',
    groups: CATEGORIES,
    onStart: (size, groups) => {
      // "Todo" no aplica a contenido generado dinámicamente; se usa el tamaño fijo más grande.
      const sessionSize = size === 'all' ? 50 : size;
      runReading(container, () => generateSessionItems(groups, sessionSize, allItems), allItems);
    },
  });
}

function runReading(container, getItems, allItems) {
  startExercise(container, {
    deck: 'numbers',
    getItems,
    allItems,
    getItemId: it => it.id,
    renderPrompt(item, el) {
      el.innerHTML = `<div class="kana-display">${formatExpression(item)}</div>`;
    },
    renderInput(item, all, el, onAnswer) {
      const options = shuffle([item, ...item.distractors]);
      el.innerHTML = `<div class="choice-grid" id="choice-grid">
        ${options.map((opt, i) => `
          <button class="choice-btn" data-val="${opt.kana}" data-key="${i + 1}">
            <span class="choice-key">${i + 1}</span>
            ${opt.kana}
          </button>
        `).join('')}
      </div>`;

      el.addEventListener('click', e => {
        const btn = e.target.closest('.choice-btn');
        if (btn && !btn.disabled) onAnswer(btn.dataset.val);
      });

      const keyHandler = e => {
        const n = parseInt(e.key);
        if (n >= 1 && n <= options.length) {
          const btn = el.querySelector(`[data-key="${n}"]`);
          if (btn && !btn.disabled) onAnswer(btn.dataset.val);
        }
      };
      document.addEventListener('keydown', keyHandler);
      return () => document.removeEventListener('keydown', keyHandler);
    },
    checkAnswer(item, answer) {
      return item.kana === answer;
    },
    getCorrectDisplay(item) {
      return item.kana;
    },
    // Sin getPromptSpeechText: el prompt es el número; pronunciar su lectura revelaría la respuesta.
    getAnswerSpeechText: item => item.kana,
    recordResult: () => {}, // sin dataset fijo: no hay caja SRS que actualizar
    menuPath: '/numbers',
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
