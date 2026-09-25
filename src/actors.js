'use strict';
// ---------------------------------------------------------------------------
// Hero (player), Heroine (NPC), Shadow (enemy), Portal
// ---------------------------------------------------------------------------
const CARRY_SPEED = 0.55;       // walking with the weight stone in his arms
const HERO = { walk: 1.25, dash: 2.45, push: 0.55, jump: 4.75 };

class Hero extends Body {
  constructor(x, y) {
    super(x, y, 5, 38);
    this.state = 'normal'; this.t = 0;
    this.coyote = 0; this.jumpBuf = 0; this.attackCd = 0; this.takeoff = 0; this.tipHist = [];
    this.trail = [];     // recent positions (her path while they run hand in hand)
    this.held = null;    // the weight stone while he carries it
    this.animDist = 0; this.landT = 0; this.flash = 0; this.pushing = false;
    this.lastSafe = { x, y }; this.hitList = new Set();
  }
  update(game) {
    const w = game.world, I = Input;
    this.t++;
    if (this.attackCd > 0) this.attackCd--;
    if (this.flash > 0) this.flash--;
    if (this.landT > 0) this.landT--;
    if (this.takeoff > 0) this.takeoff--;
    const dir = (I.down('right') ? 1 : 0) - (I.down('left') ? 1 : 0);

    switch (this.state) {
      case 'normal': {
        this.pushing = false;
        let maxSp = I.dash() ? HERO.dash : HERO.walk;
        // push a block that we're walking into
        if (dir && this.onGround) {
          const ex = this.x + dir * this.hw, ex2 = this.x + dir * (this.hw + 1.5);
          const b = w.boxHit(Math.min(ex, ex2), this.y - this.h + 4, Math.max(ex, ex2), this.y - 1, this);
          if (b instanceof Block && b.onGround && !b.hidden) {
            this.pushing = true;
            maxSp = HERO.push;
            b.push(game, dir * HERO.push);
          }
        }
        if (dir) {
          this.facing = dir;
          const acc = this.onGround ? (sign(this.vx) === -dir ? 0.4 : 0.2) : 0.14;
          this.vx = approach(this.vx, dir * maxSp, acc);
        } else {
          this.vx = approach(this.vx, 0, this.onGround ? 0.3 : 0.06);
        }
        // jump (coyote time + buffer + variable height)
        this.coyote = this.onGround ? 6 : this.coyote - 1;
        this.jumpBuf = I.pressed('jump') ? 7 : this.jumpBuf - 1;
        if (this.jumpBuf > 0 && this.coyote > 0) {
          this.vy = -HERO.jump; this.coyote = 0; this.jumpBuf = 0; this.takeoff = 4;
          Sfx.play('jump');
        }
        if (I.released('jump') && this.vy < -1.6) this.vy *= 0.5;
        if (I.pressed('attack') && this.attackCd <= 0) {
          this.state = 'attack'; this.t = 0; this.hitList.clear(); this.tipHist = []; Sfx.play('swing');
        } else if (this.onGround && I.down('down') && !dir) {
          this.state = 'reach'; this.t = 0; this.vx = 0;
        } else if (I.pressed('up')) {
          if (!game.tryLever(this)) game.tryLift(this);
        }
        break;
      }
      case 'lift':                                // bending down, getting it up to his chest
        this.vx = 0;
        if (this.t >= 28) { this.state = 'carry'; this.t = 0; }
        break;
      case 'carry': {
        if (dir) { this.facing = dir; this.vx = approach(this.vx, dir * CARRY_SPEED, 0.08); }
        else this.vx = approach(this.vx, 0, 0.2);
        // heavy steps: a thud on every stride, and he breaks a sweat
        const stride = Math.floor(this.animDist / 11);
        if (this.onGround && stride !== this.lastStride) { this.lastStride = stride; if (Math.abs(this.vx) > 0.2) Sfx.play('push'); }
        if (this.t % 70 === 35) {
          game.particles.add({ x: this.x - this.facing * 3, y: this.y - 42, vx: -this.facing * 0.4, vy: -0.6, g: 0.12, life: 26, col: '#bfe6ff' });
        }
        if ((I.pressed('up') || I.pressed('down')) && this.onGround) game.tryPutDown(this);
        break;
      }
      case 'putdown':
        this.vx = 0;
        if (this.t >= 22) game.finishPutDown(this);
        break;
      case 'attack':
        if (this.onGround) this.vx = approach(this.vx, 0, 0.12);
        this.tipHist.push(this.caneTip());
        if (this.tipHist.length > 5) this.tipHist.shift();
        if (this.t >= 4 && this.t <= 12 && this.t % 2 === 0) {
          const tip = this.caneTip();
          game.particles.add({ x: tip.x, y: tip.y - 2, vx: rand(-0.6, 0.6), vy: rand(-1.4, -0.4), life: rand(12, 22),
            col: Math.random() < 0.5 ? '#ffb040' : '#fff2b0' });
        }
        if (this.t >= 4 && this.t <= 10) game.attackHit(this, this.attackBox());
        if (this.t >= 18) { this.state = 'normal'; this.attackCd = 4; }
        break;
      case 'reach':
        this.vx = 0;
        if (dir) this.facing = dir;               // turn while kneeling
        if (!I.down('down')) this.state = 'normal';
        break;
      case 'catchwait':                           // heroine is in the air towards us
        this.vx = 0;
        if (game.heroine.state !== 'leap') this.state = 'normal';
        break;
      case 'catch':
        this.vx = 0;
        if (this.t >= 34) this.state = 'normal';
        break;
      case 'pull':
        this.vx = 0;
        if (this.t >= 42) this.state = 'normal';
        break;
      case 'hurt':
        this.vx = approach(this.vx, 0, 0.06);
        if (this.t >= 26 && this.onGround) this.state = 'normal';
        break;
      case 'fallout':
        this.vx = 0; this.vy = 0;
        if (this.t === 22) game.pendingFall = true;   // screen is black: back to the last lantern
        return;
      case 'scripted':
        break;
    }
    const prevGround = this.onGround;
    this.physics(w);
    if (this.onGround) {
      this.animDist += Math.abs(this.vx);
      if (!prevGround && this.landedSpeed > 3.2) { this.landT = 8; Sfx.play('land'); }
      if (this.state === 'normal' && w.pointSolid(this.x - this.hw - 3, this.y + 2) && w.pointSolid(this.x + this.hw + 3, this.y + 2)) {
        this.lastSafe = { x: this.x, y: this.y };
      }
    }
    if (this.y > w.ph + 48 && this.state !== 'fallout') {
      this.state = 'fallout'; this.t = 0; Sfx.play('fall');
    }
    this.trail.push({ x: this.x, y: this.y });
    if (this.trail.length > 20) this.trail.shift();
  }

