'use strict';
// ---------------------------------------------------------------------------
// Core: constants, input, sound, sprite drawing
// ---------------------------------------------------------------------------
const TILE = 16;
const VW = 384, VH = 216;
const GRAV = 0.26;

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const sign = (v) => (v > 0 ? 1 : v < 0 ? -1 : 0);
const approach = (v, t, d) => (v < t ? Math.min(v + d, t) : Math.max(v - d, t));
const rand = (a, b) => a + Math.random() * (b - a);
const overlap = (a, b) => a.x0 < b.x1 && a.x1 > b.x0 && a.y0 < b.y1 && a.y1 > b.y0;

// ---------------------------------------------------------------------------
// Input (keyboard + gamepad). Actions are polled once per fixed tick.
// ---------------------------------------------------------------------------
const Input = {
  keys: new Set(), taps: new Set(),
  map: {
    left: ['ArrowLeft', 'KeyA'], right: ['ArrowRight', 'KeyD'],
    up: ['ArrowUp', 'KeyW'], down: ['ArrowDown', 'KeyS'],
    jump: ['KeyZ', 'Space'], attack: ['KeyX'], call: ['KeyC'],
    dash: ['ShiftLeft', 'ShiftRight'], start: ['Enter', 'Escape'],
    retry: ['KeyR'], mute: ['KeyM'],
  },
  now: {}, prev: {},
  virt: {}, vtaps: new Set(),          // on-screen touch controls
  tapDir: 0, tapTimer: 0, dashLatch: false,
  press(a) { if (!this.virt[a]) this.vtaps.add(a); this.virt[a] = true; },
  release(a) { this.virt[a] = false; },
  tap(a) { this.vtaps.add(a); },
  code(e) {
    if (e.code) return e.code;
    const k = e.key || '';
    if (k.length === 1) return k === ' ' ? 'Space' : 'Key' + k.toUpperCase();
    return k === 'Shift' ? 'ShiftLeft' : k;
  },
  init() {
    addEventListener('keydown', (e) => {
      const c = this.code(e);
      if (c.startsWith('Arrow') || c === 'Space') e.preventDefault();
      if (!e.repeat) this.taps.add(c);   // keep taps shorter than one frame
      this.keys.add(c);
      Sfx.unlock();
    });
    addEventListener('keyup', (e) => this.keys.delete(this.code(e)));
    addEventListener('blur', () => { this.keys.clear(); this.virt = {}; });
  },
  poll() {
    this.prev = this.now;
    const n = {};
    for (const a in this.map) {
      n[a] = this.map[a].some((k) => this.keys.has(k) || this.taps.has(k)) || !!this.virt[a] || this.vtaps.has(a);
    }
    this.taps.clear(); this.vtaps.clear();
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    for (const p of pads) {
      if (!p) continue;
      const b = (i) => p.buttons[i] && p.buttons[i].pressed;
      const ax = p.axes[0] || 0, ay = p.axes[1] || 0;
      n.left ||= b(14) || ax < -0.4; n.right ||= b(15) || ax > 0.4;
      n.up ||= b(12) || ay < -0.5; n.down ||= b(13) || ay > 0.5;
      n.jump ||= b(0); n.attack ||= b(2); n.call ||= b(3) || b(1);
      n.dash ||= b(5) || b(7) || b(4); n.start ||= b(9);
    }
    this.now = n;
    // double tap to dash
    if (this.tapTimer > 0) this.tapTimer--;
    for (const [a, d] of [['left', -1], ['right', 1]]) {
      if (this.pressed(a)) {
        if (this.tapDir === d && this.tapTimer > 0) this.dashLatch = true;
        this.tapDir = d; this.tapTimer = 14;
      }
    }
    if (!n.left && !n.right) this.dashLatch = false;
  },
  down(a) { return !!this.now[a]; },
  pressed(a) { return !!this.now[a] && !this.prev[a]; },
  released(a) { return !this.now[a] && !!this.prev[a]; },
  dash() { return this.down('dash') || this.dashLatch; },
};

