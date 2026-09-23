'use strict';
// ---------------------------------------------------------------------------
// Game: state machine, loop, camera, lighting, HUD
// ---------------------------------------------------------------------------
ICONS['↓'] = ['..#..', '..#..', '..#..', '#####', '.###.', '..#..'];
ICONS['↑'] = ['..#..', '.###.', '#####', '..#..', '..#..', '..#..'];

class Game {
  constructor() {
    this.cv = document.getElementById('screen');
    this.ctx = this.cv.getContext('2d');
    this.ctx.imageSmoothingEnabled = false;
    this.light = document.createElement('canvas');
    this.light.width = VW; this.light.height = VH;
    this.lctx = this.light.getContext('2d');
    this.ui = {
      wrap: document.getElementById('wrap'), msg: document.getElementById('msg'), toast: document.getElementById('toast'),
      center: document.getElementById('center'), hud: document.getElementById('hud'), mode: document.getElementById('mode'),
      bubbles: document.getElementById('bubbles'), chapter: document.getElementById('chapter'),
      skip: document.getElementById('skip'), titlebg: document.getElementById('titlebg'),
    };
    this.bubbleEls = new Map();
    this.stats = { time: 0, grabs: 0, kills: 0, retries: 0 };
    this.checkpoint = null;
    this.state = 'title'; this.st = 0;
    this.load(null);
    Touch.init(() => this.onInputModeChange());
    this.showTitle();
    addEventListener('resize', () => this.resize());
    addEventListener('orientationchange', () => setTimeout(() => this.resize(), 200));
    this.resize();
    // tapping an overlay (title / game over / clear) acts like pressing Enter; menu buttons run commands
    this.ui.center.addEventListener('pointerdown', (e) => {
      Sfx.unlock();
      const btn = e.target.closest('button');
      if (btn && btn.dataset.cmd) { e.preventDefault(); this.menuCommand(btn.dataset.cmd); return; }
      if (this.state === 'cutscene') Input.tap('jump');     // advance the letter
      else if (this.state !== 'pause') Input.tap('start');
    });
    document.addEventListener('pointerdown', (e) => {
      if (this.state === 'cutscene' && !e.target.closest('#touch') && !e.target.closest('#center')) Input.tap('jump');
    });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        if (this.state === 'play' && !location.search.includes('debug')) this.pause();
        if (Sfx.ctx) Sfx.ctx.suspend();
      } else if (Sfx.ctx) Sfx.ctx.resume();
    });
    this.acc = 0; this.last = performance.now();
    requestAnimationFrame((t) => this.frame(t));
  }

  // ---- setup ---------------------------------------------------------------
  load(cp) {
    const stage = buildStage1();
    this.world = new World(stage);
    this.t = 0; this.shake = 0; this.hitstop = 0; this.dangerT = 0; this.spawnCd = 300;
    this.flags = {}; this.msgT = 0; this.msgHtml = ''; this.toastT = 0; this.fade = 0;
    this.particles = new Particles();
    this.gates = []; this.plates = []; this.levers = []; this.blocks = []; this.shrines = [];
    this.signs = []; this.ambushes = []; this.door = null; this.shadows = []; this.portals = [];
    for (const e of stage.ents) {
      switch (e.type) {
        case 'hero': this.hero = new Hero(e.x, e.y); break;
        case 'heroine': this.heroine = new Heroine(e.x, e.y); break;
        case 'gate': this.gates.push(new Gate(e)); break;
        case 'plate': this.plates.push(new Plate(e)); break;
        case 'lever': this.levers.push(new Lever(e)); break;
        case 'block': this.blocks.push(new Block(e)); break;
        case 'shrine': this.shrines.push(new Shrine(e)); break;
        case 'sign': this.signs.push(new Sign(e)); break;
        case 'ambush': this.ambushes.push(new Ambush(e)); break;
        case 'door': this.door = new Door(e); break;
      }
    }
    for (const g of this.gates) g.plates = this.plates.filter((p) => p.gateIds.includes(g.id));
    this.world.dyn = [...this.gates, ...this.blocks];
    if (cp) {
      for (const l of this.levers) if (cp.levers.includes(l.id)) { l.on = true; }
      for (const g of this.gates) if (this.levers.some((l) => l.on && l.gateIds.includes(g.id))) { g.locked = true; g.open = 1; }
      for (const s of this.shrines) if (cp.shrines.includes(s.id)) s.lit = true;
      for (const a of this.ambushes) if (cp.ambush.includes(a.id)) { a.done = true; a.wave = a.waves.length; }
      for (const b of this.blocks) { const p = cp.blocks[b.id]; if (p) { b.x = p.x; b.y = p.y; } }
      this.hero.x = cp.x + 12; this.hero.y = cp.y; this.hero.facing = 1;
      this.heroine.x = cp.x - 12; this.heroine.y = cp.y; this.heroine.facing = 1;
      this.hero.lastSafe = { x: this.hero.x, y: this.hero.y };
      this.flags.plateHint = true;
    }
    this.black = 0; this.wallShadow = null;
    this.afterPrologue();
    this.hero.checkGround(this.world); this.heroine.checkGround(this.world);
    this.cam = { x: 0, y: 0, lx: 0 };
    this.updateCamera(true);
    for (const el of this.bubbleEls.values()) el.el.remove();
    this.bubbleEls.clear();
  }

  saveCheckpoint(shrine) {
    this.checkpoint = {
      x: shrine.x, y: shrine.y,
      levers: this.levers.filter((l) => l.on).map((l) => l.id),
      shrines: this.shrines.filter((s) => s.lit).map((s) => s.id),
      ambush: this.ambushes.filter((a) => a.done).map((a) => a.id),
      blocks: Object.fromEntries(this.blocks.map((b) => [b.id, { x: b.x, y: b.y }])),
    };
  }

  resize() {
    const W = innerWidth, H = innerHeight;
    const touch = document.body.classList.contains('touch');
    const portrait = touch && H > W * 1.1;          // phone held upright: game on top, controls below
    const flipped = portrait !== document.body.classList.contains('portrait');
    document.body.classList.toggle('portrait', portrait);
    if (flipped && this.state === 'title') setTimeout(() => this.showTitle(), 0);
    const s = Math.min(W / VW, (portrait ? H * 0.46 : H) / VH);
    // integer scaling when it costs little screen space, otherwise fill the window
    const scale = Math.floor(s) >= s * 0.85 ? Math.floor(s) : s;
    this.scale = scale;
    this.cv.style.width = VW * scale + 'px'; this.cv.style.height = VH * scale + 'px';
    this.ui.wrap.style.width = VW * scale + 'px'; this.ui.wrap.style.height = VH * scale + 'px';
    document.documentElement.style.setProperty('--u', (7.2 * scale) + 'px');
    // message window: under the screen (portrait), at the top (touch landscape, clear of the thumbs), else bottom
    const r = this.ui.wrap.getBoundingClientRect(), m = this.ui.msg.style;
    m.boxSizing = 'border-box';
    m.left = r.left + r.width * 0.04 + 'px'; m.width = r.width * 0.92 + 'px';
    if (portrait) { m.left = W * 0.03 + 'px'; m.width = W * 0.94 + 'px'; m.top = r.bottom + 8 + 'px'; m.bottom = 'auto'; }
    else if (touch) { m.top = r.top + r.height * 0.13 + 'px'; m.bottom = 'auto'; }
    else { m.top = 'auto'; m.bottom = (H - r.bottom) + r.height * 0.04 + 'px'; }
  }

  onInputModeChange() {
    this.resize();
    this.shownMsg = null;
    if (this.state === 'title') this.showTitle();
    else if (this.state === 'pause') this.pause();
  }

  pause() {
    this.state = 'pause';
    this.showCenter(`<h1>PAUSE</h1>${this.keysHtml()}<div class="menu"><button data-cmd="resume">再開</button>
      <button data-cmd="retry">最後の灯籠から やり直す</button><button data-cmd="mute">音 ${Sfx.muted ? 'OFF → ON' : 'ON → OFF'}</button></div>
      ${Touch.enabled ? '' : '<div style="margin-top:1em;font-size:0.7em">Enter：再開　R：やり直す　M：音</div>'}`, true);
  }

  menuCommand(cmd) {
    Sfx.play('select');
    if (cmd === 'resume') { this.state = 'play'; this.hideCenter(); }
    else if (cmd === 'retry') this.retry();
    else if (cmd === 'mute') { Sfx.toggleMute(); this.pause(); }
  }

  // ---- loop ----------------------------------------------------------------
  frame(now) {
    this.acc += Math.min(100, now - this.last);
    this.last = now;
    let steps = 0;
    while (this.acc >= 1000 / 60 && steps < 4) {
      Input.poll();
      this.update();
      this.acc -= 1000 / 60; steps++;
    }
    if (steps >= 4) this.acc = 0;
    this.render();
    requestAnimationFrame((t) => this.frame(t));
  }

  update() {
    this.st++;
    if (Input.pressed('mute')) Sfx.toggleMute();
    switch (this.state) {
      case 'title':
        this.t++;
        if (Input.pressed('jump') || Input.pressed('start') || Input.pressed('attack')) {
          Sfx.unlock(); Sfx.play('select'); Sfx.startBgm();
          this.hideCenter();
          this.startPrologue();
        }
        return;
      case 'cutscene':
        this.updateCutscene();
        return;
      case 'pause':
        if (Input.pressed('start')) this.menuCommand('resume');
        else if (Input.pressed('retry')) this.retry();
        else if (Input.pressed('mute')) this.pause();
        return;
      case 'gameover':
        this.stGo++;
        if (this.stGo === 70) this.showCenter(`<h1 style="color:#d8c8ff">ルミナは 闇に連れ去られた…</h1><h2>あなたは 彼女の手を 離してしまった</h2><div class="blink">${Touch.enabled ? 'タップで' : 'Z：'}最後の灯籠から やり直す</div>`, true);
        if (this.stGo > 70 && (Input.pressed('jump') || Input.pressed('start') || Input.pressed('retry'))) this.retry();
        this.particles.update();
        return;
      case 'ending':
        this.updateEnding();
        return;
      case 'clear':
        if (this.st > 60 && (Input.pressed('jump') || Input.pressed('start'))) {
          this.checkpoint = null; this.stats = { time: 0, grabs: 0, kills: 0, retries: 0 };
          this.load(null); this.state = 'title'; this.showTitle(); this.ui.hud.style.display = 'none';
        }
        return;
    }
    // ---- play ----
    if (Input.pressed('start')) { this.pause(); return; }
    if (this.hitstop > 0) { this.hitstop--; return; }
    this.t++; this.stats.time++;
    const hero = this.hero, h = this.heroine;

    if (Input.pressed('call') && hero.state !== 'fallout') this.call();
    hero.update(this);
    this.checkReach();
    for (const b of this.blocks) b.update(this);
    for (const p of this.plates) p.update(this);
    for (const g of this.gates) g.update(this);
    for (const s of this.shrines) s.update(this);
    h.update(this);
    for (const s of this.shadows) s.update(this);
    this.shadows = this.shadows.filter((s) => s.alive);
    for (const p of this.portals) {
      if (!p.closing && p.users <= 0 && p.t > 60) p.closing = true;
      p.update(this);
    }
    this.portals = this.portals.filter((p) => !p.dead);
    for (const a of this.ambushes) a.update(this);
    this.updateDanger();
    this.updateDoor();
    this.particles.update();
    this.updateCamera(false);
    this.updateMessages();
    if (this.shake > 0) this.shake -= 0.25;
  }

  // ---- prologue / cutscenes -----------------------------------------------------
  startPrologue() {
    this.state = 'cutscene';
    this.ui.hud.style.display = 'none';
    this.ui.skip.style.display = 'block';
    this.cut = new Cutscene(this, prologueScript(), () => this.finishPrologue());
  }

  // everything as it is after the prologue (also used when retrying)
  afterPrologue() {
    const g0 = this.gates.find((g) => g.id === 'g0');
    if (g0) { g0.locked = true; g0.open = 1; }
    for (const d of this.world.decor) {
      if (d.type === 'rope') { d.fallen = true; d.fallT = 99; }
      if (d.type === 'rubble') d.shown = true;
    }
  }

  setupPrologue() {
    const g0 = this.gates.find((g) => g.id === 'g0');
    g0.locked = false; g0.open = 0;
    for (const d of this.world.decor) {
      if (d.type === 'rope') { d.fallen = false; d.fallT = 0; }
      if (d.type === 'rubble') d.shown = false;
    }
    const hero = this.hero, h = this.heroine;
    hero.setState('scripted'); h.setState('scripted');
    hero.x = 17.5 * TILE; hero.y = 4 * TILE; hero.facing = -1; hero.kinematic = true; hero.pose = 'jump7';
    h.x = 6 * TILE + 4; h.y = 16 * TILE; h.facing = -1; h.pose = null; h.vx = h.vy = 0;
    this.wallShadow = { scale: 1.9, alpha: 0.62, wave: false, grow: 0 };
    this.black = 1;
    this.cam.x = 0; this.cam.y = 4.5 * TILE;
  }

  finishPrologue() {
    if (this.state !== 'cutscene') return;
    this.cut = null;
    this.afterPrologue();
    const hero = this.hero, h = this.heroine;
    hero.setState('normal'); hero.pose = null; hero.kinematic = false; hero.x = 9.7 * TILE; hero.y = 16 * TILE; hero.facing = 1;
    h.setState('normal'); h.pose = null; h.x = 8.1 * TILE; h.y = 16 * TILE; h.facing = 1; h.mode = 'follow';
    hero.vx = hero.vy = h.vx = h.vy = 0;
    hero.checkGround(this.world); h.checkGround(this.world);
    hero.lastSafe = { x: hero.x, y: hero.y };
    this.wallShadow = null; this.black = 0; this.shake = 0; this.fade = 0;
    this.hideTalk(); this.hideCenter();
    this.ui.chapter.className = '';
    this.ui.skip.style.display = 'none';
    this.ui.hud.style.display = 'flex';
    this.state = 'play';
  }

  updateCutscene() {
    this.t++;
    if (Input.pressed('start')) { this.finishPrologue(); return; }
    this.cut.update();
    if (!this.cut) return;
    for (const a of [this.hero, this.heroine]) {
      if (a.kinematic) continue;
      a.physics(this.world);
      if (a.onGround) a.animDist += Math.abs(a.vx);
    }
    const h = this.heroine;
    h.t++; if (h.iconT > 0) h.iconT--;
    h.scriptFrame = h.pose || (Math.abs(h.vx) > 0.1 ? 'walk' + (Math.floor(h.animDist / 2.8) % 8) : 'idle' + (Math.floor(h.t / 40) % 2));
    this.hero.t++;
    const ws = this.wallShadow;
    if (ws && ws.grow) {
      ws.grow++;
      ws.scale = Math.min(4.6, ws.scale + 0.03);
      ws.alpha = Math.min(0.85, ws.alpha + 0.006);
      if (ws.grow % 20 === 0) this.shake = 3;
    }
    for (const d of this.world.decor) if (d.type === 'rope' && d.fallen) d.fallT++;
    if (this.fade > 0) this.fade = Math.max(0, this.fade - 0.025);     // flash
    this.particles.update();
    for (const g of this.gates) g.update(this);
    if (this.shake > 0) this.shake -= 0.25;
  }

  // walk an actor to x; true when arrived
  cutWalk(a, tx, speed) {
    const dx = tx - a.x;
    if (Math.abs(dx) < 1.2) { a.vx = 0; return true; }
    a.facing = sign(dx);
    a.vx = sign(dx) * Math.min(speed, Math.abs(dx));
    return false;
  }

  awaken() {
    Sfx.play('emerge'); Sfx.play('door');
    this.wallShadow.grow = 1;
    this.heroine.emote('!', 90);
    this.fade = 0.8;
  }

  shatterShadow() {
    const h = this.heroine, ws = this.wallShadow;
    Sfx.play('kill'); Sfx.play('block');
    this.shake = 5;
    for (let i = 0; i < 70; i++) {
      this.particles.add({ x: h.x - 20 + rand(-30, 20), y: h.y - rand(0, 110), vx: rand(1.5, 4.5), vy: rand(-1.2, 0.8),
        life: rand(40, 80), col: i % 3 ? '#140a20' : '#3a2058', size: 2 + (i % 2), shrink: true, drag: 0.99 });
    }
    // the cave-in: the rope comes down with the rubble
    for (const d of this.world.decor) {
      if (d.type === 'rope') { d.fallen = true; d.fallT = 0; }
      if (d.type === 'rubble') d.shown = true;
    }
    for (let i = 0; i < 26; i++) {
      this.particles.add({ x: 17 * TILE + rand(-10, 20), y: 6 * TILE + rand(-4, 20), vx: rand(-0.6, 0.6), vy: rand(0, 1.5), g: 0.2,
        life: rand(30, 60), col: i % 2 ? '#6a6270' : '#3a3448', size: 2 });
    }
    ws.alpha = 0; this.wallShadow = null;
    this.say(this.heroine, 'きゃっ……！', 'cry', 60);
  }

  // Lumina's shadow, cast on her cell wall by Marta's candle
  drawWallShadow(ctx, cx, cy) {
    const ws = this.wallShadow, h = this.heroine;
    const frame = ws.wave ? 'reachup' + (Math.floor(this.t / 14) % 2) : h.frame();
    const r = Sheets.heroine.f[frame];
    if (!r) return;
    const [sx, sy, w, hh, ax, ay] = r;
    const flick = 1 + Math.sin(this.t * 0.35) * 0.02;
    const s = ws.scale * flick;
    const fx = Math.round(h.x - cx - 14 - (s - 1) * 6), fy = Math.round(h.y - cy);
    ctx.save();
    ctx.globalAlpha = ws.alpha;
    ctx.translate(fx, fy);
    ctx.scale(h.facing < 0 ? -s : s, s);
    ctx.drawImage(Sheets.heroine.dark, sx, sy, w, hh, -ax, -ay, w, hh);
    ctx.restore();
  }

  showTalk(name, text) {
    this.ui.msg.innerHTML = `<span class="name">${name}：</span>${text}<span class="more">▼</span>`;
    this.ui.msg.style.display = 'block';
    this.shownMsg = null;
  }
  hideTalk() { this.ui.msg.style.display = 'none'; this.shownMsg = null; }

  showChapter(num, title) {
    const c = this.ui.chapter;
    c.innerHTML = `<div class="num">${num}</div><div class="title">${title}</div>`;
    c.className = '';
    void c.offsetWidth;          // restart the CSS animation
    c.className = 'show';
  }

  // ---- interactions ----------------------------------------------------------
  call() {
    const hero = this.hero, h = this.heroine;
    if (!['normal', 'hop', 'down', 'getup'].includes(h.state)) return;
    const d = Math.hypot(h.x - hero.x, h.y - hero.y);
    h.plateGoal = null;
    if (h.mode === 'wait') {
      h.mode = 'follow'; Sfx.play('call');
      this.say(hero, d > 90 ? 'ルミナ、こっちだ！' : 'おいで。', 'hero', 60);
      setTimeout(() => Sfx.play('reply'), 250);
      this.say(h, 'はい！', 'her', 50, 16); h.emote('♪', 40);
    } else if (d < 72) {
      h.mode = 'wait'; Sfx.play('wait');
      this.say(hero, 'ここで待っていてくれ。', 'hero', 70);
      this.say(h, 'うん…', 'her', 50, 20); h.emote('…', 60);
    } else {
      Sfx.play('call');
      this.say(hero, 'ルミナ、こっちだ！', 'hero', 60);
      h.emote('♪', 40);
    }
  }

  tryLever(hero) {
    for (const l of this.levers) if (l.near(hero)) { l.pull(this); return true; }
    return false;
  }

  attackHit(hero, box) {
    for (const s of this.shadows) {
      if (!s.alive || hero.hitList.has(s)) continue;
      if (overlap(box, s.box())) {
        if (s.hit(this, hero.facing)) { hero.hitList.add(s); this.hitstop = 4; this.shake = 2.5; }
      }
    }
  }

  // Can the hero, standing where he is, help her with ↓ right now?
  reachPlan() {
    const hero = this.hero, h = this.heroine, w = this.world;
    if (h.state !== 'normal' || !h.onGround || !hero.onGround) return null;
    const dx = h.x - hero.x, adx = Math.abs(dx);
    const below = h.y - hero.y;
    const facingHer = sign(dx) === hero.facing || adx < 8;
    if (!facingHer) return null;
    // pull up onto the ledge: find the ledge edge in front of the hero
    if (below >= 18 && below <= 66) {
      const f = hero.facing;
      let edgeX = null;
      for (let k = 0; k <= 30; k += 2) {
        const px = hero.x + f * k;
        if (!w.pointSolid(px, hero.y + 4)) { edgeX = f < 0 ? (Math.floor(px / TILE) + 1) * TILE : Math.floor(px / TILE) * TILE; break; }
      }
      if (edgeX !== null && Math.abs(h.x - edgeX) <= 30) {
        return { type: 'pull', x0: h.x, y0: h.y, ex: edgeX + f * 6, ty: hero.y, fx: edgeX - f * 8, t: 0 };
      }
    }
    // leap into his arms across a chasm / down from a height
    const up = hero.y - h.y;
    if (adx >= 14 && adx <= 112 && up >= -40 && up <= 184) {
      const toward = sign(hero.x - h.x);
      if (h.probe(w, toward) !== 'edge') return null;
      const tx = hero.x + hero.facing * 6, ty = hero.y - 3;
      const ddx = tx - h.x, ddy = ty - h.y;
      // flight time: long enough to cover the distance, short enough to stay flat
      const base = Math.max(Math.sqrt(2 * Math.max(ddy, 0) / GRAV) * 1.08, Math.abs(ddx) / 2.2, 22);
      for (const k of [1, 1.2, 0.85, 1.45]) {
        const T = Math.round(base * k);
        const vy0 = (ddy - 0.5 * GRAV * T * T) / T;
        let clear = true;
        for (let t = 2; t < T - 3 && clear; t += 2) {
          const x = h.x + (ddx * t) / T, y = h.y + vy0 * t + 0.5 * GRAV * t * t;
          if (w.boxHit(x - 4, y - 26, x + 4, y - 2, h)) clear = false;
        }
        if (clear) return { type: 'leap', x0: h.x, y0: h.y, tx, ty, T, vy0, t: 0 };
      }
      return null;
    }
    return null;
  }

  checkReach() {
    const hero = this.hero, h = this.heroine;
    if (hero.state !== 'reach') return;
    const plan = this.reachPlan();
    if (!plan) return;
    if (plan.type === 'pull') {
      h.pull = plan; h.setState('pulled'); hero.setState('pull');
      Sfx.play('pull'); h.emote('♪', 40);
    } else {
      h.leap = plan; h.setState('leap'); h.facing = sign(hero.x - h.x) || h.facing;
      hero.setState('catchwait'); Sfx.play('hop');
      this.say(h, 'えいっ！', 'her', 40);
    }
    h.mode = 'follow';
  }

  // A closed gate right in front of her with one of its plates on her side?
  plateForGate(h, dir) {
    const fx = h.x + dir * (h.hw + 3);
    for (const g of this.gates) {
      if (g.open > 0.7 || fx < g.gx || fx > g.gx + 16 || Math.abs(h.y - (g.gy + 48)) > 24) continue;
      let best = null;
      for (const p of g.plates) {
        if (p.pressed || sign(p.x - (g.gx + 8)) !== -dir) continue;
        if (Math.abs(p.y - h.y) > 20 || Math.abs(p.x - h.x) > 10 * TILE) continue;
        if (this.blocks.some((b) => !b.hidden && Math.abs(b.x - p.x) <= 10 && Math.abs(b.y - p.y) <= 2)) continue;
        if (!best || Math.abs(p.x - h.x) < Math.abs(best.x - h.x)) best = p;
      }
      return best;
    }
    return null;
  }

  plateNear(a, r) {
    for (const p of this.plates) {
      if (Math.abs(p.y - a.y) > 2 || Math.abs(p.x - a.x) > r) continue;
      if (this.blocks.some((b) => !b.hidden && Math.abs(b.x - p.x) <= 10 && Math.abs(b.y - p.y) <= 2)) continue;
      return p;
    }
    return null;
  }

  nearestShadow(a, r) {
    let best = null, bd = r;
    for (const s of this.shadows) {
      if (!s.isThreat()) continue;
      const d = Math.hypot(s.x - a.x, (s.y - a.y) * 1.5);
      if (d < bd) { bd = d; best = s; }
    }
    return best;
  }

  solidsForGate() {
    const out = [this.hero, ...this.blocks.filter((b) => !b.hidden), ...this.shadows.filter((s) => s.alive)];
    if (this.heroine.state !== 'carried') out.push(this.heroine);
    return out;
  }

  spawnShadow(x, y) {
    const p = new Portal(x, y);
    this.portals.push(p);
    const s = new Shadow(p);
    this.shadows.push(s);
    Sfx.play('emerge');
    return s;
  }

  // leaving her alone summons the shadows
  updateDanger() {
    const hero = this.hero, h = this.heroine;
    const d = Math.hypot(h.x - hero.x, (h.y - hero.y) * 1.2);
    const safe = h.x < 46 * TILE && h.y < 17 * TILE;          // tutorial corridor
    const exposed = ['normal', 'down', 'getup'].includes(h.state);
    if (d > 176 && exposed && !safe && this.state === 'play') this.dangerT++;
    else this.dangerT = Math.max(0, this.dangerT - 3);
    if (this.spawnCd > 0) this.spawnCd--;
    if (this.dangerT > 70 && this.dangerT % 50 === 0) Sfx.play('heart');
    if (this.dangerT === 90) { this.say(h, 'グレイさん…どこ…？', 'her', 80); h.emote('!', 50); }
    const active = this.shadows.filter((s) => s.alive).length;
    if (this.dangerT > 210 && this.spawnCd <= 0 && active < 2) {
      if (this.spawnNear(h)) { this.spawnCd = 520; this.dangerT = 120; }
      else this.spawnCd = 60;
    }
  }

  spawnNear(h) {
    const w = this.world;
    const away = sign(h.x - this.hero.x) || 1;
    for (const dist of [92, 76, 108, 60, 44, 32]) {
      for (const dir of [away, -away]) {
        const px = h.x + dir * dist;
        let ok = !w.boxHit(px - 7, h.y - 40, px + 7, h.y - 1) && w.pointSolid(px - 6, h.y + 2) && w.pointSolid(px + 6, h.y + 2);
        for (let k = 8; ok && k < dist; k += 6) {
          const xx = h.x + dir * k;
          if (!w.pointSolid(xx, h.y + 2) || w.pointSolid(xx, h.y - 8)) ok = false;
        }
        if (ok) {
          this.spawnShadow(px, h.y);
          this.say(h, 'きゃっ…！', 'cry', 50);
          if (!this.flags.dangerHint) { this.flags.dangerHint = true; this.notify('hint_danger', 220); }
          return true;
        }
      }
    }
    return false;
  }

  onAmbushDone(a) {
    if (a.id === 'a2') this.say(this.heroine, '…扉の封印が 消えていく。', 'her', 100);
    else this.say(this.hero, '…行こう、ルミナ。', 'hero', 70);
  }

  updateDoor() {
    const d = this.door, hero = this.hero, h = this.heroine;
    if (!d) return;
    d.update(this);
    const alive = this.shadows.some((s) => s.alive);
    const sealed = alive || this.ambushes.some((a) => a.id === 'a2' && !a.done);
    const hNear = Math.abs(h.x - d.x) < 38 && Math.abs(h.y - d.y) < 10 && h.state === 'normal';
    const heroNear = Math.abs(hero.x - d.x) < 40 && Math.abs(hero.y - d.y) < 10;
    if (!d.opening) {
      if (hNear && !sealed) {
        d.opening = true; Sfx.play('door');
        this.notify('door_open', 200);
        this.say(h, '光が…！', 'her', 80);
      } else if (heroNear && sealed && !this.flags.sealMsg) {
        this.flags.sealMsg = true; this.notify('door_sealed', 150);
      }
    } else if (d.open >= 1 && hNear && heroNear) {
      this.state = 'ending'; this.et = 0;
      hero.setState('scripted'); h.setState('scripted');
      Sfx.stopBgm(); Sfx.play('clear');
    }
  }

  updateEnding() {
    this.et++;
    const hero = this.hero, h = this.heroine, d = this.door;
    for (const a of [hero, h]) {
      const dx = d.x + (a === hero ? 9 : -9) - a.x;     // stand side by side in the light
      a.vx = Math.abs(dx) > 1 ? sign(dx) * 0.6 : 0;
      a.facing = sign(dx) || a.facing;
      a.physics(this.world);
      a.animDist += Math.abs(a.vx);
    }
    h.scriptFrame = Math.abs(h.vx) > 0 ? 'walk' + (Math.floor(h.animDist / 2.8) % 8) : this.et > 60 ? 'front' : 'idle0';
    if (Math.abs(h.vx) === 0) h.facing = 1;
    if (this.et > 60) hero.front = true;
    this.fade = clamp((this.et - 70) / 80, 0, 1);
    this.particles.update();
    if (this.et % 3 === 0) this.particles.add({ x: d.x + rand(-20, 20), y: d.y - rand(0, 40), vy: -0.5, life: 50, col: '#fff6d0' });
    if (this.et === 160) {
      this.state = 'clear'; this.st = 0;
      this.ui.hud.style.display = 'none'; this.ui.msg.style.display = 'none';
      for (const b of this.bubbleEls.values()) b.t = 0;
      const s = this.stats;
      const sec = Math.floor(s.time / 60);
      this.showCenter(`<h1>第1章 クリア</h1><h2>忘れられた地下聖堂</h2>
        <div class="quote">「これが……そと？」<br>「ああ。――夜明けだ。」</div>
        <div class="keys"><b>クリアタイム</b>${Math.floor(sec / 60)}分${String(sec % 60).padStart(2, '0')}秒<br>
        <b>さらわれた回数</b>${s.grabs} 回<br><b>光へ還した影</b>${s.kills} 体<br><b>やり直し</b>${s.retries} 回</div>
        <div style="margin-top:1em;font-size:0.8em">第2章「薄明の森」へ つづく</div>
        <div class="blink" style="margin-top:1em">${Touch.enabled ? 'タップで' : 'Z：'}タイトルへ</div>`, false, true);
    }
  }

  gameOver() {
    if (this.state !== 'play') return;
    this.state = 'gameover'; this.stGo = 0;
    Sfx.stopBgm(); Sfx.play('over');
    this.ui.msg.style.display = 'none';
  }

  retry() {
    this.stats.retries++;
    this.load(this.checkpoint);
    this.state = 'play'; this.hideCenter();
    Sfx.startBgm();
    this.say(this.heroine, 'グレイさん…！', 'her', 60);
  }

  // ---- camera ------------------------------------------------------------------
  updateCamera(snap) {
    const hero = this.hero, h = this.heroine, c = this.cam;
    c.lx = approach(c.lx, hero.facing * 30, 1.2);
    let fx = hero.x + c.lx, fy = hero.y - 28;
    // keep her in the frame too (more strongly while she is being carried off)
    const k = h.state === 'carried' ? 0.5 : Math.abs(h.x - hero.x) < 280 && Math.abs(h.y - hero.y) < 200 ? 0.3 : 0;
    fx = lerp(fx, h.x, k); fy = lerp(fy, h.y - 24, k * 1.3);
    const tx = fx - VW / 2, ty = fy - VH * 0.56;
    if (snap) { c.x = tx; c.y = ty; } else { c.x += (tx - c.x) * 0.12; c.y += (ty - c.y) * 0.1; }
    c.x = clamp(c.x, 0, this.world.pw - VW); c.y = clamp(c.y, 0, this.world.ph - VH);
  }

  // ---- messages / bubbles -------------------------------------------------------
  notify(keyOrHtml, dur = 150, toast = false) {
    const html = TEXT[keyOrHtml] || keyOrHtml;
    if (toast) { this.ui.toast.innerHTML = fmtKeys(html); this.toastT = dur; this.ui.toast.style.display = 'block'; return; }
    this.msgHtml = html; this.msgT = dur;
  }
  updateMessages() {
    let html = '';
    if (this.msgT > 0) { this.msgT--; html = this.msgHtml; }
    else for (const s of this.signs) if (s.near(this.hero)) html = TEXT[s.text];
    if (html !== this.shownMsg) {
      this.shownMsg = html;
      this.ui.msg.innerHTML = fmtKeys(html); this.ui.msg.style.display = html ? 'block' : 'none';
    }
    if (this.heroine.stuckT === 900 && !this.flags.stuckHint) { this.flags.stuckHint = true; this.notify('hint_stuck', 300); }
    if (this.toastT > 0 && --this.toastT === 0) this.ui.toast.style.display = 'none';
    this.ui.mode.textContent = this.heroine.mode === 'wait' ? '待っている' : this.heroine.state === 'carried' ? 'さらわれた！' : 'ついてくる';
    this.ui.mode.style.color = this.heroine.state === 'carried' ? '#ff9aa8' : this.heroine.mode === 'wait' ? '#ffe08a' : '#ffffff';
  }
  say(actor, text, cls = 'hero', dur = 60, delay = 0) {
    let b = this.bubbleEls.get(actor);
    if (!b) {
      const el = document.createElement('div');
      this.ui.bubbles.appendChild(el);
      b = { el };
      this.bubbleEls.set(actor, b);
    }
    b.el.className = 'bubble ' + cls; b.el.textContent = text;
    b.t = dur; b.delay = delay; b.el.style.display = 'none';
  }
  drawBubbles(cx, cy) {
    for (const [a, b] of this.bubbleEls) {
      if (b.delay > 0) { b.delay--; continue; }
      if (b.t <= 0) { b.el.style.display = 'none'; continue; }
      if (this.state === 'play' || this.state === 'title' || this.state === 'cutscene') b.t--;
      const top = a.y - a.h - (a === this.heroine && a.state === 'carried' ? -4 : 12);
      b.el.style.display = 'block';
      // keep the bubble inside the screen horizontally
      const half = b.el.offsetWidth / 2 + 2, wpx = VW * this.scale;
      b.el.style.left = clamp((a.x - cx) * this.scale, half, Math.max(half, wpx - half)) + 'px';
      b.el.style.top = (top - cy) * this.scale + 'px';
    }
  }

  // ---- DOM overlays -------------------------------------------------------------
  keysHtml() {
    if (Touch.enabled) {
      return `<div class="keys"><b>スティック</b>移動（大きく倒すとダッシュ）<br><b>ジャンプ</b>ジャンプ<br>
        <b>灯竿</b>灯竿を振る（影を光へ還す）<br><b>呼ぶ</b>ルミナに「待て」/「おいで」<br>
        <b>スティック↓</b>長押しで手を差し伸べる（受け止める・引き上げる）<br><b>スティック↑</b>レバーを引く<br>
        <b>❚❚</b>ポーズ</div>`;
    }
    return `<div class="keys"><b>←→</b>移動（Shift / 2度押しでダッシュ）<br><b>Z / Space</b>ジャンプ<br>
      <b>X</b>灯竿を振る（影を光へ還す）<br><b>C</b>ルミナに「待て」/「おいで」<br>
      <b>↓（長押し）</b>手を差し伸べる（受け止める・引き上げる）<br><b>↑</b>レバーを引く<br>
      <b>Enter</b>ポーズ　<b style="min-width:0">M</b> 音 ON/OFF</div>`;
  }
  showTitle() {
    this.showCenter(`<h1>灯のルミナ</h1><h2>第1章 ─ 忘れられた地下聖堂</h2>
      <div class="press"><div class="blink">${Touch.enabled ? 'タップでスタート' : 'PRESS Z / ENTER'}</div>
      ${document.body.classList.contains('portrait') ? '<div class="note">📱 横向きにすると 画面が大きくなります</div>' : ''}</div>`,
      false, false, 'title');
    this.ui.titlebg.style.display = 'block';
  }
  showCenter(html, dark = false, light = false, cls = '') {
    this.ui.titlebg.style.display = 'none';
    const c = this.ui.center;
    c.innerHTML = html; c.style.display = 'flex';
    c.className = 'px' + (dark ? ' dark' : '') + (light ? ' light' : '') + (cls ? ' ' + cls : '');
  }
  hideCenter() { this.ui.center.style.display = 'none'; this.ui.titlebg.style.display = 'none'; }

  // ---- render --------------------------------------------------------------------
  render() {
    const ctx = this.ctx;
    const sx = this.shake > 0 ? Math.round(rand(-this.shake, this.shake)) : 0;
    const sy = this.shake > 0 ? Math.round(rand(-this.shake, this.shake)) : 0;
    const cx = Math.round(this.cam.x) + sx, cy = Math.round(this.cam.y) + sy;
    const w = this.world, T = this.t;
    w.drawParallax(ctx, cx, cy);
    w.drawBack(ctx, cx, cy);
    w.drawDecor(ctx, cx, cy, T);
    this.drawWindowBeams(ctx, cx, cy);
    if (this.door) this.door.draw(ctx, cx, cy, T);
    for (const s of this.signs) s.draw(ctx, cx, cy);
    for (const s of this.shrines) s.draw(ctx, cx, cy);
    for (const l of this.levers) l.draw(ctx, cx, cy);
    for (const g of this.gates) g.draw(ctx, cx, cy);
    for (const p of this.plates) p.draw(ctx, cx, cy, T);
    w.drawFront(ctx, cx, cy);
    w.drawDecorFront(ctx, cx, cy);
    for (const p of this.portals) p.draw(ctx, cx, cy);
    for (const b of this.blocks) b.draw(ctx, cx, cy);

    const h = this.heroine;
    if (this.wallShadow) this.drawWallShadow(ctx, cx, cy);
    if (h.state !== 'carried') h.draw(ctx, cx, cy);
    for (const s of this.shadows) {
      s.draw(ctx, cx, cy);
      if (h.carriedBy === s) {
        const opt = s.state === 'sink' ? { clipBottom: s.portal.y - cy } : null;
        drawSprite(ctx, 'heroine', h.frame(), h.x - cx, h.y - cy, h.facing < 0, opt);
      }
    }
    if (h.state === 'carried' && !h.carriedBy) h.draw(ctx, cx, cy);
    this.hero.draw(ctx, cx, cy);
    this.particles.draw(ctx, cx, cy);

    // bottomless pits fade to black
    const g = ctx.createLinearGradient(0, w.ph - 110 - cy, 0, w.ph - 20 - cy);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,1)');
    ctx.fillStyle = g; ctx.fillRect(0, w.ph - 110 - cy, VW, 200);

    this.drawLighting(ctx, cx, cy);
    this.drawPrompts(ctx, cx, cy);
    h.drawIcon(ctx, cx, cy);
    this.drawHud(ctx, cx, cy);

    if (this.state === 'gameover') {
      const k = clamp(this.stGo / 70, 0, 1);
      ctx.fillStyle = `rgba(6,0,14,${k * 0.85})`; ctx.fillRect(0, 0, VW, VH);
    }
    if (this.hero.state === 'fallout') {
      const k = this.hero.t < 20 ? this.hero.t / 20 : 1 - (this.hero.t - 20) / 20;
      ctx.fillStyle = `rgba(0,0,0,${clamp(k, 0, 1)})`; ctx.fillRect(0, 0, VW, VH);
    }
    if (this.fade > 0) { ctx.fillStyle = `rgba(255,250,236,${this.fade})`; ctx.fillRect(0, 0, VW, VH); }
    if (this.black > 0) { ctx.fillStyle = `rgba(0,0,0,${this.black})`; ctx.fillRect(0, 0, VW, VH); }
    if (this.state === 'clear') { ctx.fillStyle = '#fffaec'; ctx.fillRect(0, 0, VW, VH); }
    this.drawBubbles(cx, cy);
  }

  drawWindowBeams(ctx, cx, cy) {
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = 'rgba(70,90,160,0.07)';
    for (const d of this.world.decor) {
      if (d.type !== 'window') continue;
      const x = d.x - cx, y = d.y - cy;
      if (x < -120 || x > VW + 40) continue;
      ctx.beginPath();
      ctx.moveTo(x + 6, y + 16); ctx.lineTo(x + 26, y + 16);
      ctx.lineTo(x + 86, y + 150); ctx.lineTo(x + 40, y + 150);
      ctx.closePath(); ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';
  }

  lights() {
    const L = [];
    const T = this.t;
    for (const d of this.world.decor) {
      if (d.type === 'torch') L.push({ x: d.x + 8, y: d.y + 2, r: 62 + Math.sin(T * 0.21 + d.x) * 2 + Math.sin(T * 0.53 + d.y) * 1.5, a: 0.95, col: 'rgba(255,150,60,0.13)' });
      if (d.type === 'window') L.push({ x: d.x + 16, y: d.y + 20, r: 44, a: 0.5 });
      if (d.type === 'candle') L.push({ x: d.x + 4, y: d.y - 20, r: 96 + Math.sin(T * 0.4) * 2, a: 0.9, col: 'rgba(255,170,80,0.16)' });
    }
    const h = this.heroine, hero = this.hero;
    L.push({ x: hero.x, y: hero.y - 20, r: 58, a: 0.55 });
    const fl = hero.caneFlare();
    if (fl > 0) { const tip = hero.caneTip(); L.push({ x: tip.x, y: tip.y - 2, r: 24 + 34 * fl, a: 0.85, col: `rgba(255,150,60,${0.22 * fl})` }); }
    L.push({ x: h.x, y: h.y - 16, r: 50, a: 0.8, col: 'rgba(200,220,255,0.10)' });
    for (const p of this.plates) { const l = p.light(); if (l) L.push(l); }
    for (const s of this.shrines) { const l = s.light(); if (l) L.push(l); }
    if (this.door) L.push(this.door.light());
    return L;
  }

  drawLighting(ctx, cx, cy) {
    const lc = this.lctx;
    lc.globalCompositeOperation = 'source-over';
    lc.clearRect(0, 0, VW, VH);
    lc.fillStyle = 'rgba(5,3,14,0.64)';
    lc.fillRect(0, 0, VW, VH);
    lc.globalCompositeOperation = 'destination-out';
    const L = this.lights();
    for (const l of L) {
      const x = l.x - cx, y = l.y - cy;
      if (x < -l.r || x > VW + l.r || y < -l.r || y > VH + l.r) continue;
      const g = lc.createRadialGradient(x, y, 0, x, y, l.r);
      // banded falloff for an SFC-like look
      g.addColorStop(0, `rgba(0,0,0,${l.a})`); g.addColorStop(0.42, `rgba(0,0,0,${l.a})`);
      g.addColorStop(0.43, `rgba(0,0,0,${l.a * 0.62})`); g.addColorStop(0.7, `rgba(0,0,0,${l.a * 0.62})`);
      g.addColorStop(0.71, `rgba(0,0,0,${l.a * 0.28})`); g.addColorStop(1, 'rgba(0,0,0,0)');
      lc.fillStyle = g;
      lc.fillRect(x - l.r, y - l.r, l.r * 2, l.r * 2);
    }
    ctx.drawImage(this.light, 0, 0);
    // warm additive glow
    ctx.globalCompositeOperation = 'lighter';
    for (const l of L) {
      if (!l.col) continue;
      const x = l.x - cx, y = l.y - cy;
      if (x < -l.r || x > VW + l.r || y < -l.r || y > VH + l.r) continue;
      const g = ctx.createRadialGradient(x, y, 0, x, y, l.r * 0.8);
      g.addColorStop(0, l.col); g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g; ctx.fillRect(x - l.r, y - l.r, l.r * 2, l.r * 2);
    }
    ctx.globalCompositeOperation = 'source-over';
    // portals swallow light
    for (const p of this.portals) {
      const x = p.x - cx, y = p.y - cy - 8;
      const g = ctx.createRadialGradient(x, y, 0, x, y, 40 * p.r);
      g.addColorStop(0, 'rgba(20,0,40,0.45)'); g.addColorStop(1, 'rgba(20,0,40,0)');
      ctx.fillStyle = g; ctx.fillRect(x - 40, y - 40, 80, 80);
    }
    // danger vignette
    const k = clamp((this.dangerT - 40) / 160, 0, 1) + (this.heroine.state === 'carried' ? 0.8 : 0);
    if (k > 0) {
      const pulse = 0.75 + 0.25 * Math.sin(this.t * 0.12);
      const g = ctx.createRadialGradient(VW / 2, VH / 2, VH * 0.35, VW / 2, VH / 2, VW * 0.62);
      g.addColorStop(0, 'rgba(40,0,50,0)'); g.addColorStop(1, `rgba(40,0,50,${Math.min(0.85, k * 0.7 * pulse)})`);
      ctx.fillStyle = g; ctx.fillRect(0, 0, VW, VH);
    }
  }

  drawPrompts(ctx, cx, cy) {
    if (this.state !== 'play') return;
    const hero = this.hero, h = this.heroine;
    const bob = Math.round(Math.sin(this.t * 0.15) * 1.5);
    for (const l of this.levers) if (!l.on && l.near(hero)) drawIcon(ctx, '↑', l.x - cx, l.y - 18 - cy + bob, '#2040a0');
    // show ↓ when kneeling would help her
    if (hero.state === 'normal' && h.stuckT > 30 && this.reachPlan()) drawIcon(ctx, '↓', hero.x - cx, hero.y - hero.h - 8 - cy + bob, '#2040a0');
  }

  drawHud(ctx, cx, cy) {
    if (this.state === 'title' || this.state === 'clear' || this.state === 'ending' || this.state === 'cutscene') return;
    const h = this.heroine;
    // heart: calm / danger
    const danger = h.state === 'carried' ? 1 : clamp(this.dangerT / 210, 0, 1);
    const beat = danger > 0.3 && Math.floor(this.t / (danger > 0.8 ? 12 : 24)) % 2 === 0;
    const col = beat ? '#ffffff' : danger > 0.66 ? '#ff3050' : danger > 0.3 ? '#ff8a9a' : '#ffd0e0';
    const g = ICONS['♥'];
    const ox = 5, oy = 5;
    ctx.fillStyle = '#1a1030';
    for (let j = -1; j <= g.length; j++) for (let i = -1; i <= g[0].length; i++) {
      const on = (a, b) => g[b] && g[b][a] === '#';
      if (!on(i, j) && (on(i - 1, j) || on(i + 1, j) || on(i, j - 1) || on(i, j + 1))) ctx.fillRect(ox + i * 2, oy + j * 2, 2, 2);
    }
    ctx.fillStyle = col;
    for (let j = 0; j < g.length; j++) for (let i = 0; i < g[0].length; i++) if (g[j][i] === '#') ctx.fillRect(ox + i * 2, oy + j * 2, 2, 2);
    // off-screen arrow toward her
    const x = h.x - cx, y = h.y - 16 - cy;
    if (x < -4 || x > VW + 4 || y < -4 || y > VH + 4) {
      const ax = clamp(x, 10, VW - 10), ay = clamp(y, 22, VH - 10);
      const a = Math.atan2(y - ay, x - ax);
      ctx.fillStyle = Math.floor(this.t / 10) % 2 ? '#ffe08a' : '#ffffff';
      for (let r = 0; r < 6; r++) {
        const w2 = 6 - r;
        for (let k2 = -w2; k2 <= w2; k2++) {
          ctx.fillRect(Math.round(ax + Math.cos(a) * r - Math.sin(a) * k2 * 0.5), Math.round(ay + Math.sin(a) * r + Math.cos(a) * k2 * 0.5), 1, 1);
        }
      }
    }
  }
}

// ---------------------------------------------------------------------------
Input.init();
// offline support (skipped while debugging so edits show up immediately)
if ('serviceWorker' in navigator && location.protocol.startsWith('http') && !/debug|nosw/.test(location.search)) {
  addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}
loadSheets().then(() => {
  window.game = new Game();
  if (location.search.includes('debug')) { const s = document.createElement('script'); s.src = 'tools/debug_helper.js?' + Date.now(); document.body.appendChild(s); }
});