  setState(s) { this.state = s; this.t = 0; }

  knock(dir) {
    if (['hurt', 'fallout', 'catch', 'catchwait', 'pull', 'scripted'].includes(this.state)) return;
    if (this.held) game.dropHeld(this);
    this.state = 'hurt'; this.t = 0; this.vx = dir * 2.3; this.vy = -2.4; this.flash = 30;
    Sfx.play('hit');
  }

  attackBox() {
    const f = this.facing;
    return { x0: this.x + (f > 0 ? 0 : -31), x1: this.x + (f > 0 ? 31 : 0), y0: this.y - 38, y1: this.y - 2 };
  }

  frame() {
    const s = this.state, t = this.t;
    if (s === 'scripted' && this.pose) return this.pose;
    if (s === 'hurt') return 'jump13';
    if (s === 'fallout') return 'jump11';
    if (s === 'reach' || s === 'catchwait') return 'jump1';
    if (s === 'catch') return t < 20 ? 'jump2' : 'jump17';
    if (s === 'pull') return t < 22 ? 'jump1' : t < 32 ? 'jump16' : 'jump18';
    if (s === 'attack') return this.attackFrame();
    if (s === 'lift') return 'lift' + Math.min(6, Math.floor(this.t / 4));
    if (s === 'putdown') return 'lift' + Math.max(0, 6 - Math.floor(this.t / 3.4));
    if (s === 'carry') return Math.abs(this.vx) > 0.1 ? 'carry' + (Math.floor(this.animDist / 3.3) % 7) : 'lift6';
    if (s === 'scripted' && this.front) return 'front';
    if (!this.onGround) {
      if (this.vy < -2.6) return this.takeoff > 0 ? 'jump5' : 'jump6';
      if (this.vy < -0.8) return 'jump7';
      if (this.vy < 0.9) return 'jump8';
      if (this.vy < 2.6) return 'jump10';
      return 'jump11';
    }
    if (this.landT > 0) return this.landT > 4 ? 'jump13' : 'jump15';
    if (this.pushing) return 'run' + (3 + Math.floor(this.animDist / 2.2) % 12);
    const sp = Math.abs(this.vx);
    if (sp > 1.7) return 'run' + (3 + Math.floor(this.animDist / 5.2) % 12);
    if (sp > 0.12) return 'walk' + (Math.floor(this.animDist / 2.5) % 15);
    const idle = [20, 21, 22, 23, 24, 23, 22, 21];
    return 'jump' + idle[Math.floor(this.t / 14) % 8];
  }

