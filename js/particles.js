import { startExercise, showSessionConfig } from './exercise.js';
import { selectSession } from './srs.js';
import { renderSpeakButton, attachSpeakHandler, isAutoOn, speak } from './tts.js';

const DECK = 'particles';

export async function start(container, allItems) {
  showSessionConfig(container, {
    title: 'Partículas',
    subtitle: 'Completa la oración con la partícula correcta.',
    onStart: (size) => {
      const items = selectSession(DECK, allItems, size);
      runParticles(container, items, allItems);
    },
  });
}

function buildSentence(parts, highlight) {
  return parts.map((p, i) => {
    if (p === '[  ]') {
      return highlight
        ? `<span class="particle-blank filled">${highlight}</span>`
        : `<span class="particle-blank">　　</span>`;
    }
    return `<span>${p}</span>`;
  }).join('');
}

function fullSentenceWithAnswer(item) {
  return item.parts.map(p => p === '[  ]' ? item.answer : p).join('');
}

export function examRenderer() {
  return {
    renderPrompt(item, el) {
      const fullText = fullSentenceWithAnswer(item);
      el.innerHTML = `
        <div class="particle-sentence">${buildSentence(item.parts, null)}</div>
        <div class="particle-tts-row">${renderSpeakButton(fullText)}<span class="particle-tts-hint">Escuchar oración con respuesta</span></div>
      `;
      attachSpeakHandler(el);
    },
    renderInput(item, _all, el, onAnswer) {
      const options = shuffle([...item.options]);
      el.innerHTML = `<div class="choice-grid particle-grid">
        ${options.map((opt, i) => `
          <button class="choice-btn particle-btn" data-val="${opt}" data-key="${i + 1}">
            <span class="choice-key">${i + 1}</span>
            <span class="particle-opt">${opt}</span>
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
    checkAnswer(item, answer) { return item.answer === answer; },
    getCorrectDisplay(item) { return `${item.answer} — ${item.explanation}`; },
  };
}

function runParticles(container, items, allItems) {
  startExercise(container, {
    deck: DECK,
    items,
    allItems,
    getItemId: it => it.id,
    ...examRenderer(),
    getAnswerSpeechText: item => fullSentenceWithAnswer(item),
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
