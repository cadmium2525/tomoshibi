'use strict';
// ---------------------------------------------------------------------------
// Stage gimmicks: gate, pressure plate, lever, push block, shrine, door, sign
// ---------------------------------------------------------------------------
class Gate {
  constructor(e) {
    this.id = e.id; this.gx = e.x - 8; this.gy = e.y - 16;   // top-left of the 16x48 slot
    this.tile = e.wood ? 'woodgate' : 'gate';
    this.open = 0; this.locked = false; this.plates = []; this.moving = 0;
  }
  solidBox() {
    if (this.open > 0.97) return null;
    return { x0: this.gx + 2, x1: this.gx + 14, y0: this.gy - 48 * this.open, y1: this.gy + 48 * (1 - this.open) };
  }
  update(game) {
    const want = this.locked || this.plates.some((p) => p.pressed);
    let n = this.open;
    if (want) n = Math.min(1, n + 1 / 36);
    else n = Math.max(0, n - 1 / 7);               // portcullis slams down
    const mv = sign(n - this.open);
    if (mv && mv !== this.moving) Sfx.play('gate');
    if (mv < 0 && n === 0) { game.shake = 3; Sfx.play('block'); }
    else if (mv && game.t % 6 === 0) game.shake = Math.max(game.shake, 1);
    this.moving = mv;
    this.open = n;
    // anyone standing in the doorway is shoved out to the side they came from
    if (mv < 0) {
      const bars = this.solidBox();
      const cx = this.gx + 8;
      for (const a of game.solidsForGate()) {
        const b = a.box();
        if (bars && overlap(bars, b)) a.x = a.x < cx ? bars.x0 - a.hw - 0.05 : bars.x1 + a.hw + 0.05;
      }
    }
  }
  draw(ctx, cx, cy) {
    const x = this.gx - cx, y = this.gy - cy;
    ctx.save();
    ctx.beginPath(); ctx.rect(x, y - 2, 16, 50); ctx.clip();
    drawTile(ctx, this.tile, x, y - Math.round(48 * this.open));
    ctx.restore();
  }
}

class Plate {
  constructor(e) { this.id = e.id; this.x = e.x; this.y = e.y; this.gateIds = e.gates; this.pressed = false; this.heroOn = false; }
  update(game) {
    const h = game.heroine;
    let p = false;
    if (h.onGround && ['normal', 'getup', 'down'].includes(h.state) && Math.abs(h.x - this.x) <= 11 && Math.abs(h.y - this.y) <= 2) p = true;
    for (const b of game.blocks) if (!b.hidden && !b.carried && b.onGround && Math.abs(b.x - this.x) <= 10 && Math.abs(b.y - this.y) <= 2) p = true;
    if (p !== this.pressed) Sfx.play(p ? 'plate' : 'plateoff');
    this.pressed = p;
    const hero = game.hero;
    const on = hero.onGround && Math.abs(hero.x - this.x) <= 10 && Math.abs(hero.y - this.y) <= 2;
    if (on && !this.heroOn && !p && !game.flags.plateHint) { game.flags.plateHint = true; game.notify('plate_hero', 200); }
    this.heroOn = on;
  }
  draw(ctx, cx, cy, t) {
    drawTile(ctx, this.pressed ? 'plate_on' : 'plate_off', this.x - 12 - cx, this.y - 5 - cy + (this.pressed ? 1 : 0));
  }
  light() { return this.pressed ? { x: this.x, y: this.y - 4, r: 34, a: 0.7, col: 'rgba(90,220,240,0.14)' } : null; }
}

class Lever {
  constructor(e) { this.id = e.id; this.x = e.x; this.y = e.y; this.gateIds = e.gates; this.on = false; }
  near(hero) { return Math.abs(hero.x - this.x) < 14 && Math.abs(hero.y - this.y) < 10; }
  pull(game) {
    if (this.on) return;
    this.on = true; Sfx.play('lever'); game.shake = 3;
    for (const g of game.gates) if (this.gateIds.includes(g.id)) g.locked = true;
    let bridge = false;
    for (const b of game.bridges) if (this.gateIds.includes(b.id)) { b.locked = true; bridge = true; }
    game.say(game.hero, bridge ? 'よし、橋が架かった。' : 'よし、これで門は開いたままだ。', 'hero', 90);
  }
  draw(ctx, cx, cy) { drawTile(ctx, this.on ? 'lever_on' : 'lever_off', this.x - 8 - cx, this.y - 16 - cy); }
}

