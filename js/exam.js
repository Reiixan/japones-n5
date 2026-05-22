import { examRenderer as vocabRenderer } from './vocab.js';
import { examRenderer as kanjiRenderer } from './kanji.js';
import { examRenderer as particlesRenderer } from './particles.js';
import { examRenderer as grammarRenderer } from './grammar.js';
import { examRenderer as listeningRenderer } from './listening.js';
import { examRenderer as readingRenderer, expandTextsToItems } from './reading.js';

const PASS_OVERALL = 0.44;
const PASS_GROUP = 0.32;

const DECK_META = {
  vocab: { label: 'Vocabulario', path: '/vocab' },
  kanji: { label: 'Kanji', path: '/kanji' },
  particles: { label: 'Partículas', path: '/particles' },
  grammar: { label: 'Gramática', path: '/grammar' },
  reading: { label: 'Comprensión lectora', path: '/reading' },
  listening: { label: 'Comprensión auditiva', path: '/listening' },
};

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function sample(arr, n) {
  return shuffle(arr).slice(0, n);
}

function pct(c, t) {
  return t ? Math.round((c / t) * 100) : 0;
}

export function formatTime(ms) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function buildSections(decks) {
  const vocabR = vocabRenderer();
  const kanjiR = kanjiRenderer();
  const particlesR = particlesRenderer();
  const grammarR = grammarRenderer();
  const readingR = readingRenderer();
  const listeningR = listeningRenderer({ maxPlays: 2 });

  const q = (deck, item, allItems, renderer) => ({ deck, item, allItems, renderer });

  const mojiGoi = [
    ...sample(decks.vocab, 12).map(it => q('vocab', it, decks.vocab, vocabR)),
    ...sample(decks.kanji, 8).map(it => q('kanji', it, decks.kanji, kanjiR)),
  ];

  // Hasta 7 textos -> expandir -> recortar a 7 preguntas dokkai.
  const readingTexts = sample(decks.reading, 7);
  const readingItems = expandTextsToItems(readingTexts).slice(0, 7);
  const bunpouDokkai = [
    ...sample(decks.particles, 5).map(it => q('particles', it, decks.particles, particlesR)),
    ...sample(decks.grammar, 4).map(it => q('grammar', it, decks.grammar, grammarR)),
    ...readingItems.map(it => q('reading', it, decks.reading, readingR)),
  ];

  const choukai = sample(decks.listening, 7).map(it => q('listening', it, decks.listening, listeningR));

  return [
    { id: 'moji-goi', label: 'Moji-Goi 文字・語彙', group: 1, minutes: 20, questions: mojiGoi },
    { id: 'bunpou-dokkai', label: 'Bunpou-Dokkai 文法・読解', group: 1, minutes: 40, questions: bunpouDokkai },
    { id: 'choukai', label: 'Choukai 聴解', group: 2, minutes: 30, questions: choukai },
  ];
}

export function scoreSections(sections, answers) {
  const sectionScores = [];
  const deckAgg = {};
  const groupAgg = { 1: { correct: 0, total: 0 }, 2: { correct: 0, total: 0 } };
  let overallCorrect = 0, overallTotal = 0;

  sections.forEach((section, sIdx) => {
    let correct = 0;
    section.questions.forEach((question, qIdx) => {
      const ans = answers.get(`${sIdx}:${qIdx}`);
      const ok = ans != null && question.renderer.checkAnswer(question.item, ans);
      if (ok) correct++;
      const d = deckAgg[question.deck] || (deckAgg[question.deck] = { correct: 0, total: 0 });
      d.total++;
      if (ok) d.correct++;
    });
    const total = section.questions.length;
    sectionScores.push({ id: section.id, label: section.label, correct, total, pct: pct(correct, total) });
    overallCorrect += correct;
    overallTotal += total;
    groupAgg[section.group].correct += correct;
    groupAgg[section.group].total += total;
  });

  const groups = [1, 2].map(g => ({
    group: g,
    correct: groupAgg[g].correct,
    total: groupAgg[g].total,
    pct: pct(groupAgg[g].correct, groupAgg[g].total),
  }));

  const frac = (o) => (o.total ? o.correct / o.total : 0);
  const overall = { correct: overallCorrect, total: overallTotal, pct: pct(overallCorrect, overallTotal) };
  const passed =
    (overallTotal ? overallCorrect / overallTotal : 0) >= PASS_OVERALL &&
    frac(groupAgg[1]) >= PASS_GROUP &&
    frac(groupAgg[2]) >= PASS_GROUP;

  const byDeck = Object.keys(deckAgg).map(deck => ({
    deck,
    label: DECK_META[deck].label,
    path: DECK_META[deck].path,
    correct: deckAgg[deck].correct,
    total: deckAgg[deck].total,
    pct: pct(deckAgg[deck].correct, deckAgg[deck].total),
  }));

  return { sections: sectionScores, groups, byDeck, overall, passed };
}

