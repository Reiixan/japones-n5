import { getDeckStats, exportAll, importAll, resetDeck } from './storage.js';
import { isAutoOn, setAutoOn } from './tts.js';
import { isRomajiOn, setRomajiOn } from './romaji.js';

const DECKS = [
  { id: 'hiragana', label: 'Hiragana', file: 'hiragana.json' },
  { id: 'katakana', label: 'Katakana', file: 'katakana.json' },
  { id: 'vocab', label: 'Vocabulario', file: 'vocab-n5.json' },
  { id: 'kanji', label: 'Kanji N5', file: 'kanji-n5.json' },
  { id: 'particles', label: 'Partículas', file: 'particles.json' },
  { id: 'grammar', label: 'Gramática', file: 'grammar-n5.json' },
  { id: 'listening', label: 'Comprensión auditiva', file: 'listening-n5.json' },
  { id: 'reading', label: 'Comprensión lectora', file: 'reading-n5.json' },
];

const dataCache = {};
async function loadData(file) {
  if (!dataCache[file]) {
    const res = await fetch(`./data/${file}`);
    dataCache[file] = await res.json();
  }
  return dataCache[file];
}

export async function renderStats(container) {
  const ttsAutoChecked = isAutoOn() ? 'checked' : '';
  const romajiChecked = isRomajiOn() ? 'checked' : '';
  container.innerHTML = `
    <div class="page">
      <header class="page-header">
        <button class="btn-icon" id="stats-back">←</button>
        <h1>Estadísticas</h1>
      </header>
      <main class="stats-body">
        <div id="stats-table-wrap">Cargando...</div>
        <section class="stats-prefs">
          <h2>Preferencias</h2>
          <label class="pref-row">
            <input type="checkbox" id="pref-tts-auto" ${ttsAutoChecked}>
            <span>Auto-pronunciar al mostrar pregunta</span>
          </label>
          <label class="pref-row">
            <input type="checkbox" id="pref-romaji" ${romajiChecked}>
            <span>Mostrar romaji en vocabulario y kanji</span>
          </label>
        </section>
        <div class="stats-actions">
          <button class="btn-secondary" id="btn-export">Exportar progreso</button>
          <button class="btn-secondary" id="btn-import">Importar progreso</button>
          <input type="file" id="import-file" accept=".json" hidden>
        </div>
      </main>
    </div>
  `;

  document.getElementById('stats-back').addEventListener('click', () => window.navigate('/'));

  const prefTtsAuto = document.getElementById('pref-tts-auto');
  if (prefTtsAuto) {
    prefTtsAuto.addEventListener('change', () => setAutoOn(prefTtsAuto.checked));
  }

  const prefRomaji = document.getElementById('pref-romaji');
  if (prefRomaji) {
    prefRomaji.addEventListener('change', () => setRomajiOn(prefRomaji.checked));
  }

  // Load all decks
  const rows = await Promise.all(DECKS.map(async deck => {
    const items = await loadData(deck.file);
    const stats = getDeckStats(deck.id, items);
    return { deck, stats };
  }));

  const wrap = document.getElementById('stats-table-wrap');
  wrap.innerHTML = `
    <table class="stats-table">
      <thead>
        <tr>
          <th>Bloque</th>
          <th>Dominados</th>
          <th>Total</th>
          <th>Progreso</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        ${rows.map(({ deck, stats }) => `
          <tr>
            <td><strong>${deck.label}</strong></td>
            <td>${stats.dominados}</td>
            <td>${stats.total}</td>
            <td>
              <div class="mini-bar-track">
                <div class="mini-bar-fill" style="width:${stats.pct}%"></div>
              </div>
              <span class="mini-pct">${stats.pct}%</span>
            </td>
            <td>
              <button class="btn-danger-sm" data-deck="${deck.id}" data-label="${deck.label}">Reset</button>
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;

  wrap.querySelectorAll('.btn-danger-sm').forEach(btn => {
    btn.addEventListener('click', () => {
      if (confirm(`¿Resetear el progreso de ${btn.dataset.label}? No se puede deshacer.`)) {
        resetDeck(btn.dataset.deck);
        renderStats(container);
      }
    });
  });

  document.getElementById('btn-export').addEventListener('click', () => {
    const data = exportAll();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `japones-n5-progreso-${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  });

  document.getElementById('btn-import').addEventListener('click', () => {
    document.getElementById('import-file').click();
  });

  document.getElementById('import-file').addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        importAll(ev.target.result);
        alert('Progreso importado correctamente.');
        renderStats(container);
      } catch {
        alert('Error al importar. Comprueba que el archivo es correcto.');
      }
    };
    reader.readAsText(file);
  });
}