class Block extends Body {
  constructor(e) {
    super(e.x, e.y, 8, 16); this.id = e.id; this.sndT = 0;
    this.home = { x: e.x, y: e.y }; this.hidden = false; this.resetT = 0;
  }
  solidBox() { return this.hidden || this.carried ? null : this.box(); }
  update(game) {
    if (this.sndT > 0) this.sndT--;
    if (this.carried) return;
    if (this.hidden) {
      // reform at home once nobody stands there
      if (--this.resetT <= 0) {
        const b = this.box(this.home.x, this.home.y);
        const busy = [game.hero, game.heroine, ...game.shadows].some((a) => overlap(b, a.box()));
        if (busy) { this.resetT = 10; return; }
        this.x = this.home.x; this.y = this.home.y; this.vy = 0; this.hidden = false;
        game.particles.burst(this.x, this.y - 8, 14, { col: '#c8f0ff', life: 26, max: 1.2 });
        Sfx.play('save');
      }
      return;
    }
    this.vx = 0;
    this.physics(game.world, 6);
    // lost down a pit: it crumbles away and reforms where it first stood
    // (pushed into a corner is fine now: it can always be lifted out again)
    const w = game.world;
    if (this.y > w.ph + 16) {
      this.hidden = true; this.resetT = 70;
      Sfx.play('block');
      game.say(game.hero, '石が落ちてしまった…元の場所に戻ったようだ。', 'hero', 90);
    }
  }
  push(game, dx) {
    const w = game.world, h = game.heroine;
    const nx = this.x + dx;
    const b = this.box(nx, this.y);
    if (w.boxHit(b.x0, b.y0, b.x1, b.y1, this)) return 0;
    if (h.state !== 'carried' && overlap(b, h.box())) return 0;
    for (const s of game.shadows) if (s.alive && overlap(b, s.box())) return 0;
    this.x = nx;
    if (this.sndT <= 0) { Sfx.play('push'); this.sndT = 14; }
    if (game.t % 4 === 0) game.particles.add({ x: this.x - sign(dx) * 8, y: this.y - 1, vy: -0.3, vx: -sign(dx) * 0.3, life: 14, col: '#6a6270' });
    return dx;
  }
  draw(ctx, cx, cy) { if (!this.hidden && !this.carried) drawTile(ctx, 'block', this.x - 8 - cx, this.y - 16 - cy); }
}

class Shrine {
  constructor(e) { this.id = e.id; this.x = e.x; this.y = e.y; this.lit = false; }
  update(game) {
    if (this.lit) return;
    const hero = game.hero, h = game.heroine;
    // her light kindles the lantern when she walks past it (with the hero close by)
    if (Math.abs(h.x - this.x) < 20 && Math.abs(h.y - this.y) < 12 && h.state === 'normal' && Math.abs(hero.x - this.x) < 110 && Math.abs(hero.y - this.y) < 60) {
      this.lit = true;
      game.saveCheckpoint(this);
      Sfx.play('save');
      game.notify('<span class="name">灯籠に灯がともった。</span> ここから再開できる。', 150, true);
      game.particles.burst(this.x, this.y - 14, 16, { col: '#a0f0ff', life: 30, max: 1.2, up: 0.5 });
    }
  }
  draw(ctx, cx, cy) { drawTile(ctx, this.lit ? 'shrine_on' : 'shrine_off', this.x - 8 - cx, this.y - 28 - cy); }
  light() { return this.lit ? { x: this.x, y: this.y - 12, r: 46, a: 0.8, col: 'rgba(120,230,255,0.12)' } : null; }
}

