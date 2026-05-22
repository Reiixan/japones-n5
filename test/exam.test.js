import { describe, it, assert, assertEqual } from './runner.js';

describe('exam.formatTime', () => {
  it('formatea mm:ss', async () => {
    const { formatTime } = await import('../js/exam.js?c=f1');
    assertEqual(formatTime(90000), '1:30');
    assertEqual(formatTime(20 * 60000), '20:00');
    assertEqual(formatTime(5000), '0:05');
  });
  it('clamp a 0:00 con negativos', async () => {
    const { formatTime } = await import('../js/exam.js?c=f2');
    assertEqual(formatTime(-5000), '0:00');
    assertEqual(formatTime(0), '0:00');
  });
});

describe('exam.buildSections', () => {
  function fakeDecks() {
    const arr = (prefix, n, extra = () => ({})) =>
      Array.from({ length: n }, (_, i) => ({ id: `${prefix}${i}`, ...extra(i) }));
    return {
      vocab: arr('v', 30, () => ({ kanji: 'x', kana: 'x', romaji: 'x', category: 'c', meaning_es: 'm' })),
      kanji: arr('k', 30, () => ({ kanji: '日', onyomi: [], kunyomi: [], meaning_es: 'm' })),
      particles: arr('p', 30, () => ({ parts: ['[  ]'], options: ['a', 'b'], answer: 'a', explanation: 'e' })),
      grammar: arr('g', 30, () => ({ pattern: 'p', meaning_es: 'm', examples: [], exercise: { prompt: '', options: ['a'], answer: 'a' } })),
      listening: arr('l', 30, () => ({ type: 'info', audio_text: 'a', audio_kana: 'a', prompt_es: 'p', options_es: ['a'], answer_es: 'a' })),
      reading: arr('r', 10, () => ({ text_ruby: [], questions: [{ q_es: 'q', options_es: ['a'], answer_es: 'a' }] })),
    };
  }

  it('produce 3 secciones con los conteos correctos', async () => {
    const { buildSections } = await import('../js/exam.js?c=b1');
    const s = buildSections(fakeDecks());
    assertEqual(s.length, 3);
    assertEqual(s[0].id, 'moji-goi');
    assertEqual(s[0].questions.length, 20);
    assertEqual(s[1].id, 'bunpou-dokkai');
    assertEqual(s[1].questions.length, 16);
    assertEqual(s[2].id, 'choukai');
    assertEqual(s[2].questions.length, 7);
  });

  it('mapea cada sección a su grupo de puntuación', async () => {
    const { buildSections } = await import('../js/exam.js?c=b2');
    const s = buildSections(fakeDecks());
    assertEqual(s[0].group, 1);
    assertEqual(s[1].group, 1);
    assertEqual(s[2].group, 2);
  });

  it('recorta dokkai a 7 preguntas con textos multi-pregunta', async () => {
    const { buildSections } = await import('../js/exam.js?c=b3');
    const decks = fakeDecks();
    // Textos con 3 preguntas cada uno: expandir daría >7, debe recortar a 7.
    decks.reading = Array.from({ length: 10 }, (_, i) => ({
      id: `rt${i}`,
      text_ruby: [],
      questions: [
        { q_es: 'q1', options_es: ['a'], answer_es: 'a' },
        { q_es: 'q2', options_es: ['a'], answer_es: 'a' },
        { q_es: 'q3', options_es: ['a'], answer_es: 'a' },
      ],
    }));
    const s = buildSections(decks);
    const readingQs = s[1].questions.filter(q => q.deck === 'reading');
    assertEqual(readingQs.length, 7);
    assertEqual(s[1].questions.length, 16);
  });
});

describe('exam.scoreSections / diagnose', () => {
  const renderer = { checkAnswer: (item, ans) => item.correct === ans };
  function fakeSections() {
    return [
      { id: 'moji-goi', label: 'Moji-Goi', group: 1, minutes: 20, questions: [
        { deck: 'vocab', item: { correct: 'a' }, renderer },
        { deck: 'kanji', item: { correct: 'b' }, renderer },
      ] },
      { id: 'bunpou-dokkai', label: 'Bunpou', group: 1, minutes: 40, questions: [
        { deck: 'grammar', item: { correct: 'c' }, renderer },
      ] },
      { id: 'choukai', label: 'Choukai', group: 2, minutes: 30, questions: [
        { deck: 'listening', item: { correct: 'd' }, renderer },
      ] },
    ];
  }

  it('puntúa por sección, grupo, deck y total', async () => {
    const { scoreSections } = await import('../js/exam.js?c=s1');
    const answers = new Map([['0:0', 'a'], ['0:1', 'wrong'], ['1:0', 'c'], ['2:0', 'd']]);
    const r = scoreSections(fakeSections(), answers);
    assertEqual(r.overall.correct, 3);
    assertEqual(r.overall.total, 4);
    assertEqual(r.sections[0].correct, 1);
    assertEqual(r.groups.find(g => g.group === 1).correct, 2);
    assertEqual(r.groups.find(g => g.group === 2).correct, 1);
  });

  it('respuesta ausente cuenta como incorrecta', async () => {
    const { scoreSections } = await import('../js/exam.js?c=s2');
    const r = scoreSections(fakeSections(), new Map());
    assertEqual(r.overall.correct, 0);
    assertEqual(r.passed, false);
  });

  it('aprueba solo si global>=44% y cada grupo>=32%', async () => {
    const { scoreSections } = await import('../js/exam.js?c=s3');
    const all = new Map([['0:0', 'a'], ['0:1', 'b'], ['1:0', 'c'], ['2:0', 'd']]);
    assertEqual(scoreSections(fakeSections(), all).passed, true);
    const noChoukai = new Map([['0:0', 'a'], ['0:1', 'b'], ['1:0', 'c'], ['2:0', 'wrong']]);
    assertEqual(scoreSections(fakeSections(), noChoukai).passed, false);
  });

  it('diagnose devuelve el deck más flojo con su path', async () => {
    const { scoreSections, diagnose } = await import('../js/exam.js?c=d1');
    const answers = new Map([['0:0', 'a'], ['0:1', 'wrong'], ['1:0', 'c'], ['2:0', 'd']]);
    const worst = diagnose(scoreSections(fakeSections(), answers));
    assertEqual(worst.deck, 'kanji');
    assertEqual(worst.path, '/kanji');
    assertEqual(worst.pct, 0);
  });
});
