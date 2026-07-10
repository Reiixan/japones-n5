// js/numbers/numbers-audio.js
import { startExercise, showSessionConfig } from '../exercise.js';
import { generateSessionItems, formatExpression } from '../numbers-rules.js';
import { renderSpeakButton, attachSpeakHandler, speak } from '../tts.js';

const CATEGORIES = [
  { value: 'cardinal', label: 'Cardinales (1–9999)' },
  { value: 'counter', label: 'Contadores (つ・人・枚…)' },
  { value: 'hour', label: 'Horas (1–12時)' },
  { value: 'date', label: 'Fechas (1–31日)' },
];

export async function start(container, allItems) {
  showSessionConfig(container, {
    title: 'Escuchar y elegir',
    subtitle: 'Oye la lectura y elige el número correcto.',
    groups: CATEGORIES,
    onStart: (size, groups) => {
      const sessionSize = size === 'all' ? 50 : size;
      runAudio(container, () => generateSessionItems(groups, sessionSize, allItems), allItems);
    },
  });
}

function runAudio(container, getItems, allItems) {
  startExercise(container, {
    deck: 'numbers',
    getItems,
    allItems,
    getItemId: it => it.id,
    renderPrompt(item, el) {
      el.innerHTML = `
        <div class="audio-prompt">
          <div class="prompt-hint">¿Qué número es?</div>
          ${renderSpeakButton(item.kana)}
        </div>
      `;
      attachSpeakHandler(el);
      speak(item.kana);
    },
    renderInput(item, all, el, onAnswer) {
      const options = shuffle([item, ...item.distractors]);
      el.innerHTML = `<div class="choice-grid" id="choice-grid">
        ${options.map((opt, i) => `
          <button class="choice-btn" data-val="${formatExpression(opt)}" data-key="${i + 1}">
            <span class="choice-key">${i + 1}</span>
            ${formatExpression(opt)}
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
      return formatExpression(item) === answer;
    },
    getCorrectDisplay(item) {
      return `${formatExpression(item)} (${item.kana})`;
    },
    getPromptSpeechText: item => item.kana,
    getAnswerSpeechText: item => item.kana,
    recordResult: () => {},
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