  draw(ctx, cx, cy) {
    if (this.state === 'fallout') return;
    if (this.flash > 0 && this.state !== 'hurt' && (this.flash >> 2) % 2) return;
    const x = this.x - cx, y = this.y - cy;
    const white = this.state === 'hurt' && this.t < 6;
    drawSprite(ctx, 'hero', this.frame(), x, y, this.facing < 0, white ? { white: true } : null);
    if (this.state === 'attack') this.drawCane(ctx, cx, cy);
    if (this.held) { const p = this.heldPos(); drawTile(ctx, 'block', Math.round(p.x - 8 - cx), Math.round(p.y - 16 - cy)); }
  }

  // where the stone he holds is drawn (bottom centre), following the painted box
  heldPos() {
    const f = this.frame(), o = Sheets.hero.box[f] || [7, -26];
    let x = this.x + this.facing * (o[0] + 3), y = this.y + o[1] + 8;
    if (this.state === 'lift' && this.t < 8) {            // slides from where it lay into his hands
      const k = this.t / 8, b = this.held;
      x = lerp(b.x, x, k); y = lerp(b.y, y, k);
    }
    return { x, y };
  }

  // the lamplighter's pole (灯竿): the swing is painted into the attack frames;
  // the old ember at its tip and its trail are drawn here
  attackFrame() {
    const t = this.t;
    return t < 2 ? 'atk0' : t < 3 ? 'atk8' : t < 4 ? 'atk10' : t < 5 ? 'atk12' : t < 6 ? 'atk13'
      : t < 8 ? 'atk15' : t < 10 ? 'atk38' : t < 14 ? 'atk40' : t < 16 ? 'atk45' : 'atk50';
  }
  caneTip() {
    const o = Sheets.hero.tip[this.attackFrame()] || [16, -24];
    return { x: this.x + o[0] * this.facing, y: this.y + o[1] };
  }
  // how strongly the old ember at its tip burns (0..1); it flares during the swing
  caneFlare() {
    if (this.state !== 'attack') return 0;
    const t = this.t;
    return t < 3 ? 0.35 : t <= 10 ? 1 : Math.max(0.25, 1 - (t - 10) / 8);
  }

  drawCane(ctx, cx, cy) {
    const t = this.t;
    // trail of fire along the path the tip has just swept
    const h = this.tipHist;
    for (let j = h.length - 1; j > 0; j--) {
      const k = (h.length - j) / h.length;
      ctx.globalAlpha = 0.9 * (1 - k);
      pxLine(ctx, h[j].x - cx, h[j].y - cy - 1, h[j - 1].x - cx, h[j - 1].y - cy - 1, k < 0.35 ? '#fff2b0' : k < 0.7 ? '#ffb040' : '#e0602a');
    }
    ctx.globalAlpha = 1;
    // the ember (flames always rise, whatever the pole's angle)
    const tip = this.caneTip();
    const px = Math.round(tip.x - cx), py = Math.round(tip.y - cy), fl = this.caneFlare(), w = t % 6 < 3 ? 0 : 1;
    const fh = fl > 0.6 ? 5 : 3;
    ctx.fillStyle = '#e0602a'; ctx.fillRect(px - 1, py - fh + 1, 3, fh - 1);
    ctx.fillStyle = '#ffb040'; ctx.fillRect(px - 1 + w, py - fh, 2, fh - 1);
    ctx.fillStyle = '#fff4c0'; ctx.fillRect(px, py - fh + 2, 1, Math.max(1, fh - 3));
  }
}

// ---------------------------------------------------------------------------
// Cutscene characters (queen Noctia, sister Marta): front-facing, they only
// breathe; `lit` makes the lantern they carry glow.
class Npc {
  constructor(name, x, y, opt = {}) {
    this.name = name; this.x = x; this.y = y; this.t = 0;
    this.lit = opt.lit !== undefined ? opt.lit : name === 'marta';
    this.alpha = opt.alpha !== undefined ? opt.alpha : 1;
  }
  update() { this.t++; }
  lampPos() {
    const o = Sheets.npc.lamp[this.name] || [0, -20];
    return { x: this.x + o[0], y: this.y + o[1] };
  }
  light() {
    if (!this.lit) return null;
    const p = this.lampPos();
    return { x: p.x, y: p.y, r: 40 + Math.sin(this.t * 0.3) * 1.5, a: 0.85 * this.alpha, col: 'rgba(255,170,80,0.14)' };
  }
  draw(ctx, cx, cy) {
    if (this.alpha <= 0) return;
    const x = this.x - cx, y = this.y - cy;
    drawSprite(ctx, 'npc', this.name + (Math.floor(this.t / 45) % 2), x, y, false, this.alpha < 1 ? { alpha: this.alpha } : null);
    if (this.lit) {
      const p = this.lampPos(), f = Math.floor(this.t / 7) % 3;
      ctx.globalAlpha = this.alpha;
      ctx.fillStyle = '#ffb040'; ctx.fillRect(Math.round(p.x - cx), Math.round(p.y - cy) - (f === 1 ? 1 : 0), 2, 2);
      ctx.fillStyle = '#fff4c0'; ctx.fillRect(Math.round(p.x - cx) + (f === 2 ? 1 : 0), Math.round(p.y - cy), 1, 1);
      ctx.globalAlpha = 1;
    }
  }
}

