// js/tts.js
let cachedVoice = null;
let resolved = false;

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

function resolveVoice() {
  if (resolved) return;
  cachedVoice = pickVoice();
  resolved = !!cachedVoice;
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

export function _resetForTests() {
  cachedVoice = null;
  resolved = false;
}
