import { describe, it, assert, assertEqual } from './runner.js';

const cacheBust = `?cache=t${Math.random()}`;

describe('reading.expandTextsToItems', () => {
  it('expande un texto con 1 pregunta a 1 ítem', async () => {
    const { expandTextsToItems } = await import('../js/reading.js' + cacheBust);
    const texts = [{ id: 'r_001', questions: [{ q_es: 'a', options_es: ['x','y','z','w'], answer_es: 'x' }] }];
    const items = expandTextsToItems(texts);
    assertEqual(items.length, 1);
    assertEqual(items[0].text.id, 'r_001');
    assertEqual(items[0].q_idx, 0);
  });

  it('expande un texto con 3 preguntas a 3 ítems consecutivos', async () => {
    const { expandTextsToItems } = await import('../js/reading.js' + cacheBust + '2');
    const texts = [{
      id: 'r_002',
      questions: [
        { q_es: 'a', options_es: ['1','2','3','4'], answer_es: '1' },
        { q_es: 'b', options_es: ['1','2','3','4'], answer_es: '2' },
        { q_es: 'c', options_es: ['1','2','3','4'], answer_es: '3' },
      ],
    }];
    const items = expandTextsToItems(texts);
    assertEqual(items.length, 3);
    assertEqual(items[0].q_idx, 0);
    assertEqual(items[1].q_idx, 1);
    assertEqual(items[2].q_idx, 2);
    assert(items.every(it => it.text.id === 'r_002'), 'todos comparten text.id');
  });

  it('mantiene preguntas del mismo texto agrupadas y en orden', async () => {
    const { expandTextsToItems } = await import('../js/reading.js' + cacheBust + '3');
    const texts = [
      { id: 'a', questions: [{ q_es: 'a1', options_es: ['1','2','3','4'], answer_es: '1' }, { q_es: 'a2', options_es: ['1','2','3','4'], answer_es: '1' }] },
      { id: 'b', questions: [{ q_es: 'b1', options_es: ['1','2','3','4'], answer_es: '1' }] },
    ];
    const items = expandTextsToItems(texts);
    assertEqual(items.map(it => `${it.text.id}:${it.q_idx}`).join(','), 'a:0,a:1,b:0');
  });
});

describe('reading.createTextSrsAggregator', () => {
  it('llama recordFn con true solo si todas las preguntas del texto son correctas', async () => {
    const { createTextSrsAggregator } = await import('../js/reading.js' + cacheBust + '4');
    const calls = [];
    const items = [
      { text: { id: 'r_001' }, q_idx: 0 },
      { text: { id: 'r_001' }, q_idx: 1 },
      { text: { id: 'r_001' }, q_idx: 2 },
    ];
    const agg = createTextSrsAggregator(items, (id, correct) => calls.push({ id, correct }));
    agg(items[0], true);
    agg(items[1], true);
    assertEqual(calls.length, 0, 'no commit hasta la última pregunta del texto');
    agg(items[2], true);
    assertEqual(calls.length, 1);
    assertEqual(calls[0].id, 'r_001');
    assertEqual(calls[0].correct, true);
  });

  it('llama recordFn con false si CUALQUIER pregunta del texto falla', async () => {
    const { createTextSrsAggregator } = await import('../js/reading.js' + cacheBust + '5');
    const calls = [];
    const items = [
      { text: { id: 'r_001' }, q_idx: 0 },
      { text: { id: 'r_001' }, q_idx: 1 },
      { text: { id: 'r_001' }, q_idx: 2 },
    ];
    const agg = createTextSrsAggregator(items, (id, correct) => calls.push({ id, correct }));
    agg(items[0], true);
    agg(items[1], false);
    agg(items[2], true);
    assertEqual(calls.length, 1);
    assertEqual(calls[0].correct, false);
  });

  it('procesa varios textos independientemente', async () => {
    const { createTextSrsAggregator } = await import('../js/reading.js' + cacheBust + '6');
    const calls = [];
    const items = [
      { text: { id: 'a' }, q_idx: 0 },
      { text: { id: 'a' }, q_idx: 1 },
      { text: { id: 'b' }, q_idx: 0 },
    ];
    const agg = createTextSrsAggregator(items, (id, correct) => calls.push({ id, correct }));
    agg(items[0], true);
    agg(items[1], false);
    agg(items[2], true);
    assertEqual(calls.length, 2);
    assertEqual(calls[0].id, 'a');
    assertEqual(calls[0].correct, false);
    assertEqual(calls[1].id, 'b');
    assertEqual(calls[1].correct, true);
  });
});

