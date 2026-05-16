import { startExercise, showSessionConfig } from '../exercise.js';
import { selectSession, pickWrong } from '../srs.js';
import { renderSpeakButton, attachSpeakHandler, isAutoOn, speak } from '../tts.js';

const GROUPS = [
  { value: 'base', label: 'Base (あ～ん)' },
  { value: 'dakuten', label: 'Dakuten (が、ざ…)' },
  { value: 'handakuten', label: 'Handakuten (ぱ…)' },
  { value: 'yoon', label: 'Yōon (きゃ…)' },
];

export async function start(container, deck, allItems) {
  showSessionConfig(container, {
    title: 'Opción Múltiple',
    subtitle: `Ve el ${deck === 'hiragana' ? 'hiragana' : 'katakana'} y elige su romaji.`,
    groups: GROUPS,
    onStart: (size, groups) => {
      const filtered = groups ? allItems.filter(it => groups.includes(it.group)) : allItems;
      if (filtered.length === 0) { alert('Selecciona al menos un grupo.'); return; }
      const items = selectSession(deck, filtered, size);
      runChoice(container, deck, items, allItems);
    },
  });
}

function runChoice(container, deck, items, allItems) {
  startExercise(container, {
    deck,
    items,
    allItems,
    getItemId: it => it.id,
    renderPrompt(item, el) {
      el.innerHTML = `<div class="kana-display">${item.kana}</div>${renderSpeakButton(item.kana)}`;
      attachSpeakHandler(el);
      if (isAutoOn()) speak(item.kana);
    },
    renderInput(item, all, el, onAnswer) {
      const wrongs = pickWrong(all, item, it => it.romaji, 3);
      const options = shuffle([item, ...wrongs]);

      el.innerHTML = `<div class="choice-grid" id="choice-grid">
        ${options.map((opt, i) => `
          <button class="choice-btn" data-val="${opt.romaji}" data-key="${i + 1}">
            <span class="choice-key">${i + 1}</span>
            ${opt.romaji}
          </button>
        `).join('')}
      </div>`;

      const handler = e => {
        const btn = e.target.closest('.choice-btn');
        if (btn && !btn.disabled) onAnswer(btn.dataset.val);
      };
      el.addEventListener('click', handler);

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
      return item.romaji === answer;
    },
    getCorrectDisplay(item) {
      return item.romaji;
    },
    getPromptSpeechText: item => item.kana,
    getAnswerSpeechText: item => item.kana,
    menuPath: `/${deck}`,
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
