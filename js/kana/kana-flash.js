import { showSessionConfig } from '../exercise.js';
import { selectSession, pickWrong } from '../srs.js';
import { recordAnswer } from '../storage.js?v=2';
import { recordPracticeTick } from '../daily.js';

export const TIMEOUT_MS = 3000;
export const FEEDBACK_MS = 400;

export function isCorrect(item, answer) {
  return answer !== '__timeout__' && item.romaji === answer;
}

const GROUPS = [
  { value: 'base', label: 'Base (あ～ん)' },
  { value: 'dakuten', label: 'Dakuten (が、ざ…)' },
  { value: 'handakuten', label: 'Handakuten (ぱ…)' },
  { value: 'yoon', label: 'Yōon (きゃ…)' },
];

const TIMER_STORAGE_KEY = 'jp_n5_flash_timer';

export async function start(container, deck, allItems) {
  showSessionConfig(container, {
    title: 'Flash rápido',
    subtitle: 'Reconocimiento rápido de kana. Activa el cronómetro para un reto mayor.',
    groups: GROUPS,
    toggles: [
      { key: 'timer', label: 'Cronómetro (3 s por pregunta)', storageKey: TIMER_STORAGE_KEY, default: true },
    ],
    onStart: (size, groups, toggles) => {
      const filtered = groups ? allItems.filter(it => groups.includes(it.group)) : allItems;
      if (filtered.length === 0) { alert('Selecciona al menos un grupo.'); return; }
      const items = selectSession(deck, filtered, size);
      runFlash(container, deck, items, allItems, toggles?.timer ?? true);
    },
  });
}

function runFlash(container, deck, items, allItems, timerEnabled) {
  const sessionSize = items.length;
  let idx = 0;
  let correct = 0;
  let timer = null;
  let answered = false;

  function clearTimer() {
    if (timer !== null) { clearTimeout(timer); timer = null; }
  }

  function render() {
    if (idx >= items.length) { showSummary(); return; }

    const item = items[idx];
    const wrongs = pickWrong(allItems, item, it => it.romaji, 3);
    const options = shuffle([item, ...wrongs]);
    answered = false;

    container.innerHTML = `
      <div class="ex-wrap">
        <header class="ex-header">
          <button class="btn-icon" id="flash-back" title="Salir">✕</button>
          <div class="ex-progress-track">
            <div class="ex-progress-fill" style="width:${Math.round(idx / items.length * 100)}%"></div>
          </div>
          <div class="ex-streak">${idx + 1} / ${items.length}</div>
        </header>
        <main class="ex-body">
          ${timerEnabled ? `<div class="flash-timer-track"><div class="flash-timer-fill" id="flash-timer"></div></div>` : ''}
          <div class="kana-display">${item.kana}</div>
          <div class="choice-grid" id="choice-grid">
            ${options.map((opt, i) => `
              <button class="choice-btn" data-val="${opt.romaji}" data-key="${i + 1}">
                <span class="choice-key">${i + 1}</span>${opt.romaji}
              </button>
            `).join('')}
          </div>
        </main>
      </div>
    `;

    if (timerEnabled) {
      const timerEl = document.getElementById('flash-timer');
      timerEl.style.transition = 'none';
      timerEl.style.width = '100%';
      timerEl.offsetWidth;
      timerEl.style.transition = `width ${TIMEOUT_MS}ms linear`;
      timerEl.style.width = '0%';
    }

    const keyHandler = e => {
      const n = parseInt(e.key);
      if (n >= 1 && n <= options.length) {
        const btn = container.querySelector(`[data-key="${n}"]`);
        if (btn && !btn.disabled) handleAnswer(btn.dataset.val);
      }
    };
    document.addEventListener('keydown', keyHandler);

    container.querySelector('#choice-grid').addEventListener('click', e => {
      const btn = e.target.closest('.choice-btn');
      if (btn && !btn.disabled) handleAnswer(btn.dataset.val);
    });

    container.querySelector('#flash-back').addEventListener('click', () => {
      clearTimer();
      document.removeEventListener('keydown', keyHandler);
      window.navigate('/');
    });

    function handleAnswer(answer) {
      if (answered) return;
      answered = true;
      clearTimer();
      document.removeEventListener('keydown', keyHandler);

      const ok = isCorrect(item, answer);
      recordAnswer(deck, item.id, ok);
      if (ok) { recordPracticeTick(); correct++; }

      container.querySelectorAll('.choice-btn').forEach(btn => {
        btn.disabled = true;
        if (btn.dataset.val === item.romaji) btn.classList.add('flash-correct');
        else if (btn.dataset.val === answer && !ok) btn.classList.add('flash-wrong');
      });

      setTimeout(() => { idx++; render(); }, FEEDBACK_MS);
    }

    if (timerEnabled) timer = setTimeout(() => handleAnswer('__timeout__'), TIMEOUT_MS);
  }

  function showSummary() {
    const total = items.length;
    const pct = Math.round((correct / total) * 100);
    const scoreClass = pct >= 80 ? 'score-good' : pct >= 50 ? 'score-mid' : 'score-bad';

    container.innerHTML = `
      <div class="summary">
        <h2 class="summary-title">Sesión completada</h2>
        <div class="summary-score ${scoreClass}">${pct}%</div>
        <div class="summary-detail">${correct} / ${total} correctos</div>
        <div class="summary-actions">
          <button class="btn-primary" id="sum-home">← Inicio</button>
          <button class="btn-secondary" id="sum-menu">← Cambiar modo</button>
          <button class="btn-secondary" id="sum-retry">Otra ronda</button>
        </div>
      </div>
    `;

    document.getElementById('sum-home').addEventListener('click', () => window.navigate('/'));
    document.getElementById('sum-menu').addEventListener('click', () => window.navigate(`/${deck}`));
    document.getElementById('sum-retry').addEventListener('click', () => {
      const newItems = selectSession(deck, allItems, sessionSize);
      idx = 0; correct = 0;
      items.length = 0; items.push(...newItems);
      render();
    });
  }

  render();
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