// ---------------------------------------------------------------------------
class Heroine extends Body {
  constructor(x, y) {
    super(x, y, 5, 30);
    this.mode = 'follow'; this.state = 'normal'; this.t = 0;
    this.animDist = 0; this.anim = 'idle'; this.icon = null; this.iconT = 0;
    this.carriedBy = null; this.stuckT = 0; this.flash = 0;
  }
  setState(s) { this.state = s; this.t = 0; }
  grabbable() { return (this.state === 'normal' || this.state === 'down' || this.state === 'getup') && this.onGround; }
  emote(ch, dur = 60) { this.icon = ch; this.iconT = dur; }

  // Look at the terrain in front of her and decide how to proceed.
  probe(world, dir) {
    const fx = this.x + dir * (this.hw + 2);
    const y = this.y;
    const S = (px, py) => world.pointSolid(px, py, this);
    if (S(fx, y - 3) || S(fx, y - 14) || S(fx, y - 26)) {
      // a single step (<= 1 tile) with head room: hop onto it
      let top = null;
      for (let k = 1; k <= 18; k++) if (!S(fx, y - k)) { top = k; break; }
      if (top !== null && !S(fx, y - top - 16) && !S(fx, y - top - 29) && !S(this.x, y - 44)) return 'hop';
      return 'blocked';
    }
    if (!S(fx, y + 2) && !S(fx - dir * 3, y + 2)) {
      // how far down is the floor?
      let depth = null;
      for (let k = 2; k <= 76; k += 2) if (S(fx + dir * 2, y + k)) { depth = k; break; }
      if (depth !== null && depth <= 18) return 'clear';           // small step down
      // a narrow ditch with a landing at the same height?
      for (let d = 6; d <= 24; d += 3) {
        const lx = fx + dir * d;
        if (S(lx, y + 2) && S(lx + dir * 4, y + 2) && !S(lx, y - 4) && !S(lx, y - 26)) return 'hopgap';
      }
      if (depth !== null && depth <= 70) return 'drop';
      return 'edge';
    }
    return 'clear';
  }

  update(game) {
    this.t++;
    if (this.iconT > 0) this.iconT--;
    if (this.flash > 0) this.flash--;
    const w = game.world, hero = game.hero;
    switch (this.state) {
      case 'normal': this.updateNormal(game); break;
      case 'hop':
        this.vx = this.hopVx;             // keep pushing forward even after brushing a wall
        this.physics(w);
        if (this.onGround && this.t > 2) { this.state = 'normal'; this.vx *= 0.3; }
        break;
      case 'leap': {
        const L = this.leap;
        L.t++;
        const k = Math.min(L.t / L.T, 1);
        this.x = lerp(L.x0, L.tx, k);
        this.y = L.y0 + L.vy0 * L.t + 0.5 * GRAV * L.t * L.t;
        if (L.t >= L.T) {
          this.x = L.tx; this.y = L.ty;
          this.setState('caught'); hero.setState('catch');
          Sfx.play('catch'); this.emote('♥', 50);
          game.particles.burst(this.x, this.y - 18, 8, { col: '#ffe6a0', life: 24, max: 1 });
        }
        break;
      }
      case 'caught':
        this.x = hero.x + hero.facing * 7; this.y = hero.y - 3; this.facing = -hero.facing;
        if (this.t >= 30) {
          const spots = [hero.x - hero.facing * 14, hero.x - hero.facing * 6, hero.x];
          let px = hero.x;
          for (const sx of spots) {
            if (!w.boxHit(sx - this.hw, hero.y - this.h, sx + this.hw, hero.y, this) && w.pointSolid(sx, hero.y + 2, this)) { px = sx; break; }
          }
          this.x = px; this.y = hero.y; this.vx = 0; this.vy = 0;
          this.facing = hero.facing; this.mode = 'follow'; this.setState('normal');
          this.checkGround(w);
        }
        break;
      case 'pulled': {
        const P = this.pull; P.t++;
        if (P.t <= 26) {
          const k = P.t / 26, e = 1 - (1 - k) * (1 - k);
          this.x = lerp(P.x0, P.ex, Math.min(1, k * 1.5));
          this.y = lerp(P.y0, P.ty - 2, e);
        } else {
          const k = Math.min(1, (P.t - 26) / 14);
          this.x = lerp(P.ex, P.fx, k); this.y = P.ty;
          this.animDist += 1;
        }
        if (P.t >= 40) {
          this.x = P.fx; this.y = P.ty; this.vy = 0; this.vx = 0;
          this.mode = 'follow'; this.setState('normal'); this.checkGround(w);
        }
        break;
      }
      case 'carried': {
        const s = this.carriedBy;
        if (!s) { this.setState('down'); break; }
        const off = Sheets.shadow.carry[s.frame()] || [0, -34];
        this.x = s.x + off[0] * s.facing; this.y = s.y + off[1] + (s.sinkOffset || 0);
        this.facing = s.facing;
        if (this.t % 50 === 1) game.say(this, ['たすけて！', 'いやっ…！', 'はなして！'][Math.floor(this.t / 50) % 3], 'cry', 45);
        break;
      }
      case 'down':
        this.physics(w);
        this.vx = approach(this.vx, 0, 0.05);
        if (this.onGround && (this.t > 70 || (this.t > 18 && Math.abs(hero.x - this.x) < 26 && Math.abs(hero.y - this.y) < 20))) this.setState('getup');
        break;
      case 'getup':
        this.physics(w);
        if (this.t > 18) { this.setState('normal'); this.mode = 'follow'; }
        break;
      case 'scripted':
        this.physics(w);
        break;
      case 'hand': {
        // running hand in hand: she follows the path Grey took a few frames ago
        const tr = hero.trail, p = tr[Math.max(0, tr.length - 11)];
        if (p) {
          const px = this.x, py = this.y;
          if (Math.abs(p.x - hero.x) > 9 || Math.abs(p.y - hero.y) > 2) { this.x = p.x; this.y = p.y; }
          else this.x = approach(this.x, hero.x - hero.facing * 10, 1.5);
          this.vx = this.x - px; this.vy = this.y - py;
          if (Math.abs(this.vx) > 0.05) this.facing = sign(this.vx);
          this.onGround = w.pointSolid(this.x, this.y + 2, this);
          if (this.onGround) this.animDist += Math.abs(this.vx);
        }
        return;
      }
    }
    if (this.y > w.ph + 48) {           // safety: never lose her in a pit
      this.x = hero.lastSafe.x; this.y = hero.lastSafe.y; this.vx = this.vy = 0; this.setState('normal');
    }
  }

