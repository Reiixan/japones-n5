// test/tts.test.js
import { describe, it, assert, assertEqual } from './runner.js';

// Mock helper: instala un speechSynthesis falso en window.
// window.speechSynthesis es getter-only en navegadores reales, así que usamos
// Object.defineProperty con configurable:true para poder reemplazarlo en cada test.
function defineOnWindow(name, value) {
  Object.defineProperty(window, name, { value, configurable: true, writable: true });
}

function installMockSynthesis({ voices = [], firingVoicesChanged = false } = {}) {
  const utterances = [];
  let handler = null;
  defineOnWindow('speechSynthesis', {
    getVoices: () => voices,
    speak: u => utterances.push(u),
    cancel: () => {},
    addEventListener(event, cb) { if (event === 'voiceschanged') handler = cb; },
    removeEventListener() { handler = null; },
    _fireVoicesChanged() { if (handler) handler(); },
    _utterances: utterances,
  });
  defineOnWindow('SpeechSynthesisUtterance', class { constructor(text) { this.text = text; } });
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

describe('tts — voiceschanged async', () => {
  it('detecta voces tras el evento voiceschanged', async () => {
    let voices = [];
    let handler = null;
    defineOnWindow('speechSynthesis', {
      getVoices: () => voices,
      speak: () => {},
      addEventListener(e, cb) { if (e === 'voiceschanged') handler = cb; },
      removeEventListener() { handler = null; },
    });
    defineOnWindow('SpeechSynthesisUtterance', class { constructor(t) { this.text = t; } });

    const { isAvailable, onReady, _resetForTests } = await import('../js/tts.js?cache=t3a');
    _resetForTests();

    assertEqual(isAvailable(), false, 'al inicio no debe haber voz');

    // Simular carga async de voces
    voices = [{ lang: 'ja-JP', name: 'Kyoko' }];
    handler();  // dispara voiceschanged

    await new Promise(r => setTimeout(r, 0));
    assertEqual(isAvailable(), true, 'tras voiceschanged la voz debe estar disponible');

    delete window.speechSynthesis;
    delete window.SpeechSynthesisUtterance;
  });

  it('onReady resuelve cuando hay voz disponible inmediatamente', async () => {
    defineOnWindow('speechSynthesis', {
      getVoices: () => [{ lang: 'ja-JP', name: 'Kyoko' }],
      speak: () => {},
      addEventListener() {},
      removeEventListener() {},
    });
    defineOnWindow('SpeechSynthesisUtterance', class { constructor(t) { this.text = t; } });

    const { onReady, _resetForTests } = await import('../js/tts.js?cache=t3b');
    _resetForTests();

    const ready = await onReady();
    assertEqual(ready, true);

    delete window.speechSynthesis;
    delete window.SpeechSynthesisUtterance;
  });

  it('onReady resuelve a false tras timeout si nunca hay voz', async () => {
    defineOnWindow('speechSynthesis', {
      getVoices: () => [],
      speak: () => {},
      addEventListener() {},
      removeEventListener() {},
    });
    defineOnWindow('SpeechSynthesisUtterance', class { constructor(t) { this.text = t; } });

    const { onReady, _resetForTests } = await import('../js/tts.js?cache=t3c');
    _resetForTests();

    const ready = await onReady(50);  // timeout de 50ms
    assertEqual(ready, false);

    delete window.speechSynthesis;
    delete window.SpeechSynthesisUtterance;
  });
});

describe('tts.speak — fallback a audio pregrabado', () => {
  it('cuando no hay voz, carga manifest y reproduce Audio', async () => {
    defineOnWindow('speechSynthesis', {
      getVoices: () => [],
      speak: () => {},
      addEventListener() {},
      removeEventListener() {},
    });
    defineOnWindow('SpeechSynthesisUtterance', class { constructor(t) { this.text = t; } });

    const origFetch = window.fetch;
    window.fetch = async () => ({
      ok: true,
      json: async () => ({ 'テスト': 'abc123.mp3' }),
    });

    const audioInstances = [];
    const origAudio = window.Audio;
    window.Audio = class {
      constructor(src) { this.src = src; audioInstances.push(src); }
      play() { return Promise.resolve(); }
    };

    const { speak, _resetForTests } = await import('../js/tts.js?cache=tfb1');
    _resetForTests();

    speak('テスト');
    // playRecording dispara loadManifest (async). Esperamos a que resuelva.
    await new Promise(r => setTimeout(r, 30));

    assertEqual(audioInstances.length, 1, 'debería haber creado una instancia Audio');
    assertEqual(audioInstances[0], 'audio/abc123.mp3');

    window.fetch = origFetch;
    window.Audio = origAudio;
    delete window.speechSynthesis;
    delete window.SpeechSynthesisUtterance;
  });

  it('no reproduce si el texto no está en el manifest', async () => {
    defineOnWindow('speechSynthesis', {
      getVoices: () => [],
      speak: () => {},
      addEventListener() {},
      removeEventListener() {},
    });
    defineOnWindow('SpeechSynthesisUtterance', class { constructor(t) { this.text = t; } });

    const origFetch = window.fetch;
    window.fetch = async () => ({ ok: true, json: async () => ({ 'otra': 'xyz.mp3' }) });

    const audioInstances = [];
    const origAudio = window.Audio;
    window.Audio = class {
      constructor(src) { audioInstances.push(src); }
      play() { return Promise.resolve(); }
    };

    const { speak, _resetForTests } = await import('../js/tts.js?cache=tfb2');
    _resetForTests();

    speak('テスト');
    await new Promise(r => setTimeout(r, 30));

    assertEqual(audioInstances.length, 0, 'no debería haber creado ningún Audio');

    window.fetch = origFetch;
    window.Audio = origAudio;
    delete window.speechSynthesis;
    delete window.SpeechSynthesisUtterance;
  });
});

describe('tts.renderSpeakButton', () => {
  it('devuelve HTML de un botón con data-tts-text escapado', async () => {
    const { renderSpeakButton } = await import('../js/tts.js?cache=t4a');
    const html = renderSpeakButton('こんにちは');
    assert(html.includes('class="btn-tts"'), 'falta class btn-tts');
    assert(html.includes('data-tts-text="こんにちは"'), 'falta data-tts-text');
    assert(html.includes('🔊'), 'falta icono 🔊');
  });

  it('escapa comillas dobles en el texto', async () => {
    const { renderSpeakButton } = await import('../js/tts.js?cache=t4b');
    const html = renderSpeakButton('a "b" c');
    assert(html.includes('data-tts-text="a &quot;b&quot; c"'), 'comillas no escapadas: ' + html);
  });
});

describe('tts auto flag', () => {
  it('isAutoOn devuelve false por defecto', async () => {
    localStorage.removeItem('jp_n5_tts_auto');
    const { isAutoOn } = await import('../js/tts.js?cache=t4c');
    assertEqual(isAutoOn(), false);
  });

  it('isAutoOn devuelve true cuando localStorage tiene "1"', async () => {
    localStorage.setItem('jp_n5_tts_auto', '1');
    const { isAutoOn } = await import('../js/tts.js?cache=t4d');
    assertEqual(isAutoOn(), true);
    localStorage.removeItem('jp_n5_tts_auto');
  });

  it('setAutoOn(true) escribe "1" en localStorage', async () => {
    localStorage.removeItem('jp_n5_tts_auto');
    const { setAutoOn } = await import('../js/tts.js?cache=t4e');
    setAutoOn(true);
    assertEqual(localStorage.getItem('jp_n5_tts_auto'), '1');
    localStorage.removeItem('jp_n5_tts_auto');
  });

  it('setAutoOn(false) borra la clave', async () => {
    localStorage.setItem('jp_n5_tts_auto', '1');
    const { setAutoOn } = await import('../js/tts.js?cache=t4f');
    setAutoOn(false);
    assertEqual(localStorage.getItem('jp_n5_tts_auto'), null);
  });
});
