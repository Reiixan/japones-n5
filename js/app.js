import { renderHome, renderKanaMenu } from './home.js';
import { renderStats } from './stats.js';
import { start as startKanaTyping } from './kana/kana-typing.js';
import { start as startKanaChoice } from './kana/kana-choice.js';
import { start as startKanaReverse } from './kana/kana-reverse.js';
import { start as startKanaAudio } from './kana/kana-audio.js';
import { start as startKanaWords } from './kana/kana-words.js';
import { start as startKanaFlash } from './kana/kana-flash.js';
import { start as startVocab } from './vocab.js';
import { start as startKanji } from './kanji.js';
import { start as startParticles } from './particles.js';
import { start as startGrammar } from './grammar.js';
import { start as startListening } from './listening.js';
import { start as startReading } from './reading.js';
import { start as startVerbs } from './verbs.js';
import { start as startAdjectives } from './adjectives.js';
import { start as startReviewToday } from './review-today.js';
import { start as startExam } from './exam.js';
import { migrateV1ToV2 } from './storage.js?v=2';
import { initViewport } from './viewport.js';

const container = document.getElementById('app');
const dataCache = {};

async function loadData(file) {
  if (!dataCache[file]) {
    const res = await fetch(`./data/${file}`);
    dataCache[file] = await res.json();
  }
  return dataCache[file];
}

window.navigate = function (path) {
  window.location.hash = path;
};

async function route() {
  const hash = window.location.hash.slice(1) || '/';
  const [, seg1, seg2] = hash.split('/');

  container.innerHTML = '<div class="loading-screen">Cargando...</div>';

  try {
    if (!seg1) {
      await renderHome(container);
    } else if (seg1 === 'stats') {
      await renderStats(container);
    } else if (seg1 === 'hiragana' || seg1 === 'katakana') {
      const deck = seg1;
      const file = deck === 'hiragana' ? 'hiragana.json' : 'katakana.json';
      if (!seg2) {
        renderKanaMenu(container, deck);
      } else {
        const allItems = await loadData(file);
        if (seg2 === 'typing') await startKanaTyping(container, deck, allItems);
        else if (seg2 === 'choice') await startKanaChoice(container, deck, allItems);
        else if (seg2 === 'reverse') await startKanaReverse(container, deck, allItems);
        else if (seg2 === 'audio') await startKanaAudio(container, deck, allItems);
        else if (seg2 === 'flash') await startKanaFlash(container, deck, allItems);
        else if (seg2 === 'words') {
          const vocabItems = await loadData('vocab-n5.json');
          await startKanaWords(container, deck, vocabItems);
        }
        else window.navigate(`/${deck}`);
      }
    } else if (seg1 === 'vocab') {
      const allItems = await loadData('vocab-n5.json');
      if (!seg2) {
        await startVocab(container, allItems, null);
      } else if (seg2 === 'jp-es' || seg2 === 'es-jp') {
        await startVocab(container, allItems, seg2);
      } else {
        window.navigate('/vocab');
      }
    } else if (seg1 === 'kanji') {
      const allItems = await loadData('kanji-n5.json');
      await startKanji(container, allItems);
    } else if (seg1 === 'particles') {
      const allItems = await loadData('particles.json');
      await startParticles(container, allItems);
    } else if (seg1 === 'grammar') {
      const allItems = await loadData('grammar-n5.json');
      await startGrammar(container, allItems);
    } else if (seg1 === 'listening') {
      const allItems = await loadData('listening-n5.json');
      await startListening(container, allItems);
    } else if (seg1 === 'reading') {
      const allItems = await loadData('reading-n5.json');
      await startReading(container, allItems);
    } else if (seg1 === 'verbs') {
      const allItems = await loadData('verbs-n5.json');
      await startVerbs(container, allItems);
    } else if (seg1 === 'adjectives') {
      const allItems = await loadData('adjectives-n5.json');
      await startAdjectives(container, allItems);
    } else if (seg1 === 'review') {
      await startReviewToday(container);
    } else if (seg1 === 'exam') {
      // Solo los 6 bloques de las secciones del JLPT real. Verbos/adjetivos son
      // práctica propia (en el examen se subsumen en gramática/vocabulario).
      const [vocab, kanji, particles, grammar, listening, reading] = await Promise.all([
        loadData('vocab-n5.json'),
        loadData('kanji-n5.json'),
        loadData('particles.json'),
        loadData('grammar-n5.json'),
        loadData('listening-n5.json'),
        loadData('reading-n5.json'),
      ]);
      await startExam(container, { vocab, kanji, particles, grammar, listening, reading });
    } else {
      window.navigate('/');
    }
  } catch (err) {
    console.error('Route error:', err);
    container.innerHTML = `
      <div class="error-screen">
        <h2>Error al cargar</h2>
        <p>${err.message}</p>
        <button class="btn-primary" onclick="window.navigate('/')">Volver al inicio</button>
      </div>
    `;
  }
}

// Run migration from v1 to v2 storage keys
migrateV1ToV2();
initViewport();

// Apply saved theme
const savedTheme = localStorage.getItem('jp_n5_theme') || 'light';
document.documentElement.dataset.theme = savedTheme;

window.addEventListener('hashchange', route);
window.addEventListener('load', route);