  updateNormal(game) {
    const w = game.world, hero = game.hero;
    this.anim = 'idle';
    if (!this.onGround) { this.physics(w); this.anim = 'fall'; return; }
    const heroNear = Math.abs(hero.x - this.x) < 30 && Math.abs(hero.y - this.y) < 24;
    const threat = game.nearestShadow(this, 64);
    if (threat && !heroNear) {
      this.vx = approach(this.vx, 0, 0.3); this.anim = 'cower';
      if (this.iconT <= 0) this.emote('!', 40);
      this.physics(w);
      return;
    }
    if (this.mode === 'wait') {
      // told to wait next to a stone plate (or heading for one to open a gate): step onto it
      const p = this.plateGoal || game.plateNear(this, 30);
      const pd = p ? sign(p.x - this.x) : 0;
      const res = p && Math.abs(p.x - this.x) > 1.5 ? this.probe(w, pd) : null;
      if (res === 'clear') {
        this.vx = approach(this.vx, pd * 0.9, 0.1);
        this.facing = pd;
        if (Math.abs(p.x - this.x) < 3) this.vx = (p.x - this.x) * 0.5;
      } else if (this.plateGoal && (res === 'hop' || res === 'hopgap')) {
        this.vy = res === 'hop' ? -3.9 : -3.1; this.hopVx = pd * (res === 'hop' ? 1.0 : 1.6);
        this.setState('hop'); Sfx.play('hop');
        return;
      } else {
        if (this.plateGoal && res === null) this.plateGoal = null;       // arrived
        if (res && res !== 'clear') this.plateGoal = null;               // can't get there
        this.vx = approach(this.vx, 0, 0.2);
        this.facing = sign(hero.x - this.x) || this.facing;
        this.anim = game.dangerT > 60 ? 'anx' : 'wait';
      }
      this.physics(w);
      if (this.onGround) this.animDist += Math.abs(this.vx);
      return;
    }
    const dx = hero.x - this.x, dy = hero.y - this.y, adx = Math.abs(dx);
    let want = 0;
    if (adx > 20 || (Math.abs(dy) > 20 && adx > 3)) want = sign(dx);
    if (hero.state === 'reach' || hero.state === 'catchwait' || hero.state === 'pull') {
      if (dy < -12) want = adx > 10 ? sign(dx) : 0;   // hero is above: get right under his hand
    }
    if (want) {
      const res = this.probe(w, want);
      const speed = adx > 72 || Math.abs(dy) > 60 ? 2.0 : 1.05;
      this.facing = want;
      switch (res) {
        case 'clear': this.vx = approach(this.vx, want * speed, 0.12); this.stuckT = 0; break;
        case 'hop': this.vy = -3.9; this.hopVx = want * 1.0; this.setState('hop'); Sfx.play('hop'); break;
        case 'hopgap': this.vy = -3.1; this.hopVx = want * 1.6; this.setState('hop'); Sfx.play('hop'); break;
        case 'drop':
          if (dy > 12) { this.vy = -1.8; this.hopVx = want * 0.9; this.setState('hop'); Sfx.play('hop'); }
          else { this.vx = 0; this.anim = 'anx'; this.stuckT++; }
          break;
        default: // edge / blocked: wait for the hero's help
          this.vx = 0; this.anim = 'anx'; this.stuckT++;
          // a closed gate with its plate on her side: she goes to hold it open herself
          if (res === 'blocked' && this.stuckT === 40) {
            const p = game.plateForGate(this, want);
            if (p) {
              this.plateGoal = p; this.mode = 'wait';
              game.say(this, 'わたしが 石板に乗って 開けるね！', 'her', 100);
              break;
            }
          }
          if (this.stuckT === 50) this.emote('?', 70);
          if (this.stuckT === 60 && (hero.state === 'normal')) game.say(this, dy < -12 ? 'のぼれない…' : 'こわくて跳べない…', 'her', 70);
          if (this.stuckT > 400) this.stuckT = 40;
      }
      if (hero.state === 'reach' && res !== 'clear' && dy < -12) this.anim = 'reachup';
    } else {
      this.stuckT = 0;
      const p = game.plateNear(this, 14);          // idle beside a plate: stand on it
      if (p && Math.abs(p.x - this.x) > 1.5) this.vx = approach(this.vx, sign(p.x - this.x) * 0.6, 0.1);
      else { this.vx = approach(this.vx, 0, 0.15); if (adx > 2) this.facing = sign(dx); }
    }
    if (this.state === 'normal') this.physics(w);
    if (this.onGround) this.animDist += Math.abs(this.vx);
  }

