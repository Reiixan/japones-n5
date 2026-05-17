import { getProgress } from './storage.js';

const DATA_FILES = [
  { deck: 'vocab', file: 'vocab-n5.json' },
  { deck: 'kanji', file: 'kanji-n5.json' },
  { deck: 'particles', file: 'particles.json' },
  { deck: 'grammar', file: 'grammar-n5.json' },
  { deck: 'verbs', file: 'verbs-n5.json' },
  { deck: 'adjectives', file: 'adjectives-n5.json' },
];

const dataCache = {};
async function loadData(file) {
  if (!dataCache[file]) {
    const res = await fetch(`./data/${file}`);
    dataCache[file] = await res.json();
  }
  return dataCache[file];
}

export function collectDueItems(deck, items, now) {
  const due = [];
  for (const item of items) {
    const p = getProgress(deck, item.id);
    if (p.dueAt != null && p.dueAt <= now) {
      due.push(item);
    }
  }
  return due;
}

async function collectAllDue(now) {
  const allDue = [];
  for (const { deck, file } of DATA_FILES) {
    try {
      const items = await loadData(file);
      const due = collectDueItems(deck, items, now);
      for (const item of due) {
        allDue.push({ ...item, _deck: deck, _file: file });
      }
    } catch (e) {
      console.warn('No se pudo cargar', file, e);
    }
  }
  return allDue;
}

async function collectUpcoming(now, limit = 5) {
  const all = [];
  for (const { deck, file } of DATA_FILES) {
    try {
      const items = await loadData(file);
      for (const item of items) {
        const p = getProgress(deck, item.id);
        if (p.dueAt != null && p.dueAt > now) {
          all.push({ item, deck, dueAt: p.dueAt });
        }
      }
    } catch (_) {}
  }
  all.sort((a, b) => a.dueAt - b.dueAt);
  return all.slice(0, limit);
}

function formatTimeUntil(ms) {
  if (ms < 60 * 1000) return 'menos de 1 min';
  if (ms < 60 * 60 * 1000) return `${Math.round(ms / 60000)} min`;
  if (ms < 24 * 60 * 60 * 1000) return `${Math.round(ms / 3600000)} h`;
  return `${Math.round(ms / 86400000)} d`;
}

export async function start(container) {
  container.innerHTML = '<div class="loading-screen">Calculando…</div>';
  const now = Date.now();
  const due = await collectAllDue(now);

  if (due.length === 0) {
    const upcoming = await collectUpcoming(now, 5);
    container.innerHTML = `
      <div class="page review-today">
        <header class="page-header">
          <button class="btn-icon" id="rev-back">←</button>
          <h1>Repaso de hoy</h1>
        </header>
        <main class="review-body">
          <div class="review-empty">
            <div class="review-empty-icon">🎉</div>
            <h2>¡Sin repasos pendientes!</h2>
            <p>Has dominado todo lo que toca hoy. Buena racha.</p>
          </div>
          ${upcoming.length > 0 ? `
            <div class="review-upcoming">
              <h3>Próximos repasos</h3>
              <ul>
                ${upcoming.map(u => `<li><strong>${u.deck}</strong> · <code>${u.item.id}</code> · en ${formatTimeUntil(u.dueAt - now)}</li>`).join('')}
              </ul>
            </div>
          ` : ''}
        </main>
      </div>
    `;
    document.getElementById('rev-back').addEventListener('click', () => window.navigate('/'));
    return;
  }

  // Render pantalla de resumen: cuántos items, agrupados por bloque, botón "Empezar"
  const byDeck = {};
  for (const it of due) {
    byDeck[it._deck] = (byDeck[it._deck] || 0) + 1;
  }

  container.innerHTML = `
    <div class="page review-today">
      <header class="page-header">
        <button class="btn-icon" id="rev-back">←</button>
        <h1>Repaso de hoy</h1>
      </header>
      <main class="review-body">
        <div class="review-summary">
          <div class="review-total">${due.length} repasos vencidos</div>
          <ul class="review-breakdown">
            ${Object.entries(byDeck).map(([deck, count]) => `<li><strong>${deck}</strong>: ${count}</li>`).join('')}
          </ul>
          <p class="review-note">
            <small>El repaso unificado todavía no orquesta todos los tipos de ejercicio.
            Por ahora ve al bloque que más vencidos tenga: arriba ${Object.entries(byDeck).sort((a,b) => b[1]-a[1])[0][0]}.</small>
          </p>
        </div>
      </main>
    </div>
  `;
  document.getElementById('rev-back').addEventListener('click', () => window.navigate('/'));
}