// Labels for controls in messages: {jump} etc. switch between keyboard and touch wording
const KEY_LABELS = {
  key: { move: '←→', dash: 'Shift（または →→ 2度押し）', jump: 'Z', attack: 'X', call: 'C', down: '↓', up: '↑', pause: 'Enter' },
  touch: { move: 'スティック', dash: 'スティックを大きく倒す', jump: '「ジャンプ」', attack: '「杖」', call: '「呼ぶ」',
    down: 'スティックの↓', up: 'スティックの↑', pause: '❚❚' },
};
function fmtKeys(html) {
  const L = KEY_LABELS[document.body.classList.contains('touch') ? 'touch' : 'key'];
  return html.replace(/\{(\w+)\}/g, (m, k) => L[k] || m);
}

// ---------------------------------------------------------------------------
// Sound: tiny WebAudio synth (SFC-ish square / triangle / noise)
// ---------------------------------------------------------------------------
const Sfx = {
  ctx: null, master: null, muted: false, noiseBuf: null, bgmTimer: null,
  unlock() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.32;
    this.master.connect(this.ctx.destination);
    const len = this.ctx.sampleRate;
    this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = this.noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  },
  toggleMute() {
    this.muted = !this.muted;
    if (this.master) this.master.gain.value = this.muted ? 0 : 0.32;
  },
  tone(f, dur, type = 'square', vol = 0.2, f2 = null, delay = 0) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + delay;
    const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t);
    if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(this.master);
    o.start(t); o.stop(t + dur + 0.02);
  },
  noise(dur, vol = 0.2, freq = 1200, delay = 0, q = 1) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + delay;
    const s = this.ctx.createBufferSource(); s.buffer = this.noiseBuf;
    const f = this.ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = q;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    s.connect(f); f.connect(g); g.connect(this.master);
    s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.02);
  },
  play(name) {
    switch (name) {
      case 'jump': this.tone(260, 0.12, 'square', 0.08, 520); break;
      case 'hop': this.tone(520, 0.08, 'triangle', 0.1, 900); break;
      case 'land': this.noise(0.06, 0.12, 400); break;
      case 'swing': this.noise(0.12, 0.18, 2400, 0, 0.7); break;
      case 'hit': this.noise(0.12, 0.3, 700); this.tone(180, 0.1, 'square', 0.12, 70); break;
      case 'kill': this.tone(600, 0.35, 'triangle', 0.12, 80); this.noise(0.4, 0.14, 300); break;
      case 'call': this.tone(880, 0.09, 'square', 0.07); this.tone(1175, 0.14, 'square', 0.07, null, 0.09); break;
      case 'wait': this.tone(784, 0.09, 'square', 0.07); this.tone(587, 0.14, 'square', 0.07, null, 0.09); break;
      case 'reply': this.tone(1320, 0.07, 'triangle', 0.12); this.tone(1760, 0.1, 'triangle', 0.1, null, 0.07); break;
      case 'plate': this.tone(660, 0.15, 'triangle', 0.14); this.tone(990, 0.3, 'triangle', 0.1, null, 0.1); break;
      case 'plateoff': this.tone(500, 0.15, 'triangle', 0.1, 300); break;
      case 'gate': this.noise(0.5, 0.12, 180, 0, 0.5); break;
      case 'lever': this.noise(0.08, 0.3, 900); this.tone(150, 0.2, 'square', 0.1, 90, 0.05); break;
      case 'push': this.noise(0.08, 0.05, 250); break;
      case 'catch': [523, 659, 784].forEach((f, i) => this.tone(f, 0.25, 'triangle', 0.1, null, i * 0.05)); break;
      case 'pull': this.tone(392, 0.2, 'triangle', 0.1, 784); break;
      case 'emerge': this.tone(110, 0.9, 'sawtooth', 0.06, 55); this.noise(0.9, 0.08, 200); break;
      case 'grab': this.tone(1400, 0.25, 'square', 0.07, 700); this.tone(1100, 0.3, 'square', 0.05, 500, 0.12); break;
      case 'drop': this.tone(300, 0.12, 'triangle', 0.1, 500); break;
      case 'save': [784, 988, 1175, 1568].forEach((f, i) => this.tone(f, 0.3, 'triangle', 0.09, null, i * 0.08)); break;
      case 'heart': this.tone(70, 0.12, 'sine', 0.35); this.tone(62, 0.14, 'sine', 0.3, null, 0.16); break;
      case 'fall': this.tone(600, 0.6, 'square', 0.06, 80); break;
      case 'door': this.noise(1.6, 0.14, 150, 0, 0.4); [392, 523, 659, 784, 1046].forEach((f, i) => this.tone(f, 0.6, 'triangle', 0.07, null, 0.3 + i * 0.12)); break;
      case 'over': [392, 349, 311, 262].forEach((f, i) => this.tone(f, 0.5, 'square', 0.06, null, i * 0.3)); break;
      case 'clear': [523, 659, 784, 1046, 784, 1046, 1318].forEach((f, i) => this.tone(f, 0.35, 'square', 0.06, null, i * 0.13)); break;
      case 'select': this.tone(990, 0.06, 'square', 0.06); break;
      case 'block': this.noise(0.1, 0.2, 200); break;
    }
  },
  // quiet, looping minor-key arpeggio (triangle) as background music
  startBgm() {
    if (!this.ctx || this.bgmTimer) return;
    const notes = [57, 60, 64, 67, 64, 60, 57, 55, 53, 57, 60, 65, 60, 57, 55, 52];
    const bass = [45, 45, 41, 40];
    let i = 0;
    const step = () => {
      const f = (m) => 440 * Math.pow(2, (m - 69) / 12);
      this.tone(f(notes[i % 16] + 12), 0.5, 'triangle', 0.035);
      if (i % 4 === 0) this.tone(f(bass[(i / 4) % 4]), 1.6, 'triangle', 0.05);
      i++;
    };
    step();
    this.bgmTimer = setInterval(step, 380);
  },
  stopBgm() { clearInterval(this.bgmTimer); this.bgmTimer = null; },
};