  frame() {
    const t = this.t;
    switch (this.state) {
      case 'hop': return this.vy < 0 ? 'jump' : 'fall';
      case 'leap': return 'leap';
      case 'caught': return t < 16 ? 'jump' : 'joy';
      case 'pulled': return this.pull.t < 26 ? 'climb' : 'walk' + (Math.floor(this.animDist / 3) % 8);
      case 'carried': return 'carried' + (Math.floor(t / 9) % 2);
      case 'down': return 'down';
      case 'getup': return 'sit';
      case 'scripted': return this.scriptFrame || 'idle0';
      case 'hand':
        if (!this.onGround) return this.vy < 0 ? 'jump' : 'fall';
        if (Math.abs(this.vx) > 1.3) return 'run' + (Math.floor(this.animDist / 5) % 6);
        if (Math.abs(this.vx) > 0.1) return 'walk' + (Math.floor(this.animDist / 2.8) % 8);
        return 'anx' + (Math.floor(t / 24) % 2);
    }
    switch (this.anim) {
      case 'fall': return this.vy < 0 ? 'jump' : 'fall';
      case 'cower': return 'cower' + (Math.floor(t / 5) % 2);
      case 'wait': return 'wait' + (Math.floor(t / 40) % 2);
      case 'anx': return 'anx' + (Math.floor(t / 24) % 2);
      case 'reachup': return 'reachup' + (Math.floor(t / 16) % 2);
    }
    const sp = Math.abs(this.vx);
    if (sp > 1.3) return 'run' + (Math.floor(this.animDist / 5) % 6);
    if (sp > 0.1) return 'walk' + (Math.floor(this.animDist / 2.8) % 8);
    return 'idle' + (Math.floor(t / 40) % 2);
  }

  draw(ctx, cx, cy) {
    const x = this.x - cx, y = this.y - cy;
    drawSprite(ctx, 'heroine', this.frame(), x, y, this.facing < 0, this.flash > 0 && (this.flash >> 1) % 2 ? { white: true } : null);
  }
  drawIcon(ctx, cx, cy) {
    if (this.iconT > 0 && this.state !== 'carried') {
      const bob = Math.round(Math.sin(this.t * 0.2));
      drawIcon(ctx, this.icon, this.x - cx, this.y - this.h - 6 - cy + bob, this.icon === '♥' ? '#e0406a' : this.icon === '!' ? '#d02030' : '#303060');
    }
  }
}

