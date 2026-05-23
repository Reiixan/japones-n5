import { startExercise, showSessionConfig } from './exercise.js';
import { selectSession } from './srs.js';
import { speak } from './tts.js';
import { conjugate, generateDistractors } from './conjugation.js';

const DECK = 'verbs';

export const ALLOWED_FORMS = ['masu', 'masen', 'mashita', 'masen_deshita', 'te', 'ta', 'nai', 'nakatta'];

export const FORM_LABELS = {
  masu: 'presente afirmativo (~ます)',
  masen: 'presente negativo (~ません)',
  mashita: 'pasado afirmativo (~ました)',
  masen_deshita: 'pasado negativo (~ませんでした)',
  te: 'forma て',
  ta: 'forma た (pasado plain)',
  nai: 'forma ない (negativo plain)',
  nakatta: 'forma なかった (pasado negativo plain)',
};

const GROUP_LABELS = {
  godan: 'godan (五段)',
  ichidan: 'ichidan (一段)',
  irregular: 'irregular',
};

export function pickRandomForm() {
  return ALLOWED_FORMS[Math.floor(Math.random() * ALLOWED_FORMS.length)];
}

export function buildItem(verb, form) {
  const correct = conjugate(verb.dict, verb.group, form);
  const distractors = generateDistractors(verb.dict, verb.group, form, 3);
  return { verb, form, correct, distractors };
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

export async function start(container, allVerbs, mode) {
  if (!mode) {
    renderModeMenu(container);
    return;
  }
  showSessionConfig(container, {
    title: 'Verbos 動詞',
    subtitle: 'Mira el verbo en diccionario, su grupo y la forma pedida. Elige la conjugación correcta.',
    onStart: (size) => {
      const verbs = selectSession(DECK, allVerbs, size);
      const items = verbs.map(v => buildItem(v, pickRandomForm()));
      runVerbs(container, items, allVerbs);
    },
  });
}

function renderModeMenu(container) {
  container.innerHTML = `
    <div class="page">
      <header class="page-header">
        <button class="btn-icon" id="verbs-menu-back">←</button>
        <h1>Verbos 動詞</h1>
      </header>
      <main class="mode-grid">
        <div class="mode-card" data-path="/lessons/l07-verbos-masu">
          <div class="mode-icon">📖</div>
          <div class="mode-label">Lección</div>
          <div class="mode-desc">Verbos en forma ます · ~10 min</div>
        </div>
        <div class="mode-card" data-path="/verbs/practice">
          <div class="mode-icon">📝</div>
          <div class="mode-label">Practicar</div>
          <div class="mode-desc">Conjugación de los 8 tipos N5</div>
        </div>
      </main>
    </div>
  `;
  document.getElementById('verbs-menu-back').addEventListener('click', () => window.navigate('/'));
  container.querySelectorAll('.mode-card').forEach(card => {
    card.addEventListener('click', () => window.navigate(card.dataset.path));
  });
}

function runVerbs(container, items, allVerbs) {
  startExercise(container, {
    deck: DECK,
    items,
    allItems: allVerbs,
    getItemId: it => it.verb.id,
    renderPrompt(item, el) {
      const { verb, form } = item;
      el.innerHTML = `
        <div class="verb-prompt">
          <div class="verb-dict">
            <span class="verb-jp">${verb.dict}</span>
            <button type="button" class="btn-tts" data-tts-text="${escapeAttr(verb.dict_kana)}" aria-label="Escuchar">🔊</button>
          </div>
          <div class="verb-kana">${verb.dict_kana}</div>
          <div class="verb-meta">
            <span class="verb-group">${GROUP_LABELS[verb.group]}</span>
            <span class="verb-meaning">${verb.meaning_es}</span>
          </div>
          <div class="verb-form-target">Conjuga en <strong>${FORM_LABELS[form]}</strong></div>
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
        ${options.map((o, i) => `<button class="choice-btn verb-choice" data-val="${escapeAttr(o)}" data-key="${i + 1}">
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
    getCorrectDisplay(item) { return `${item.correct}  (${item.verb.dict} → ${FORM_LABELS[item.form]})`; },
    getPromptSpeechText: item => item.verb.dict_kana,
    getAnswerSpeechText: item => item.correct,
  });
}