// A fragment of shadow-play (shard) or a page of the lamplighter's notebook.
class Collectible {
  constructor(e) { this.kind = e.type; this.id = e.id; this.x = e.x; this.y = e.y - 10; this.t = Math.random() * 100; }
  box() { return { x0: this.x - 6, x1: this.x + 6, y0: this.y - 7, y1: this.y + 7 }; }
  update(game) {
    this.t++;
    if (overlap(this.box(), game.hero.box())) game.collect(this);
  }
  draw(ctx, cx, cy) {
    const x = Math.round(this.x - cx), y = Math.round(this.y - cy + Math.sin(this.t * 0.08) * 1.5);
    if (this.kind === 'shard') {
      // a little shadow-puppet rabbit, with a violet shimmer
      const g = ICONS.rabbit, ox = x - 3, oy = y - 4;
      for (let j = 0; j < g.length; j++) for (let i = 0; i < g[j].length; i++) {
        if (g[j][i] !== '#') continue;
        ctx.fillStyle = '#b890ff'; ctx.fillRect(ox + i - 1, oy + j, 3, 1); ctx.fillRect(ox + i, oy + j - 1, 1, 3);
      }
      ctx.fillStyle = '#1c1030';
      for (let j = 0; j < g.length; j++) for (let i = 0; i < g[j].length; i++) if (g[j][i] === '#') ctx.fillRect(ox + i, oy + j, 1, 1);
      if (Math.floor(this.t / 6) % 8 === 0) { ctx.fillStyle = '#e0c8ff'; ctx.fillRect(x + 3, y - 4, 1, 1); }
    } else {
      ctx.fillStyle = '#5a4020'; ctx.fillRect(x - 4, y - 5, 9, 11);
      ctx.fillStyle = '#efe3c4'; ctx.fillRect(x - 3, y - 5, 8, 10);
      ctx.fillStyle = '#9a8060'; for (let i = 0; i < 4; i++) ctx.fillRect(x - 2, y - 3 + i * 2, 5 - (i === 3 ? 2 : 0), 1);
    }
  }
  light() {
    return this.kind === 'shard'
      ? { x: this.x, y: this.y, r: 18, a: 0.6, col: 'rgba(170,120,255,0.12)' }
      : { x: this.x, y: this.y, r: 20, a: 0.6, col: 'rgba(255,220,150,0.12)' };
  }
}

class Sign {
  constructor(e) { this.x = e.x; this.y = e.y; this.text = e.text; this.hidden = !!e.hidden; }
  near(hero) { return Math.abs(hero.x - this.x) < (this.hidden ? 40 : 18) && Math.abs(hero.y - this.y) < 26; }
  draw(ctx, cx, cy) { if (!this.hidden) drawTile(ctx, 'sign', this.x - 7 - cx, this.y - 16 - cy); }
}

class Door {
  constructor(e) { this.x = e.x; this.y = e.y; this.open = 0; this.opening = false; this.t = 0; }
  update(game) {
    if (this.opening) { this.open = Math.min(1, this.open + 1 / 110); this.t++; if (this.t % 8 === 0) game.shake = Math.max(game.shake, 1); }
  }
  draw(ctx, cx, cy, t) {
    const x = Math.round(this.x - cx), y = Math.round(this.y - cy);
    drawTile(ctx, 'door_frame', x - 32, y - 72);
    // a way back into the dark (the cathedral's back door, seen from outside)
    if (this.dark) {
      ctx.fillStyle = '#07050c'; ctx.fillRect(x - 22, y - 50, 44, 50);
      ctx.fillStyle = '#120e1c'; ctx.fillRect(x - 22, y - 50, 44, 3);
      return;
    }
    // light spilling from behind
    if (this.open > 0) {
      const k = this.open;
      ctx.fillStyle = `rgba(255,244,210,${0.35 + 0.65 * k})`;
      ctx.fillRect(x - 22, y - 50, 44, 50);
      ctx.fillStyle = `rgba(255,255,255,${k})`;
      ctx.fillRect(x - 16, y - 46, 32, 46);
    }
    ctx.save();
    ctx.beginPath(); ctx.rect(x - 22, y - 50, 44, 50); ctx.clip();
    drawTile(ctx, 'door', x - 22, y - 50 - Math.round(50 * this.open));
    ctx.restore();
    // pulsing crest glow while sealed
    if (!this.opening) {
      ctx.globalAlpha = 0.3 + 0.2 * Math.sin(t * 0.05);
      ctx.fillStyle = '#80e0ff';
      ctx.fillRect(x - 1, y - 36, 2, 16); ctx.fillRect(x - 8, y - 29, 16, 2);
      ctx.globalAlpha = 1;
    }
  }
  light() { return { x: this.x, y: this.y - 26, r: 50 + 90 * this.open, a: 0.6 + 0.4 * this.open, col: `rgba(255,236,190,${0.08 + 0.25 * this.open})` }; }
}

