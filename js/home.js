import { getDeckStats } from './storage.js';

const BLOCKS = [
  {
    id: 'hiragana',
    label: 'Hiragana',
    jp: 'ひらがな',
    emoji: '🇯🇵',
    file: 'hiragana.json',
    desc: '3 modos de práctica',
    color: 'var(--c-blue)',
    path: '/hiragana',
  },
  {
    id: 'katakana',
    label: 'Katakana',
    jp: 'カタカナ',
    emoji: '🔤',
    file: 'katakana.json',
    desc: '3 modos de práctica',
    color: 'var(--c-violet)',
    path: '/katakana',
  },
  {
    id: 'vocab',
    label: 'Vocabulario',
    jp: '語彙',
    emoji: '📖',
    file: 'vocab-n5.json',
    desc: '~150 palabras N5',
    color: 'var(--c-green)',
    path: '/vocab',
  },
  {
    id: 'kanji',
    label: 'Kanji N5',
    jp: '漢字',
    emoji: '🈳',
    file: 'kanji-n5.json',
    desc: '103 kanji oficiales',
    color: 'var(--c-orange)',
    path: '/kanji',
  },
  {
    id: 'particles',
    label: 'Partículas',
    jp: '助詞',
    emoji: '🔗',
    file: 'particles.json',
    desc: 'は が を に で…',
    color: 'var(--c-red)',
    path: '/particles',
  },
  {
    id: 'grammar',
    label: 'Gramática',
    jp: '文法',
    emoji: '📝',
    file: 'grammar-n5.json',
    desc: '40 patrones N5',
    color: 'var(--c-teal)',
    path: '/grammar',
  },
  {
    id: 'listening',
    label: 'Comprensión auditiva',
    jp: '聴解',
    emoji: '🎧',
    file: 'listening-n5.json',
    desc: 'Mini-diálogos con audio',
    color: 'var(--c-pink)',
    path: '/listening',
  },
  {
    id: 'reading',
    label: 'Comprensión lectora',
    jp: '読解',
    emoji: '📚',
    file: 'reading-n5.json',
    desc: 'Textos cortos y medios con preguntas',
    color: 'var(--c-orange)',
    path: '/reading',
  },
  {
    id: 'verbs',
    label: 'Verbos',
    jp: '動詞',
    emoji: '🏃',
    file: 'verbs-n5.json',
    desc: 'Conjugación de los 8 tipos N5',
    color: 'var(--c-violet)',
    path: '/verbs',
  },
  {
    id: 'adjectives',
    label: 'Adjetivos',
    jp: '形容詞',
    emoji: '🎨',
    file: 'adjectives-n5.json',
    desc: 'い/な adjetivos N5',
    color: 'var(--c-pink)',
    path: '/adjectives',
  },
];

const dataCache = {};
async function loadData(file) {
  if (!dataCache[file]) {
    const res = await fetch(`./data/${file}`);
    dataCache[file] = await res.json();
  }
  return dataCache[file];
}

export async function renderHome(container) {
  container.innerHTML = `
    <div class="home-wrap">
      <header class="home-header">
        <div class="home-title">
          <span class="home-title-jp">日本語</span>
          <span class="home-title-es">Práctica N5</span>
        </div>
        <div class="home-actions">
          <button class="btn-icon" id="home-stats" title="Estadísticas">📊</button>
          <button class="btn-icon" id="home-theme" title="Tema">🌙</button>
        </div>
      </header>
      <main class="home-grid" id="home-grid">
        ${BLOCKS.map(b => `
          <div class="block-card loading" data-path="${b.path}" style="--block-color:${b.color}">
            <div class="block-emoji">${b.emoji}</div>
            <div class="block-info">
              <div class="block-label">${b.label}</div>
              <div class="block-jp">${b.jp}</div>
              <div class="block-desc">${b.desc}</div>
            </div>
            <div class="block-progress">
              <div class="block-bar-track">
                <div class="block-bar-fill" style="width:0%"></div>
              </div>
              <div class="block-pct">—</div>
            </div>
          </div>
        `).join('')}
      </main>
    </div>
  `;

  document.getElementById('home-stats').addEventListener('click', () => window.navigate('/stats'));
  document.getElementById('home-theme').addEventListener('click', toggleTheme);

  container.querySelectorAll('.block-card').forEach(card => {
    card.addEventListener('click', () => window.navigate(card.dataset.path));
  });

  // Load stats async
  await Promise.all(BLOCKS.map(async (block, i) => {
    const items = await loadData(block.file);
    const stats = getDeckStats(block.id, items);
    const card = container.querySelectorAll('.block-card')[i];
    card.classList.remove('loading');
    card.querySelector('.block-bar-fill').style.width = `${stats.pct}%`;
    card.querySelector('.block-pct').textContent = `${stats.pct}% (${stats.dominados}/${stats.total})`;
  }));
}

export function renderKanaMenu(container, deck) {
  const deckLabel = deck === 'hiragana' ? 'Hiragana ひらがな' : 'Katakana カタカナ';
  const MODES = [
    { mode: 'typing', icon: '⌨️', label: 'Escribir Romaji', desc: 'Ve el kana y escribe su romaji' },
    { mode: 'choice', icon: '🔘', label: 'Opción Múltiple', desc: 'Ve el kana y elige 1 de 4 romaji' },
    { mode: 'reverse', icon: '🔄', label: 'Modo Inverso', desc: 'Ve el romaji y elige el kana' },
  ];

  container.innerHTML = `
    <div class="page">
      <header class="page-header">
        <button class="btn-icon" id="menu-back">←</button>
        <h1>${deckLabel}</h1>
      </header>
      <main class="mode-grid">
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

  document.getElementById('menu-back').addEventListener('click', () => window.navigate('/'));
  container.querySelectorAll('.mode-card').forEach(card => {
    card.addEventListener('click', () => window.navigate(`/${deck}/${card.dataset.mode}`));
  });
}

function toggleTheme() {
  const isDark = document.documentElement.dataset.theme === 'dark';
  document.documentElement.dataset.theme = isDark ? 'light' : 'dark';
  localStorage.setItem('jp_n5_theme', isDark ? 'light' : 'dark');
}
