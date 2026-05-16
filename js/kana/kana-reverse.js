import { startExercise, showSessionConfig } from '../exercise.js';
import { selectSession, pickWrong } from '../srs.js';

const GROUPS = [
  { value: 'base', label: 'Base (あ～ん)' },
  { value: 'dakuten', label: 'Dakuten (が、ざ…)' },
  { value: 'handakuten', label: 'Handakuten (ぱ…)' },
  { value: 'yoon', label: 'Yōon (きゃ…)' },
];

export async function start(container, deck, allItems) {
  showSessionConfig(container, {
    title: 'Modo Inverso',
    subtitle: `Ve el romaji y elige el ${deck === 'hiragana' ? 'hiragana' : 'katakana'} correcto.`,
    groups: GROUPS,
    onStart: (size, groups) => {
      const filtered = groups ? allItems.filter(it => groups.includes(it.group)) : allItems;
      if (filtered.length === 0) { alert('Selecciona al menos un grupo.'); return; }
      const items = selectSession(deck, filtered, size);
      runReverse(container, deck, items, allItems);
    },
  });
}

function runReverse(container, deck, items, allItems) {
  startExercise(container, {
    deck,
    items,
    allItems,
    getItemId: it => it.id,
    renderPrompt(item, el) {
      el.innerHTML = `<div class="romaji-display">${item.romaji}</div>
        <div class="prompt-hint">Elige el ${deck === 'hiragana' ? 'hiragana' : 'katakana'}</div>`;
    },
    renderInput(item, all, el, onAnswer) {
      const wrongs = pickWrong(all, item, it => it.kana, 3);
      const options = shuffle([item, ...wrongs]);

      el.innerHTML = `<div class="choice-grid kana-grid" id="choice-grid">
        ${options.map((opt, i) => `
          <button class="choice-btn kana-choice-btn" data-val="${opt.kana}" data-key="${i + 1}">
            <span class="choice-key">${i + 1}</span>
            ${opt.kana}
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
      return item.kana === answer;
    },
    getCorrectDisplay(item) {
      return `${item.kana} (${item.romaji})`;
    },
    // Sin getPromptSpeechText: el prompt es romaji, reproducirlo revelaría el kana correcto.
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
