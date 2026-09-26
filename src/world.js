'use strict';
// ---------------------------------------------------------------------------
// World: tile collision, dynamic solids, pre-rendered tile layers
// ---------------------------------------------------------------------------
// what each chapter's world is built from
const THEMES = {
  cathedral: { front: (r) => (r < 0.08 ? 'fg4' : r < 0.14 ? 'fg5' : 'fg' + Math.floor(r * 4)), top: 'top',
    back: (r) => (r < 0.06 ? 'bg4' : r < 0.12 ? 'bg5' : 'bg' + Math.floor(r * 4)),
    deep: '#0d0b16', shade: 'rgba(10,8,18,0.72)', edges: ['#1e1a28', '#9890a8', '#3a3448', '#403a50'] },
  forest: { front: (r) => 'dirt' + Math.floor(r * 6), top: 'grass', back: (r) => 'eback' + Math.floor(r * 4),
    deep: '#1a1014', shade: 'rgba(14,8,10,0.6)', edges: ['#1a1014', '#8a6448', '#3a2622', '#4a3228'],
    sky: { grad: 'sky2', far: 'hills2', mid: 'trees2', farFill: '#262240', midFill: '#181628' } },
  // house fronts alternate: brick, then timber and plaster, every few tiles
  town: { front: (r) => 'cob' + Math.floor(r * 4), top: 'ctop',
    back: (r, x) => (Math.floor(x / 7) % 3 === 1 ? 'plaster' + (Math.floor(r * 2) * 2 + (x % 7 === 0 ? 0 : 1)) : 'wall' + Math.floor(r * 4)),
    back2: (r) => 'plaster' + Math.floor(r * 4),
    deep: '#0e0c14', shade: 'rgba(8,8,14,0.66)', edges: ['#14121a', '#8a8898', '#3a3844', '#34323e'],
    sky: { grad: 'sky3', far: 'far3', mid: 'mid3', farFill: '#1a1830', midFill: '#121020' } },
};

class World {
  constructor(stage, theme = 'cathedral') {
    this.theme = theme;
    this.W = stage.W; this.H = stage.H;
    this.solid = stage.solid; this.noBg = stage.noBg;
    this.pw = this.W * TILE; this.ph = this.H * TILE;
    this.dyn = [];            // objects with solidBox() -> box|null
    this.decor = stage.decor;
    this.prerender();
  }

  tile(tx, ty) {
    if (tx < 0 || tx >= this.W || ty < 0) return 1;
    if (ty >= this.H) return 0;           // bottomless below the map
    return this.solid[ty * this.W + tx];
  }
  tileAt(px, py) { return this.tile(Math.floor(px / TILE), Math.floor(py / TILE)); }

  boxHitTiles(x0, y0, x1, y1) {
    const tx0 = Math.floor(x0 / TILE), tx1 = Math.floor((x1 - 0.001) / TILE);
    const ty0 = Math.floor(y0 / TILE), ty1 = Math.floor((y1 - 0.001) / TILE);
    for (let ty = ty0; ty <= ty1; ty++) for (let tx = tx0; tx <= tx1; tx++) if (this.tile(tx, ty)) return true;
    return false;
  }
  // returns the blocking thing (true for tiles, object for dynamic) or null
  boxHit(x0, y0, x1, y1, self = null, ignoreDyn = false) {
    if (this.boxHitTiles(x0, y0, x1, y1)) return true;
    if (ignoreDyn) return null;
    const b = { x0, y0, x1, y1 };
    for (const d of this.dyn) {
      if (d === self) continue;
      const s = d.solidBox(self);
      if (s && overlap(b, s)) return d;
    }
    return null;
  }
  pointSolid(px, py, self = null) { return !!this.boxHit(px - 0.5, py - 0.5, px + 0.5, py + 0.5, self); }

  // -------------------------------------------------------------------------
  hash(x, y) { let h = (x * 374761393 + y * 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967295; }

  prerender() {
    const W = this.W, H = this.H;
    // distance of each solid cell to the nearest open cell (for dark rock mass)
    const depth = new Uint8Array(W * H).fill(9);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (!this.solid[y * W + x]) { depth[y * W + x] = 0; continue; }
      let best = 9;
      for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
        if (!this.solid[ny * W + nx]) best = Math.min(best, Math.max(Math.abs(dx), Math.abs(dy)));
      }
      depth[y * W + x] = best;
    }
    this.depth = depth;

