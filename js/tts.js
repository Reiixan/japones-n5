// js/tts.js
let cachedVoice = null;
let resolved = false;
let listenerAttached = false;

const PREFERRED_NAMES = ['Google 日本語', 'Kyoko', 'Otoya', 'Hattori'];

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

export function isAvailable() {
  resolveVoice();
  return !!cachedVoice;
}

export function speak(text) {
  if (!text) return;
  resolveVoice();
  if (!cachedVoice) return;
  const u = new window.SpeechSynthesisUtterance(text);
  u.voice = cachedVoice;
  u.lang = 'ja-JP';
  u.rate = 0.95;
  window.speechSynthesis.speak(u);
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
}

function escapeAttr(s) {
  return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function renderSpeakButton(text) {
  return `<button type="button" class="btn-tts" data-tts-text="${escapeAttr(text)}" aria-label="Pronunciar" title="Pronunciar">🔊</button>`;
}

// Adjunta un único delegated listener al elemento `root` (idempotente — usa flag en el propio elemento).
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
