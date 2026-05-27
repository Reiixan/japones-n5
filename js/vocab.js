import { startExercise, showSessionConfig } from './exercise.js';
import { selectSession, pickWrong } from './srs.js';
import { renderSpeakButton, attachSpeakHandler, isAutoOn, speak } from './tts.js';
import { isRomajiOn } from './romaji.js';

const DECK = 'vocab';

// mode: null (mostrar menú), 'jp-es', o 'es-jp'
export async function start(container, allItems, mode) {
  if (!mode) {
    renderModeMenu(container);
    return;
  }
  showSessionConfig(container, {
    title: mode === 'jp-es' ? 'Vocabulario · JP → ES' : 'Vocabulario · ES → JP',
    subtitle: mode === 'jp-es'
      ? 'Ve la palabra japonesa y elige su significado en español.'
      : 'Ve el significado en español y elige la palabra japonesa.',
    onStart: (size) => {
      const getItems = () => selectSession(DECK, allItems, size);
      if (mode === 'jp-es') runJpEs(container, getItems, allItems);
      else runEsJp(container, getItems, allItems);
    },
  });
}

function renderModeMenu(container) {
  const LESSONS = [
    { id: 'l03-saludos',    label: 'Saludos y presentaciones', desc: '~7 min' },
    { id: 'l04-numeros',    label: 'Números del 1 al 100',     desc: '~8 min' },
    { id: 'l15-contadores', label: 'Contadores: ~つ, 人, 枚…',  desc: '~10 min' },
  ];
  const MODES = [
    { mode: 'jp-es', icon: '🇯🇵→🇪🇸', label: 'JP → ES', desc: 'Lees la palabra japonesa y eliges el significado' },
    { mode: 'es-jp', icon: '🇪🇸→🇯🇵', label: 'ES → JP', desc: 'Lees el significado y eliges la palabra japonesa' },
  ];
  container.innerHTML = `
    <div class="page">
      <header class="page-header">
        <button class="btn-icon" id="vocab-menu-back">←</button>
        <h1>Vocabulario N5</h1>
      </header>
      <main class="mode-grid">
        ${LESSONS.map(l => `
          <div class="mode-card" data-path="/lessons/${l.id}">
            <div class="mode-icon">📖</div>
            <div class="mode-label">${l.label}</div>
            <div class="mode-desc">${l.desc}</div>
          </div>
        `).join('')}
        ${MODES.map(m => `
          <div class="mode-card" data-mode="${m.mode}">
            <div class="mode-icon">${m.icon}</div>
            <div class="mode-label">${m.label}</div>
            <div class="mode-desc">${m.desc}</div>
          </div>
        `).join('')}
      </main>
    </div>
  `;
  document.getElementById('vocab-menu-back').addEventListener('click', () => window.navigate('/'));
  container.querySelectorAll('.mode-card').forEach(card => {
    const path = card.dataset.path ?? `/vocab/${card.dataset.mode}`;
    card.addEventListener('click', () => window.navigate(path));
  });
}

export function examRenderer() {
  return {
    renderPrompt(item, el) {
      el.innerHTML = `
        <div class="vocab-kanji">${item.kanji}</div>
        <div class="vocab-kana-row">
          <span class="vocab-kana">${item.kana}</span>
          ${renderSpeakButton(item.kana)}
        </div>
        ${isRomajiOn() ? `<div class="vocab-romaji">${item.romaji}</div>` : ''}
        <div class="vocab-category">${item.category}</div>
      `;
      attachSpeakHandler(el);
      if (isAutoOn()) speak(item.kana);
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
    checkAnswer(item, answer) { return item.meaning_es === answer; },
    getCorrectDisplay(item) { return item.meaning_es; },
  };
}

function runJpEs(container, getItems, allItems) {
  startExercise(container, {
    deck: DECK,
    getItems,
    allItems,
    getItemId: it => it.id,
    ...examRenderer(),
    getPromptSpeechText: item => item.kana,
    getAnswerSpeechText: item => item.kana,
    menuPath: '/vocab',
  });
}

function runEsJp(container, getItems, allItems) {
  startExercise(container, {
    deck: DECK,
    getItems,
    allItems,
    getItemId: it => it.id,
    renderPrompt(item, el) {
      el.innerHTML = `
        <div class="vocab-meaning-prompt">${item.meaning_es}</div>
        <div class="vocab-category">${item.category}</div>
      `;
      // No TTS en ES→JP: el prompt es español.
    },
    renderInput(item, all, el, onAnswer) {
      const wrongs = pickWrong(all, item, it => it.id, 3);
      const options = shuffle([item, ...wrongs]);
      const romaji = isRomajiOn();
      el.innerHTML = `<div class="choice-grid vocab-grid-jp">
        ${options.map((opt, i) => `
          <button class="choice-btn vocab-choice-jp" data-val="${opt.id}" data-key="${i + 1}">
            <span class="choice-key">${i + 1}</span>
            <span class="choice-jp-kana">${opt.kana}</span>
            <span class="choice-jp-kanji">${opt.kanji}</span>
            ${romaji ? `<span class="choice-jp-romaji">${opt.romaji}</span>` : ''}
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
    getCorrectDisplay(item) { return `${item.kana} (${item.kanji}) — ${item.meaning_es}`; },
    // Sin getPromptSpeechText: el prompt es español, no hay JP que repetir.
    getAnswerSpeechText: item => item.kana,
    menuPath: '/vocab',
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