// ---------------------------------------------------------------------------
// Sprites. Each sheet: {img, f: {name: [x, y, w, h, ax, ay]}}
// ---------------------------------------------------------------------------
const Sheets = {};
function loadSheets() {
  const jobs = [];
  for (const key in ASSETS) {
    const a = ASSETS[key];
    const img = new Image();
    Sheets[key] = { img, f: a.f || {}, carry: a.carry || {}, white: null };
    jobs.push(new Promise((res) => { img.onload = res; img.src = a.src; }));
  }
  return Promise.all(jobs).then(() => {
    // white silhouettes for hit flashes
    for (const key of ['hero', 'heroine', 'shadow']) {
      const s = Sheets[key];
      const c = document.createElement('canvas');
      c.width = s.img.width; c.height = s.img.height;
      const x = c.getContext('2d');
      x.drawImage(s.img, 0, 0);
      x.globalCompositeOperation = 'source-in';
      x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height);
      s.white = c;
    }
  });
}

function drawSprite(ctx, sheet, name, x, y, flip = false, opt = null) {
  const s = Sheets[sheet];
  const r = s.f[name];
  if (!r) return;
  const [sx, sy, w, h, ax, ay] = r;
  const img = opt && opt.white ? s.white : s.img;
  x = Math.round(x); y = Math.round(y);
  if (opt && opt.alpha !== undefined) ctx.globalAlpha = opt.alpha;
  let clipH = h;
  if (opt && opt.clipBottom !== undefined) {
    // only draw the part above world-y clipBottom (for emerging / sinking)
    clipH = clamp(Math.round(opt.clipBottom - (y - ay)), 0, h);
  }
  if (clipH > 0) {
    if (flip) {
      ctx.save(); ctx.translate(x, y); ctx.scale(-1, 1);
      ctx.drawImage(img, sx, sy, w, clipH, -ax, -ay, w, clipH);
      ctx.restore();
    } else {
      ctx.drawImage(img, sx, sy, w, clipH, x - ax, y - ay, w, clipH);
    }
  }
  if (opt && opt.alpha !== undefined) ctx.globalAlpha = 1;
}