class Ambush {
  constructor(e) { this.id = e.id; this.x0 = e.x0 * TILE; this.x1 = (e.x1 + 1) * TILE; this.y = e.y; this.waves = e.waves; this.wave = -1; this.done = false; this.delay = 0; }
  update(game) {
    if (this.done) return;
    const hero = game.hero;
    if (this.wave < 0) {
      if (hero.x >= this.x0 && hero.x <= this.x1 && Math.abs(hero.y - this.y) < 64) this.spawnWave(game, 0);
      return;
    }
    const alive = game.shadows.some((s) => s.alive && s.wave === this);
    if (!alive) {
      if (this.wave + 1 >= this.waves.length) { this.done = true; game.onAmbushDone(this); return; }
      if (++this.delay > 70) this.spawnWave(game, this.wave + 1);
    }
  }
  spawnWave(game, i) {
    this.wave = i; this.delay = 0;
    for (const p of this.waves[i]) {
      const s = game.spawnShadow(p.tx * TILE + 8, (p.ty + 1) * TILE);
      s.wave = this;
    }
    game.say(game.heroine, 'いやっ…影が…！', 'cry', 70);
    game.heroine.emote('!', 50);
  }
}

// ---------------------------------------------------------------------------
// Old plank: gives way a moment after Grey stands on it (Lumina is too light
// to break it), and is back a few seconds later.
class Crumble {
  constructor(e) { this.x = e.x - 8; this.y = e.y; this.state = 'ok'; this.t = 0; this.drop = 0; }
  solidBox() { return this.state === 'gone' || this.state === 'fall' ? null : { x0: this.x, x1: this.x + 16, y0: this.y, y1: this.y + 6 }; }
  update(game) {
    this.t++;
    const hero = game.hero;
    const on = hero.onGround && Math.abs(hero.y - this.y) < 1 && hero.x + hero.hw > this.x && hero.x - hero.hw < this.x + 16;
    if (this.state === 'ok' && on) {
      this.state = 'shake'; this.t = 0; Sfx.play('push');
      if (!game.flags.bridgeMsg) { game.flags.bridgeMsg = true; game.notify('bridge_crumble', 160); }
    } else if (this.state === 'shake' && this.t >= 10) {
      this.state = 'fall'; this.t = 0; this.drop = 0; Sfx.play('block');
      for (let i = 0; i < 5; i++) game.particles.add({ x: this.x + rand(0, 16), y: this.y + 3, vx: rand(-0.4, 0.4), vy: rand(0, 1), g: 0.15, life: 30, col: '#6a4a30', size: 2 });
    } else if (this.state === 'fall') {
      this.drop += 0.3 + this.t * 0.25;
      if (this.t > 40) { this.state = 'gone'; this.t = 0; }
    } else if (this.state === 'gone' && this.t > 200) {
      const b = { x0: this.x, x1: this.x + 16, y0: this.y - 30, y1: this.y + 6 };
      if (![hero, game.heroine].some((a) => overlap(b, a.box()))) { this.state = 'ok'; this.t = 0; }
    }
  }
  draw(ctx, cx, cy) {
    if (this.state === 'gone') return;
    const sx = this.state === 'shake' ? (this.t % 4 < 2 ? -1 : 1) : 0;
    const x = Math.round(this.x - cx + sx), y = Math.round(this.y - cy + (this.state === 'fall' ? this.drop : 0));
    if (this.state === 'fall') ctx.globalAlpha = Math.max(0, 1 - this.t / 40);
    ctx.fillStyle = '#2a1a10'; ctx.fillRect(x, y, 16, 6);
    ctx.fillStyle = '#7a5434'; ctx.fillRect(x + 1, y, 14, 4);
    ctx.fillStyle = '#9a7048'; ctx.fillRect(x + 1, y, 14, 1);
    ctx.fillStyle = '#4a3020'; ctx.fillRect(x + 7, y + 1, 1, 3); ctx.fillRect(x + 3, y + 2, 2, 1);
    ctx.globalAlpha = 1;
  }
}

