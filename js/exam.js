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
