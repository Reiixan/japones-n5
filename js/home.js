import { getDeckStats, getRecentErrors } from './storage.js?v=2';
import { collectDueItems } from './review-today.js';
import { getDailyState } from './daily.js';
import { initSyncButton } from './sync.js';

const BLOCKS = [
  {
    id: 'hiragana',
    label: 'Hiragana',
    jp: 'ひらがな',
    file: 'hiragana.json',
    desc: '3 modos de práctica',
    color: 'var(--c-blue)',
    path: '/hiragana',
  },
  {
    id: 'katakana',
    label: 'Katakana',
    jp: 'カタカナ',
    file: 'katakana.json',
    desc: '3 modos de práctica',
    color: 'var(--c-violet)',
    path: '/katakana',
  },
  {
    id: 'vocab',
    label: 'Vocabulario',
    jp: '語彙',
    file: 'vocab-n5.json',
    desc: '~150 palabras N5',
    color: 'var(--c-green)',
    path: '/vocab',
  },
  {
    id: 'kanji',
    label: 'Kanji N5',
    jp: '漢字',
    file: 'kanji-n5.json',
    desc: '103 kanji oficiales',
    color: 'var(--c-orange)',
    path: '/kanji',
  },
  {
    id: 'particles',
    label: 'Partículas',
    jp: '助詞',
    file: 'particles.json',
    desc: 'は が を に で…',
    color: 'var(--c-red)',
    path: '/particles',
  },
  {
    id: 'grammar',
    label: 'Gramática',
    jp: '文法',
    file: 'grammar-n5.json',
    desc: '40 patrones N5',
    color: 'var(--c-teal)',
    path: '/grammar',
  },
  {
    id: 'listening',
    label: 'Comprensión auditiva',
    jp: '聴解',
    file: 'listening-n5.json',
    desc: 'Mini-diálogos con audio',
    color: 'var(--c-pink)',
    path: '/listening',
  },
  {
    id: 'reading',
    label: 'Comprensión lectora',
    jp: '読解',
    file: 'reading-n5.json',
    desc: 'Textos cortos y medios con preguntas',
    color: 'var(--c-orange)',
    path: '/reading',
  },
  {
    id: 'verbs',
    label: 'Verbos',
    jp: '動詞',
    file: 'verbs-n5.json',
    desc: 'Conjugación de los 8 tipos N5',
    color: 'var(--c-violet)',
    path: '/verbs',
  },
  {
    id: 'adjectives',
    label: 'Adjetivos',
    jp: '形容詞',
    file: 'adjectives-n5.json',
    desc: 'い/な adjetivos N5',
    color: 'var(--c-pink)',
    path: '/adjectives',
  },
];

const SECTIONS = [
  { label: 'Escritura',    ids: ['hiragana', 'katakana'] },
  { label: 'Vocabulario',  ids: ['vocab', 'kanji'] },
  { label: 'Gramática',    ids: ['particles', 'grammar', 'verbs', 'adjectives'] },
  { label: 'Comprensión',  ids: ['listening', 'reading'] },
];

const dataCache = {};
async function loadData(file) {
  if (!dataCache[file]) {
    const res = await fetch(`./data/${file}`);
    dataCache[file] = await res.json();
  }
  return dataCache[file];
}

function blockById(id) {
  return BLOCKS.find(b => b.id === id);
}

function renderCard(b, delay) {
  return `
    <div class="block-card loading" data-id="${b.id}" data-path="${b.path}"
         role="button" tabindex="0" aria-label="${b.label}"
         style="--block-color:${b.color}; animation-delay:${delay.toFixed(2)}s">
      <div class="block-jp">${b.jp}</div>
      <div class="block-label">${b.label}</div>
      <div class="block-desc">${b.desc}</div>
      <div class="block-progress">
        <div class="block-bar-track">
          <div class="block-bar-fill" style="width:0%"></div>
        </div>
        <div class="block-pct">—</div>
      </div>
    </div>
  `;
}

