// js/tts.js
// Pronunciación japonesa con dos backends:
//   1. Web Speech API si el navegador tiene una voz ja-JP
//   2. Audio MP3 pregrabado (audio/manifest.json) como fallback
// El segundo se usa cuando no hay voz nativa; garantiza que el botón 🔊 suene
// en cualquier dispositivo/navegador.

let cachedVoice = null;
let resolved = false;
let listenerAttached = false;

let manifest = null;
let manifestPromise = null;

const PREFERRED_NAMES = ['Google 日本語', 'Kyoko', 'Otoya', 'Hattori'];
const MANIFEST_URL = 'audio/manifest.json';

function pickVoice() {
  const synth = window.speechSynthesis;
  if (!synth) return null;
  const voices = synth.getVoices().filter(v => v.lang === 'ja-JP' || v.lang === 'ja_JP');
  if (voices.length === 0) return null;
  for (const name of PREFERRED_NAMES) {
    const match = voices.find(v => v.name.includes(name));
    if (match) return match;
  }
  return voices[0];
}

function attachListener() {
  if (listenerAttached) return;
  const synth = window.speechSynthesis;
  if (!synth || !synth.addEventListener) return;
  synth.addEventListener('voiceschanged', () => {
    cachedVoice = pickVoice();
    resolved = !!cachedVoice;
  });
  listenerAttached = true;
}

function resolveVoice() {
  if (resolved) return;
  cachedVoice = pickVoice();
  resolved = !!cachedVoice;
  if (!resolved) attachListener();
}

function loadManifest() {
  if (manifest !== null) return Promise.resolve(manifest);
  if (manifestPromise) return manifestPromise;
  manifestPromise = fetch(MANIFEST_URL)
    .then(r => r.ok ? r.json() : {})
    .catch(() => ({}))
    .then(m => { manifest = m; return m; });
  return manifestPromise;
}

// Inicia la carga del manifest en background al importar el módulo.
// No bloquea — solo hace que esté listo cuando se llame a speak().
loadManifest();

function playRecording(text) {
  loadManifest().then(m => {
    const file = m[text];
    if (!file) return;
    const audio = new Audio(`audio/${file}`);
    audio.playbackRate = 0.8;
    audio.preservesPitch = true;
    audio.play().catch(() => {});
  });
}

export function isAvailable() {
  resolveVoice();
  if (cachedVoice) return true;
  // Si el manifest ya cargó y tiene entradas, también está disponible.
  return manifest !== null && Object.keys(manifest).length > 0;
}

export function speak(text) {
  if (!text) return;
  resolveVoice();
  if (cachedVoice) {
    const u = new window.SpeechSynthesisUtterance(text);
    u.voice = cachedVoice;
    u.lang = 'ja-JP';
    u.rate = 0.8;
    window.speechSynthesis.speak(u);
    return;
  }
  playRecording(text);
}

export function onReady(timeoutMs = 2000) {
  resolveVoice();
  if (resolved) return Promise.resolve(true);
  return new Promise(resolve => {
    const start = Date.now();
    const tick = () => {
      cachedVoice = pickVoice();
      resolved = !!cachedVoice;
      if (resolved) return resolve(true);
      if (manifest !== null && Object.keys(manifest).length > 0) return resolve(true);
      if (Date.now() - start >= timeoutMs) return resolve(false);
      setTimeout(tick, 50);
    };
    tick();
  });
}

export function _resetForTests() {
  cachedVoice = null;
  resolved = false;
  listenerAttached = false;
  manifest = null;
  manifestPromise = null;
}

function escapeAttr(s) {
  return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function renderSpeakButton(text) {
  return `<button type="button" class="btn-tts" data-tts-text="${escapeAttr(text)}" aria-label="Pronunciar" title="Pronunciar">🔊</button>`;
}

// Adjunta un único delegated listener al elemento `root` (idempotente).
// Cualquier clic en un .btn-tts dentro de root llama speak() con su data-tts-text.
export function attachSpeakHandler(root) {
  if (!root || root.__ttsHandlerAttached) return;
  root.addEventListener('click', e => {
    const btn = e.target.closest('.btn-tts');
    if (!btn) return;
    e.preventDefault();
    e.stopPropagation();
    speak(btn.dataset.ttsText);
  });
  root.__ttsHandlerAttached = true;
}

const AUTO_KEY = 'jp_n5_tts_auto';

export function isAutoOn() {
  return localStorage.getItem(AUTO_KEY) === '1';
}

export function setAutoOn(on) {
  if (on) localStorage.setItem(AUTO_KEY, '1');
  else localStorage.removeItem(AUTO_KEY);
}
