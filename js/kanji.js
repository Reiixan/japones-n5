import { startExercise, showSessionConfig } from './exercise.js';
import { selectSession, pickWrong } from './srs.js';
import { renderSpeakButton, attachSpeakHandler, isAutoOn, speak } from './tts.js';
import { kanaToRomaji, isRomajiOn } from './romaji.js';

const DECK = 'kanji';

export async function start(container, allItems, mode) {
  if (!mode) {
    renderModeMenu(container);
    return;
  }
  showSessionConfig(container, {
    title: 'Kanji N5',
    subtitle: 'Ve el kanji y elige su significado y lectura correctos.',
    onStart: (size) => {
      const items = selectSession(DECK, allItems, size);
      runKanji(container, items, allItems);
    },
  });
}

function renderModeMenu(container) {
  container.innerHTML = `
    <div class="page">
      <header class="page-header">
        <button class="btn-icon" id="kanji-menu-back">←</button>
        <h1>Kanji N5</h1>
      </header>
      <main class="mode-grid">
        <div class="mode-card" data-path="/lessons/l16-kanji">
          <div class="mode-icon">📖</div>
          <div class="mode-label">Lección: Kanji N5</div>
          <div class="mode-desc">Los 100 kanji del N5 · ~12 min</div>
        </div>
        <div class="mode-card" data-path="/kanji/practice">
          <div class="mode-icon">📝</div>
          <div class="mode-label">Practicar</div>
          <div class="mode-desc">100 kanji N5 con SRS</div>
        </div>
      </main>
    </div>
  `;
  document.getElementById('kanji-menu-back').addEventListener('click', () => window.navigate('/'));
  container.querySelectorAll('.mode-card').forEach(card => {
    card.addEventListener('click', () => window.navigate(card.dataset.path));
  });
}

function displayFor(item) {
  const on = item.onyomi.join('・') || '—';
  const kun = item.kunyomi.join('・') || '—';
  return `${item.meaning_es} (${kun} / ${on})`;
}

export function examRenderer() {
  return {
    renderPrompt(item, el) {
      const reading = item.example_reading;
      const romaji = isRomajiOn() ? `<span class="kanji-example-romaji">${kanaToRomaji(reading)}</span>` : '';
      const exampleHtml = (item.example_word && item.example_reading)
        ? `<div class="kanji-example">
            <span class="kanji-example-word">${item.example_word}</span>
            <span class="kanji-example-reading">(${reading})</span>
            ${romaji}
            ${renderSpeakButton(reading)}
          </div>`
        : '';
      el.innerHTML = `<div class="kanji-prompt"><div class="kanji-display">${item.kanji}</div>${exampleHtml}</div>`;
      attachSpeakHandler(el);
      if (isAutoOn()) speak(reading);
    },
    renderInput(item, all, el, onAnswer) {
      const wrongs = pickWrong(all, item, it => it.id, 3);
      const options = shuffle([item, ...wrongs]);
      el.innerHTML = `<div class="choice-grid kanji-grid">
        ${options.map((opt, i) => `
          <button class="choice-btn kanji-choice" data-val="${opt.id}" data-key="${i + 1}">
            <span class="choice-key">${i + 1}</span>
            <span class="kanji-meaning">${opt.meaning_es}</span>
            <span class="kanji-readings">${opt.kunyomi.join('・') || '—'} / ${opt.onyomi.join('・') || '—'}</span>
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
    checkAnswer(item, answer) { return item.id === answer; },
    getCorrectDisplay(item) { return displayFor(item); },
  };
}

function runKanji(container, items, allItems) {
  startExercise(container, {
    deck: DECK,
    items,
    allItems,
    getItemId: it => it.id,
    ...examRenderer(),
    getPromptSpeechText: item => item.example_reading,
    getAnswerSpeechText: item => item.example_reading,
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