export function diagnose(scored) {
  if (!scored.byDeck.length) return null;
  return scored.byDeck.reduce((worst, d) => (d.pct < worst.pct ? d : worst), scored.byDeck[0]);
}

// ---- Orquestador DOM (verificado en navegador) ----
let container = null;
let state = null;
let timerId = null;
let keyHandler = null;

export function start(rootEl, decks) {
  teardown();
  container = rootEl;
  state = {
    sections: buildSections(decks),
    sectionIdx: 0,
    questionIdx: 0,
    answers: new Map(),
    cache: new Map(),
    deadlineAt: 0,
    phase: 'intro',
  };
  installKeyHandler();
  renderIntro();
}

function installKeyHandler() {
  keyHandler = (e) => {
    if (!state || state.phase !== 'section') return;
    const n = parseInt(e.key);
    if (!(n >= 1 && n <= 9)) return;
    const panel = container.querySelector('.exam-qpanel');
    const btn = panel && panel.querySelector(`.exam-input .choice-btn[data-key="${n}"]`);
    if (btn && !btn.disabled) btn.click();
  };
  document.addEventListener('keydown', keyHandler);
}

function teardown() {
  if (timerId) { clearInterval(timerId); timerId = null; }
  if (keyHandler) { document.removeEventListener('keydown', keyHandler); keyHandler = null; }
}

function renderIntro() {
  state.phase = 'intro';
  const rows = state.sections.map(s =>
    `<tr><td>${s.label}</td><td>${s.minutes} min</td><td>${s.questions.length}</td></tr>`).join('');
  const totalQ = state.sections.reduce((n, s) => n + s.questions.length, 0);
  const totalMin = state.sections.reduce((n, s) => n + s.minutes, 0);
  container.innerHTML = `
    <div class="page exam-intro">
      <header class="page-header">
        <button class="btn-icon" id="exam-back">←</button>
        <h1>Simulacro JLPT N5</h1>
      </header>
      <main>
        <p class="exam-intro-text">Examen completo cronometrado. No puedes volver a una sección anterior. No cuenta para tu progreso (SRS).</p>
        <table class="exam-section-table">
          <thead><tr><th>Sección</th><th>Tiempo</th><th>Preguntas</th></tr></thead>
          <tbody>${rows}</tbody>
          <tfoot><tr><td>Total</td><td>${totalMin} min</td><td>${totalQ}</td></tr></tfoot>
        </table>
        <p class="exam-intro-note">Aprobado: ≥44% global y ≥32% en cada grupo (Lengua+Lectura / Choukai).</p>
        <button class="btn-start" id="exam-start">Comenzar simulacro →</button>
      </main>
    </div>
  `;
  document.getElementById('exam-back').addEventListener('click', () => { teardown(); window.navigate('/'); });
  document.getElementById('exam-start').addEventListener('click', () => enterSection(0));
}

function enterSection(idx) {
  state.sectionIdx = idx;
  state.questionIdx = 0;
  state.phase = 'section';
  const section = state.sections[idx];
  state.deadlineAt = Date.now() + section.minutes * 60000;
  if (timerId) clearInterval(timerId);
  timerId = setInterval(tick, 1000);
  renderQuestion();
}

function tick() {
  const timerEl = container.querySelector('#exam-timer');
  if (!timerEl) {
    // El usuario salió del examen (p.ej. atrás del navegador): detener el timer
    // para no pisar luego la página actual con contenido del examen.
    teardown();
    return;
  }
  const remaining = state.deadlineAt - Date.now();
  timerEl.textContent = formatTime(remaining);
  timerEl.classList.toggle('warning', remaining <= 30000);
  if (remaining <= 0) finishSection();
}

function finishSection() {
  if (!timerId) return; // sección ya en proceso de cierre: evita doble transición
  clearInterval(timerId);
  timerId = null;
  if (state.sectionIdx + 1 < state.sections.length) {
    enterSection(state.sectionIdx + 1);
  } else {
    renderResults();
  }
}

function markSelected(inputEl, val) {
  inputEl.querySelectorAll('.choice-btn').forEach(b =>
    b.classList.toggle('selected', b.dataset.val === String(val)));
}

