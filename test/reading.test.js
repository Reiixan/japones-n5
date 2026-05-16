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
