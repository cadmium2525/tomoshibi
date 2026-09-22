'use strict';
// ---------------------------------------------------------------------------
// Stage gimmicks: gate, pressure plate, lever, push block, shrine, door, sign
// ---------------------------------------------------------------------------
class Gate {
  constructor(e) {
    this.id = e.id; this.gx = e.x - 8; this.gy = e.y - 16;   // top-left of the 16x48 slot
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
    drawTile(ctx, 'gate', x, y - Math.round(48 * this.open));
    ctx.restore();
  }
}

class Plate {
  constructor(e) { this.id = e.id; this.x = e.x; this.y = e.y; this.gateIds = e.gates; this.pressed = false; this.heroOn = false; }
  update(game) {
    const h = game.heroine;
    let p = false;
    if (h.onGround && ['normal', 'getup', 'down'].includes(h.state) && Math.abs(h.x - this.x) <= 11 && Math.abs(h.y - this.y) <= 2) p = true;
    for (const b of game.blocks) if (!b.hidden && b.onGround && Math.abs(b.x - this.x) <= 10 && Math.abs(b.y - this.y) <= 2) p = true;
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
    game.say(game.hero, 'よし、これで門は開いたままだ。', 'hero', 90);
  }
  draw(ctx, cx, cy) { drawTile(ctx, this.on ? 'lever_on' : 'lever_off', this.x - 8 - cx, this.y - 16 - cy); }
}

class Block extends Body {
  constructor(e) {
    super(e.x, e.y, 8, 16); this.id = e.id; this.sndT = 0;
    this.home = { x: e.x, y: e.y }; this.hidden = false; this.resetT = 0;
  }
  solidBox() { return this.hidden ? null : this.box(); }
  update(game) {
    if (this.sndT > 0) this.sndT--;
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
    // jammed against a wall it could never be pushed back from: crumble and reform at home
    const w = game.world;
    if (this.onGround && (this.x !== this.home.x || this.y !== this.home.y) &&
        (w.boxHitTiles(this.x - 9, this.y - 14, this.x - 8, this.y - 2) || w.boxHitTiles(this.x + 8, this.y - 14, this.x + 9, this.y - 2))) {
      this.hidden = true; this.resetT = 70;
      for (let i = 0; i < 18; i++) game.particles.add({ x: this.x + rand(-8, 8), y: this.y - rand(0, 16), vx: rand(-0.6, 0.6), vy: rand(-1.6, -0.2), g: 0.12, life: rand(20, 36), col: i % 2 ? '#8a8070' : '#5a5448', size: 2 });
      Sfx.play('block');
      game.say(game.hero, '石が崩れた…元の場所に戻ったようだ。', 'hero', 90);
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
  draw(ctx, cx, cy) { if (!this.hidden) drawTile(ctx, 'block', this.x - 8 - cx, this.y - 16 - cy); }
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
