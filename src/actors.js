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
    if (this.dropT > 0) this.dropT--;
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
        } else if (this.onGround && I.down('down') && !dir && game.onPole(this)) {
          this.dropT = 10;                          // ↓ on a pole: let go and drop through it
        } else if (this.onGround && I.down('down') && !dir) {
          this.state = 'reach'; this.t = 0; this.vx = 0;
        } else if (I.pressed('up')) {
          if (!game.tryLever(this) && !game.tryLift(this)) game.tryHood(this);
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
    this.hooded = false;        // chapter 3: Grey's coat hides her light
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
        const off = s.carryOff ? s.carryOff() : Sheets.shadow.carry[s.frame()] || [0, -34];
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
    if (this.y > w.ph + 48) {
      // she fell into the abyss (e.g. the planks gave way under her): that is losing her
      if (game.state === 'play') game.gameOver('fall');
      else { this.x = hero.lastSafe.x; this.y = hero.lastSafe.y; this.vx = this.vy = 0; this.setState('normal'); }
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
      const p = this.plateGoal || game.pedestalOrPlate(this, 44);
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
      const speed = (adx > 72 || Math.abs(dy) > 60 ? 2.0 : 1.05) * (this.hooded ? 0.75 : 1);
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
    if (this.hooded && this.state !== 'carried') {
      // Grey's coat over her head and shoulders; a little light leaks out at the hem
      drawSprite(ctx, 'heroine', this.frame(), x, y, this.facing < 0, { cloak: true, clipBottom: y - 7, alpha: 0.94 });
      if ((this.t >> 3) % 3 === 0) { ctx.fillStyle = '#ffe9a8'; ctx.fillRect(Math.round(x) - 1, Math.round(y) - 8, 2, 1); }
    }
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
    this.swipeCd = 90; this.animT = 0; this.sinkOffset = 0; this.wave = null; this.dodgeCd = 0;
  }
  setState(s) { this.state = s; this.t = 0; }
  isThreat() { return this.alive && this.state !== 'die' && this.state !== 'emerge'; }

  update(game) {
    this.t++; this.animT++;
    if (this.flash > 0) this.flash--;
    if (this.swipeCd > 0) this.swipeCd--;
    if (this.dodgeCd > 0) this.dodgeCd--;
    const w = game.world, h = game.heroine, hero = game.hero;
    // Grey's swing: now and then it slips back out of reach, and comes straight back at him
    if (this.state === 'seek' && hero.state === 'attack' && hero.t === 2 && this.dodgeCd <= 0) {
      const dx = this.x - hero.x;
      if (sign(dx) === hero.facing && Math.abs(dx) < 40 && Math.abs(hero.y - this.y) < 30 && Math.random() < game.dodgeChance()
        && w.pointSolid(this.x + hero.facing * 26, this.y + 4, this)) {
        this.setState('dodge'); this.vx = hero.facing * 2.4; this.vy = -2.2; this.dodgeCd = 150; this.facing = -hero.facing;
        Sfx.play('swing');
      }
    }
    // smoky wisps
    if (this.state !== 'die' && this.t % 4 === 0) {
      game.particles.add({ x: this.x + rand(-8, 8), y: this.y - rand(10, 40) + this.sinkOffset, vx: rand(-0.2, 0.2), vy: rand(-0.6, -0.2), life: 26, col: Math.random() < 0.6 ? '#140a20' : '#3a2058', size: 2, shrink: true });
    }
    // a shadow left far behind (another floor, cut off) fades back into the dark after a while
    if (this.state === 'seek' && !this.wave) {
      this.lostT = Math.hypot(h.x - this.x, h.y - this.y) > 300 ? (this.lostT || 0) + 1 : 0;
      if (this.lostT > 300) { this.setState('die'); return; }
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
      case 'dodge':
        this.vx = approach(this.vx, 0, 0.1);
        if (this.t % 2 === 0) game.particles.add({ x: this.x + rand(-6, 6), y: this.y - rand(4, 40), vx: -this.vx * 0.3, vy: rand(-0.3, 0.3), life: 18, col: '#3a2058', size: 2, shrink: true });
        if (this.t >= 22 && this.onGround) { this.swipeCd = 0; this.setState('seek'); }
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
    if (!['seek', 'grab', 'carry', 'sink', 'swipe', 'hurt', 'fly', 'dive', 'flee'].includes(this.state) && !(this.state === 'emerge' && this.t > 20)) return false;
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
      case 'dodge': return 'reach0';
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

// ---------------------------------------------------------------------------
// A shadow with wings: swoops down on Lumina from the sky, flies off low with
// her, then lands and sinks into a pool of dark like the others do.
// Hitting it at any point frees her; knocked down, it walks like the rest.
class FlyShadow extends Shadow {
  constructor(x, y) {
    super({ x, y, users: 0 });
    this.state = 'fly'; this.hp = 2; this.swipeCd = 9999;
  }
  groundBelow(w) {
    for (let k = 0; k < 240; k += 2) if (w.pointSolid(this.x, this.y + k)) return Math.floor((this.y + k) / TILE) * TILE;
    return null;
  }
  update(game) {
    if (!['fly', 'dive', 'flee'].includes(this.state)) { super.update(game); return; }
    this.t++; this.animT++;
    if (this.flash > 0) this.flash--;
    const h = game.heroine, hero = game.hero, w = game.world;
    if (this.t % 4 === 0) game.particles.add({ x: this.x + rand(-8, 8), y: this.y - rand(10, 40), vx: rand(-0.2, 0.2), vy: rand(-0.6, -0.2), life: 26, col: Math.random() < 0.6 ? '#140a20' : '#3a2058', size: 2, shrink: true });
    if (this.state === 'fly') {
      // circle above her, then drop on her
      const tx = h.x + Math.sin(this.t * 0.03) * 30, ty = h.y - 70 + Math.sin(this.t * 0.07) * 6;
      this.x += clamp(tx - this.x, -1.4, 1.4); this.y += clamp(ty - this.y, -1.2, 1.2);
      this.facing = sign(h.x - this.x) || this.facing;
      if (this.t > 70 && Math.abs(this.x - h.x) < 14 && h.grabbable() && !h.carriedBy) { this.setState('dive'); Sfx.play('swing'); }
    } else if (this.state === 'dive') {
      this.x += clamp(h.x - this.x, -1, 1);
      this.y += 2.8;
      if (Math.abs(h.x - this.x) < 14 && Math.abs(h.y - this.y) < 16 && h.grabbable() && !h.carriedBy) {
        h.carriedBy = this; h.setState('carried'); h.mode = 'follow';
        this.setState('flee'); Sfx.play('grab'); game.stats.grabs++;
        if (!game.flags.grabHint) { game.flags.grabHint = true; game.notify('hint_grab', 240); }
      } else if (this.y > h.y + 6 || this.groundBelow(w) - this.y < 2) { this.setState('fly'); this.t = 40; }
    } else {
      // flee low, away from Grey, then land and sink
      const dir = sign(this.x - hero.x) || this.facing;
      this.facing = dir;
      const g = this.groundBelow(w);
      const nx = this.x + dir * 0.8;
      if (!w.boxHit(nx - 7, this.y - 40, nx + 7, this.y - 1)) this.x = nx;
      if (g !== null) this.y += clamp(g - 28 - this.y, -1, 1);
      if (this.t > 110 && g !== null) {
        this.y = g;
        const p = new Portal(this.x, g);
        game.portals.push(p);
        this.portal = p; p.users++;
        this.setState('sink');
      }
    }
  }
  frame() {
    if (this.state === 'flee') return 'carry' + (Math.floor(this.animT / 10) % 4);
    if (this.state === 'fly' || this.state === 'dive') return 'walk' + (Math.floor(this.animT / 9) % 4);
    return super.frame();
  }
  draw(ctx, cx, cy) {
    if (['fly', 'dive', 'flee'].includes(this.state)) {
      // ragged wings of smoke
      const x = Math.round(this.x - cx), y = Math.round(this.y - cy) - 40, f = Math.sin(this.animT * 0.3);
      for (const s of [-1, 1]) {
        for (let i = 0; i < 26; i++) {
          const wy = y - Math.round(f * (i * 0.7)) - Math.round(i * 0.25), hgt = 12 - Math.floor(i / 2.6);
          ctx.fillStyle = '#7a58c0'; ctx.fillRect(x + s * (4 + i), wy - 1, 1, 1);          // lit upper edge
          ctx.fillStyle = '#1a0c2c'; ctx.fillRect(x + s * (4 + i), wy, 1, Math.max(1, hgt));
        }
      }
    }
    super.draw(ctx, cx, cy);
  }
}

// ---------------------------------------------------------------------------
// 消灯番: town guard. Patrols (or stands watch), sees Lumina's light inside a
// cone in front of him, and takes her away if he catches her. Grey does not
// fight people: his pole only shoves a guard back and dazes him for a moment.
class Guard extends Body {
  constructor(e) {
    super(e.x, e.y, 6, 44);
    this.home = { x: e.x, y: e.y };
    this.x0 = e.x0 !== undefined ? e.x0 * TILE + 8 : null; this.x1 = e.x1 !== undefined ? e.x1 * TILE + 8 : null;
    this.facing = e.dir || -1; this.baseFacing = this.facing;
    this.turnEvery = e.turn || 0;           // a stationary guard who looks the other way now and then
    this.state = 'patrol'; this.t = 0; this.animDist = 0; this.unseen = 0; this.lamp = null; this.range = e.range || 112;
    this.id = e.id;
  }
  setState(s) { this.state = s; this.t = 0; }
  eye() { return { x: this.x + this.facing * 4, y: this.y - 40 }; }
  // does he see her right now?
  sees(game) {
    const h = game.heroine, w = game.world;
    if (h.state === 'carried' || game.inSanctuary(h.x)) return false;
    const e = this.eye(), dx = h.x - this.x, dy = (h.y - 18) - e.y;
    if (h.hooded) {
      // under the coat: only noticed walking right into his face (never in a nook)
      if (game.inNook(h)) return false;
      // (slipping past behind him and walking on the way he looks is fine)
      const closing = (Math.abs(h.vx) > 0.05 && sign(h.vx) === -this.facing) || (Math.abs(this.vx) > 0.05 && sign(this.vx) === this.facing);
      return Math.abs(dx) < 16 && dx * this.facing > 0 && closing && Math.abs(h.y - this.y) < 20;
    }
    if (dx * this.facing < 2 || Math.abs(dx) > this.range) return false;
    if (Math.abs(dy) > Math.abs(dx) * 0.55 + 22) return false;                  // outside the cone
    const n = Math.ceil(Math.hypot(dx, dy) / 6);
    for (let i = 1; i < n; i++) {
      const px = e.x + (h.x - e.x) * i / n, py = e.y + (h.y - 18 - e.y) * i / n;
      if (w.tileAt(px, py)) return false;
      for (const g of game.gates) { const b = g.solidBox(); if (b && px > b.x0 && px < b.x1 && py > b.y0 && py < b.y1) return false; }
    }
    return true;
  }
  walkTo(game, tx, speed) {
    const dx = tx - this.x;
    if (Math.abs(dx) < 2) { this.vx = 0; return true; }
    this.facing = sign(dx);
    // never set foot in a sanctuary (the sanatorium)
    if (game.inSanctuary(this.x + this.facing * (this.hw + 4))) { this.vx = 0; return true; }
    const w = game.world, fx = this.x + this.facing * (this.hw + 2);
    // guards keep to the ground: no leaps into pits, one-tile steps are fine
    if (!w.pointSolid(fx, this.y + 2) && !w.pointSolid(fx, this.y + 18)) { this.vx = 0; return true; }
    this.vx = approach(this.vx, this.facing * speed, 0.1);
    if (this.onGround && w.pointSolid(fx, this.y - 4) && !w.pointSolid(fx, this.y - 20)) this.vy = -3.6;
    return false;
  }
  update(game) {
    this.t++;
    const h = game.heroine;
    const seen = this.sees(game);
    switch (this.state) {
      case 'patrol':
        if (this.x0 !== null) {
          const tx = this.facing > 0 ? this.x1 : this.x0;
          if (this.walkTo(game, tx, 0.45)) { this.facing = -this.facing; this.setState('look'); }
        } else {
          this.vx = 0;
          if (this.turnEvery && this.t % this.turnEvery === 0) this.facing = -this.facing;
        }
        if (seen) { this.setState('alert'); Sfx.play('grab'); }
        else this.checkLamps(game);
        break;
      case 'look':                              // a pause at the end of the beat
        this.vx = 0;
        if (this.t === 30) this.facing = -this.facing;
        if (this.t === 60) this.facing = -this.facing;
        if (seen) { this.setState('alert'); Sfx.play('grab'); }
        else if (this.t > 80) this.setState('patrol');
        break;
      case 'alert':
        this.vx = 0; this.facing = sign(h.x - this.x) || this.facing;
        if (this.t >= 40) { if (seen || this.t < 60) this.setState('chase'); else this.setState('lost'); }
        break;
      case 'chase':
        if (game.inSanctuary(h.x)) { this.setState('lost'); game.say(this, '……療養院か。 ちっ。', 'hero', 90); break; }
        this.unseen = seen ? 0 : this.unseen + 1;
        this.walkTo(game, h.x, 1.65);
        if (Math.abs(h.x - this.x) < 12 && Math.abs(h.y - this.y) < 26 && h.state !== 'carried') { game.gameOver('guard'); return; }
        if (this.unseen > 100 || h.hooded && this.unseen > 30) this.setState('lost');
        break;
      case 'lost':
        this.vx = 0;
        if (this.t === 25 || this.t === 50) this.facing = -this.facing;
        if (seen) this.setState('alert');
        else if (this.t > 70) this.setState('return');
        break;
      case 'return': {
        const back = this.x0 !== null ? clamp(this.x, this.x0, this.x1) : this.home.x;
        if (this.walkTo(game, back, 0.6)) { this.facing = this.baseFacing; this.setState('patrol'); }
        if (seen) this.setState('alert');
        else this.checkLamps(game);
        break;
      }
      case 'investigate': {                     // walks over to put out a lamp someone lit
        const L = this.lamp;
        if (!L.lit) { this.lamp = null; this.setState('return'); break; }
        if (this.walkTo(game, L.x - sign(L.x - this.home.x || 1) * 10, 0.7)) { this.facing = sign(L.x - this.x) || this.facing; this.setState('snuff'); }
        if (seen) this.setState('alert');
        break;
      }
      case 'snuff':
        this.vx = 0;
        if (this.t === 1) game.say(this, '……灯りは 禁じられている。', 'hero', 120);
        this.lamp.dying = this.t / 300;           // he lifts his pole and smothers it little by little
        if (this.t === 300) {
          const L = this.lamp; L.dying = 0;
          for (let i = 0; i < 12; i++) game.particles.add({ x: L.x + rand(-4, 4), y: L.y - 44, vx: rand(-0.3, 0.3), vy: rand(-0.9, -0.3), life: rand(30, 50), col: i % 2 ? '#8a8490' : '#5a5460', size: 2 });
        }
        if (this.t === 300) { this.lamp.lit = false; this.lamp.by = null; this.lamp = null; Sfx.play('plateoff'); this.setState('return'); }
        if (seen) this.setState('alert');
        break;
      case 'stun':
        this.vx = approach(this.vx, 0, 0.1);
        if (this.t > 50) this.setState(seen ? 'alert' : 'return');
        break;
    }
    this.physics(game.world);
    if (this.onGround) this.animDist += Math.abs(this.vx);
  }
  checkLamps(game) {
    for (const L of game.lamps) {
      if (!L.lit || L.by || L.guard !== this.id) continue;      // each lamp is watched by one guard
      { L.by = this; this.lamp = L; this.setState('investigate'); game.say(this, '……誰だ、灯りを つけたのは', 'hero', 90); return; }
    }
  }
  // Grey's pole: a shove, never a blow
  bump(game, dir) {
    if (this.state === 'stun') return false;
    this.vx = dir * 2.4; this.vy = -1.5; this.setState('stun');
    Sfx.play('hit'); game.say(this, 'うおっ…！', 'hero', 50);
    return true;
  }
  frame() {
    switch (this.state) {
      case 'alert': return 'alert' + (this.t < 20 ? 0 : 1);
      case 'chase': return 'run' + (Math.floor(this.animDist / 6) % 6);
      case 'look': case 'lost': case 'snuff': case 'stun': return 'idle' + (Math.floor(this.t / 15) % 4);
    }
    if (Math.abs(this.vx) > 0.1) return 'walk' + (Math.floor(this.animDist / 3) % 9);
    return 'idle' + (Math.floor(this.t / 20) % 4);
  }
  drawCone(ctx, cx, cy) {
    if (this.state === 'stun') return;
    const e = this.eye(), x = e.x - cx, y = e.y - cy, r = this.range, f = this.facing;
    const hot = this.state === 'alert' || this.state === 'chase';
    ctx.fillStyle = hot ? 'rgba(255,140,80,0.16)' : 'rgba(210,220,255,0.07)';
    ctx.beginPath(); ctx.moveTo(x, y);
    ctx.lineTo(x + f * r, y - r * 0.55 - 22); ctx.lineTo(x + f * r, y + r * 0.55 + 22); ctx.closePath(); ctx.fill();
  }
  draw(ctx, cx, cy) {
    const x = this.x - cx, y = this.y - cy;
    drawSprite(ctx, 'guard', this.frame(), x, y, this.facing < 0);
    const icon = this.state === 'alert' || this.state === 'chase' ? '!' : this.state === 'lost' ? '?' : null;
    if (icon) drawIcon(ctx, icon, x, y - 48, icon === '!' ? '#d02030' : '#303060');
  }
}

// ---------------------------------------------------------------------------
// 影蛾 (the shadow moth): chapter 4's boss. It nested in the dead great lamp and
// waited thirteen years for a light. It flutters out of the pole's reach, back and
// forth across the lamp room, and now and then dives at Lumina to carry her up
// into the dark of the dome. Only her beam can burn its wings (Grey turns the
// pedestal: straight up, or left / right onto the mirrors); burnt, it falls, and
// on the floor Grey's pole finally reaches it. Three blows a fall, three falls.
class Moth {
  constructor(B) {
    this.B = B; this.cx = B.x; this.cy = B.y - 6.5 * TILE; this.A = 10 * TILE;
    this.x = B.x; this.y = B.y - 19 * TILE;               // up in the dome
    this.state = 'enter'; this.t = 0; this.animT = 0; this.dir = 1; this.hover = 0;
    this.hp = 9; this.hits = 0; this.phase = 1; this.beamT = 0; this.lit = false;
    this.diveCd = 300; this.flash = 0; this.facing = 1; this.alive = true; this.falls = 0;
  }
  setState(s) { this.state = s; this.t = 0; }
  P() {
    return [null, { speed: 1, need: 34, dive: 480, down: 330 }, { speed: 1.3, need: 38, dive: 380, down: 290 },
      { speed: 1.6, need: 42, dive: 300, down: 260 }][Math.min(3, this.phase)];
  }
  home() { return { x: clamp(this.x, this.cx - this.A, this.cx + this.A), y: this.cy + TILE * Math.sin(this.animT * 0.025) }; }
  // the pole through its wings in the air: dust, nothing more
  inWings(box) { return ['cruise', 'aim', 'rise', 'enter'].includes(this.state) && overlap(box, { x0: this.x - 36, x1: this.x + 36, y0: this.y - 34, y1: this.y + 8 }); }
  whiff(game) {
    Sfx.play('push');
    for (let i = 0; i < 8; i++) game.particles.add({ x: game.hero.x + game.hero.facing * 20 + rand(-6, 6), y: this.y - rand(0, 20), vx: rand(-0.6, 0.6), vy: rand(-0.6, 0.2), life: 26, col: '#6a58a0', size: 1 });
    if (!game.flags.mothWhiff) { game.flags.mothWhiff = true; game.say(game.hero, '……灯竿では 手応えがない。 光で 焼かねば！', 'hero', 120); }
  }
  // the wings catch the beam
  inBeam(x, y) { return ['cruise', 'aim', 'dive'].includes(this.state) && Math.abs(x - this.x) < 22 && y > this.y - 30 && y < this.y + 2; }
  hurtBox() {
    if (this.state === 'down') return { x0: this.x - 22, x1: this.x + 22, y0: this.y - 20, y1: this.y };
    if (this.state === 'dive' || this.state === 'flee') return { x0: this.x - 18, x1: this.x + 18, y0: this.y - 26, y1: this.y + 16 };
    return null;
  }
  carryOff() { return [0, 34]; }            // she hangs from its legs
  update(game) {
    this.t++; this.animT++;
    if (this.flash > 0) this.flash--;
    const h = game.heroine, B = this.B, P = this.P();
    // the beam burns
    if (this.lit) {
      this.beamT++;
      if (this.t % 2 === 0) game.particles.add({ x: this.x + rand(-34, 34), y: this.y - rand(4, 26), vx: rand(-0.4, 0.4), vy: rand(-1, -0.2), life: 22, col: Math.random() < 0.5 ? '#ffd080' : '#fff4d0', size: 1 });
      if (this.t % 12 === 0) Sfx.play('push');
    } else this.beamT = Math.max(0, this.beamT - 0.3);
    this.lit = false;
    // wisps of shadow off the wings
    if (this.state !== 'die' && this.t % 3 === 0) game.particles.add({ x: this.x + rand(-36, 36), y: this.y - rand(0, 26), vx: rand(-0.2, 0.2), vy: rand(-0.4, 0.1), life: 24, col: Math.random() < 0.6 ? '#140a20' : '#3a2058', size: 2, shrink: true });
    const burnt = () => {
      if (this.beamT < P.need) return false;
      this.beamT = 0; this.setState('fall'); this.vy = 0; this.falls++;
      Sfx.play('kill'); game.shake = 4;
      game.particles.burst(this.x, this.y - 14, 18, { col: '#ffe0a0', life: 24, max: 2 });
      return true;
    };
    switch (this.state) {
      case 'enter': {                           // down from the dome onto its round
        const p = this.home();
        this.x += clamp(p.x - this.x, -1, 1); this.y += clamp(p.y - this.y, -1.2, 1.2);
        if (Math.abs(p.y - this.y) < 1 && Math.abs(p.x - this.x) < 1) this.setState('cruise');
        break;
      }
      case 'cruise': {
        if (burnt()) break;
        // back and forth across the room, hanging in the air a moment at each end.
        // It knows the light: it turns back before a lit column. Turn the beam onto it where it is.
        if (this.hover > 0) this.hover--;
        else {
          const lit = game.beams.some(([a, b]) => a.x === b.x && (a.x - this.x) * this.dir > 0 && Math.abs(a.x - this.x) < 44);
          if (lit) { this.dir = -this.dir; game.particles.burst(this.x, this.y - 14, 6, { col: '#3a2058', life: 16, max: 1.2 }); }
          this.x += this.dir * P.speed;
          if (Math.abs(this.x - this.cx) >= this.A) { this.x = this.cx + sign(this.x - this.cx) * this.A; this.dir = -this.dir; this.hover = 70; }
        }
        this.facing = this.dir;
        this.y = this.home().y + (this.hover ? Math.sin(this.animT * 0.15) * 2 : 0);
        if (--this.diveCd <= 0 && h.grabbable() && !h.carriedBy) { this.setState('aim'); Sfx.play('emerge'); }
        break;
      }
      case 'aim':                               // a shiver, then the dive
        if (burnt()) break;
        this.facing = sign(h.x - this.x) || this.facing;
        if (this.t >= 45) { this.tx = h.x; this.ty = h.y - 34; this.setState('dive'); Sfx.play('swing'); }
        break;
      case 'dive': {
        if (burnt()) break;
        const dx = this.tx - this.x, dy = this.ty - this.y, d = Math.hypot(dx, dy);
        if (d > 3) { this.x += dx / d * 3.2; this.y += dy / d * 3.2; }
        if (h.grabbable() && !h.carriedBy && Math.abs(h.x - this.x) < 18 && Math.abs(h.y - 34 - this.y) < 20) {
          h.carriedBy = this; h.setState('carried'); h.mode = 'follow';
          this.setState('flee'); Sfx.play('grab'); game.stats.grabs++;
          break;
        }
        if (d <= 3 || this.t > 160) { this.diveCd = P.dive; this.setState('rise'); }
        break;
      }
      case 'flee':                              // up into the dark with her
        // slowly while the pole can still reach it, then away
        this.x += clamp(this.cx - this.x, -0.5, 0.5); this.y -= this.t < 120 ? 0.4 : 1.2;
        if (this.y < B.y - 12 * TILE) { game.gameOver(); return; }
        break;
      case 'recoil':
        this.x += this.vx; this.y += this.vy; this.vx *= 0.94; this.vy *= 0.94;
        if (this.t > 30) this.setState('rise');
        break;
      case 'rise': {                            // back onto its round (the light cannot catch it rising)
        const p = this.home(), dx = p.x - this.x, dy = p.y - this.y, d = Math.hypot(dx, dy);
        if (d < 2) { this.setState('cruise'); break; }
        this.x += dx / d * 1.6; this.y += dy / d * 1.6;
        this.facing = sign(dx) || this.facing;
        break;
      }
      case 'fall':
        this.vy = Math.min(this.vy + 0.2, 4); this.y += this.vy;
        this.x = clamp(this.x, B.x0 + 2 * TILE, B.x1 - 2 * TILE);
        if (this.t % 3 === 0) game.particles.add({ x: this.x + rand(-20, 20), y: this.y - rand(0, 20), vx: rand(-0.3, 0.3), vy: -0.6, life: 30, col: '#ff9a50', size: 1 });
        if (this.y >= B.y) {
          this.y = B.y; this.setState('down'); this.hits = 0; game.shake = 5; Sfx.play('block');
          if (this.falls === 1) game.say(game.hero, '落ちた……！ 今だ！', 'hero', 90);
        }
        break;
      case 'down':                              // on the floor, wings smoking
        if (this.t % 5 === 0) game.particles.add({ x: this.x + rand(-30, 30), y: this.y - rand(0, 8), vy: -0.5, life: 30, col: '#5a4a60', size: 2, shrink: true });
        if (this.t > P.down) { this.diveCd = P.dive; this.setState('rise'); Sfx.play('emerge'); }
        break;
      case 'die':
        if (this.t % 2 === 0) for (let i = 0; i < 4; i++) {
          game.particles.add({ x: this.x + rand(-40, 40), y: this.y - rand(0, 28), vx: rand(-0.6, 0.6), vy: rand(-1.6, -0.3), life: rand(30, 60), col: ['#140a20', '#3a2058', '#8050c0', '#ffe9a8'][i], size: i < 2 ? 2 : 1, shrink: i < 2 });
        }
        if (this.t >= 140) this.alive = false;
        break;
    }
  }
  drop(game, dir) {
    const h = game.heroine;
    h.carriedBy = null; h.setState('down');
    h.vx = -dir * 0.6; h.vy = -1; h.flash = 20;
    game.say(h, 'きゃっ…！', 'her', 40);
    Sfx.play('drop');
  }
  // Grey's pole: on the floor it hurts; in the air it only drives it off
  hit(game, dir) {
    if (this.state === 'down') {
      this.hp--; this.hits++; this.flash = 10; game.shake = 3;
      game.particles.burst(this.x, this.y - 12, 12, { col: '#e8d8ff', life: 16, max: 2 });
      if (this.hp <= 0) { this.setState('die'); Sfx.play('kill'); game.shake = 8; return true; }
      Sfx.play('hit');
      if (this.hits >= 3) {                     // it tears itself off the floor, angrier
        this.phase++; this.diveCd = 200; this.setState('rise'); Sfx.play('emerge'); game.shake = 6;
        game.say(game.heroine, this.phase === 2 ? '……こなが、ふってくる！' : '……くらく なった……！', 'cry', 100);
      }
      return true;
    }
    if (this.state === 'dive' || this.state === 'flee') {
      if (game.heroine.carriedBy === this) this.drop(game, dir);
      this.flash = 10; this.vx = dir * 2.2; this.vy = -2.2; this.diveCd = this.P().dive;
      this.setState('recoil'); Sfx.play('hit');
      game.particles.burst(this.x, this.y - 12, 8, { col: '#e8d8ff', life: 14, max: 2 });
      return true;
    }
    return false;
  }
  draw(ctx, cx, cy) {
    ctx.save();                                 // drawn a size larger than its measurements
    ctx.translate(Math.round(this.x - cx), Math.round(this.y - cy)); ctx.scale(1.25, 1.25);
    this.drawAt(ctx);
    ctx.restore();
  }
  drawAt(ctx) {
    const x = 0, y = 0;
    const down = this.state === 'down' || this.state === 'fall';
    const dying = this.state === 'die' ? this.t / 140 : 0;
    // wing beat: fast when it shivers before a dive, slow and flat on the floor
    const rate = this.state === 'aim' ? 0.7 : this.state === 'dive' || this.state === 'flee' ? 0.35 : 0.18;
    const f = down ? 0.45 + (this.state === 'down' ? 0.1 * Math.sin(this.animT * 0.5) : 0) : 0.3 + 0.7 * Math.abs(Math.cos(this.animT * rate));
    const white = this.flash > 0 && (this.flash >> 1) % 2;
    const burn = Math.min(1, this.beamT / this.P().need);
    ctx.save();
    ctx.globalAlpha = 1 - dying;
    const body = y - (down ? 12 : 14);
    const wing = (s, pts, fill, edge) => {
      ctx.beginPath();
      pts.forEach(([px, py], i) => { const X = x + s * px, Y = body + py * f; if (i) ctx.lineTo(X, Y); else ctx.moveTo(X, Y); });
      ctx.closePath(); ctx.fillStyle = fill; ctx.fill();
      ctx.strokeStyle = edge; ctx.lineWidth = 1; ctx.stroke();
    };
    const dark = white ? '#f0e8ff' : '#150b22', mid = white ? '#ffffff' : '#2a1640';
    const rim = burn > 0 ? `rgba(255,${Math.round(200 - 80 * burn)},120,${0.4 + 0.6 * burn})` : '#4a2e78';
    for (const s of [-1, 1]) {
      // hind wing, then fore wing (ragged trailing edge)
      wing(s, [[3, 0], [26, 8], [32, 18], [20, 22], [8, 12]], dark, rim);
      wing(s, [[2, -4], [18, -20], [40, -26], [44, -18], [38, -8], [30, -4], [34, 2], [22, 0], [14, 4]], mid, rim);
      // an eye on each wing: the only warm thing about it
      const ex = x + s * 26, ey = Math.round(body - 12 * f), r = Math.max(1, Math.round(4 * f));
      ctx.fillStyle = dark; ctx.fillRect(ex - 4, ey - r, 8, r * 2);
      ctx.fillStyle = '#6a48a8'; ctx.fillRect(ex - 2, ey - Math.ceil(r / 2), 4, Math.max(1, r));
      ctx.fillStyle = this.state === 'aim' && (this.t >> 2) % 2 ? '#ffffff' : '#e8c070'; ctx.fillRect(ex, ey, 1, 1);
    }
    // body, feathered antennae, the two yellow points of its eyes
    ctx.fillStyle = white ? '#ffffff' : '#0e0616';
    ctx.fillRect(x - 3, body - 10, 6, 22); ctx.fillRect(x - 4, body - 6, 8, 12); ctx.fillRect(x - 2, body + 12, 4, 4);
    ctx.fillStyle = '#3a2058'; for (let i = 0; i < 4; i++) ctx.fillRect(x - 4, body - 2 + i * 4, 8, 1);
    ctx.strokeStyle = '#2a1640'; ctx.lineWidth = 1;
    for (const s of [-1, 1]) {
      ctx.beginPath(); ctx.moveTo(x + s, body - 10); ctx.quadraticCurveTo(x + s * 6, body - 22, x + s * 12, body - 24); ctx.stroke();
      ctx.fillStyle = '#2a1640';
      for (let i = 0; i < 4; i++) ctx.fillRect(x + s * (4 + i * 2), body - 17 - i * 2, 1, 2);
    }
    ctx.fillStyle = '#ffe9a8'; ctx.fillRect(x - 3, body - 9, 1, 1); ctx.fillRect(x + 2, body - 9, 1, 1);
    ctx.restore();
  }
}

// ---------------------------------------------------------------------------
// Chapter 5: a shadow child at home in its village. It potters about and pays
// no mind to anyone - until Lumina's light comes near (hidden under the coat she
// can pass right by). Then it wants her, like any other shadow. If it loses her
// under the coat it wanders off home again.
class Villager extends Shadow {
  constructor(portal, e) {
    super(portal);
    this.x0 = e.x0 * TILE + 8; this.x1 = e.x1 * TILE + 8;
    this.state = 'wander'; this.pause = 0; this.dir = e.dir || 1; this.calm = 0;
    this.hop = e.hop || 0;                         // some play at hopping
  }
  isThreat() { return this.alive && !['die', 'emerge', 'wander'].includes(this.state); }
  notices(game) {
    const h = game.heroine;
    if (h.state === 'carried' || h.carriedBy) return false;
    const dx = h.x - this.x, dy = h.y - this.y;
    if (h.hooded) return false;                  // under the coat she is just another shadow to them
    return Math.abs(dx) < 96 && Math.abs(dy) < 48;
  }
  update(game) {
    if (this.state === 'wander') {
      this.t++; this.animT++;
      if (this.flash > 0) this.flash--;
      if (this.t % 6 === 0) game.particles.add({ x: this.x + rand(-6, 6), y: this.y - rand(10, 36), vx: rand(-0.2, 0.2), vy: rand(-0.5, -0.2), life: 22, col: '#2a1a40', size: 2, shrink: true });
      if (this.notices(game)) {
        this.setState('seek'); this.swipeCd = 60; Sfx.play('emerge');
        game.say(this, '！', 'cry', 50);
        return;
      }
      if (this.pause > 0) { this.pause--; this.vx = approach(this.vx, 0, 0.1); }
      else {
        const tx = this.dir > 0 ? this.x1 : this.x0;
        if (Math.abs(tx - this.x) < 3) { this.dir = -this.dir; this.pause = 60 + Math.floor(rand(0, 90)); }
        else { this.facing = this.dir; this.vx = approach(this.vx, this.dir * 0.35, 0.05); }
        if (this.hop && this.onGround && this.t % this.hop === 0) this.vy = -2.6;
      }
      this.physics(game.world);
      return;
    }
    // lost her under the coat: back to its own business
    if (this.state === 'seek') {
      const h = game.heroine;
      this.calm = h.hooded && Math.abs(h.x - this.x) > 40 ? this.calm + 1 : 0;
      if (this.calm > 150) { this.setState('wander'); this.calm = 0; game.say(this, '？', 'hero', 50); return; }
    }
    super.update(game);
  }
  frame() { return this.state === 'wander' ? 'walk' + (Math.floor(this.animT / 12) % 4) : super.frame(); }
  draw(ctx, cx, cy) {
    if (this.state !== 'wander') { super.draw(ctx, cx, cy); return; }
    // at home and at ease: fainter, a little smaller
    ctx.save(); ctx.globalAlpha = 0.72;
    ctx.translate(Math.round(this.x - cx), Math.round(this.y - cy)); ctx.scale(0.85, 0.85);
    drawSprite(ctx, 'shadow', this.frame(), 0, 0, this.facing < 0);
    ctx.restore();
  }
}

// ---------------------------------------------------------------------------
// 影鯨: the first and biggest shadow play she ever made on the chapel wall - a whale.
// It swims in the sea of shadow road at the bottom of the valley (only a fin shows),
// gathers under Grey (ripples), and leaps out of the sea to land a little ahead.
// Landing in the sea it dives again; landing where her light has dried the sea up
// (or on rock) it is stranded, and Grey's pole reaches it. Three blows a stranding.
class Whale {
  constructor(B) {
    this.B = B; this.sea = B.sea;                     // y of the sea's surface
    this.x = B.x0 + 4 * TILE; this.y = this.sea + 10; this.dir = 1;
    this.state = 'rise'; this.t = 0; this.animT = 0; this.hp = 12; this.hits = 0; this.phase = 1;
    this.flash = 0; this.alive = true; this.alpha = 1; this.scale = 1; this.singT = 0; this.offSea = 0; this.again = false;
  }
  setState(s) { this.state = s; this.t = 0; }
  P() { return [null, { speed: 1.1, ripple: 55, beach: 240 }, { speed: 1.4, ripple: 45, beach: 210 }, { speed: 1.7, ripple: 36, beach: 180 }][Math.min(3, this.phase)]; }
  seaAt(game, x) {                                   // is there shadow sea (set, not dried up) at x?
    const w = game.world, tx = Math.floor(x / TILE), ty = Math.floor(this.sea / TILE);
    return w.soft && w.soft[ty * w.W + tx] === 1 && w.softOn[ty * w.W + tx] === 1;
  }
  onSea(game, a) { return a.onGround && Math.abs(a.y - this.sea) < 2 && this.seaAt(game, a.x); }
  hurtBox() {
    if (this.state === 'beached') return { x0: this.x - 30, x1: this.x + 30, y0: this.y - 24, y1: this.y };
    if (this.state === 'drag') return { x0: this.x - 22, x1: this.x + 22, y0: this.sea - 20, y1: this.sea + 4 };
    return null;
  }
  // under the sea, one step toward x (never through dried-up sea)
  swimTo(game, x, speed) {
    const d = x - this.x;
    if (Math.abs(d) < 2) return true;
    const nx = this.x + sign(d) * Math.min(speed, Math.abs(d));
    this.dir = sign(d);
    if (this.seaAt(game, nx + this.dir * 4)) { this.x = nx; return false; }
    return true;                                      // (the light stops it here)
  }
  groundBelow(game, x, y) {
    for (let k = 0; k < 200; k += 2) if (game.world.pointSolid(x, y + k)) return Math.floor((y + k) / TILE) * TILE;
    return this.B.floor;
  }
  update(game) {
    this.t++; this.animT++;
    if (this.flash > 0) this.flash--;
    const hero = game.hero, h = game.heroine, P = this.P(), B = this.B;
    const bubble = (x) => game.particles.add({ x: x + rand(-10, 10), y: this.sea - 1, vx: rand(-0.3, 0.3), vy: rand(-0.9, -0.3), life: 24, col: Math.random() < 0.5 ? '#6a4ca8' : '#2a1a48', size: 1 });
    switch (this.state) {
      case 'rise':                                    // surfacing at the start (fin only)
        this.alpha = Math.min(1, this.t / 40);
        if (this.t > 60) this.setState('swim');
        break;
      case 'swim': {
        // her, in the sea (under the coat, or wandered in): it goes for her first
        const target = this.onSea(game, h) && h.grabbable() ? h : this.onSea(game, hero) ? hero : null;
        if (!this.seaAt(game, this.x)) {             // the light came over it: away to the nearest sea
          const s = this.nearestSea(game, this.x);
          if (s !== null) this.x += sign(s - this.x) * Math.min(3, Math.abs(s - this.x));
          break;
        }
        this.offSea = target ? 0 : this.offSea + 1;
        if (target) {
          if (this.swimTo(game, target.x, P.speed) && Math.abs(target.x - this.x) < 14) { this.target = target; this.setState('ripple'); }
        } else {
          // circle near Grey, as close as the sea lets it
          const s = this.nearestSea(game, hero.x);
          if (s !== null) this.swimTo(game, s + Math.sin(this.t * 0.02) * 24, P.speed * 0.6);
        }
        if (this.phase >= 2 && ++this.singT > 540 && this.state === 'swim') { this.singT = 0; this.setState('sing'); }
        if (this.t % 20 === 0) bubble(this.x);
        break;
      }
      case 'ripple': {                                // gathering under someone: the cue to jump aside
        const a = this.target;
        this.x += clamp(a.x - this.x, -0.4, 0.4);
        if (this.t % 4 === 0) bubble(this.x);
        if (this.t >= (this.again ? 26 : P.ripple)) {
          if (!this.seaAt(game, this.x)) { this.setState('swim'); break; }
          this.again = false;
          this.bx = this.x; this.lx = this.x + this.dir * 5 * TILE; this.setState('breach'); Sfx.play('emerge'); game.shake = 4;
          for (let i = 0; i < 16; i++) game.particles.add({ x: this.x + rand(-16, 16), y: this.sea, vx: rand(-1.2, 1.2), vy: rand(-3, -1), g: 0.12, life: 40, col: i % 2 ? '#3a2466' : '#8a70c8', size: 2 });
          // it takes whoever stands right over it: Lumina into the sea, Grey it throws aside
          if (a === h && Math.abs(h.x - this.x) < 14 && h.grabbable() && !h.carriedBy) {
            h.carriedBy = this; h.setState('carried'); h.mode = 'follow';
            this.setState('drag'); Sfx.play('grab'); game.stats.grabs++;
            break;
          }
          if (Math.abs(hero.x - this.x) < 20 && Math.abs(hero.y - this.sea) < 24) hero.knock(this.dir);
        }
        break;
      }
      case 'breach': {                                // a leap out of the sea
        const T = 56, f = Math.min(1, this.t / T);
        this.x = lerp(this.bx, this.lx, f);
        const gy = this.groundBelow(game, this.lx, this.sea - 4);
        this.y = lerp(this.sea + 10, gy, f) - Math.sin(f * Math.PI) * 60;
        if (Math.abs(hero.x - this.x) < 24 && hero.y > this.y - 20 && hero.y - 38 < this.y && this.t > 6 && this.t < T - 4) hero.knock(this.dir);
        if (f >= 1) {
          this.x = this.lx; this.y = gy;
          if (this.seaAt(game, this.x) && Math.abs(gy - this.sea) < 4) {       // back into the sea
            this.y = this.sea + 10; this.setState('swim'); Sfx.play('drop');
            for (let i = 0; i < 14; i++) bubble(this.x);
            if (this.phase >= 3 && !this.again) { this.again = true; this.target = hero; if (this.onSea(game, hero)) this.setState('ripple'); }
          } else {                                    // stranded
            this.setState('beached'); this.hits = 0; Sfx.play('block'); game.shake = 6;
            if (Math.abs(h.x - this.x) < 26 && h.state === 'normal') { h.setState('down'); h.vx = this.dir * 1.2; h.vy = -2; }
            if (!game.flags.whaleBeached) { game.flags.whaleBeached = true; game.say(hero, '打ち上がった……！ 今だ！', 'hero', 90); }
          }
        }
        break;
      }
      case 'beached':
        this.y = this.groundBelow(game, this.x, this.y - 8);
        if (this.t > P.beach) this.setState('back');
        break;
      case 'back': {                                  // wriggles off into the dark, comes up in the sea
        this.alpha = Math.max(0, 1 - this.t / 30);
        if (this.t >= 30) {
          const s = this.nearestSea(game, this.x);
          this.x = s !== null ? s : B.x0 + 4 * TILE; this.y = this.sea + 10; this.alpha = 1; this.setState('swim');
        }
        break;
      }
      case 'drag': {                                  // it has her: down into the sea with her
        this.y = this.sea + 10;
        if (this.t > 150) { game.gameOver(); return; }
        if (this.t % 6 === 0) bubble(this.x);
        break;
      }
      case 'sing':                                    // a long low call: shadows answer from the sea
        if (this.t === 1) { Sfx.play('door'); game.say(h, '……うたってる？', 'her', 80); }
        if (this.t === 60) game.whaleCall();
        if (this.t > 90) this.setState('swim');
        break;
      case 'die':
        this.scale = Math.max(0.22, 1 - this.t / 90);
        this.y = lerp(this.y, h.y - 28, 0.04); this.x = lerp(this.x, h.x + 18, 0.04);
        if (this.t % 3 === 0) game.particles.add({ x: this.x + rand(-20, 20) * this.scale, y: this.y - rand(0, 20) * this.scale, vx: rand(-0.4, 0.4), vy: rand(-1, -0.2), life: 40, col: '#ffe9a8', size: 1 });
        if (this.t >= 150) this.alive = false;
        break;
    }
  }
  nearestSea(game, x) {
    for (let d = 0; d < 40 * TILE; d += TILE) {
      if (this.seaAt(game, x - d)) return x - d;
      if (this.seaAt(game, x + d)) return x + d;
    }
    return null;
  }
  carryOff() { return [0, 12]; }
  hit(game, dir) {
    if (this.state === 'drag') {
      const h = game.heroine;
      h.carriedBy = null; h.setState('down'); h.y = this.sea; h.vy = -3; h.vx = -dir * 0.8; h.flash = 20;
      game.say(h, 'きゃっ…！', 'her', 40); Sfx.play('drop');
      this.flash = 10; this.setState('back'); Sfx.play('hit');
      return true;
    }
    if (this.state !== 'beached') return false;
    this.hp--; this.hits++; this.flash = 10; game.shake = 3; Sfx.play('hit');
    game.particles.burst(this.x, this.y - 12, 12, { col: '#e8d8ff', life: 16, max: 2 });
    if (this.hp <= 0) { this.setState('die'); Sfx.play('kill'); game.shake = 8; return true; }
    // four strandings in all (three blows each); it grows fiercer as it weakens
    const phase = this.hp > 8 ? 1 : this.hp > 4 ? 2 : 3;
    if (phase !== this.phase) {
      this.phase = phase; game.shake = 6;
      if (phase === 3) game.ring = 50;
      game.say(game.heroine, phase === 2 ? '……ないてる。' : '……くらく なった……', 'cry', 90);
    }
    if (this.hits >= 3) this.setState('back');
    return true;
  }
  draw(ctx, cx, cy) {
    const x = Math.round(this.x - cx), sea = Math.round(this.sea - cy);
    if (['rise', 'swim', 'ripple', 'drag', 'sing'].includes(this.state)) {
      // under the sea: a dark shape, its fin cutting the surface, rings of ripples
      ctx.save(); ctx.globalAlpha = 0.35 * this.alpha;
      ctx.fillStyle = '#05020c'; ctx.beginPath(); ctx.ellipse(x, sea + 9, 30, 7, 0, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      ctx.fillStyle = '#0c0616';
      const fx = x - this.dir * 4;
      ctx.beginPath(); ctx.moveTo(fx - this.dir * 8, sea); ctx.lineTo(fx + this.dir * 5, sea - 11); ctx.lineTo(fx + this.dir * 6, sea); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#6a4ca8'; ctx.fillRect(fx + this.dir * 4, sea - 10, 1, 3);
      if (this.state === 'ripple' || this.state === 'sing') {
        ctx.strokeStyle = 'rgba(150,120,220,0.7)'; ctx.lineWidth = 1;
        for (let i = 0; i < 3; i++) {
          const r = ((this.t * 0.6 + i * 8) % 24) + 4;
          ctx.beginPath(); ctx.ellipse(x, sea, r, r * 0.25, 0, Math.PI, Math.PI * 2); ctx.stroke();
        }
      }
      return;
    }
    // out of the sea: the whole whale
    const y = Math.round(this.y - cy), s = this.scale, d = this.state === 'breach' ? this.dir : this.dir;
    const white = this.flash > 0 && (this.flash >> 1) % 2;
    const flop = this.state === 'beached' ? Math.sin(this.animT * 0.25) * 2 : 0;
    ctx.save(); ctx.globalAlpha = this.alpha;
    ctx.translate(x, y - 12 * s); ctx.scale(d * s, s);
    if (this.state === 'breach') ctx.rotate((this.t / 56 - 0.5) * 0.6);
    ctx.fillStyle = white ? '#ffffff' : '#0e0818';
    ctx.beginPath(); ctx.ellipse(0, 0, 30, 11, 0, 0, Math.PI * 2); ctx.fill();                    // body
    ctx.beginPath(); ctx.moveTo(-26, -2); ctx.lineTo(-44, -10 + flop); ctx.lineTo(-40, 0); ctx.lineTo(-46, 8 - flop); ctx.lineTo(-26, 4); ctx.closePath(); ctx.fill();   // flukes
    ctx.beginPath(); ctx.moveTo(4, 6); ctx.lineTo(-6, 16 + flop); ctx.lineTo(-10, 8); ctx.closePath(); ctx.fill();              // flipper
    ctx.fillStyle = white ? '#ffffff' : '#2a1a48';
    ctx.beginPath(); ctx.ellipse(4, 4, 22, 5, 0, 0, Math.PI); ctx.fill();                           // pale belly grooves
    ctx.fillStyle = '#5a3c98'; for (let i = -10; i < 22; i += 4) ctx.fillRect(i, 6, 2, 1);
    ctx.strokeStyle = this.state === 'die' ? '#ffe9a8' : '#6a4ca8'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.ellipse(0, 0, 30, 11, 0, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke();    // a lit rim along the back
    ctx.fillStyle = '#ffe9a8'; ctx.fillRect(18, -2, 2, 2);                                         // its eye
    ctx.restore();
  }
}

// ---------------------------------------------------------------------------
// The great shadow, asleep at the bottom of the valley: a child's shape hugging
// its knees, far too big. It wakes, looks at her, stands, and goes (up and away).
class Ookage {
  constructor(x, y) { this.x = x; this.y = y; this.state = 'sleep'; this.t = 0; this.k = 0; this.alpha = 1; }
  update() {
    this.t++;
    if (this.state === 'wake') this.k = Math.min(1, this.k + 1 / 120);
    if (this.state === 'go') { this.y -= 2.2; this.x += 1.4; this.alpha = Math.max(0, this.alpha - 1 / 150); }
  }
  draw(ctx, cx, cy) {
    if (this.alpha <= 0) return;
    const x = Math.round(this.x - cx), y = Math.round(this.y - cy), k = this.k;
    const breathe = this.state === 'sleep' ? Math.sin(this.t * 0.03) * 2 : 0;
    ctx.save(); ctx.globalAlpha = this.alpha * 0.92;
    ctx.fillStyle = '#07030e';
    // curled up (k=0) -> standing (k=1)
    const bodyH = lerp(56, 120, k), bodyW = lerp(64, 40, k);
    ctx.beginPath(); ctx.ellipse(x, y - bodyH / 2 + breathe, bodyW / 2, bodyH / 2, 0, 0, Math.PI * 2); ctx.fill();
    const hy = y - bodyH - lerp(-8, 18, k) + breathe;
    ctx.beginPath(); ctx.ellipse(x + lerp(14, 0, k), hy, 18, 20, 0, 0, Math.PI * 2); ctx.fill();         // head
    // long hair, down the back, stirring
    ctx.beginPath(); ctx.moveTo(x + lerp(0, -14, k), hy - 10);
    for (let i = 0; i <= 8; i++) ctx.lineTo(x - lerp(20, 22, k) - Math.sin(this.t * 0.05 + i) * 3, hy + i * lerp(6, 11, k));
    ctx.lineTo(x - 4, hy + 40); ctx.closePath(); ctx.fill();
    // eyes: two faint yellow points, open when it wakes
    if (this.state !== 'sleep') {
      ctx.fillStyle = `rgba(255,233,168,${0.4 + 0.6 * k})`;
      ctx.fillRect(x + lerp(14, 0, k) - 6, Math.round(hy), 2, 2); ctx.fillRect(x + lerp(14, 0, k) + 4, Math.round(hy), 2, 2);
    }
    ctx.restore();
    if (this.state === 'sleep' && this.t % 90 < 45) { ctx.fillStyle = '#6a58a0'; ctx.font = '8px sans-serif'; ctx.fillText('…', x + 24, y - 70); }
  }
}