// ---------------------------------------------------------------------------
class Portal {
  constructor(x, y) { this.x = x; this.y = y; this.r = 0; this.t = 0; this.users = 0; this.dead = false; this.closing = false; }
  update(game) {
    this.t++;
    if (this.closing) { this.r = Math.max(0, this.r - 0.03); if (this.r <= 0) this.dead = true; }
    else this.r = Math.min(1, this.r + 0.04);
    if (this.t % 3 === 0 && this.r > 0.3) {
      game.particles.add({ x: this.x + rand(-14, 14) * this.r, y: this.y - 1, vy: rand(-0.8, -0.3), vx: rand(-0.1, 0.1), life: rand(20, 40), col: Math.random() < 0.5 ? '#2a1640' : '#6a3aa0', size: 1 + (Math.random() < 0.3 ? 1 : 0) });
    }
  }
  draw(ctx, cx, cy) {
    if (this.r <= 0) return;
    const x = Math.round(this.x - cx), y = Math.round(this.y - cy);
    const rw = 18 * this.r, rh = 4 * this.r;
    // pixel ellipse rings
    const rings = [[1, '#1a0c2c'], [0.8, '#3a1c5c'], [0.62, '#0a0410'], [0.4, '#000']];
    for (const [k, col] of rings) {
      ctx.fillStyle = col;
      const a = rw * k, b = Math.max(1, rh * k);
      for (let j = -Math.ceil(b); j <= Math.ceil(b); j++) {
        const hw = Math.round(a * Math.sqrt(Math.max(0, 1 - (j * j) / (b * b))));
        ctx.fillRect(x - hw, y + j, hw * 2, 1);
      }
    }
    // swirling sparks
    ctx.fillStyle = '#b070ff';
    for (let i = 0; i < 6; i++) {
      const a = this.t * 0.08 + i * 1.047;
      ctx.fillRect(Math.round(x + Math.cos(a) * rw * 0.75), Math.round(y + Math.sin(a) * rh * 0.75), 1, 1);
    }
  }
}

// ---------------------------------------------------------------------------
class Shadow extends Body {
  constructor(portal) {
    super(portal.x, portal.y, 7, 40);
    this.portal = portal; portal.users++;
    this.state = 'emerge'; this.t = 0; this.hp = 3; this.flash = 0; this.alive = true;
    this.swipeCd = 90; this.animT = 0; this.sinkOffset = 0; this.wave = null;
  }
  setState(s) { this.state = s; this.t = 0; }
  isThreat() { return this.alive && this.state !== 'die' && this.state !== 'emerge'; }

  update(game) {
    this.t++; this.animT++;
    if (this.flash > 0) this.flash--;
    if (this.swipeCd > 0) this.swipeCd--;
    const w = game.world, h = game.heroine, hero = game.hero;
    // smoky wisps
    if (this.state !== 'die' && this.t % 4 === 0) {
      game.particles.add({ x: this.x + rand(-8, 8), y: this.y - rand(10, 40) + this.sinkOffset, vx: rand(-0.2, 0.2), vy: rand(-0.6, -0.2), life: 26, col: Math.random() < 0.6 ? '#140a20' : '#3a2058', size: 2, shrink: true });
    }
    switch (this.state) {
      case 'emerge':
        this.facing = sign(h.x - this.x) || 1;
        if (this.t >= 50) this.setState('seek');
        return;
      case 'seek': {
        const target = h.grabbable() && !h.carriedBy ? h : hero;
        const dx = target.x - this.x;
        this.facing = sign(dx) || this.facing;
        // swat the hero away if he stands in the way
        const hdx = hero.x - this.x;
        const inWay = target === hero || sign(hdx) === sign(dx);
        if (this.swipeCd <= 0 && inWay && Math.abs(hdx) < 24 && Math.abs(hero.y - this.y) < 28 && hero.state !== 'hurt' && hero.state !== 'fallout') {
          this.facing = sign(hdx) || this.facing;
          this.setState('swipe'); this.vx = 0;
          break;
        }
        if (target === h && Math.abs(dx) < 15 && Math.abs(h.y - this.y) < 18) {
          this.setState('grab'); this.vx = 0;
          break;
        }
        this.walk(game, this.facing, 0.7);
        break;
      }
      case 'grab':
        this.vx = 0;
        if (this.t === 12) {
          if (h.grabbable() && !h.carriedBy && Math.abs(h.x - this.x) < 20 && Math.abs(h.y - this.y) < 20) {
            h.carriedBy = this; h.setState('carried'); h.mode = 'follow';
            this.setState('carry');
            Sfx.play('grab'); game.stats.grabs++;
            if (!game.flags.grabHint) { game.flags.grabHint = true; game.notify('hint_grab', 240); }
          }
        }
        if (this.t > 20 && this.state === 'grab') this.setState('seek');
        break;
      case 'carry': {
        const dx = this.portal.x - this.x;
        this.facing = sign(dx) || this.facing;
        if (Math.abs(dx) < 2) { this.x = this.portal.x; this.setState('sink'); this.vx = 0; break; }
        this.walk(game, this.facing, 0.42);
        break;
      }
      case 'sink':
        this.vx = 0;
        this.sinkOffset = this.t * 0.42;
        if (this.t >= 115) game.gameOver();
        return;
      case 'swipe':
        this.vx = 0;
        if (this.t === 13) {
          const hdx = hero.x - this.x;
          if (Math.abs(hdx) < 30 && sign(hdx) === this.facing && Math.abs(hero.y - this.y) < 30) hero.knock(this.facing);
          Sfx.play('swing');
        }
        if (this.t >= 30) { this.swipeCd = 150; this.setState('seek'); }
        break;
      case 'hurt':
        this.vx = approach(this.vx, 0, 0.12);
        if (this.t >= 30) this.setState('seek');
        break;
      case 'die':
        this.vx = 0;
        if (this.t % 2 === 0) {
          for (let i = 0; i < 3; i++) game.particles.add({ x: this.x + rand(-10, 10), y: this.y - rand(0, 42), vx: rand(-0.5, 0.5), vy: rand(-1.4, -0.4), life: rand(20, 40), col: ['#140a20', '#3a2058', '#8050c0', '#e0d0ff'][i + (Math.random() < 0.3 ? 1 : 0)], size: 2, shrink: true });
        }
        if (this.t >= 36) { this.alive = false; this.portal.users--; }
        return;
    }
    this.physics(w);
  }

