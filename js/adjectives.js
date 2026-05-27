import { startExercise, showSessionConfig } from './exercise.js';
import { selectSession } from './srs.js';
import { speak } from './tts.js';
import { adjectiveForm, generateAdjDistractors } from './adjective-forms.js';

const DECK = 'adjectives';

export const I_FORMS = ['negative', 'past', 'negative_past'];
export const NA_FORMS = ['negative', 'past', 'negative_past', 'noun_form'];

export const FORM_LABELS = {
  negative: 'negativo (~ない / じゃない)',
  past: 'pasado (~かった / だった)',
  negative_past: 'pasado negativo',
  noun_form: 'forma para modificar sustantivo (+ な)',
};

const TYPE_LABELS = { i: 'い-adjetivo', na: 'な-adjetivo' };

export function pickRandomForm(type) {
  const arr = type === 'i' ? I_FORMS : NA_FORMS;
  return arr[Math.floor(Math.random() * arr.length)];
}

export function buildItem(adj, form) {
  const correct = adjectiveForm(adj.jp, adj.type, form);
  const distractors = generateAdjDistractors(adj.jp, adj.type, form, 3);
  return { adj, form, correct, distractors };
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function escapeAttr(s) {
  return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export async function start(container, allAdj, mode) {
  if (!mode) {
    renderModeMenu(container);
    return;
  }
  showSessionConfig(container, {
    title: 'Adjetivos 形容詞',
    subtitle: 'Mira el adjetivo, su tipo y la forma pedida. Elige la conjugación correcta.',
    onStart: (size) => {
      runAdjectives(container, () => {
        const adjs = selectSession(DECK, allAdj, size);
        return adjs.map(a => buildItem(a, pickRandomForm(a.type)));
      }, allAdj);
    },
  });
}

function renderModeMenu(container) {
  container.innerHTML = `
    <div class="page">
      <header class="page-header">
        <button class="btn-icon" id="adjectives-menu-back">←</button>
        <h1>Adjetivos 形容詞</h1>
      </header>
      <main class="mode-grid">
        <div class="mode-card" data-path="/lessons/l08-adjetivos">
          <div class="mode-icon">📖</div>
          <div class="mode-label">Lección</div>
          <div class="mode-desc">Adjetivos い y な · ~9 min</div>
        </div>
        <div class="mode-card" data-path="/adjectives/practice">
          <div class="mode-icon">📝</div>
          <div class="mode-label">Practicar</div>
          <div class="mode-desc">い/な adjetivos N5 con SRS</div>
        </div>
      </main>
    </div>
  `;
  document.getElementById('adjectives-menu-back').addEventListener('click', () => window.navigate('/'));
  container.querySelectorAll('.mode-card').forEach(card => {
    card.addEventListener('click', () => window.navigate(card.dataset.path));
  });
}

function runAdjectives(container, getItems, allAdj) {
  startExercise(container, {
    deck: DECK,
    getItems,
    allItems: allAdj,
    getItemId: it => it.adj.id,
    renderPrompt(item, el) {
      const { adj, form } = item;
      el.innerHTML = `
        <div class="adj-prompt">
          <div class="adj-jp">
            <span class="adj-text">${adj.jp}</span>
            <button type="button" class="btn-tts" data-tts-text="${escapeAttr(adj.kana)}" aria-label="Escuchar">🔊</button>
          </div>
          <div class="adj-kana">${adj.kana}</div>
          <div class="adj-meta">
            <span class="adj-type">${TYPE_LABELS[adj.type]}</span>
            <span class="adj-meaning">${adj.meaning_es}</span>
          </div>
          <div class="adj-form-target">Conjuga en <strong>${FORM_LABELS[form]}</strong></div>
        </div>
      `;
      el.addEventListener('click', e => {
        const btn = e.target.closest('.btn-tts');
        if (btn) { e.preventDefault(); speak(btn.dataset.ttsText); }
      });
    },
    renderInput(item, _all, el, onAnswer) {
      const options = shuffle([item.correct, ...item.distractors]);
      el.innerHTML = `<div class="choice-grid">
        ${options.map((o, i) => `<button class="choice-btn adj-choice" data-val="${escapeAttr(o)}" data-key="${i + 1}">
          <span class="choice-key">${i + 1}</span><span>${o}</span>
        </button>`).join('')}
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
    checkAnswer(item, answer) { return item.correct === answer; },
    getCorrectDisplay(item) { return `${item.correct}  (${item.adj.jp} → ${FORM_LABELS[item.form]})`; },
    getPromptSpeechText: item => item.adj.kana,
    getAnswerSpeechText: item => item.correct,
  });
}