    const mk = () => { const c = document.createElement('canvas'); c.width = this.pw; c.height = this.ph; return c; };
    const TH = THEMES[this.theme];
    // back wall layer
    this.back = mk();
    let g = this.back.getContext('2d');
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const nb = this.noBg[y * W + x];
      if (this.solid[y * W + x] || nb === 1) continue;
      const r = this.hash(x, y);
      const name = nb === 2 && TH.back2 ? TH.back2(r) : TH.back(r, x, y);
      drawTile(g, name, x * TILE, y * TILE);
    }
    // soft shadow under ceilings / beside walls on the back wall
    g.fillStyle = 'rgba(6,4,14,0.45)';
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (this.solid[y * W + x] || this.noBg[y * W + x] === 1) continue;
      if (this.tile(x, y - 1)) g.fillRect(x * TILE, y * TILE, TILE, 5);
      if (this.tile(x - 1, y)) g.fillRect(x * TILE, y * TILE, 3, TILE);
      if (this.tile(x + 1, y)) g.fillRect(x * TILE + 13, y * TILE, 3, TILE);
    }

    // foreground solid layer
    this.front = mk();
    g = this.front.getContext('2d');
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (!this.solid[y * W + x]) continue;
      const d = depth[y * W + x];
      const px = x * TILE, py = y * TILE;
      if (d >= 3) { g.fillStyle = TH.deep; g.fillRect(px, py, TILE, TILE); continue; }
      const r = this.hash(x + 999, y);
      drawTile(g, TH.front(r), px, py);
      if (d === 2) { g.fillStyle = TH.shade; g.fillRect(px, py, TILE, TILE); }
      const open = (dx, dy) => !this.tile(x + dx, y + dy) && y + dy < H;
      const E = TH.edges;
      if (open(0, -1)) drawTile(g, TH.top + Math.floor(this.hash(x, y + 7) * 4), px, py);
      if (open(-1, 0)) { g.fillStyle = E[0]; g.fillRect(px, py, 1, TILE); g.fillStyle = E[1]; g.fillRect(px + 1, py + (open(0, -1) ? 2 : 0), 1, TILE - (open(0, -1) ? 2 : 0)); }
      if (open(1, 0)) { g.fillStyle = E[0]; g.fillRect(px + 15, py, 1, TILE); g.fillStyle = E[2]; g.fillRect(px + 14, py, 1, TILE); }
      if (open(0, 1)) { g.fillStyle = E[0]; g.fillRect(px, py + 15, TILE, 1); g.fillStyle = E[3]; g.fillRect(px, py + 14, TILE, 1); }
    }
  }

  drawParallax(ctx, cx, cy, sun = 0) {
    if (THEMES[this.theme].sky) { this.drawSky(ctx, cx, cy, sun); return; }
    const far = Sheets.bgfar.img, mid = Sheets.bgmid.img;
    const layer = (img, fx, fy, oy) => {
      const w = img.width, h = img.height;
      let ox = -Math.round(cx * fx) % w; if (ox > 0) ox -= w;
      let oy2 = (-Math.round(cy * fy) + oy) % h; if (oy2 > 0) oy2 -= h;
      for (let y = oy2; y < VH; y += h) for (let x = ox; x < VW; x += w) ctx.drawImage(img, x, y);
    };
    ctx.fillStyle = '#0e0c1a'; ctx.fillRect(0, 0, VW, VH);
    layer(far, 0.15, 0.1, 0);
    layer(mid, 0.4, 0.3, 40);
  }

  // dawn sky: a fixed gradient, hills and a tree line that scroll (not repeated vertically)
  drawSky(ctx, cx, cy, sun) {
    const S = THEMES[this.theme].sky, grad = Sheets[S.grad].img;
    ctx.drawImage(grad, 0, 0, 1, grad.height, 0, 0, VW, VH);
    if (sun > 0) {                  // morning: the sky turns pale blue above and gold at the horizon
      const g = ctx.createLinearGradient(0, 0, 0, VH);
      g.addColorStop(0, `rgba(120,160,220,${0.9 * sun})`); g.addColorStop(0.6, `rgba(230,190,190,${0.9 * sun})`);
      g.addColorStop(1, `rgba(255,214,150,${sun})`);
      ctx.fillStyle = g; ctx.fillRect(0, 0, VW, VH);
    }
    const band = (img, fx, fy, base) => {
      const w = img.width;
      let ox = -Math.round(cx * fx) % w; if (ox > 0) ox -= w;
      const oy = Math.round(base + VH - img.height - (cy - 270) * fy);     // ~270 = camera at ground level
      for (let x = ox; x < VW; x += w) ctx.drawImage(img, x, oy);
      const last = oy + img.height;
      if (last < VH) { ctx.fillStyle = img === Sheets[S.mid].img ? S.midFill : S.farFill; ctx.fillRect(0, last, VW, VH - last); }
    };
    band(Sheets[S.far].img, 0.08, 0.05, 0);
    band(Sheets[S.mid].img, 0.3, 0.2, 20);
  }

  drawBack(ctx, cx, cy) {
    ctx.drawImage(this.back, cx, cy, VW, VH, 0, 0, VW, VH);
  }
  drawFront(ctx, cx, cy) {
    ctx.drawImage(this.front, cx, cy, VW, VH, 0, 0, VW, VH);
  }

  // decorative objects on the back wall (torches animate)
  drawDecor(ctx, cx, cy, t) {
    for (const d of this.decor) {
      const x = d.x - cx, y = d.y - cy;
      if (x < -40 || x > VW + 40 || y < -300 || y > VH + 60) continue;
      switch (d.type) {
        case 'window': drawTile(ctx, 'window', x, y); break;
        case 'banner': drawTile(ctx, 'banner', x, y); break;
        case 'chain':
          for (let i = 0; i < d.len; i++) drawTile(ctx, 'chain', x + 4, y + i * 16);
          break;
        case 'pillar': {
          const n = d.to - d.y / TILE;
          for (let i = 0; i <= n; i++) drawTile(ctx, i === 0 ? 'pillar_top' : i === n ? 'pillar_bot' : 'pillar_mid', x, y + i * TILE);
          break;
        }
        case 'torch':
          drawTile(ctx, 'sconce', x + 4, y + 6);
          drawTile(ctx, 'flame' + (Math.floor(t / 6 + d.x) % 4), x + 4, y - 5);
          break;
        case 'bed': case 'drawings':
          drawTile(ctx, d.type, x, y);
          break;
        // forest: things standing on the ground (d.y = the ground line)
        case 'tree': case 'tree_s': {
          const r = Sheets.tiles.f[d.type];
          drawTile(ctx, d.type, x - r[2] / 2 + 8, y - r[3]);
          break;
        }
        case 'bush': drawTile(ctx, 'bush' + (d.v || 0), x - 8, y - 16); break;
        case 'fern': drawTile(ctx, 'fern', x, y - 16); break;
        case 'flower': drawTile(ctx, 'flower' + (d.v || 0), x + 4, y - 8); break;
        case 'stump': drawTile(ctx, 'stump', x - 8, y - 16); break;
        // town
        case 'shopsign': drawTile(ctx, 'shopsign' + (d.v || 0), x, y); break;
        case 'flowerbox': drawTile(ctx, 'flowerbox', x, y); break;
        case 'cat': if (Math.floor(t / 400 + d.x) % 5) drawTile(ctx, 'cat', x + 2, y - 8); break;     // now and then it wanders off
        case 'smoke':                             // someone keeps a stove going behind the shutters
          for (let i = 0; i < 5; i++) {
            const k = ((t * 0.4 + i * 26 + d.x) % 130) / 130;
            const sx = x + 8 + Math.sin(k * 5 + i) * 3 + k * 10, sy = y - k * 60;
            ctx.fillStyle = `rgba(120,116,134,${0.35 * (1 - k)})`;
            ctx.fillRect(Math.round(sx - 2 - k * 3), Math.round(sy), Math.round(4 + k * 6), Math.round(3 + k * 3));
          }
          break;
        case 'candle': {
          drawTile(ctx, 'candle', x, y);
          const f = Math.floor(t / 7 + d.x) % 3;
          ctx.fillStyle = '#ffb040'; ctx.fillRect(Math.round(x) + 3, Math.round(y) - 3 - (f === 1 ? 1 : 0), 2, 3);
          ctx.fillStyle = '#fff4c0'; ctx.fillRect(Math.round(x) + 3 + (f === 2 ? 1 : 0), Math.round(y) - 1, 1, 1);
          break;
        }
        case 'rope':
          if (d.fallen && d.fallT > 36) break;
          ctx.globalAlpha = d.fallen ? 1 - d.fallT / 36 : 1;
          for (let i = 0; i < d.len; i++) {
            const drop = d.fallen ? d.fallT * d.fallT * 0.12 : 0;
            drawTile(ctx, 'rope', x + (d.fallen ? Math.sin(i + d.fallT * 0.3) * 2 : Math.sin(t * 0.03 + i * 0.4) * 0.6), y + i * 16 + drop);
          }
          ctx.globalAlpha = 1;
          break;
      }
    }
  }

  // decor drawn over the foreground tiles (ceiling hole, fallen rubble)
  drawDecorFront(ctx, cx, cy) {
    for (const d of this.decor) {
      const x = d.x - cx, y = d.y - cy;
      if (x < -60 || x > VW + 20 || y < -40 || y > VH + 20) continue;
      if (d.type === 'hole') drawTile(ctx, 'hole', x, y);
      if (d.type === 'rubble' && d.shown) drawTile(ctx, 'rubble', x, y);
    }
  }
}