// Bridge of light: solid while any of its plates is pressed.
class LightBridge {
  constructor(e) {
    this.id = e.id; this.x = e.x - 8; this.y = e.y; this.w = e.w * TILE; this.plates = []; this.k = 0; this.on = false;
    this.log = !!e.log; this.locked = false;
  }
  solidBox() { return this.k > 0.6 ? { x0: this.x, x1: this.x + this.w, y0: this.y, y1: this.y + 6 } : null; }
  update(game) {
    const want = this.locked || this.plates.some((p) => p.pressed);
    if (want !== this.on) { this.on = want; Sfx.play(want ? (this.log ? 'block' : 'save') : 'plateoff'); if (this.log) game.shake = 3; }
    this.k = want ? Math.min(1, this.k + 0.06) : Math.max(0, this.k - 0.08);
  }
  draw(ctx, cx, cy, t) {
    const x = Math.round(this.x - cx), y = Math.round(this.y - cy);
    if (this.log) {             // logs drop into place one after another
      const n = Math.floor(this.w / 16);
      for (let i = 0; i < n; i++) {
        const k = clamp(this.k * (n + 2) - i, 0, 1);
        if (k <= 0) continue;
        drawTile(ctx, 'log', x + i * 16, y - Math.round((1 - k) * 40));
      }
      return;
    }
    // faint dotted outline where the bridge will appear
    ctx.fillStyle = 'rgba(120,230,255,0.25)';
    for (let i = 0; i < this.w; i += 4) ctx.fillRect(x + i, y + 2, 2, 1);
    if (this.k <= 0) return;
    const n = Math.floor(this.w / 16);
    for (let i = 0; i < n; i++) {
      // planks light up one after another from both ends
      const d = Math.min(i, n - 1 - i) / (n / 2);
      const a = clamp(this.k * 1.6 - d * 0.6, 0, 1);
      if (a <= 0) continue;
      ctx.globalAlpha = a;
      ctx.fillStyle = '#5ad0f0'; ctx.fillRect(x + i * 16 + 1, y, 14, 5);
      ctx.fillStyle = '#c8f6ff'; ctx.fillRect(x + i * 16 + 1, y, 14, 1);
      ctx.fillStyle = '#ffffff'; ctx.fillRect(x + i * 16 + 3 + ((t >> 3) + i * 5) % 10, y + 1, 2, 1);
    }
    ctx.globalAlpha = 1;
  }
  light() { return this.k > 0 && !this.log ? { x: this.x + this.w / 2, y: this.y, r: 30 + this.w * 0.45 * this.k, a: 0.7 * this.k, col: `rgba(90,220,240,${0.12 * this.k})` } : null; }
}

