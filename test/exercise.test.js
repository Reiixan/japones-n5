import { describe, it, assert } from './runner.js';

const cacheBust = `?cache=t${Math.random()}`;

describe('exercise.recordResult hook', () => {
  it('usa recordResult cuando está definido y no llama a recordAnswer estándar', async () => {
    const KEY = 'jp_n5_v2.testdeck.i1';
    localStorage.removeItem(KEY);

    const { startExercise } = await import('../js/exercise.js' + cacheBust);
    const container = document.createElement('div');
    document.body.appendChild(container);

    const recordResultCalls = [];
    const items = [{ id: 'i1' }, { id: 'i2' }];

    startExercise(container, {
      deck: 'testdeck',
      items,
      allItems: items,
      getItemId: it => it.id,
      renderPrompt: (item, el) => { el.textContent = item.id; },
      renderInput: (item, _all, el, onAnswer) => {
        el.innerHTML = '<button class="b-yes">yes</button><button class="b-no">no</button>';
        el.querySelector('.b-yes').addEventListener('click', () => onAnswer('yes'));
        el.querySelector('.b-no').addEventListener('click', () => onAnswer('no'));
        return () => {};
      },
      checkAnswer: (_item, answer) => answer === 'yes',
      getCorrectDisplay: () => 'yes',
      recordResult: (item, correct) => recordResultCalls.push({ id: item.id, correct }),
    });

    container.querySelector('.b-yes').click();

    assert(recordResultCalls.length === 1, 'recordResult debería llamarse 1 vez');
    assert(recordResultCalls[0].id === 'i1', 'recordResult con id correcto');
    assert(recordResultCalls[0].correct === true, 'recordResult con correct=true');
    assert(localStorage.getItem(KEY) === null, `recordAnswer estándar NO debería llamarse, pero ${KEY} se escribió`);

    container.remove();
  });

  it('llama a recordAnswer estándar cuando recordResult no está definido', async () => {
    const KEY = 'jp_n5_v2.testdeck2.j1';
    localStorage.removeItem(KEY);

    const { startExercise } = await import('../js/exercise.js' + cacheBust + '2');
    const container = document.createElement('div');
    document.body.appendChild(container);

    const items = [{ id: 'j1' }];

    startExercise(container, {
      deck: 'testdeck2',
      items,
      allItems: items,
      getItemId: it => it.id,
      renderPrompt: (item, el) => { el.textContent = item.id; },
      renderInput: (_item, _all, el, onAnswer) => {
        el.innerHTML = '<button class="b">go</button>';
        el.querySelector('.b').addEventListener('click', () => onAnswer('go'));
        return () => {};
      },
      checkAnswer: () => true,
      getCorrectDisplay: () => 'go',
    });

    container.querySelector('.b').click();

    const raw = localStorage.getItem(KEY);
    assert(raw != null, `recordAnswer debería escribir en ${KEY}, pero localStorage.getItem devuelve null`);
    const stored = JSON.parse(raw);
    assert(stored.box === 1, `box debería ser 1 tras acierto, hubo: ${stored.box}`);

    container.remove();
    localStorage.removeItem(KEY);
  });
});
