import { startExercise, showSessionConfig } from '../exercise.js';
import { selectSession, pickWrong } from '../srs.js';
import { getProgress } from '../storage.js?v=2';
import { speak, renderSpeakButton, attachSpeakHandler, isAutoOn } from '../tts.js';

const DECK_PREFIX = 'kana-sentences';
const LEVEL_NAMES = ['', 'Oraciones simples', 'Oraciones complejas', 'Textos cortos'];
const GATE = 0.8;

function getDeckId(deck) {
  return `${DECK_PREFIX}-${deck}`;
}

function unlockedLevel(deckId, items) {
  for (let lvl = 1; lvl <= 2; lvl++) {
    const group = items.filter(i => i.level === lvl);
    if (group.length === 0) continue;
    const mastered = group.filter(i => (getProgress(deckId, i.id).box ?? 0) >= 3).length;
    if (mastered / group.length < GATE) return lvl;
  }
  return 3;
}

function buildSubtitle(deckId, items, currentLevel) {
  if (currentLevel >= 3) return `Nivel 3 — Textos cortos · Nivel máximo alcanzado ✓`;
  const group = items.filter(i => i.level === currentLevel);
  const mastered = group.filter(i => (getProgress(deckId, i.id).box ?? 0) >= 3).length;
  const total = group.length;
  const pct = total > 0 ? Math.round((mastered / total) * 100) : 0;
  const filled = Math.round(pct / 10);
  const bar = '█'.repeat(filled) + '░'.repeat(10 - filled);
  return `Nivel actual: ${currentLevel} — ${LEVEL_NAMES[currentLevel]}<br><span class="level-progress">${bar} ${mastered}/${total} dominadas → nivel ${currentLevel + 1}</span>`;
}

export async function start(container, deck, allSentences) {
  const deckId = getDeckId(deck);
  const deckItems = allSentences.filter(i => i.deck === deck);
  const level = unlockedLevel(deckId, deckItems);
  const available = deckItems.filter(i => i.level <= level);

  showSessionConfig(container, {
    title: 'Lectura de oraciones',
    subtitle: buildSubtitle(deckId, deckItems, level),
    onStart: (size) => {
      try {
        runSentences(container, deck, deckId, available, deckItems, size);
      } catch (err) {
        container.innerHTML = `
          <div class="error-screen">
            <h2>Error al iniciar</h2>
            <p>${err.message}</p>
            <button class="btn-primary" onclick="history.back()">Volver</button>
          </div>`;
      }
    },
  });
}

function runSentences(container, deck, deckId, available, deckItems, size) {
  startExercise(container, {
    deck: deckId,
    getItems: () => selectSession(deckId, available, size),
    allItems: deckItems,
    getItemId: it => it.id,
    renderPrompt(item, el) {
      const jpHtml = item.jp.replace(/\n/g, '<br>');
      el.innerHTML = `<div class="kana-sentence-display">${jpHtml}</div>${renderSpeakButton(item.jp)}`;
      attachSpeakHandler(el);
      if (isAutoOn()) speak(item.jp);
    },
    renderInput(item, all, el, onAnswer) {
      return item.level === 3
        ? renderMcOnly(item, all, el, onAnswer)
        : renderTwoStep(item, all, el, onAnswer);
    },
    checkAnswer(item, answer) {
      return answer === item.es;
    },
    getCorrectDisplay(item) {
      return item.es;
    },
    getPromptSpeechText: item => item.jp,
    getAnswerSpeechText: item => item.jp,
    menuPath: `/${deck}`,
  });
}

// ── helpers ────────────────────────────────────────────────────

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function esc(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function buildMcHtml(all, item) {
  const wrongs = pickWrong(all, item, it => it.es, 3);
  return shuffle([item, ...wrongs])
    .map((opt, i) => `<button class="choice-btn" data-val="${esc(opt.es)}" data-key="${i + 1}"><span class="choice-key">${i + 1}</span>${esc(opt.es)}</button>`)
    .join('');
}

function attachMcListeners(el, onSelect) {
  const keyHandler = e => {
    const n = parseInt(e.key);
    if (n >= 1 && n <= 4) {
      const btn = el.querySelector(`[data-key="${n}"]`);
      if (btn && !btn.disabled) btn.click();
    }
  };
  document.addEventListener('keydown', keyHandler);

  const clickHandler = e => {
    const btn = e.target.closest('.choice-btn');
    if (!btn || btn.disabled) return;
    el.removeEventListener('click', clickHandler);
    document.removeEventListener('keydown', keyHandler);
    onSelect(btn.dataset.val);
  };
  el.addEventListener('click', clickHandler);

  return () => {
    el.removeEventListener('click', clickHandler);
    document.removeEventListener('keydown', keyHandler);
  };
}

// ── level-3: MC only ──────────────────────────────────────────

function renderMcOnly(item, all, el, onAnswer) {
  el.innerHTML = `<div class="choice-grid">${buildMcHtml(all, item)}</div>`;
  return attachMcListeners(el, onAnswer);
}

// ── levels 1-2: romaji → MC ───────────────────────────────────

function renderTwoStep(item, all, el, onAnswer) {
  let romajiCorrect = false;
  let phase2Cleanup = null;

  el.innerHTML = `
    <form class="typing-form" autocomplete="off">
      <input class="typing-input" type="text" placeholder="romaji..." spellcheck="false" autocorrect="off" autocapitalize="off">
      <button type="submit" class="btn-primary">Comprobar</button>
    </form>
  `;
  const form = el.querySelector('.typing-form');
  el.querySelector('.typing-input').focus();

  const submitHandler = e => {
    e.preventDefault();
    const val = form.querySelector('.typing-input').value.trim().toLowerCase();
    if (!val) {
      const inp = form.querySelector('.typing-input');
      inp.classList.add('input-shake');
      inp.placeholder = 'Escribe el romaji primero…';
      setTimeout(() => inp.classList.remove('input-shake'), 500);
      return;
    }

    romajiCorrect = val === item.romaji.toLowerCase();
    const fbClass = romajiCorrect ? 'romaji-fb-ok' : 'romaji-fb-err';
    const fbText = romajiCorrect ? `✓ ${item.romaji}` : `✗ Era: ${item.romaji}`;

    el.innerHTML = `<div class="romaji-feedback ${fbClass}">${fbText}</div><div class="choice-grid">${buildMcHtml(all, item)}</div>`;

    phase2Cleanup = attachMcListeners(el, selectedVal => {
      const meaningCorrect = selectedVal === item.es;
      onAnswer(romajiCorrect && meaningCorrect ? item.es : '__wrong__');
    });
  };

  form.addEventListener('submit', submitHandler);

  return () => {
    form.removeEventListener('submit', submitHandler);
    if (phase2Cleanup) phase2Cleanup();
  };
}
