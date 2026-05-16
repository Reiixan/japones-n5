import { startExercise, showSessionConfig } from './exercise.js';
import { selectSession } from './srs.js';
import { speak } from './tts.js';

const DECK = 'listening';

export async function start(container, allItems) {
  showSessionConfig(container, {
    title: 'Comprensión auditiva 聴解',
    subtitle: 'Escucha la frase y elige la respuesta correcta. Pulsa ▶ para escuchar las veces que quieras.',
    onStart: (size) => {
      const items = selectSession(DECK, allItems, size);
      runListening(container, items, allItems);
    },
  });
}

function escapeAttr(s) {
  return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function runListening(container, items, allItems) {
  startExercise(container, {
    deck: DECK,
    items,
    allItems,
    getItemId: it => it.id,
    renderPrompt(item, el) {
      el.innerHTML = `
        <div class="listen-prompt">
          <button type="button" class="btn-listen" data-listen-text="${escapeAttr(item.audio_text)}" aria-label="Escuchar">
            <span class="listen-icon">▶</span>
            <span class="listen-label">Escuchar</span>
          </button>
          <button type="button" class="btn-listen-repeat" data-listen-text="${escapeAttr(item.audio_text)}" aria-label="Repetir" title="Repetir">↻</button>
        </div>
        <details class="listen-reveal">
          <summary>Ver texto japonés</summary>
          <div class="listen-text">${item.audio_text}</div>
          <div class="listen-kana">${item.audio_kana}</div>
        </details>
        <div class="listen-question">${item.prompt_es}</div>
      `;
      el.addEventListener('click', e => {
        const btn = e.target.closest('[data-listen-text]');
        if (!btn) return;
        e.preventDefault();
        speak(btn.dataset.listenText);
      });
      // Auto-pronunciar la primera vez al mostrar la pregunta (sin esperar al usuario).
      speak(item.audio_text);
    },
    renderInput(item, _all, el, onAnswer) {
      const isResponse = item.type === 'response';
      const opts = isResponse ? item.options_jp : item.options_es;
      const answer = isResponse ? item.answer_jp : item.answer_es;
      const options = shuffle([...opts]);

      el.innerHTML = `<div class="choice-grid listen-grid ${isResponse ? 'listen-grid-jp' : ''}">
        ${options.map((opt, i) => `
          <button class="choice-btn listen-choice" data-val="${escapeAttr(opt)}" data-key="${i + 1}">
            <span class="choice-key">${i + 1}</span>
            <span>${opt}</span>
          </button>
        `).join('')}
      </div>`;

      const keyHandler = e => {
        const tag = e.target && e.target.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA') return;
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
      const correct = item.type === 'response' ? item.answer_jp : item.answer_es;
      return correct === answer;
    },
    getCorrectDisplay(item) {
      const correct = item.type === 'response' ? item.answer_jp : item.answer_es;
      return `${correct}  ·  ${item.audio_text} (${item.audio_kana})`;
    },
    getPromptSpeechText: item => item.audio_text,
    getAnswerSpeechText: item => item.audio_text,
  });
}