export async function renderHome(container) {
  const ds = getDailyState();
  const pct = ds.goal > 0 ? Math.min(100, Math.round((ds.todayCount / ds.goal) * 100)) : 0;

  let cardIdx = 0;
  const gridHTML = SECTIONS.map(section => {
    const cardsHTML = section.ids.map(id => {
      const block = blockById(id);
      const delay = 0.15 + cardIdx * 0.06;
      cardIdx++;
      return renderCard(block, delay);
    }).join('');
    return `
      <div class="home-col">
        <div class="home-col-label">${section.label}</div>
        <div class="home-col-cards">${cardsHTML}</div>
      </div>
    `;
  }).join('');

  container.innerHTML = `
    <div class="home-wrap">
      <div class="home-inner">
        <header class="home-header">
          <div class="home-title">
            <span class="home-title-jp">日本語</span>
            <span class="home-title-es">Práctica N5</span>
          </div>
          <div class="daily-widget">
            <div class="daily-progress" style="--pct:${pct}%">
              <span class="daily-label">${ds.todayCount}/${ds.goal}</span>
            </div>
            <div class="daily-streak" title="Racha actual">🔥 ${ds.streak}</div>
          </div>
          <div class="home-actions">
            <button class="btn-icon" id="home-stats" title="Estadísticas">📊</button>
            <button class="btn-icon" id="home-theme" title="Tema">🌙</button>
            <button class="btn-icon" id="home-auth" title="Sincronización">☁️ <span class="auth-cta-text">Sync</span></button>
          </div>
        </header>
        <div id="errors-card-wrap"></div>
        <div class="review-card" data-path="/review" role="button" tabindex="0" aria-label="Repaso de hoy" style="animation-delay:.08s">
          <div class="review-card-icon">🌅</div>
          <div class="review-card-text">
            <div class="review-card-title">Repaso de hoy</div>
            <div class="review-card-sub" id="review-card-sub">Calculando…</div>
          </div>
          <div class="review-card-arrow">→</div>
        </div>
        <div class="lesson-home-card" id="lesson-home-card" role="button" tabindex="0" aria-label="Lecciones" style="animation-delay:.12s">
          <div class="lesson-home-card-icon">📚</div>
          <div class="lesson-home-card-text">
            <div class="lesson-home-card-title">Lecciones</div>
            <div class="lesson-home-card-sub" id="lesson-home-sub">Calculando…</div>
          </div>
          <div class="lesson-home-card-arrow">→</div>
        </div>
        <div class="exam-card" data-path="/exam" role="button" tabindex="0" aria-label="Simulacro JLPT N5" style="animation-delay:.16s">
          <div class="exam-card-icon">📝</div>
          <div class="exam-card-text">
            <div class="exam-card-title">Simulacro JLPT N5</div>
            <div class="exam-card-sub">90 min · 43 preguntas · cronometrado</div>
          </div>
          <div class="exam-card-arrow">→</div>
        </div>
        <main class="home-grid" id="home-grid">
          ${gridHTML}
        </main>
      </div>
    </div>
  `;

  document.getElementById('home-stats').addEventListener('click', () => window.navigate('/stats'));
  document.getElementById('home-theme').addEventListener('click', toggleTheme);
  initSyncButton();

  const recentErrors = getRecentErrors();
  const errWrap = document.getElementById('errors-card-wrap');
  if (recentErrors.length > 0 && errWrap) {
    errWrap.innerHTML = `
      <div class="errors-card" style="animation-delay:.06s">
        <div class="errors-card-icon">🔁</div>
        <div class="errors-card-text">
          <div class="errors-card-title">Para repasar</div>
          <div class="errors-card-items">
            ${recentErrors.slice(0, 10).map(e => `<span class="errors-tag">${e.display}</span>`).join('')}
            ${recentErrors.length > 10 ? `<span class="errors-tag errors-tag-more">+${recentErrors.length - 10}</span>` : ''}
          </div>
        </div>
      </div>`;
  }

  const reviewCard = container.querySelector('.review-card');
  if (reviewCard) activate(reviewCard, () => window.navigate('/review'));

  const examCard = container.querySelector('.exam-card');
  if (examCard) activate(examCard, () => window.navigate('/exam'));

  // Lesson card: async load progress, then wire click
  (async () => {
    const index = await fetch('./data/lessons/index.json').then(r => r.json());
    const completed = index.filter(l => {
      const raw = localStorage.getItem('jp_n5_lesson.' + l.id);
      return raw && JSON.parse(raw).status === 'completed';
    });
    const next = index.find(l => {
      const raw = localStorage.getItem('jp_n5_lesson.' + l.id);
      return !raw || JSON.parse(raw).status !== 'completed';
    }) ?? index[index.length - 1];

    const sub = document.getElementById('lesson-home-sub');
    if (sub) {
      sub.textContent = completed.length === index.length
        ? `¡Todas completadas! (${index.length}/${index.length})`
        : `${completed.length}/${index.length} completadas · Siguiente: ${next.title}`;
    }
    const card = document.getElementById('lesson-home-card');
    if (card) activate(card, () => window.navigate('/lessons/' + next.id));
  })();

  container.querySelectorAll('.block-card').forEach(card => {
    activate(card, () => window.navigate(card.dataset.path));
  });

  // Load stats keyed by data-id (order-independent)
  await Promise.all(BLOCKS.map(async (block) => {
    if (!block.file) return;
    const items = await loadData(block.file);
    const stats = getDeckStats(block.id, items);
    const card = container.querySelector(`.block-card[data-id="${block.id}"]`);
    if (!card) return;
    card.classList.remove('loading');
    card.querySelector('.block-bar-fill').style.width = `${stats.pct}%`;
    card.querySelector('.block-pct').textContent = `${stats.pct}% (${stats.dominados}/${stats.total})`;
  }));

  const now = Date.now();
  let totalDue = 0;
  await Promise.all(BLOCKS.map(async block => {
    if (!block.file) return;
    const items = await loadData(block.file);
    const due = collectDueItems(block.id, items, now);
    totalDue += due.length;
  }));
  const sub = document.getElementById('review-card-sub');
  if (sub) {
    sub.textContent = totalDue === 0
      ? '¡Sin pendientes!'
      : `${totalDue} ítem${totalDue === 1 ? '' : 's'} vencido${totalDue === 1 ? '' : 's'}`;
  }

}

