// ============================================================
//  PetGrow — Audio System (Web Audio API, no external files)
//  ES Module version.
// ============================================================

// Tiny localStorage shim that no-ops in SSR / non-browser contexts and
// swallows Safari-private-mode quota errors. Keeping this isolated means
// every read/write below is safe even if the module is imported from a
// server endpoint by accident.
function safeGetItem(key) {
  try {
    if (typeof localStorage === 'undefined') return null;
    return localStorage.getItem(key);
  } catch { return null; }
}
function safeSetItem(key, value) {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(key, value);
  } catch { /* ignore quota / disabled storage */ }
}

let ctx = null;
let _enabled = safeGetItem('petgrow_sound') !== 'off';

function getCtx() {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function noiseSrc(ac, duration) {
  const buf = ac.createBuffer(1, ac.sampleRate * duration, ac.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  const s = ac.createBufferSource();
  s.buffer = buf;
  return s;
}

function tone(ac, freq, type, dur, vol = 0.25) {
  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  g.gain.setValueAtTime(vol, ac.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + dur);
  osc.connect(g);
  g.connect(ac.destination);
  osc.start();
  osc.stop(ac.currentTime + dur);
}

const sounds = {
  inject() {
    const ac = getCtx();
    const osc = ac.createOscillator();
    const g = ac.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, ac.currentTime);
    osc.frequency.exponentialRampToValueAtTime(200, ac.currentTime + 0.3);
    g.gain.setValueAtTime(0.18, ac.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.3);
    osc.connect(g); g.connect(ac.destination);
    osc.start(); osc.stop(ac.currentTime + 0.3);
    setTimeout(() => tone(ac, 600, 'sine', 0.1, 0.12), 300);
  },

  hatch() {
    const ac = getCtx();
    const n = noiseSrc(ac, 0.3);
    const g = ac.createGain();
    const bp = ac.createBiquadFilter();
    bp.type = 'bandpass'; bp.frequency.value = 3000; bp.Q.value = 2;
    g.gain.setValueAtTime(0.15, ac.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.3);
    n.connect(bp); bp.connect(g); g.connect(ac.destination);
    n.start(); n.stop(ac.currentTime + 0.3);
    setTimeout(() => {
      tone(ac, 523, 'square', 0.15, 0.1);
      setTimeout(() => tone(ac, 659, 'square', 0.15, 0.1), 150);
      setTimeout(() => tone(ac, 784, 'square', 0.3, 0.13), 300);
    }, 350);
  },

  feed() {
    const ac = getCtx();
    tone(ac, 250, 'square', 0.08, 0.12);
    setTimeout(() => tone(ac, 300, 'square', 0.08, 0.12), 100);
    setTimeout(() => tone(ac, 250, 'square', 0.08, 0.12), 200);
  },

  clean() {
    const ac = getCtx();
    const n = noiseSrc(ac, 0.25);
    const g = ac.createGain();
    const lp = ac.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = 2000;
    g.gain.setValueAtTime(0.1, ac.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.25);
    n.connect(lp); lp.connect(g); g.connect(ac.destination);
    n.start(); n.stop(ac.currentTime + 0.25);
    setTimeout(() => tone(ac, 800, 'sine', 0.1, 0.07), 150);
    setTimeout(() => tone(ac, 1000, 'sine', 0.1, 0.07), 250);
  },

  play() {
    const ac = getCtx();
    const osc = ac.createOscillator();
    const g = ac.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(200, ac.currentTime);
    osc.frequency.exponentialRampToValueAtTime(600, ac.currentTime + 0.1);
    osc.frequency.exponentialRampToValueAtTime(300, ac.currentTime + 0.2);
    g.gain.setValueAtTime(0.18, ac.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.25);
    osc.connect(g); g.connect(ac.destination);
    osc.start(); osc.stop(ac.currentTime + 0.25);
  },

  evolve() {
    const ac = getCtx();
    [523, 587, 659, 784, 1047].forEach((f, i) => {
      setTimeout(() => tone(ac, f, 'square', 0.2, 0.1), i * 150);
    });
  },

  sleep() {
    const ac = getCtx();
    tone(ac, 200, 'sine', 0.4, 0.08);
    setTimeout(() => tone(ac, 180, 'sine', 0.5, 0.06), 400);
  },

  click() {
    const ac = getCtx();
    tone(ac, 440, 'sine', 0.05, 0.06);
  },

  room() {
    const ac = getCtx();
    const n = noiseSrc(ac, 0.2);
    const g = ac.createGain();
    const bp = ac.createBiquadFilter();
    bp.type = 'bandpass'; bp.frequency.value = 1500; bp.Q.value = 0.5;
    g.gain.setValueAtTime(0.08, ac.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.2);
    n.connect(bp); bp.connect(g); g.connect(ac.destination);
    n.start(); n.stop(ac.currentTime + 0.2);
  },

  error() {
    const ac = getCtx();
    tone(ac, 200, 'sawtooth', 0.15, 0.12);
    setTimeout(() => tone(ac, 150, 'sawtooth', 0.2, 0.12), 150);
  },
};

export function play(name) {
  if (!_enabled) return;
  try {
    if (sounds[name]) sounds[name]();
  } catch (e) {
    console.warn('Audio error:', e);
  }
}

export function toggle() {
  _enabled = !_enabled;
  safeSetItem('petgrow_sound', _enabled ? 'on' : 'off');
  return _enabled;
}

export function isEnabled() {
  return _enabled;
}

export function setEnabled(v) {
  _enabled = v;
  safeSetItem('petgrow_sound', v ? 'on' : 'off');
}