function drawTile(ctx, name, x, y, flip = false) {
  const r = Sheets.tiles.f[name];
  if (!r) return;
  if (flip) {
    ctx.save(); ctx.translate(Math.round(x) + r[2], Math.round(y)); ctx.scale(-1, 1);
    ctx.drawImage(Sheets.tiles.img, r[0], r[1], r[2], r[3], 0, 0, r[2], r[3]);
    ctx.restore();
  } else {
    ctx.drawImage(Sheets.tiles.img, r[0], r[1], r[2], r[3], Math.round(x), Math.round(y), r[2], r[3]);
  }
}

// crisp 1px line (Bresenham) for canes, arrows, etc.
function pxLine(ctx, x0, y0, x1, y1, col) {
  x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
  ctx.fillStyle = col;
  const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  for (let n = 0; n < 200; n++) {
    ctx.fillRect(x0, y0, 1, 1);
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) { err += dy; x0 += sx; }
    if (e2 <= dx) { err += dx; y0 += sy; }
  }
}

// tiny pixel icons drawn above heads (!, ?, heart, note, ...)
const ICONS = {
  '!': ['.##.', '.##.', '.##.', '.##.', '....', '.##.'],
  '?': ['.###.', '##.##', '...##', '..##.', '.....', '..##.'],
  '♥': ['.##.##.', '#######', '#######', '.#####.', '..###..', '...#...'],
  '♪': ['..###', '..#.#', '..#..', '###..', '###..'],
  '…': ['.......', '.......', '.......', '.......', '#.#.#..'],
};
function drawIcon(ctx, ch, x, y, col = '#fff') {
  const g = ICONS[ch];
  if (!g) return;
  const w = g[0].length, h = g.length;
  const ox = Math.round(x - w / 2 - 2), oy = Math.round(y - h - 4);
  ctx.fillStyle = '#1a1030';
  ctx.fillRect(ox, oy, w + 4, h + 4);
  ctx.fillStyle = '#f8f4ff';
  ctx.fillRect(ox + 1, oy + 1, w + 2, h + 2);
  ctx.fillStyle = '#1a1030';
  ctx.fillRect(ox + (w + 4) / 2 - 1 | 0, oy + h + 4, 2, 2);
  ctx.fillStyle = col;
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) if (g[j][i] === '#') ctx.fillRect(ox + 2 + i, oy + 2 + j, 1, 1);
}

// ---------------------------------------------------------------------------
// Particles
// ---------------------------------------------------------------------------
class Particles {
  constructor() { this.list = []; }
  add(p) { this.list.push(Object.assign({ vx: 0, vy: 0, g: 0, life: 30, t: 0, size: 1, col: '#fff', fade: true, drag: 1 }, p)); }
  burst(x, y, n, o) {
    for (let i = 0; i < n; i++) {
      const a = rand(0, Math.PI * 2), sp = rand(o.min || 0.3, o.max || 1.5);
      this.add(Object.assign({}, o, { x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - (o.up || 0), life: rand(o.life * 0.6, o.life) }));
    }
  }
  update() {
    for (const p of this.list) {
      p.t++; p.vx *= p.drag; p.vy = p.vy * p.drag + p.g; p.x += p.vx; p.y += p.vy;
    }
    this.list = this.list.filter((p) => p.t < p.life);
  }
  draw(ctx, cx, cy) {
    for (const p of this.list) {
      const k = 1 - p.t / p.life;
      ctx.globalAlpha = p.fade ? clamp(k * 1.5, 0, 1) : 1;
      ctx.fillStyle = p.col;
      const s = p.shrink ? Math.max(1, Math.round(p.size * k)) : p.size;
      ctx.fillRect(Math.round(p.x - cx - s / 2), Math.round(p.y - cy - s / 2), s, s);
    }
    ctx.globalAlpha = 1;
  }
}
