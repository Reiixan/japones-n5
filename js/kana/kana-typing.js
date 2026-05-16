import { startExercise, showSessionConfig } from '../exercise.js';
import { selectSession } from '../srs.js';
import { renderSpeakButton, attachSpeakHandler, isAutoOn, speak } from '../tts.js';

const GROUPS = [
  { value: 'base', label: 'Base (あ～ん)' },
  { value: 'dakuten', label: 'Dakuten (が、ざ…)' },
  { value: 'handakuten', label: 'Handakuten (ぱ…)' },
  { value: 'yoon', label: 'Yōon (きゃ…)' },
];

export async function start(container, deck, allItems) {
  showSessionConfig(container, {
    title: 'Escribir Romaji',
    subtitle: `Ve el ${deck === 'hiragana' ? 'hiragana' : 'katakana'} y escribe su romaji.`,
    groups: GROUPS,
    onStart: (size, groups) => {
      const filtered = groups ? allItems.filter(it => groups.includes(it.group)) : allItems;
      if (filtered.length === 0) { alert('Selecciona al menos un grupo.'); return; }
      const items = selectSession(deck, filtered, size);
      runTyping(container, deck, items, allItems);
    },
  });
}

function runTyping(container, deck, items, allItems) {
  startExercise(container, {
    deck,
    items,
    allItems,
    getItemId: it => it.id,
    renderPrompt(item, el) {
      el.innerHTML = `<div class="kana-display">${item.kana}</div>${renderSpeakButton(item.kana)}`;
      attachSpeakHandler(el);
      if (isAutoOn()) speak(item.kana);
    },
    renderInput(item, _all, el, onAnswer) {
      el.innerHTML = `
        <form class="typing-form" id="typing-form" autocomplete="off">
          <input id="typing-input" class="typing-input" type="text"
            placeholder="romaji..." spellcheck="false" autocorrect="off" autocapitalize="off">
          <button type="submit" class="btn-primary">Comprobar</button>
        </form>
      `;
      const input = document.getElementById('typing-input');
      input.focus();

      const handler = e => {
        e.preventDefault();
        const val = input.value.trim().toLowerCase();
        if (val) onAnswer(val);
      };
      document.getElementById('typing-form').addEventListener('submit', handler);

      return () => {};
    },
    checkAnswer(item, answer) {
      return item.accepted.includes(answer);
    },
    getCorrectDisplay(item) {
      return item.accepted[0];
    },
    getPromptSpeechText: item => item.kana,
    getAnswerSpeechText: item => item.kana,
    menuPath: `/${deck}`,
  });
}