// ---------------------------------------------------------------------------
// Physical body (feet-anchored box) with pixel-stepped collision
// ---------------------------------------------------------------------------
class Body {
  constructor(x, y, hw, h) {
    this.x = x; this.y = y; this.hw = hw; this.h = h;
    this.vx = 0; this.vy = 0; this.onGround = false; this.facing = 1;
  }
  box(x = this.x, y = this.y) { return { x0: x - this.hw, y0: y - this.h, x1: x + this.hw, y1: y }; }
  hitAt(world, x, y) { return world.boxHit(x - this.hw, y - this.h, x + this.hw, y, this); }
  move(world, dx, dy) {
    let hitX = null, hitY = null;
    if (dx) hitX = this.stepAxis(world, dx, 0);
    if (dy) hitY = this.stepAxis(world, 0, dy);
    return [hitX, hitY];
  }
  stepAxis(world, dx, dy) {
    const d = dx || dy, s = sign(d);
    let rem = Math.abs(d);
    while (rem > 1e-6) {
      const st = Math.min(1, rem);
      const nx = this.x + (dx ? s * st : 0), ny = this.y + (dy ? s * st : 0);
      const hit = this.hitAt(world, nx, ny);
      if (!hit) { this.x = nx; this.y = ny; rem -= st; continue; }
      let f = st;
      for (let k = 0; k < 4; k++) {
        f /= 2;
        const fx = this.x + (dx ? s * f : 0), fy = this.y + (dy ? s * f : 0);
        if (!this.hitAt(world, fx, fy)) { this.x = fx; this.y = fy; }
      }
      return hit;
    }
    return null;
  }
  checkGround(world) {
    this.onGround = !!world.boxHit(this.x - this.hw, this.y, this.x + this.hw, this.y + 1, this);
    return this.onGround;
  }
  physics(world, maxFall = 5.5) {
    this.vy = Math.min(this.vy + GRAV, maxFall);
    const [hx, hy] = this.move(world, this.vx, this.vy);
    if (hx) this.vx = 0;
    const wasGround = this.onGround;
    if (hy) {
      if (this.vy > 0) { this.y = Math.round(this.y * 4) / 4; }
      this.landedSpeed = this.vy;
      this.vy = 0;
    }
    this.checkGround(world);
    this.justLanded = !wasGround && this.onGround;
    return hx;
  }
}