export function renderKanaMenu(container, deck) {
  const deckLabel = deck === 'hiragana' ? 'Hiragana ひらがな' : 'Katakana カタカナ';
  const lessonId  = deck === 'hiragana' ? 'l01-hiragana' : 'l02-katakana';
  const lessonDesc = deck === 'hiragana'
    ? 'Vocales y primeros sonidos · ~10 min'
    : 'Para palabras extranjeras · ~8 min';
  const MODES = [
    { mode: 'typing',  icon: '⌨️', label: 'Escribir Romaji',  desc: 'Ve el kana y escribe su romaji' },
    { mode: 'choice',  icon: '🔘', label: 'Opción Múltiple',  desc: 'Ve el kana y elige 1 de 4 romaji' },
    { mode: 'reverse', icon: '🔄', label: 'Modo Inverso',     desc: 'Ve el romaji y elige el kana' },
    { mode: 'audio',   icon: '🔊', label: 'Escuchar',         desc: 'Oye el sonido y elige el kana' },
    { mode: 'words',   icon: '📖', label: 'Dictado palabras', desc: 'Ve una palabra y escribe su romaji' },
    { mode: 'flash',   icon: '⚡', label: 'Flash rápido',     desc: 'Elige el romaji antes de que se acabe el tiempo' },
  ];

  container.innerHTML = `
    <div class="page">
      <header class="page-header">
        <button class="btn-icon" id="menu-back">←</button>
        <h1>${deckLabel}</h1>
      </header>
      <main class="mode-grid">
        <div class="mode-card" data-path="/lessons/${lessonId}" role="button" tabindex="0" aria-label="Lección">
          <div class="mode-icon">📖</div>
          <div>
            <div class="mode-label">Lección</div>
            <div class="mode-desc">${lessonDesc}</div>
          </div>
        </div>
        ${MODES.map(m => `
          <div class="mode-card" data-mode="${m.mode}" role="button" tabindex="0" aria-label="${m.label}">
            <div class="mode-icon">${m.icon}</div>
            <div>
              <div class="mode-label">${m.label}</div>
              <div class="mode-desc">${m.desc}</div>
            </div>
          </div>
        `).join('')}
      </main>
    </div>
  `;

  document.getElementById('menu-back').addEventListener('click', () => window.navigate('/'));
  container.querySelectorAll('.mode-card').forEach(card => {
    const path = card.dataset.path ?? `/${deck}/${card.dataset.mode}`;
    activate(card, () => window.navigate(path));
  });
}

// Hace un elemento clicable también activable por teclado (Enter/Espacio).
function activate(el, fn) {
  el.addEventListener('click', fn);
  el.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fn(); }
  });
}

function toggleTheme() {
  const isDark = document.documentElement.dataset.theme === 'dark';
  document.documentElement.dataset.theme = isDark ? 'light' : 'dark';
  localStorage.setItem('jp_n5_theme', isDark ? 'light' : 'dark');
}