  walk(game, dir, speed) {
    const w = game.world;
    const fx = this.x + dir * (this.hw + 2);
    // stop at chasms deeper than 5 tiles
    if (!w.pointSolid(fx, this.y + 2, this)) {
      let ok = false;
      for (let k = 4; k <= 80; k += 4) if (w.pointSolid(fx, this.y + k, this)) { ok = true; break; }
      if (!ok) { this.vx = 0; return; }
    }
    this.vx = approach(this.vx, dir * speed, 0.05);
    if (this.onGround && (w.pointSolid(fx, this.y - 4, this) || w.pointSolid(fx, this.y - 20, this)) && !w.pointSolid(fx, this.y - 36, this)) {
      this.vy = -4.4;
    }
  }

  hit(game, dir) {
    if (!['seek', 'grab', 'carry', 'sink', 'swipe', 'hurt'].includes(this.state) && !(this.state === 'emerge' && this.t > 20)) return false;
    const h = game.heroine;
    if (h.carriedBy === this) {
      h.carriedBy = null; h.setState('down');
      h.x = this.x; h.y = this.portal && this.state === 'sink' ? this.portal.y : this.y;
      h.vx = -dir * 0.6; h.vy = -2.2; h.flash = 20;
      game.say(h, 'きゃっ…！', 'her', 40);
      Sfx.play('drop');
    }
    this.sinkOffset = 0;
    this.hp--; this.flash = 10;
    this.vx = dir * 2.6; this.vy = -1.4;
    game.particles.burst(this.x, this.y - 24, 10, { col: '#e8d8ff', life: 16, max: 2 });
    if (this.hp <= 0) {
      this.setState('die'); Sfx.play('kill'); game.stats.kills++;
      // the shadow comes apart into motes of light that drift back to Lumina
      for (let i = 0; i < 14; i++) {
        game.particles.add({ x: this.x + rand(-8, 8), y: this.y - rand(8, 40), vx: rand(-1.2, 1.2), vy: rand(-1.6, -0.2),
          life: 140, delay: 18 + i, home: h, col: i % 3 ? '#ffe9a8' : '#ffffff', size: 1 + (i % 4 === 0 ? 1 : 0), fade: false });
      }
    }
    else { this.setState('hurt'); Sfx.play('hit'); }
    return true;
  }

  frame() {
    switch (this.state) {
      case 'grab': return 'reach' + (this.t < 8 ? 0 : 1);
      case 'swipe': return this.t < 12 ? 'reach0' : 'reach1';
      case 'carry': case 'sink': return 'carry' + (Math.floor(this.animT / 10) % 4);
      case 'hurt': return 'hurt';
      case 'die': return 'hurt';
      case 'emerge': return 'walk0';
    }
    return 'walk' + (Math.floor(this.animT / 9) % 4);
  }

  draw(ctx, cx, cy) {
    const x = this.x - cx, y = this.y - cy;
    const opt = {};
    if (this.state === 'emerge') {
      const k = Math.min(1, this.t / 40);
      opt.clipBottom = this.portal.y - cy;
      drawSprite(ctx, 'shadow', 'walk0', x, y + (1 - k) * 58, this.facing < 0, opt);
      return;
    }
    if (this.state === 'sink') opt.clipBottom = this.portal.y - cy;
    if (this.state === 'die') opt.alpha = 1 - this.t / 36;
    if (this.flash > 0 && (this.flash >> 1) % 2) opt.white = true;
    drawSprite(ctx, 'shadow', this.frame(), x, y + this.sinkOffset, this.facing < 0, opt);
  }
}