describe('reading.renderRubyHtml', () => {
  it('devuelve texto plano si furigana off', async () => {
    const { renderRubyHtml } = await import('../js/reading.js?cache=ui1');
    const ruby = [
      { base: '山田', ruby: 'やまだ' },
      { base: 'さん', ruby: null },
    ];
    const html = renderRubyHtml(ruby, false);
    assert(!html.includes('<ruby>'), 'no debe contener <ruby> con furigana off');
    assert(html.includes('山田'), 'debe contener base');
    assert(html.includes('さん'), 'debe contener base sin ruby');
  });

  it('devuelve HTML con <ruby><rt> si furigana on', async () => {
    const { renderRubyHtml } = await import('../js/reading.js?cache=ui2');
    const ruby = [
      { base: '山田', ruby: 'やまだ' },
      { base: 'さん', ruby: null },
    ];
    const html = renderRubyHtml(ruby, true);
    assert(html.includes('<ruby>山田<rt>やまだ</rt></ruby>'), `esperaba <ruby>山田<rt>やまだ</rt></ruby>, html: ${html}`);
    assert(html.includes('さん'), 'tokens sin ruby siguen apareciendo');
    assert(!html.match(/<ruby>さん/), 'tokens sin ruby NO deben envolverse en <ruby>');
  });
});

describe('reading.isFuriganaOn / setFuriganaOn', () => {
  it('default off', async () => {
    localStorage.removeItem('jp_n5_reading_furigana_on');
    const { isFuriganaOn } = await import('../js/reading.js?cache=fur1');
    assertEqual(isFuriganaOn(), false);
  });

  it('setFuriganaOn(true) persiste y isFuriganaOn lo lee', async () => {
    const { isFuriganaOn, setFuriganaOn } = await import('../js/reading.js?cache=fur2');
    setFuriganaOn(true);
    assertEqual(isFuriganaOn(), true);
    assertEqual(localStorage.getItem('jp_n5_reading_furigana_on'), '1');
    setFuriganaOn(false);
    assertEqual(isFuriganaOn(), false);
    localStorage.removeItem('jp_n5_reading_furigana_on');
  });
});

describe('reading SRS por texto - integración', () => {
  it('3 preguntas todas correctas → box sube de 0 a 1', async () => {
    const KEY = 'jp_n5_v2.reading.r_test_a';
    localStorage.removeItem(KEY);
    const { createTextSrsAggregator } = await import('../js/reading.js?cache=int1');
    const { recordAnswer } = await import('../js/storage.js?cache=int1');
    const items = [
      { text: { id: 'r_test_a' }, q_idx: 0 },
      { text: { id: 'r_test_a' }, q_idx: 1 },
      { text: { id: 'r_test_a' }, q_idx: 2 },
    ];
    const agg = createTextSrsAggregator(items, (id, correct) => recordAnswer('reading', id, correct));
    agg(items[0], true);
    agg(items[1], true);
    agg(items[2], true);
    const stored = JSON.parse(localStorage.getItem(KEY));
    assertEqual(stored.box, 1);
    assertEqual(stored.correct, 1);
    assertEqual(stored.wrong, 0);
    localStorage.removeItem(KEY);
  });

  it('3 preguntas con 1 fallo → box queda en 0 y wrong=1', async () => {
    const KEY = 'jp_n5_v2.reading.r_test_b';
    localStorage.removeItem(KEY);
    localStorage.setItem(KEY, JSON.stringify({ box: 2, lastSeen: null, correct: 5, wrong: 0 }));
    const { createTextSrsAggregator } = await import('../js/reading.js?cache=int2');
    const { recordAnswer } = await import('../js/storage.js?cache=int2');
    const items = [
      { text: { id: 'r_test_b' }, q_idx: 0 },
      { text: { id: 'r_test_b' }, q_idx: 1 },
      { text: { id: 'r_test_b' }, q_idx: 2 },
    ];
    const agg = createTextSrsAggregator(items, (id, correct) => recordAnswer('reading', id, correct));
    agg(items[0], true);
    agg(items[1], false);
    agg(items[2], true);
    const stored = JSON.parse(localStorage.getItem(KEY));
    assertEqual(stored.box, 0);
    assertEqual(stored.wrong, 1);
    localStorage.removeItem(KEY);
  });
});
