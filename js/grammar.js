import { startExercise, showSessionConfig } from './exercise.js';
import { selectSession } from './srs.js';
import { renderSpeakButton, attachSpeakHandler, isAutoOn, speak } from './tts.js';

const DECK = 'grammar';

export async function start(container, allItems, mode) {
  if (!mode) {
    renderModeMenu(container);
    return;
  }
  showSessionConfig(container, {
    title: 'Gramática N5',
    subtitle: 'Aprende los patrones y pon a prueba tu comprensión.',
    onStart: (size) => {
      const items = selectSession(DECK, allItems, size);
      runGrammar(container, items, allItems);
    },
  });
}

function renderModeMenu(container) {
  container.innerHTML = `
    <div class="page">
      <header class="page-header">
        <button class="btn-icon" id="grammar-menu-back">←</button>
        <h1>Gramática N5</h1>
      </header>
      <main class="mode-grid">
        <div class="mode-card" data-path="/lessons/l05-copula">
          <div class="mode-icon">📖</div>
          <div class="mode-label">Lección: Cópula です</div>
          <div class="mode-desc">です · ではありません · だ · ~9 min</div>
        </div>
        <div class="mode-card" data-path="/lessons/l09-demostrativos">
          <div class="mode-icon">📖</div>
          <div class="mode-label">Lección: Demostrativos</div>
          <div class="mode-desc">こ/そ/あ/ど · の posesivo · ~10 min</div>
        </div>
        <div class="mode-card" data-path="/lessons/l10-existencia">
          <div class="mode-icon">📖</div>
          <div class="mode-label">Lección: Existencia</div>
          <div class="mode-desc">あります · います · posición · ~9 min</div>
        </div>
        <div class="mode-card" data-path="/lessons/l14-interrogativos">
          <div class="mode-icon">📖</div>
          <div class="mode-label">Lección: Interrogativos</div>
          <div class="mode-desc">何・誰・どこ・いつ・いくら · ~10 min</div>
        </div>
        <div class="mode-card" data-path="/grammar/practice">
          <div class="mode-icon">📝</div>
          <div class="mode-label">Practicar</div>
          <div class="mode-desc">51 patrones N5 con SRS</div>
        </div>
      </main>
    </div>
  `;
  document.getElementById('grammar-menu-back').addEventListener('click', () => window.navigate('/'));
  container.querySelectorAll('.mode-card').forEach(card => {
    card.addEventListener('click', () => window.navigate(card.dataset.path));
  });
}

export function examRenderer() {
  return {
    renderPrompt(item, el) {
      const examples = item.examples.slice(0, 2).map(ex => `
        <li>
          <span class="ex-jp">${ex.jp}</span>
          <button type="button" class="btn-tts btn-tts-sm" data-tts-text="${ex.jp.replace(/"/g, '&quot;')}" aria-label="Pronunciar" title="Pronunciar">🔊</button>
          <span class="ex-es">${ex.es}</span>
        </li>
      `).join('');
      el.innerHTML = `
        <div class="grammar-pattern">${item.pattern}</div>
        <div class="grammar-meaning">${item.meaning_es}</div>
        <ul class="grammar-examples">${examples}</ul>
        <div class="grammar-exercise-prompt">${item.exercise.prompt}</div>
      `;
      attachSpeakHandler(el);
      if (isAutoOn() && item.examples[0]) speak(item.examples[0].jp);
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
    checkAnswer(item, answer) { return item.exercise.answer === answer; },
    getCorrectDisplay(item) { return item.exercise.answer; },
  };
}

function runGrammar(container, items, allItems) {
  startExercise(container, {
    deck: DECK,
    items,
    allItems,
    getItemId: it => it.id,
    ...examRenderer(),
    getPromptSpeechText: item => item.examples[0] ? item.examples[0].jp : null,
    getAnswerSpeechText: item => item.exercise.answer,
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