function getQuestionNode(sIdx, qIdx) {
  const key = `${sIdx}:${qIdx}`;
  if (state.cache.has(key)) return state.cache.get(key);
  const question = state.sections[sIdx].questions[qIdx];
  const node = document.createElement('div');
  node.className = 'exam-qpanel';
  const promptEl = document.createElement('div');
  promptEl.className = 'ex-prompt exam-prompt';
  const inputEl = document.createElement('div');
  inputEl.className = 'ex-input exam-input';
  node.append(promptEl, inputEl);
  question.renderer.renderPrompt(question.item, promptEl);
  const cleanup = question.renderer.renderInput(question.item, question.allItems, inputEl, (val) => {
    state.answers.set(key, val);
    markSelected(inputEl, val);
  });
  // El cleanup de cada bloque solo elimina su keydown de document; el click sobre
  // inputEl permanece. exam.js gestiona el teclado con un único handler global.
  if (typeof cleanup === 'function') cleanup();
  if (state.answers.has(key)) markSelected(inputEl, state.answers.get(key));
  state.cache.set(key, node);
  return node;
}

function renderQuestion() {
  const sIdx = state.sectionIdx;
  const qIdx = state.questionIdx;
  const section = state.sections[sIdx];
  const remaining = state.deadlineAt - Date.now();
  container.innerHTML = `
    <div class="ex-wrap exam-wrap">
      <header class="ex-header exam-header">
        <div class="exam-section-label">${section.label}</div>
        <div class="exam-timer" id="exam-timer">${formatTime(remaining)}</div>
        <div class="exam-progress">${qIdx + 1}/${section.questions.length}</div>
      </header>
      <main class="ex-body exam-body" id="exam-body"></main>
      <footer class="exam-nav">
        <button class="btn-secondary" id="exam-prev" ${qIdx === 0 ? 'disabled' : ''}>← Anterior</button>
        <button class="btn-secondary" id="exam-finish">Terminar sección</button>
        <button class="btn-secondary" id="exam-next" ${qIdx === section.questions.length - 1 ? 'disabled' : ''}>Siguiente →</button>
      </footer>
    </div>
  `;
  document.getElementById('exam-body').appendChild(getQuestionNode(sIdx, qIdx));
  document.getElementById('exam-prev').addEventListener('click', () => {
    if (state.questionIdx > 0) { state.questionIdx--; renderQuestion(); }
  });
  document.getElementById('exam-next').addEventListener('click', () => {
    if (state.questionIdx < section.questions.length - 1) { state.questionIdx++; renderQuestion(); }
  });
  document.getElementById('exam-finish').addEventListener('click', () => {
    if (confirm('¿Terminar esta sección? No podrás volver.')) finishSection();
  });
}

function renderResults() {
  state.phase = 'results';
  teardown();
  const scored = scoreSections(state.sections, state.answers);
  const worst = diagnose(scored);
  const sectionRows = scored.sections.map(s =>
    `<tr><td>${s.label}</td><td>${s.correct}/${s.total}</td><td>${s.pct}%</td></tr>`).join('');
  const g1 = scored.groups.find(g => g.group === 1);
  const g2 = scored.groups.find(g => g.group === 2);
  const groupLine = (g, name, min) =>
    `<li>${name}: ${g.correct}/${g.total} (${g.pct}%) ${g.pct >= min ? '✅' : `❌ &lt; ${min}%`}</li>`;
  container.innerHTML = `
    <div class="page exam-results">
      <header class="page-header"><h1>Resultado del simulacro</h1></header>
      <main>
        <div class="exam-final-score ${scored.passed ? 'pass' : 'fail'}">
          <div class="exam-pct">${scored.overall.pct}%</div>
          <div class="exam-verdict">${scored.passed ? 'APROBADO ✅' : 'NO APROBADO ❌'}
            <small>(corte: 44% global · 32% por grupo)</small></div>
        </div>
        <table class="exam-section-table">
          <thead><tr><th>Sección</th><th>Aciertos</th><th>%</th></tr></thead>
          <tbody>${sectionRows}</tbody>
        </table>
        <ul class="exam-groups">
          ${groupLine(g1, 'Lengua + Lectura', 32)}
          ${groupLine(g2, 'Choukai', 32)}
        </ul>
        ${worst ? `<div class="exam-diagnosis">
          Tu punto más flojo: <strong>${worst.label}</strong> (${worst.pct}%).
          <button class="btn-secondary" id="exam-practice">Practicar ${worst.label} →</button>
        </div>` : ''}
        <div class="exam-actions">
          <button class="btn-secondary" id="exam-home">Inicio</button>
          <button class="btn-primary" id="exam-retry">Otro simulacro</button>
        </div>
      </main>
    </div>
  `;
  document.getElementById('exam-home').addEventListener('click', () => window.navigate('/'));
  document.getElementById('exam-retry').addEventListener('click', () => window.navigate('/exam'));
  if (worst) {
    document.getElementById('exam-practice').addEventListener('click', () => window.navigate(worst.path));
  }
}
