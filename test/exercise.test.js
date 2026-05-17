import { describe, it, assert } from './runner.js';

const cacheBust = `?cache=t${Math.random()}`;

describe('exercise.recordResult hook', () => {
  it('usa recordResult cuando está definido y no llama a recordAnswer estándar', async () => {
    const storeWrites = [];
    const origSetItem = localStorage.setItem.bind(localStorage);
    localStorage.setItem = (k, v) => {
      if (k.startsWith('jp_n5_v2.testdeck.')) storeWrites.push({ k, v });
      origSetItem(k, v);
    };

    try {
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
      assert(storeWrites.length === 0, `recordAnswer estándar NO debería llamarse, pero se escribió: ${JSON.stringify(storeWrites)}`);

      container.remove();
    } finally {
      localStorage.setItem = origSetItem;
    }
  });

  it('llama a recordAnswer estándar cuando recordResult no está definido', async () => {
    const storeWrites = [];
    const origSetItem = localStorage.setItem.bind(localStorage);
    localStorage.setItem = (k, v) => {
      if (k.startsWith('jp_n5_v2.testdeck2.')) storeWrites.push({ k, v });
      origSetItem(k, v);
    };

    try {
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

      assert(storeWrites.length === 1, `recordAnswer debería escribir 1 entrada, hubo: ${storeWrites.length}`);
      assert(storeWrites[0].k === 'jp_n5_v2.testdeck2.j1', `key esperada jp_n5_v2.testdeck2.j1, hubo: ${storeWrites[0].k}`);

      container.remove();
      localStorage.removeItem('jp_n5_v2.testdeck2.j1');
    } finally {
      localStorage.setItem = origSetItem;
    }
  });
});