// Rock that drops from the ceiling during the escape and then lies in the way.
class Rock {
  constructor(e) { this.x = e.x; this.floor = e.y; this.y = e.y; this.state = 'wait'; this.t = 0; this.top = 0; }
  solidBox() { return this.state === 'down' ? { x0: this.x - 8, x1: this.x + 8, y0: this.y - 16, y1: this.y } : null; }
  update(game) {
    this.t++;
    const hero = game.hero;
    if (this.state === 'wait') {
      if (game.escape && hero.x > this.x - 120) {
        this.state = 'warn'; this.t = 0;
        let k = 1; while (k < 12 && !game.world.pointSolid(this.x, this.floor - 16 * k - 1)) k++;
        this.top = this.floor - 16 * k;
      }
    } else if (this.state === 'warn') {
      if (this.t % 3 === 0) game.particles.add({ x: this.x + rand(-7, 7), y: this.top + 1, vy: rand(0.5, 1.5), g: 0.1, life: 30, col: '#8a8070' });
      if (this.t >= 40) { this.state = 'fall'; this.t = 0; this.y = this.top + 16; this.vy = 0; }
    } else if (this.state === 'fall') {
      this.vy = Math.min(7, this.vy + 0.4); this.y += this.vy;
      const b = { x0: this.x - 7, x1: this.x + 7, y0: this.y - 15, y1: this.y };
      if (overlap(b, hero.box())) hero.knock(hero.x < this.x ? -1 : 1);
      if (this.y >= this.floor) {
        this.y = this.floor; this.state = 'down'; game.shake = 4; Sfx.play('block');
        game.particles.burst(this.x, this.y - 4, 10, { col: '#8a8070', life: 24, max: 1.4 });
        // never bury anyone inside it
        for (const a of [hero, game.heroine]) if (overlap(this.solidBox(), a.box())) a.x = a.x < this.x ? this.x - 8 - a.hw - 0.1 : this.x + 8 + a.hw + 0.1;
      }
    }
  }
  draw(ctx, cx, cy) {
    if (this.state === 'fall' || this.state === 'down') drawTile(ctx, 'block', this.x - 8 - cx, this.y - 16 - cy);
  }
}

// The cave-in chasing them: a wall of falling rubble that moves right.
class Collapse {
  constructor(x, floorY) { this.x = x; this.y = floorY; this.t = 0; this.speed = 0; }
  update(game) {
    this.t++;
    const hero = game.hero;
    // eases in, then keeps a steady pace a little slower than a dash
    this.speed = Math.min(2.15, this.speed + 0.02);
    const gap = hero.x - this.x;
    this.x += this.speed + (gap > 230 ? 1.2 : 0);           // never falls hopelessly behind
    if (this.t % 12 === 0) game.shake = Math.max(game.shake, 2);
    if (this.t % 30 === 0) Sfx.play('block');
    if (this.t % 2 === 0) {
      game.particles.add({ x: this.x + rand(-30, 4), y: game.cam.y - 4, vx: rand(-0.3, 0.3), vy: rand(1, 3), g: 0.25, life: 70, col: Math.random() < 0.5 ? '#6a6270' : '#4a4450', size: 2 + (Math.random() < 0.3 ? 1 : 0) });
    }
  }
  caught(a) { return a.x - a.hw < this.x - 2; }
  draw(ctx, cx, cy) {
    const x = Math.round(this.x - cx);
    if (x < -40) return;
    const g = ctx.createLinearGradient(x - 60, 0, x + 6, 0);
    g.addColorStop(0, 'rgba(6,4,12,1)'); g.addColorStop(0.8, 'rgba(20,16,26,0.95)'); g.addColorStop(1, 'rgba(40,34,48,0)');
    ctx.fillStyle = g; ctx.fillRect(Math.min(0, x - 60), 0, Math.max(0, x + 6 - Math.min(0, x - 60)), VH);
    // tumbling boulders along the front
    for (let i = 0; i < 7; i++) {
      const bx = x - 10 + Math.sin(this.t * 0.07 + i * 1.7) * 6;
      const by = ((this.t * (3 + i % 3) + i * 37) % (VH + 40)) - 20;
      ctx.fillStyle = i % 2 ? '#3a3440' : '#57505e';
      ctx.fillRect(Math.round(bx), Math.round(by), 6 + (i % 3) * 2, 5 + (i % 2) * 2);
    }
  }
}

