// test/tts.test.js
import { describe, it, assert, assertEqual } from './runner.js';

// Mock helper: instala un speechSynthesis falso en window
function installMockSynthesis({ voices = [], firingVoicesChanged = false } = {}) {
  const utterances = [];
  let handler = null;
  window.speechSynthesis = {
    getVoices: () => voices,
    speak: u => utterances.push(u),
    cancel: () => {},
    addEventListener(event, cb) { if (event === 'voiceschanged') handler = cb; },
    removeEventListener() { handler = null; },
    _fireVoicesChanged() { if (handler) handler(); },
    _utterances: utterances,
  };
  window.SpeechSynthesisUtterance = class { constructor(text) { this.text = text; } };
  if (firingVoicesChanged) queueMicrotask(() => window.speechSynthesis._fireVoicesChanged());
}

function uninstallMockSynthesis() {
  delete window.speechSynthesis;
  delete window.SpeechSynthesisUtterance;
}

describe('tts.isAvailable', () => {
  it('devuelve false si no hay voces ja-JP', async () => {
    installMockSynthesis({ voices: [{ lang: 'en-US', name: 'Alex' }] });
    const { isAvailable, _resetForTests } = await import('../js/tts.js?cache=t2a');
    _resetForTests();
    assertEqual(isAvailable(), false);
    uninstallMockSynthesis();
  });

  it('devuelve true si hay al menos una voz ja-JP', async () => {
    installMockSynthesis({ voices: [{ lang: 'ja-JP', name: 'Kyoko' }] });
    const { isAvailable, _resetForTests } = await import('../js/tts.js?cache=t2b');
    _resetForTests();
    assertEqual(isAvailable(), true);
    uninstallMockSynthesis();
  });
});

describe('tts.speak', () => {
  it('llama a speechSynthesis.speak con la voz ja-JP seleccionada', async () => {
    const kyoko = { lang: 'ja-JP', name: 'Kyoko' };
    installMockSynthesis({ voices: [{ lang: 'en-US', name: 'Alex' }, kyoko] });
    const { speak, _resetForTests } = await import('../js/tts.js?cache=t2c');
    _resetForTests();
    speak('こんにちは');
    const u = window.speechSynthesis._utterances[0];
    assert(u, 'no se enviaron utterances');
    assertEqual(u.text, 'こんにちは');
    assertEqual(u.voice, kyoko);
    assertEqual(u.lang, 'ja-JP');
    uninstallMockSynthesis();
  });

  it('prefiere "Google 日本語" sobre otras ja-JP', async () => {
    const google = { lang: 'ja-JP', name: 'Google 日本語' };
    const kyoko = { lang: 'ja-JP', name: 'Kyoko' };
    installMockSynthesis({ voices: [kyoko, google] });
    const { speak, _resetForTests } = await import('../js/tts.js?cache=t2d');
    _resetForTests();
    speak('テスト');
    const u = window.speechSynthesis._utterances[0];
    assertEqual(u.voice, google);
    uninstallMockSynthesis();
  });

  it('no llama a speak si no hay voz ja-JP', async () => {
    installMockSynthesis({ voices: [{ lang: 'en-US', name: 'Alex' }] });
    const { speak, _resetForTests } = await import('../js/tts.js?cache=t2e');
    _resetForTests();
    speak('テスト');
    assertEqual(window.speechSynthesis._utterances.length, 0);
    uninstallMockSynthesis();
  });
});
