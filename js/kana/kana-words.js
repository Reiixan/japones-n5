import { startExercise, showSessionConfig } from '../exercise.js';
import { selectSession } from '../srs.js';

export function filterWords(vocab, kanaType) {
  if (kanaType === 'hiragana') {
    return vocab.filter(w => /^[ぁ-ん]+$/.test(w.kana));
  }
  if (kanaType === 'katakana') {
    return vocab.filter(w => /^[ァ-ンー]+$/.test(w.kana));
  }
  return [];
}

export async function start(container, deck, vocabItems) {
  const wordsDeck = `${deck}-words`;
  const filtered = filterWords(vocabItems, deck);

  showSessionConfig(container, {
    title: 'Dictado de palabras',
    subtitle: `Ve la palabra en ${deck === 'hiragana' ? 'hiragana' : 'katakana'} con su significado y escribe su romaji.`,
    onStart: (size) => {
      const items = selectSession(wordsDeck, filtered, size);
      runWords(container, wordsDeck, items, filtered);
    },
  });
}

function runWords(container, deck, items, allItems) {
  const kanaType = deck.replace('-words', '');
  startExercise(container, {
    deck,
    items,
    allItems,
    getItemId: it => it.id,
    renderPrompt(item, el) {
      el.innerHTML = `
        <div class="kana-display">${item.kana}</div>
        <div class="words-meaning">${item.meaning_es}</div>
      `;
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
      document.getElementById('typing-form').addEventListener('submit', e => {
        e.preventDefault();
        const val = input.value.trim().toLowerCase();
        if (val) onAnswer(val);
      });
      return () => {};
    },
    checkAnswer(item, answer) {
      return item.romaji.toLowerCase() === answer;
    },
    getCorrectDisplay(item) {
      return item.romaji;
    },
    menuPath: `/${kanaType}`,
  });
}