// ---------------------------------------------------------------------------
// 道標石 and its shadow. Lumina's light throws the stone's shadow away from her;
// the shadow is a ledge at the stone's head height that only Grey can stand on.
// The nearer she stands, the longer it reaches. The stone itself stands in the
// background (anyone walks past it).
class Marker {
  constructor(e) {
    this.id = e.id; this.x = e.x; this.y = e.y; this.top = e.y - 30;
    this.len = 0; this.dir = 1; this.want = 0;
  }
  solidBox(self) {
    if (!(self instanceof Hero) || this.len < 6 || self.y > this.top + 0.5) return null;
    const x0 = this.dir > 0 ? this.x + 4 : this.x - 4 - this.len;
    return { x0, x1: x0 + this.len, y0: this.top, y1: this.top + 5 };
  }
  update(game) {
    const h = game.heroine;
    const dx = this.x - h.x, d = Math.abs(dx);
    const lit = ['normal', 'getup', 'hand', 'hop', 'scripted'].includes(h.state) && h.state !== 'carried' &&
      Math.abs(h.y - this.y) < 40 && d > 6 && d < 150;
    // the nearer the light, the longer the shadow (up to 8 tiles)
    this.want = lit ? clamp((150 - d) * 1.05, 0, 128) : 0;
    // a shadow stops where it meets rock
    if (this.want > 0) {
      const w = game.world, dir0 = sign(dx) || this.dir;
      for (let s = 0; s < this.want; s += 4) {
        const px = this.x + dir0 * (4 + s);
        if (w.boxHit(px - 0.5, this.top + 1, px + 0.5, this.top + 4)) { this.want = s; break; }
      }
    }
    const dir = sign(dx) || this.dir;
    if (lit && dir !== this.dir) { this.dir = dir; this.len = 0; }
    this.len = this.want > this.len ? Math.min(this.want, this.len + 4) : Math.max(this.want, this.len - 5);
  }
  drawStone(ctx, cx, cy) { drawTile(ctx, 'marker', Math.round(this.x - 8 - cx), Math.round(this.y - 32 - cy)); }
  drawShadow(ctx, cx, cy, t) {
    if (this.len < 2) return;
    const x0 = Math.round((this.dir > 0 ? this.x + 4 : this.x - 4 - this.len) - cx), y = Math.round(this.top - cy);
    const w = Math.round(this.len);
    ctx.fillStyle = 'rgba(34,18,62,0.95)'; ctx.fillRect(x0, y, w, 6);
    ctx.fillStyle = '#6a58b8'; ctx.fillRect(x0, y + 1, w, 1);
    ctx.fillStyle = '#b8a8ff'; ctx.fillRect(x0, y, w, 1);
    // a faint shimmer runs along it
    const sx = x0 + ((t * 2) % Math.max(1, w));
    ctx.fillStyle = '#e8e0ff'; ctx.fillRect(sx, y, 3, 1);
    // the far end frays like smoke
    const tip = this.dir > 0 ? x0 + w : x0;
    for (let i = 0; i < 4; i++) {
      ctx.fillStyle = `rgba(26,14,48,${0.6 - i * 0.14})`;
      ctx.fillRect(tip + this.dir * (i * 2) - (this.dir > 0 ? 0 : 2), y + 1 + ((t >> 3) + i) % 3, 2, 3);
    }
  }
}

// A wall of morning fog on the hill: it will not let anyone through until sunrise.
class Mist {
  constructor(e) { this.x = e.x; this.y = e.y; this.k = 1; this.t = 0; }
  solidBox() { return this.k > 0.5 ? { x0: this.x - 12, x1: this.x + 12, y0: this.y - 200, y1: this.y } : null; }
  update(game) { this.t++; if (game.dawnDone) this.k = Math.max(0, this.k - 0.01); }
  draw(ctx, cx, cy) {
    if (this.k <= 0) return;
    for (let i = 0; i < 24; i++) {
      const x = this.x - cx + Math.sin(this.t * 0.02 + i * 1.3) * 18 + ((i * 7) % 3 - 1) * 10, y = this.y - cy - (i % 12) * 12 - 6;
      const g = ctx.createRadialGradient(x, y, 0, x, y, 26);
      g.addColorStop(0, `rgba(210,206,230,${0.5 * this.k})`); g.addColorStop(1, 'rgba(210,206,230,0)');
      ctx.fillStyle = g; ctx.fillRect(x - 26, y - 26, 52, 52);
    }
  }
}

// The end of a chapter out of doors: a lookout where the two stop and watch.
class Lookout {
  constructor(e) { this.x = e.x; this.y = e.y; this.open = 1; }
  draw() {}
  light() { return { x: this.x, y: this.y - 30, r: 90, a: 0.6, col: 'rgba(255,210,160,0.12)' }; }
}
