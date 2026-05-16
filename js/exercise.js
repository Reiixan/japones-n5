import { recordAnswer } from './storage.js';

// config = {
//   deck: string,
//   items: array (already selected + ordered),
//   allItems: array (full deck, for wrong-choice generation),
//   getItemId: item => string,
//   renderPrompt: (item, el) => void,
//   renderInput: (item, allItems, el, onAnswer) => void,
//   checkAnswer: (item, answer) => boolean,
//   getCorrectDisplay: item => string,
// }
export function startExercise(container, config) {
  const { deck, items, allItems } = config;
  let idx = 0;
  let streak = 0;
  let results = [];
  let inputCleanup = null;

  function render() {
    if (idx >= items.length) {
      showSummary();
      return;
    }

    const item = items[idx];
    const pct = Math.round((idx / items.length) * 100);

    container.innerHTML = `
      <div class="ex-wrap">
        <header class="ex-header">
          <button class="btn-icon ex-back" id="ex-back" title="Salir">✕</button>
          <div class="ex-progress-track">
            <div class="ex-progress-fill" style="width:${pct}%"></div>
          </div>
          <div class="ex-streak" id="ex-streak">🔥 ${streak}</div>
        </header>
        <main class="ex-body">
          <div class="ex-counter">${idx + 1} / ${items.length}</div>
          <div class="ex-prompt" id="ex-prompt"></div>
          <div class="ex-input" id="ex-input"></div>
          <div class="ex-feedback" id="ex-feedback" hidden></div>
        </main>
      </div>
    `;

    document.getElementById('ex-back').addEventListener('click', () => {
      if (inputCleanup) inputCleanup();
      window.navigate('/');
    });

    config.renderPrompt(item, document.getElementById('ex-prompt'));
    inputCleanup = config.renderInput(item, allItems, document.getElementById('ex-input'), handleAnswer);
  }

  function handleAnswer(answer) {
    if (inputCleanup) { inputCleanup(); inputCleanup = null; }
    const item = items[idx];
    const correct = config.checkAnswer(item, answer);
    recordAnswer(deck, config.getItemId(item), correct);
    results.push({ item, correct, answer });

    if (correct) streak++;
    else streak = 0;

    showFeedback(correct, item);
  }

  function showFeedback(correct, item) {
    const fb = document.getElementById('ex-feedback');
    fb.hidden = false;
    fb.className = `ex-feedback ${correct ? 'correct' : 'wrong'}`;

    if (correct) {
      fb.innerHTML = `<span class="fb-icon">✓</span><span>¡Correcto!</span>`;
      const input = document.getElementById('ex-input');
      if (input) input.querySelectorAll('button,input').forEach(el => el.disabled = true);
      setTimeout(() => { idx++; render(); }, 800);
    } else {
      const correctText = config.getCorrectDisplay(item);
      fb.innerHTML = `
        <span class="fb-icon">✗</span>
        <span>Respuesta: <strong>${correctText}</strong></span>
        <button class="btn-next" id="btn-next">Continuar →</button>
      `;
      const input = document.getElementById('ex-input');
      if (input) input.querySelectorAll('button,input').forEach(el => el.disabled = true);

      const next = document.getElementById('btn-next');
      const advance = () => { idx++; render(); };
      next.addEventListener('click', advance);
      document.addEventListener('keydown', function onKey(e) {
        if (e.key === 'Enter' || e.key === ' ') {
          document.removeEventListener('keydown', onKey);
          advance();
        }
      });
    }
  }

  function showSummary() {
    const total = results.length;
    const correctCount = results.filter(r => r.correct).length;
    const wrongItems = results.filter(r => !r.correct);
    const pct = total > 0 ? Math.round((correctCount / total) * 100) : 0;

    let scoreClass = 'score-bad';
    if (pct >= 80) scoreClass = 'score-good';
    else if (pct >= 50) scoreClass = 'score-mid';

    container.innerHTML = `
      <div class="summary">
        <h2 class="summary-title">Sesión completada</h2>
        <div class="summary-score ${scoreClass}">${pct}%</div>
        <div class="summary-detail">${correctCount} / ${total} correctos</div>
        ${wrongItems.length === 0
          ? '<div class="summary-perfect">¡Perfecto! Sin errores 🎉</div>'
          : `<div class="summary-wrongs">
              <h3>Para repasar:</h3>
              <div class="wrong-list">
                ${wrongItems.map(r => `<span class="wrong-tag">${config.getCorrectDisplay(r.item)}</span>`).join('')}
              </div>
            </div>`
        }
        <div class="summary-actions">
          <button class="btn-primary" id="sum-home">← Inicio</button>
          <button class="btn-secondary" id="sum-retry">Otra ronda</button>
        </div>
      </div>
    `;

    document.getElementById('sum-home').addEventListener('click', () => window.navigate('/'));
    document.getElementById('sum-retry').addEventListener('click', () => {
      idx = 0; streak = 0; results = [];
      render();
    });
  }

  render();
}

// Shared session config screen shown before exercise starts
// onStart(size, filters) => void
export function showSessionConfig(container, { title, subtitle, groups, onStart }) {
  const hasGroups = groups && groups.length > 0;

  container.innerHTML = `
    <div class="session-config">
      <div class="config-header">
        <button class="btn-icon" id="cfg-back" title="Volver">←</button>
      </div>
      <div class="config-body">
        <h2 class="config-title">${title}</h2>
        ${subtitle ? `<p class="config-subtitle">${subtitle}</p>` : ''}
        ${hasGroups ? `
          <div class="config-section">
            <label class="config-label">Grupos</label>
            <div class="group-checks">
              ${groups.map(g => `
                <label class="group-check">
                  <input type="checkbox" name="group" value="${g.value}" checked>
                  <span>${g.label}</span>
                </label>
              `).join('')}
            </div>
          </div>
        ` : ''}
        <div class="config-section">
          <label class="config-label">Tamaño de sesión</label>
          <div class="size-buttons">
            <button class="size-btn" data-size="10">10</button>
            <button class="size-btn active" data-size="20">20</button>
            <button class="size-btn" data-size="50">50</button>
            <button class="size-btn" data-size="all">Todo</button>
          </div>
        </div>
        <button class="btn-start" id="cfg-start">Comenzar →</button>
      </div>
    </div>
  `;

  document.getElementById('cfg-back').addEventListener('click', () => history.back());

  let selectedSize = 20;
  container.querySelectorAll('.size-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('.size-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedSize = btn.dataset.size === 'all' ? 'all' : parseInt(btn.dataset.size);
    });
  });

  document.getElementById('cfg-start').addEventListener('click', () => {
    const selectedGroups = hasGroups
      ? [...container.querySelectorAll('input[name="group"]:checked')].map(i => i.value)
      : null;
    onStart(selectedSize, selectedGroups);
  });
}
