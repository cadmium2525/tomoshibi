'use strict';
// ---------------------------------------------------------------------------
// Stage editor (editor.html). Edits a chapter's stage - tiles, things, decor - on
// top of what its build() makes, test-plays it in the game (index.html?test) and
// saves it to src/stage_edits.js through tools/devserver.py.
// ---------------------------------------------------------------------------
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const clone = (v) => JSON.parse(JSON.stringify(v));

// ---- what can be placed ----------------------------------------------------------
// cat: 基本 / 収集物 / 敵 / 仕掛け / 章の特別なもの; ch: chapters it was made for (others: may not work)
const ENT = {
  hero: { label: 'グレイ（開始位置）', cat: '基本', col: '#c89060', unique: true, desc: '章が始まるときの グレイの位置。' },
  heroine: { label: 'ルミナ（開始位置）', cat: '基本', col: '#ffe9a8', unique: true, desc: '章が始まるときの ルミナの位置。' },
  shrine: { label: '灯籠', cat: '基本', col: '#80e0ff', id: 's', desc: 'ルミナが通ると灯り、やられたときの再開地点になる（試練では灯らない）。' },
  sign: { label: '立て札・碑文', cat: '基本', col: '#b0a080', def: { text: '<span class="name">立て札：</span>ここに 文を 書く' }, desc: '近づくと 文が出る。' },
  shard: { label: '影絵の欠片', cat: '収集物', col: '#c8a8ff', desc: 'ルミナの影の記憶。右の欄で 文を書く。' },
  page: { label: '手記の頁', cat: '収集物', col: '#f0e0b0', desc: '拾うと読める頁。右の欄で 題と本文を書く。' },
  ambush: { label: '待ち伏せ', cat: '敵', col: '#b060ff', id: 'a', desc: '範囲にグレイが入ると 影が波になって現れる。全部倒すまで続く。' },
  guard: { label: '消灯番（近衛）', cat: '敵', col: '#7080c0', id: 'gd', ch: [3, 6], desc: '範囲を見回り、ルミナの光を見つけると 連れて行く。外套で隠れる章向け。' },
  villager: { label: '影の村人', cat: '敵', col: '#6a5a9a', ch: [5], desc: '範囲をうろつく影。外套をかぶったルミナには 気づかない。' },
  gate: { label: '門（格子）', cat: '仕掛け', col: '#8a8aa0', id: 'g', def: { }, desc: 'レバー・感圧板などに つなぐと開く。高さ3マス。' },
  lever: { label: 'レバー', cat: '仕掛け', col: '#d0a040', id: 'l', def: { gates: [] }, desc: 'グレイが ↑ で引く。「つながる先」の門などが開く。' },
  plate: { label: '感圧板', cat: '仕掛け', col: '#a0a0c0', id: 'p', def: { gates: [] }, ch: [1, 2, 3], desc: 'ルミナか重し石が乗っている間、つながる門が開く。' },
  block: { label: '重し石', cat: '仕掛け', col: '#9a8a70', id: 'b', ch: [1, 2, 3], desc: 'グレイが持ち上げて運べる石。' },
  crumble: { label: '崩れる床板', cat: '仕掛け', col: '#a07040', ch: [1, 3], desc: 'グレイが乗ると すぐ落ちる板（ルミナは平気）。' },
  lightbridge: { label: '光の橋・落とし戸', cat: '仕掛け', col: '#ffe070', id: 'br', def: { w: 3 }, desc: '動力が入ると 現れる橋。「通電で開く」をオンにすると 落とし戸になる。' },
  rock: { label: '落石', cat: '仕掛け', col: '#807870', ch: [1], desc: '近づくと 天井から落ちてくる岩。' },
  pole: { label: '竿の足場', cat: '仕掛け', col: '#9a7a54', def: { w: 2 }, desc: 'グレイだけが乗れる細い足場（↓で降りる）。' },
  nook: { label: '隠れ場所', cat: '仕掛け', col: '#405070', def: { w: 3 }, ch: [3, 6], desc: 'ここで待たせると 消灯番に見つからない。' },
  lamp: { label: '街灯', cat: '仕掛け', col: '#ffc060', id: 'L', ch: [3, 6], desc: 'ルミナが灯すと 周りが明るくなる。消灯番は消しに来る。' },
  candle: { label: '燭台', cat: '仕掛け', col: '#ffb040', id: 'c', ch: [6], desc: '壁に ルミナの影を落とす灯り。' },
  slatch: { label: '影の留め金', cat: '仕掛け', col: '#8060c0', id: 'lt', def: { gates: [], min: 2.6 }, ch: [6], desc: 'ルミナの影が ちょうどの大きさで触れると外れる。' },
  veil: { label: '影の帳', cat: '仕掛け', col: '#503080', id: 'V', def: { h: 4 }, ch: [6], desc: '二つの光で はさむと 薄れて通れる。' },
  pedestal: { label: '光の台座', cat: '仕掛け', col: '#ffe0a0', id: 'P', ch: [4], desc: 'ルミナが乗ると 光を放つ。' },
  mirror: { label: '鏡', cat: '仕掛け', col: '#a0d0ff', id: 'M', ch: [4], desc: '光を 90° 曲げる。グレイが ↑ で回す。' },
  receptor: { label: '受光器', cat: '仕掛け', col: '#60e0c0', id: 'R', def: { gates: [] }, ch: [4], desc: '光が当たると つながる仕掛けを動かす。' },
  lift: { label: '昇降台', cat: '仕掛け', col: '#a09070', id: 'Lf', def: { w: 3, dy: -6, src: [] }, ch: [4], desc: '動力（受光器など）が入ると 動く台。' },
  marker: { label: '道しるべ', cat: '仕掛け', col: '#c0c0a0', id: 'm', ch: [2, 3], desc: '霧の森などの 目印。' },
  sanctuary: { label: '安全地帯', cat: '仕掛け', col: '#60a080', ch: [3], desc: 'ここから 範囲の右端まで 影が近づかない。' },
  door: { label: '封じられた扉', cat: '章の特別なもの', col: '#806040', ch: [1], desc: '待ち伏せ a2 を倒すと開く扉。' },
  escape: { label: '崩落の始まり', cat: '章の特別なもの', col: '#ff6060', id: 'esc', ch: [1, 3, 5], desc: 'ここに着くと 崩落からの逃走が始まる。' },
  exit: { label: '出口', cat: '章の特別なもの', col: '#60ff90', ch: [1, 3, 5], desc: '二人で着くと 章クリア。' },
  lookout: { label: '見晴らし（出口）', cat: '章の特別なもの', col: '#60ff90', ch: [2], desc: '二人で着くと 章クリア。' },
  doorway: { label: '戸口', cat: '章の特別なもの', col: '#806040', ch: [2] },
  dawn: { label: '夜明けの丘（防衛）', cat: '章の特別なもの', col: '#ffa060', ch: [2], desc: 'ここから 範囲の右端まで入ると 夜明けまでの防衛戦。' },
  mist: { label: '霧', cat: '章の特別なもの', col: '#a0a0c0', ch: [2] },
  marta: { label: 'マルタ', cat: '章の特別なもの', col: '#e0a0a0', ch: [3] },
  npcspot: { label: '人の立ち位置', cat: '章の特別なもの', col: '#e0a0a0', ch: [3] },
  logbook: { label: '灯守りの記録', cat: '章の特別なもの', col: '#f0e0b0', ch: [4] },
  boss: { label: '大蛾の間', cat: '章の特別なもの', col: '#ff6060', ch: [4], desc: 'ボス戦の部屋（範囲）。' },
  greatlamp: { label: '大灯', cat: '章の特別なもの', col: '#ffe060', ch: [4] },
  playwall: { label: '影絵の壁', cat: '章の特別なもの', col: '#c0a0ff', ch: [5] },
  whale: { label: '影鯨の海', cat: '章の特別なもの', col: '#ff6060', ch: [5], desc: 'ボス戦の範囲と 海面の高さ。' },
  ookage: { label: '眠る大影', cat: '章の特別なもの', col: '#503070', ch: [5] },
  chapel: { label: '礼拝堂（灯竿に火）', cat: '章の特別なもの', col: '#ffb040', ch: [6] },
  finalboss: { label: '玉座の間（大影）', cat: '章の特別なもの', col: '#ff6060', ch: [6], desc: '最後の戦いの範囲。' },
  epilogue: { label: '夕暮れの街の始まり', cat: '章の特別なもの', col: '#ffb080', ch: [6] },
  epiend: { label: '夕暮れの街の終わり', cat: '章の特別なもの', col: '#ffb080', ch: [6] },
};
const CATS = ['基本', '収集物', '敵', '仕掛け', '章の特別なもの'];

// what the fields mean (anything else is shown as it is)
const FIELDS = {
  id: ['ID（名前）', 'text'],
  text: ['文（そのまま書くか、章の文のキー）', 'textarea'],
  hidden: ['近づくまで 見えない', 'bool'],
  gates: ['つながる先（ID、地図で選べる）', 'ids'],
  src: ['動力（ID、地図で選べる）', 'ids'],
  guard: ['見張る消灯番（ID）', 'id'],
  w: ['幅（マス）', 'num'],
  h: ['高さ（マス）', 'num'],
  x0: ['範囲の左端（列）', 'num'],
  x1: ['範囲の右端（列）', 'num'],
  y0: ['上端（行）', 'num'],
  sea: ['海面の高さ（行）', 'num'],
  dir: ['向き（1 右 ／ -1 左）', 'num'],
  turn: ['振り向く間隔（フレーム、60で1秒）', 'num'],
  wood: ['木の門', 'bool'],
  dx: ['横のずらし（ピクセル）', 'num'],
  log: ['丸太の見た目', 'bool'],
  invert: ['通電で開く（落とし戸）', 'bool'],
  min: ['影の大きさ 下限', 'num'],
  max: ['影の大きさ 上限', 'num'],
  fixed: ['はじめから灯っている', 'bool'],
  hold: ['光をためておく時間（フレーム）', 'num'],
  dy: ['動く量（マス、上はマイナス）', 'num'],
  speed: ['速さ', 'num'],
  hop: ['はねる', 'num'],
  lift: ['乗る昇降台（ID）', 'id'],
  kind: ['種類', 'text'],
  look: ['見る向き', 'num'],
  lamp: ['灯り', 'text'],
  name: ['名前', 'text'],
};
const TILE_X = ['x0', 'x1'], TILE_Y = ['y0', 'sea'];

// decor types, and whether their y is the ground line (true) or the top-left corner
const DECOR = {
  window: ['窓', 1, false], banner: ['旗', 1, false], chain: ['鎖', 1, false], pillar: ['柱', 1, false], torch: ['燭台（壁）', 1, false],
  candle: ['ろうそく', 1, false], bed: ['寝台', 1, false], drawings: ['落書き', 1, false], rope: ['縄', 1, false], hole: ['天井の穴', 1, false],
  tree: ['木', 2, true], tree_s: ['小さな木', 2, true], bush: ['茂み', 2, true], fern: ['しだ', 2, true], flower: ['花', 2, true], stump: ['切り株', 2, true],
  poster: ['貼り紙', 3, false], barrel: ['樽', 3, false], bwindow: ['窓（街）', 3, false], chimney: ['煙突', 3, false], laundry: ['洗濯物', 3, false],
  shopsign: ['看板', 3, false], flowerbox: ['花箱', 3, false], smoke: ['煙', 3, false], cat: ['猫', 3, false],
  twindow: ['窓（塔）', 4, false], gear: ['歯車', 4, false],
  shut: ['閉じた窓（谷）', 5, true], slaundry: ['影の洗濯物', 5, false],
  portrait: ['肖像画', 6, true], kwindow: ['城の窓', 6, true], throne: ['玉座', 6, true],
};
const DECOR_DEF = { chain: { len: 3 }, rope: { len: 4 }, pillar: { to: 0 } };

// ---- state -------------------------------------------------------------------------
const ED = {
  n: 1, S: null, world: null, decorCv: null, dirtyTiles: new Set(), renderTimer: 0,
  cam: { x: 0, y: 0, z: 2 }, tool: 'select', mat: 1, bg: 0, brush: 1, entType: 'shrine', decType: 'window',
  axis: 'col', count: 4, sel: null, undo: [], redo: [], testStart: null, clip: null, region: null, paste: false,
  mouse: { sx: 0, sy: 0, mx: 0, my: 0, tx: 0, ty: 0, in: false }, drag: null, space: false, pick: null,
  saved: {}, baseline: '', draftTimer: 0,
};
const ZOOMS = [0.25, 0.5, 0.75, 1, 1.5, 2, 3, 4];
const cv = $('cv'), ctx = cv.getContext('2d'), mini = $('mini'), mctx = mini.getContext('2d');

// ---- stage data ----------------------------------------------------------------------
function textsFor(n, d) {
  return d && d.shards ? { shards: clone(d.shards), pages: clone(d.pages || {}) } : clone(ORIG_TEXTS[n]);
}
function stateFrom(stage, n, texts) {
  return {
    W: stage.W, H: stage.H, solid: new Uint8Array(stage.solid), noBg: new Uint8Array(stage.noBg),
    soft: stage.soft ? new Uint8Array(stage.soft) : null,
    ents: clone(stage.ents), decor: clone(stage.decor || []), darks: clone(stage.darks || []), name: stage.name,
    shards: texts.shards, pages: texts.pages,
  };
}
// the chapter as saved (what the game plays): layers packed, texts only for what is placed
function packState(S) {
  const d = packStage({ W: S.W, H: S.H, solid: S.solid, noBg: S.noBg, soft: S.soft, ents: S.ents, decor: S.decor, darks: S.darks, name: S.name });
  if (!d.soft) delete d.soft;
  const has = (t) => S.ents.filter((e) => e.type === t).map((e) => e.id);
  d.shards = {}; for (const id of has('shard')) d.shards[id] = S.shards[id] || '';
  d.pages = {}; for (const id of has('page')) d.pages[id] = S.pages[id] || { title: '手記', body: '<p></p>' };
  return d;
}
function origPacked(n) {
  const T = ORIG_TEXTS[n];
  return packState(stateFrom(CHAPTERS[n].build(), n, clone(T)));
}

function openChapter(n, { fromDraft = true } = {}) {
  ED.n = n;
  const saved = ED.saved[n];
  let d = saved || null, S;
  const draft = readDraft(n);
  const base = saved ? JSON.stringify(saved) : JSON.stringify(origPacked(n));
  if (fromDraft && draft && JSON.stringify(draft.data) !== base) {
    if (confirm(`第${n}章に 保存していない編集途中のデータがあります。\n続きから編集しますか？\n（「キャンセル」で 下書きを捨てて ${saved ? '保存済み' : '元'}の状態を開きます）`)) {
      d = draft.data; ED.testStart = draft.testStart || null;
    } else { clearDraft(n); ED.testStart = null; }
  } else ED.testStart = draft ? draft.testStart || null : null;
  S = d ? stateFrom(unpackStage(d), n, textsFor(n, d)) : stateFrom(CHAPTERS[n].build(), n, clone(ORIG_TEXTS[n]));
  ED.S = S; ED.baseline = base;
  ED.undo = []; ED.redo = []; ED.sel = null; ED.region = null; ED.paste = false; ED.pick = null;
  $('chapterSel').value = n;
  $('optFireL').style.display = n === 6 ? '' : 'none';
  rebuildWorld(); rebuildDecor();
  const hero = S.ents.find((e) => e.type === 'hero');
  ED.cam.z = 2; centerOn(hero ? hero.x : 0, hero ? hero.y - 40 : 0);
  buildPalette(); inspect(); changed(false);
}

// ---- drafts (kept in this browser until saved) ------------------------------------------
const DRAFT = (n) => 'lumina.editor.draft.' + n;
function readDraft(n) { try { return JSON.parse(localStorage.getItem(DRAFT(n))); } catch (e) { return null; } }
function clearDraft(n) { try { localStorage.removeItem(DRAFT(n)); } catch (e) { /* ignore */ } }
function writeDraft() {
  const data = packState(ED.S), same = JSON.stringify(data) === ED.baseline;
  try {
    if (same && !ED.testStart) localStorage.removeItem(DRAFT(ED.n));
    else localStorage.setItem(DRAFT(ED.n), JSON.stringify({ data, testStart: ED.testStart, at: Date.now() }));
  } catch (e) { /* storage full: carry on */ }
  $('dirty').textContent = same ? '' : '● 未保存の変更あり';
}

// something was changed: redraw, recheck, keep a draft
function changed(tiles = true) {
  if (tiles) scheduleRender();
  runChecks();
  clearTimeout(ED.draftTimer); ED.draftTimer = setTimeout(writeDraft, 400);
  drawMini();
}

// ---- undo ----------------------------------------------------------------------------------
function snap() {
  const S = ED.S;
  return { W: S.W, H: S.H, solid: S.solid.slice(), noBg: S.noBg.slice(), soft: S.soft ? S.soft.slice() : null,
    rest: JSON.stringify({ ents: S.ents, decor: S.decor, darks: S.darks, shards: S.shards, pages: S.pages, start: ED.testStart }) };
}
function restore(s) {
  const S = ED.S, r = JSON.parse(s.rest);
  const sized = S.W !== s.W || S.H !== s.H;
  Object.assign(S, { W: s.W, H: s.H, solid: s.solid, noBg: s.noBg, soft: s.soft, ents: r.ents, decor: r.decor, darks: r.darks, shards: r.shards, pages: r.pages });
  ED.testStart = r.start; ED.sel = null;
  if (sized) rebuildWorld();
  rebuildDecor(); inspect(); changed();
}
function pushUndo() { ED.undo.push(snap()); if (ED.undo.length > 120) ED.undo.shift(); ED.redo = []; }
function undo() { if (!ED.undo.length) return; ED.redo.push(snap()); restore(ED.undo.pop()); toast('元に戻しました'); }
function redo() { if (!ED.redo.length) return; ED.undo.push(snap()); restore(ED.redo.pop()); toast('やり直しました'); }

// ---- the look (the game's own tile renderer) ---------------------------------------------------
function rebuildWorld() {
  const S = ED.S;
  ED.world = new World({ W: S.W, H: S.H, solid: S.solid, noBg: S.noBg, soft: S.soft, decor: [] }, CHAPTERS[ED.n].theme);
  ED.dirtyTiles.clear();
  sizeMini();
}
function scheduleRender() {
  clearTimeout(ED.renderTimer);
  ED.renderTimer = setTimeout(() => { if (!ED.drag || !ED.drag.paint) rebuildWorld(); else scheduleRender(); }, 180);
}
function rebuildDecor() {
  const S = ED.S, c = ED.decorCv || document.createElement('canvas');
  c.width = S.W * TILE; c.height = S.H * TILE;
  const g = c.getContext('2d'); g.imageSmoothingEnabled = false;
  for (const d of S.decor) {
    // (the game's decor drawer skips what is off its 384x216 screen: draw each one near the origin)
    const ox = d.x - 100, oy = d.y - 150;
    g.save(); g.translate(ox, oy);
    try { World.prototype.drawDecor.call({ decor: [d] }, g, ox, oy, 0); } catch (e) { /* unknown decor */ }
    g.restore();
  }
  ED.decorCv = c;
}

// ---- geometry ------------------------------------------------------------------------------
const tileOf = (px) => Math.floor(px / TILE);
function entBox(e) {
  const x = e.x, y = e.y, w = (e.w || 1) * TILE;
  switch (e.type) {
    case 'hero': case 'heroine': case 'guard': case 'villager': case 'marta': case 'npcspot': return { x: x - 8, y: y - 40, w: 16, h: 40 };
    case 'gate': return { x: x - 8, y: y - 16, w: 16, h: 48 };
    case 'shrine': return { x: x - 8, y: y - 28, w: 16, h: 28 };
    case 'lamp': return { x: x - 8, y: y - 48, w: 16, h: 48 };
    case 'candle': case 'marker': return { x: x - 8, y: y - 32, w: 16, h: 32 };
    case 'pole': case 'crumble': case 'lightbridge': return { x: x - 8, y: y - 3, w: e.type === 'crumble' ? 16 : w, h: 8 };
    case 'lift': return { x: x - 8, y: y - 2, w: (e.w || 3) * TILE, h: 10 };
    case 'nook': return { x: x - 8, y: y - 16, w, h: 16 };
    case 'veil': return { x: x - 6, y: y - (e.h || 4) * TILE, w: 12, h: (e.h || 4) * TILE };
    case 'greatlamp': return { x: x - 24, y: y - 56, w: 48, h: 56 };
    case 'door': case 'exit': return { x: x - 16, y: y - 48, w: 32, h: 48 };
    default: return { x: x - 8, y: y - 16, w: 16, h: 16 };
  }
}
function decorBox(d) {
  const ground = DECOR[d.type] && DECOR[d.type][2];
  return ground ? { x: d.x - 8, y: d.y - 16, w: 16, h: 16 } : { x: d.x, y: d.y, w: 16, h: 16 };
}
const inBox = (b, x, y) => x >= b.x && x < b.x + b.w && y >= b.y && y < b.y + b.h;
const rangeFields = (e) => ('x0' in e && 'x1' in e ? ['x0', 'x1'] : 'x1' in e ? ['x1'] : []);
function rangeY(e) { return e.y - 4; }
function rangeHandles(e) {
  const hs = [], y = rangeY(e);
  if ('x0' in e) hs.push({ f: 'x0', x: e.x0 * TILE, y });
  if ('x1' in e) hs.push({ f: 'x1', x: (e.x1 + 1) * TILE, y });
  return hs;
}

function hitTest(mx, my) {
  const S = ED.S, z = ED.cam.z, r = 5 / z;
  const sel = ED.sel;
  if (sel && sel.kind === 'ent') {
    for (const h of rangeHandles(sel.e)) if (Math.abs(mx - h.x) < r + 2 && Math.abs(my - h.y) < r + 2) return { kind: 'handle', e: sel.e, f: h.f };
    if (sel.e.type === 'ambush') {
      for (const [wi, w] of sel.e.waves.entries()) for (const [pi, p] of w.entries()) {
        const px = p.tx * TILE + 8, py = (p.ty + 1) * TILE;
        if (mx > px - 8 && mx < px + 8 && my > py - (p.fly ? 130 : 40) && my < py - (p.fly ? 90 : 0)) return { kind: 'spawn', e: sel.e, wi, pi };
      }
    }
  }
  for (let i = S.ents.length - 1; i >= 0; i--) if (inBox(entBox(S.ents[i]), mx, my)) return { kind: 'ent', e: S.ents[i] };
  for (let i = S.decor.length - 1; i >= 0; i--) if (inBox(decorBox(S.decor[i]), mx, my)) return { kind: 'decor', d: S.decor[i] };
  const tx = tileOf(mx), ty = tileOf(my);
  for (const dk of S.darks) if (tx >= dk[0] && tx <= dk[2] && ty >= dk[1] && ty <= dk[3]) return { kind: 'dark', dk };
  return null;
}

// ---- tiles ---------------------------------------------------------------------------------
function setTile(tx, ty, layer, v) {
  const S = ED.S;
  if (tx < 0 || ty < 0 || tx >= S.W || ty >= S.H) return;
  const i = ty * S.W + tx;
  if (layer === 'solid') {
    if (v === 3 || v === 4) {                             // shadow road / light moss (chapter 5)
      if (!S.soft) S.soft = new Uint8Array(S.W * S.H);
      if (S.soft[i] === v - 2 && !S.solid[i]) return;
      S.soft[i] = v - 2; S.solid[i] = 0;
    } else {
      if (S.solid[i] === v && !(S.soft && S.soft[i])) return;
      S.solid[i] = v; if (S.soft) S.soft[i] = 0;
    }
  } else {
    if (S.noBg[i] === v) return;
    S.noBg[i] = v;
  }
  ED.dirtyTiles.add(i);
}
function paintAt(tx, ty, layer, v) {
  const b = ED.brush, o = Math.floor((b - 1) / 2);
  for (let y = 0; y < b; y++) for (let x = 0; x < b; x++) setTile(tx - o + x, ty - o + y, layer, v);
}
function paintLine(a, b, layer, v) {
  const n = Math.max(Math.abs(b.tx - a.tx), Math.abs(b.ty - a.ty), 1);
  for (let i = 0; i <= n; i++) paintAt(Math.round(a.tx + (b.tx - a.tx) * i / n), Math.round(a.ty + (b.ty - a.ty) * i / n), layer, v);
}
function rectNorm(a, b) { return [Math.min(a.tx, b.tx), Math.min(a.ty, b.ty), Math.max(a.tx, b.tx), Math.max(a.ty, b.ty)]; }

// ---- inserting / removing columns and rows (everything to the right / below moves along) -----
function shiftThings(axis, at, n) {
  const S = ED.S, px = n * TILE, horiz = axis === 'col';
  const moveE = (e) => {
    if (horiz) {
      if (e.x >= at * TILE) e.x += px;
      for (const f of TILE_X) if (typeof e[f] === 'number' && e[f] >= at) e[f] += n;
      if (e.type === 'ambush') for (const w of e.waves) for (const p of w) if (p.tx >= at) p.tx += n;
    } else {
      if (e.y > at * TILE) e.y += px;
      for (const f of TILE_Y) if (typeof e[f] === 'number' && e[f] >= at) e[f] += n;
      if (e.type === 'ambush') for (const w of e.waves) for (const p of w) if (p.ty >= at) p.ty += n;
    }
  };
  S.ents.forEach(moveE);
  for (const d of S.decor) { if (horiz) { if (d.x >= at * TILE) d.x += px; } else if (d.y >= at * TILE) d.y += px; }
  for (const dk of S.darks) {
    const [a, b] = horiz ? [0, 2] : [1, 3];
    if (dk[a] >= at) dk[a] += n;
    if (dk[b] >= at) dk[b] += n;
  }
  if (ED.testStart) { if (horiz && ED.testStart.x >= at * TILE) ED.testStart.x += px; if (!horiz && ED.testStart.y > at * TILE) ED.testStart.y += px; }
}
function insertLines(axis, at, n) {
  const S = ED.S, W = S.W, H = S.H;
  const horiz = axis === 'col', W2 = horiz ? W + n : W, H2 = horiz ? H : H + n;
  const src = Math.min(at, (horiz ? W : H) - 1);       // the new lines copy the one they are put before
  const grow = (a) => {
    if (!a) return a;
    const b = new Uint8Array(W2 * H2);
    for (let y = 0; y < H2; y++) for (let x = 0; x < W2; x++) {
      let sx = x, sy = y;
      if (horiz) sx = x < at ? x : x < at + n ? src : x - n; else sy = y < at ? y : y < at + n ? src : y - n;
      b[y * W2 + x] = a[sy * W + sx];
    }
    return b;
  };
  S.solid = grow(S.solid); S.noBg = grow(S.noBg); S.soft = grow(S.soft); S.W = W2; S.H = H2;
  shiftThings(axis, at, n);
}
function deleteLines(axis, at, n) {
  const S = ED.S, W = S.W, H = S.H, horiz = axis === 'col';
  n = Math.min(n, (horiz ? W : H) - at - 1);
  if (n <= 0) return 0;
  const W2 = horiz ? W - n : W, H2 = horiz ? H : H - n;
  const shrink = (a) => {
    if (!a) return a;
    const b = new Uint8Array(W2 * H2);
    for (let y = 0; y < H2; y++) for (let x = 0; x < W2; x++) {
      const sx = horiz && x >= at ? x + n : x, sy = !horiz && y >= at ? y + n : y;
      b[y * W2 + x] = a[sy * W + sx];
    }
    return b;
  };
  // what stands in the removed lines goes too (the two start markers are pushed to the edge instead)
  const gone = [];
  S.ents = S.ents.filter((e) => {
    const t = horiz ? tileOf(e.x) : e.y / TILE - 1;
    if (t >= at && t < at + n) {
      if (e.type === 'hero' || e.type === 'heroine') { if (horiz) e.x = at * TILE + 8; else e.y = (at + 1) * TILE; return true; }
      gone.push(ENT[e.type] ? ENT[e.type].label : e.type); return false;
    }
    return true;
  });
  S.decor = S.decor.filter((d) => { const t = tileOf(horiz ? d.x : d.y); return !(t >= at && t < at + n); });
  S.darks = S.darks.filter((dk) => !(horiz ? dk[0] >= at && dk[2] < at + n : dk[1] >= at && dk[3] < at + n));
  S.solid = shrink(S.solid); S.noBg = shrink(S.noBg); S.soft = shrink(S.soft); S.W = W2; S.H = H2;
  shiftThings(axis, at + n, -n);
  // ranges that ended inside the removed part are clipped to it
  for (const e of S.ents) for (const f of horiz ? TILE_X : TILE_Y) if (typeof e[f] === 'number' && e[f] >= at && e[f] < at + n) e[f] = at;
  if (gone.length) toast(`消えたもの：${gone.join('、')}`);
  return n;
}

// ---- region copy / paste ---------------------------------------------------------------------
function copyRegion() {
  const r = ED.region, S = ED.S;
  if (!r) { toast('先に「範囲」でドラッグして 範囲を選んでください'); return; }
  const [x0, y0, x1, y1] = r, w = x1 - x0 + 1, h = y1 - y0 + 1;
  const layer = (a) => { if (!a) return null; const b = new Uint8Array(w * h); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) b[y * w + x] = a[(y0 + y) * S.W + x0 + x]; return b; };
  const inR = (px, py) => tileOf(px) >= x0 && tileOf(px) <= x1 && py / TILE - 1 >= y0 && py / TILE - 1 <= y1;
  ED.clip = {
    w, h, solid: layer(S.solid), noBg: layer(S.noBg), soft: layer(S.soft),
    ents: clone(S.ents.filter((e) => e.type !== 'hero' && e.type !== 'heroine' && inR(e.x, e.y))).map((e) => relEnt(e, -x0, -y0)),
    decor: clone(S.decor.filter((d) => tileOf(d.x) >= x0 && tileOf(d.x) <= x1 && tileOf(d.y - 1) >= y0 && tileOf(d.y - 1) <= y1)).map((d) => ({ ...d, x: d.x - x0 * TILE, y: d.y - y0 * TILE })),
  };
  toast(`コピーしました（${w}×${h}マス、物 ${ED.clip.ents.length}）。Ctrl+V で貼り付け`);
}
function relEnt(e, dx, dy) {
  e.x += dx * TILE; e.y += dy * TILE;
  for (const f of TILE_X) if (typeof e[f] === 'number') e[f] += dx;
  for (const f of TILE_Y) if (typeof e[f] === 'number') e[f] += dy;
  if (e.type === 'ambush') for (const w of e.waves) for (const p of w) { p.tx += dx; p.ty += dy; }
  return e;
}
function pasteAt(tx, ty) {
  const c = ED.clip, S = ED.S;
  if (!c) return;
  pushUndo();
  for (let y = 0; y < c.h; y++) for (let x = 0; x < c.w; x++) {
    const X = tx + x, Y = ty + y;
    if (X < 0 || Y < 0 || X >= S.W || Y >= S.H) continue;
    const i = Y * S.W + X, j = y * c.w + x;
    S.solid[i] = c.solid[j]; S.noBg[i] = c.noBg[j];
    if (c.soft || S.soft) { if (!S.soft) S.soft = new Uint8Array(S.W * S.H); S.soft[i] = c.soft ? c.soft[j] : 0; }
  }
  // pasted things get names of their own (links among them follow)
  const ren = {};
  const ents = clone(c.ents).map((e) => relEnt(e, tx, ty));
  for (const e of ents) if (e.id) { const nid = e.type === 'shard' || e.type === 'page' ? newId(e.type) : uniqueId(e.id); ren[e.id] = nid; reserve(nid); e.id = nid; }
  for (const e of ents) {
    for (const f of ['gates', 'src']) if (Array.isArray(e[f])) e[f] = e[f].map((id) => ren[id] || id);
    if (e.guard && ren[e.guard]) e.guard = ren[e.guard];
    if (e.type === 'shard') S.shards[e.id] = S.shards[e.id] || '（あたらしい 欠片の ことば）';
    if (e.type === 'page') S.pages[e.id] = S.pages[e.id] || { title: '手記', body: '<p>（本文）</p>' };
  }
  reserved.clear();
  S.ents.push(...ents);
  S.decor.push(...clone(c.decor).map((d) => ({ ...d, x: d.x + tx * TILE, y: d.y + ty * TILE })));
  for (let y = 0; y < c.h; y++) for (let x = 0; x < c.w; x++) ED.dirtyTiles.add((ty + y) * S.W + tx + x);
  rebuildDecor(); changed();
  toast('貼り付けました');
}

// ---- ids -------------------------------------------------------------------------------------
const reserved = new Set();
function reserve(id) { reserved.add(id); }
function usedIds() {
  const s = new Set(reserved);
  for (const e of ED.S.ents) if (e.id) s.add(e.id);
  // fragments and pages are counted over the whole game: their ids must differ from every chapter's
  for (const n in CHAPTERS) if (+n !== ED.n) { for (const k in CHAPTERS[n].shards || {}) s.add(k); for (const k in CHAPTERS[n].pages || {}) s.add(k); }
  return s;
}
function uniqueId(base) {
  const used = usedIds();
  if (!used.has(base)) return base;
  const m = base.match(/^(.*?)(\d+)$/), stem = m ? m[1] : base;
  for (let k = m ? +m[2] + 1 : 2; ; k++) if (!used.has(stem + k)) return stem + k;
}
function newId(type) {
  const pre = type === 'shard' ? `c${ED.n}f` : type === 'page' ? `c${ED.n}j` : ENT[type].id;
  const used = usedIds();
  for (let k = 1; ; k++) if (!used.has(pre + k)) return pre + k;
}

// ---- placing things -------------------------------------------------------------------------
function placeEnt(type, tx, ty) {
  const S = ED.S, info = ENT[type];
  pushUndo();
  if (info.unique) {
    const old = S.ents.find((e) => e.type === type);
    if (old) { old.x = tx * TILE + 8; old.y = (ty + 1) * TILE; select({ kind: 'ent', e: old }); changed(false); return; }
  }
  const e = { type, x: tx * TILE + 8, y: (ty + 1) * TILE };
  if (info.id) e.id = newId(type);
  Object.assign(e, clone(info.def || {}));
  if (type === 'shard') { e.id = newId('shard'); S.shards[e.id] = '（あたらしい 欠片の ことば）'; }
  if (type === 'page') { e.id = newId('page'); S.pages[e.id] = { title: `${CHAPTERS[ED.n].pageLabel || '灯守りの手記'}`, body: '<p>（本文）</p>' }; }
  if (type === 'guard' || type === 'villager' || type === 'boss' || type === 'finalboss' || type === 'whale') { e.x0 = tx - 5; e.x1 = tx + 5; }
  if (type === 'whale') e.sea = ty - 2;
  if (type === 'dawn' || type === 'sanctuary') e.x1 = tx + 8;
  if (type === 'ambush') { e.x0 = tx - 2; e.x1 = tx + 2; e.waves = [[{ tx: tx + 6, ty }]]; }
  if (type === 'playwall') { e.x0 = tx - 4; e.y0 = ty - 6; }
  S.ents.push(e);
  select({ kind: 'ent', e });
  changed(false);
}
function placeDecor(type, tx, ty) {
  pushUndo();
  const ground = DECOR[type][2];
  const d = { type, x: tx * TILE + (ground ? 8 : 0), y: (ground ? ty + 1 : ty) * TILE, ...clone(DECOR_DEF[type] || {}) };
  if (type === 'pillar') d.to = ty + 3;
  ED.S.decor.push(d); rebuildDecor();
  select({ kind: 'decor', d }); changed(false);
}
function removeHit(h) {
  const S = ED.S;
  if (!h) return;
  pushUndo();
  if (h.kind === 'ent') S.ents = S.ents.filter((e) => e !== h.e);
  else if (h.kind === 'decor') { S.decor = S.decor.filter((d) => d !== h.d); rebuildDecor(); }
  else if (h.kind === 'dark') S.darks = S.darks.filter((d) => d !== h.dk);
  else if (h.kind === 'spawn') { h.e.waves[h.wi].splice(h.pi, 1); }
  if (ED.sel && (ED.sel.e === h.e && h.kind !== 'spawn' || ED.sel.d === h.d || ED.sel.dk === h.dk)) ED.sel = null;
  inspect(); changed(false);
}
function deleteSelection() {
  const s = ED.sel;
  if (!s) return;
  if (s.kind === 'ent' && ENT[s.e.type] && ENT[s.e.type].unique) { toast('グレイとルミナの開始位置は 消せません（動かしてください）'); return; }
  removeHit(s);
}
function duplicateSelection() {
  const s = ED.sel;
  if (!s || s.kind !== 'ent' || (ENT[s.e.type] && ENT[s.e.type].unique)) return;
  pushUndo();
  const e = relEnt(clone(s.e), 1, 0);
  if (e.id) e.id = e.type === 'shard' || e.type === 'page' ? newId(e.type) : uniqueId(e.id);
  if (e.type === 'shard') ED.S.shards[e.id] = ED.S.shards[s.e.id] || '';
  if (e.type === 'page') ED.S.pages[e.id] = clone(ED.S.pages[s.e.id] || { title: '手記', body: '' });
  ED.S.ents.push(e); select({ kind: 'ent', e }); changed(false);
}
function select(s) { ED.sel = s; ED.pick = null; inspect(); }

// ---- view ----------------------------------------------------------------------------------
function resize() {
  const r = cv.getBoundingClientRect();
  cv.width = Math.max(1, Math.floor(r.width)); cv.height = Math.max(1, Math.floor(r.height));
  sizeMini();
}
function sizeMini() {
  const S = ED.S; if (!S) return;
  const maxW = Math.min(360, cv.width * 0.4), k = Math.min(maxW / S.W, 90 / S.H);
  mini.width = Math.max(1, Math.round(S.W * k)); mini.height = Math.max(1, Math.round(S.H * k));
  mini.k = k;
  drawMini();
}
function drawMini() {
  const S = ED.S; if (!S || !mini.k) return;
  const k = mini.k, W = S.W, img = mctx.createImageData(W, S.H);
  for (let i = 0; i < W * S.H; i++) {
    const s = S.solid[i], soft = S.soft && S.soft[i], o = i * 4;
    const c = s ? [110, 100, 130] : soft === 1 ? [70, 40, 120] : soft === 2 ? [60, 110, 60] : S.noBg[i] === 1 ? [26, 24, 48] : [14, 12, 22];
    img.data[o] = c[0]; img.data[o + 1] = c[1]; img.data[o + 2] = c[2]; img.data[o + 3] = 255;
  }
  const t = document.createElement('canvas'); t.width = W; t.height = S.H; t.getContext('2d').putImageData(img, 0, 0);
  mctx.imageSmoothingEnabled = false;
  mctx.drawImage(t, 0, 0, mini.width, mini.height);
  for (const e of S.ents) {
    const col = e.type === 'shard' || e.type === 'page' ? '#e0c0ff' : e.type === 'shrine' ? '#80e0ff' : e.type === 'hero' || e.type === 'heroine' ? '#ffe9a8' : null;
    if (!col) continue;
    mctx.fillStyle = col; mctx.fillRect(Math.round(e.x / TILE * k) - 1, Math.round((e.y / TILE - 1) * k) - 1, 3, 3);
  }
  if (miniCache) miniCache.stale = true;
  $('stSize').textContent = `${S.W} × ${S.H} マス`;
}
function centerOn(x, y) {
  ED.cam.x = x - cv.width / 2 / ED.cam.z; ED.cam.y = y - cv.height / 2 / ED.cam.z;
}
function setZoom(z, sx = cv.width / 2, sy = cv.height / 2) {
  const c = ED.cam, mx = c.x + sx / c.z, my = c.y + sy / c.z;
  c.z = z; c.x = mx - sx / z; c.y = my - sy / z;
  $('zlabel').textContent = Math.round(z * 100) + '%';
}
function stepZoom(d, sx, sy) {
  let i = ZOOMS.findIndex((z) => z >= ED.cam.z - 1e-6);
  if (i < 0) i = ZOOMS.length - 1;
  setZoom(ZOOMS[Math.max(0, Math.min(ZOOMS.length - 1, i + d))], sx, sy);
}

// ---- drawing --------------------------------------------------------------------------------
function drawEntIcon(g, e) {
  const x = e.x, y = e.y, info = ENT[e.type] || { col: '#888' };
  const tile = (name, dx, dy) => drawTile(g, name, x + dx, y + dy);
  switch (e.type) {
    case 'hero': drawSprite(g, 'hero', 'walk0', x, y); return;
    case 'heroine': drawSprite(g, 'heroine', 'idle0', x, y); return;
    case 'guard': drawSprite(g, 'guard', 'idle0', x, y, (e.dir || 1) < 0); return;
    case 'villager': g.globalAlpha = 0.8; drawSprite(g, 'shadow', 'walk0', x, y); g.globalAlpha = 1; return;
    case 'marta': drawSprite(g, 'npc', 'marta0', x, y); return;
    case 'shrine': tile('shrine_off', -8, -28); return;
    case 'gate': tile(e.wood ? 'woodgate' : 'gate', -8, -16); return;
    case 'lamp': tile('lamp_off', -8, -48); return;
    case 'candle': tile(e.fixed ? 'candle_on' : 'candle_off', -8, -32); return;
    case 'lever': tile('lever_off', -8, -16); return;
    case 'block': tile('block', -8, -16); return;
    case 'sign': tile('sign', -7, -16); return;
    case 'plate': tile('plate_off', -12, -6); return;
    case 'receptor': tile('receptor_off', -8, -16); return;
    case 'slatch': tile('latch_off', -8, -16); return;
    case 'pedestal': tile('pedestal', -8, -8); return;
    case 'marker': tile('marker', -8, -32); return;
    case 'greatlamp': tile('glamp_off', -24, -56); return;
    case 'door': case 'exit': tile('door', -22, -50); return;
    case 'pole': case 'crumble': {
      const w = e.type === 'crumble' ? 16 : (e.w || 1) * TILE;
      g.fillStyle = '#1a1014'; g.fillRect(x - 9, y, w + 2, 4);
      g.fillStyle = e.type === 'crumble' ? '#8a5a30' : '#7a5a3c'; g.fillRect(x - 8, y, w, 2);
      g.fillStyle = '#3a2620'; g.fillRect(x - 8, y + 2, 2, 6); g.fillRect(x - 8 + w - 2, y + 2, 2, 6);
      return;
    }
    case 'lightbridge': {
      const w = (e.w || 1) * TILE;
      g.fillStyle = e.invert ? 'rgba(160,120,70,0.8)' : 'rgba(255,224,112,0.45)'; g.fillRect(x - 8, y, w, e.invert ? 16 : 5);
      g.strokeStyle = '#ffe070'; g.lineWidth = 1; g.setLineDash([3, 2]); g.strokeRect(x - 8 + 0.5, y + 0.5, w - 1, (e.invert ? 16 : 5) - 1); g.setLineDash([]);
      return;
    }
    case 'lift': { const w = (e.w || 3) * TILE; g.fillStyle = '#a09070'; g.fillRect(x - 8, y, w, 6); g.fillStyle = '#5a4a38'; g.fillRect(x - 8, y + 6, w, 2);
      g.strokeStyle = 'rgba(160,144,112,0.6)'; g.setLineDash([2, 3]); g.strokeRect(x - 8 + 0.5, y + (e.dy || 0) * TILE + 0.5, w - 1, 7); g.setLineDash([]); return; }
    case 'nook': { const w = (e.w || 1) * TILE; g.fillStyle = 'rgba(40,60,110,0.45)'; g.fillRect(x - 8, y - 16, w, 16); return; }
    case 'veil': { const h = (e.h || 4) * TILE; g.fillStyle = 'rgba(60,20,100,0.7)'; g.fillRect(x - 5, y - h, 10, h); return; }
    case 'shard': {
      g.fillStyle = '#c8a8ff'; g.beginPath(); g.moveTo(x, y - 14); g.lineTo(x + 5, y - 8); g.lineTo(x, y - 2); g.lineTo(x - 5, y - 8); g.closePath(); g.fill();
      g.fillStyle = '#fff'; g.fillRect(x - 1, y - 10, 2, 2); return;
    }
    case 'page': g.fillStyle = '#f0e0b0'; g.fillRect(x - 5, y - 14, 10, 12); g.fillStyle = '#8a6a3a'; g.fillRect(x - 3, y - 11, 6, 1); g.fillRect(x - 3, y - 8, 6, 1); g.fillRect(x - 3, y - 5, 4, 1); return;
  }
  const b = entBox(e);
  g.fillStyle = info.col + 'aa'; g.fillRect(b.x + 1, b.y + 1, b.w - 2, b.h - 2);
  g.strokeStyle = info.col; g.lineWidth = 1; g.strokeRect(b.x + 1.5, b.y + 1.5, b.w - 3, b.h - 3);
}

function draw() {
  requestAnimationFrame(draw);
  const S = ED.S; if (!S || !ED.world) return;
  const c = ED.cam, z = c.z, W = cv.width, H = cv.height;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = '#07060c'; ctx.fillRect(0, 0, W, H);
  ctx.imageSmoothingEnabled = false;
  ctx.setTransform(z, 0, 0, z, -c.x * z, -c.y * z);
  const pw = S.W * TILE, ph = S.H * TILE, th = THEMES[CHAPTERS[ED.n].theme];
  // outdoors: the sky colour behind; then the game's own back wall, decor and rock
  ctx.fillStyle = th.sky ? th.sky.farFill : '#0e0c1a'; ctx.fillRect(0, 0, pw, ph);
  const w = ED.world;
  if (w.W === S.W && w.H === S.H) { ctx.drawImage(w.back, 0, 0); }
  ctx.drawImage(ED.decorCv, 0, 0);
  if (w.W === S.W && w.H === S.H) ctx.drawImage(w.front, 0, 0);
  // tiles changed since the last full render: plain colours until it catches up
  for (const i of ED.dirtyTiles) {
    const x = i % S.W, y = (i - x) / S.W;
    const soft = S.soft && S.soft[i];
    ctx.fillStyle = S.solid[i] ? '#5a5070' : soft === 1 ? '#3a2466' : soft === 2 ? '#2a5a2e' : S.noBg[i] === 1 ? (th.sky ? th.sky.farFill : '#141226') : S.noBg[i] === 2 ? '#3a3850' : '#26223a';
    ctx.fillRect(x * TILE, y * TILE, TILE, TILE);
  }
  // chapter 5's soft tiles (drawn by the game only by the light ring)
  if (S.soft) {
    for (let i = 0; i < S.soft.length; i++) {
      if (!S.soft[i]) continue;
      const x = i % S.W, y = (i - x) / S.W;
      ctx.fillStyle = S.soft[i] === 1 ? 'rgba(90,50,160,0.55)' : 'rgba(80,160,80,0.5)';
      ctx.fillRect(x * TILE, y * TILE, TILE, TILE);
    }
  }
  // dark areas
  ctx.lineWidth = 1 / z;
  for (const dk of S.darks) {
    const sel = ED.sel && ED.sel.dk === dk;
    ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(dk[0] * TILE, dk[1] * TILE, (dk[2] - dk[0] + 1) * TILE, (dk[3] - dk[1] + 1) * TILE);
    ctx.strokeStyle = sel ? '#ffd978' : 'rgba(150,140,200,0.6)'; ctx.setLineDash([4 / z, 3 / z]);
    ctx.strokeRect(dk[0] * TILE, dk[1] * TILE, (dk[2] - dk[0] + 1) * TILE, (dk[3] - dk[1] + 1) * TILE); ctx.setLineDash([]);
  }
  // grid
  const x0 = Math.max(0, Math.floor(c.x / TILE)), x1 = Math.min(S.W, Math.ceil((c.x + W / z) / TILE));
  const y0 = Math.max(0, Math.floor(c.y / TILE)), y1 = Math.min(S.H, Math.ceil((c.y + H / z) / TILE));
  if (z >= 1) {
    ctx.strokeStyle = 'rgba(255,255,255,0.06)'; ctx.beginPath();
    for (let x = x0; x <= x1; x++) { ctx.moveTo(x * TILE, y0 * TILE); ctx.lineTo(x * TILE, y1 * TILE); }
    for (let y = y0; y <= y1; y++) { ctx.moveTo(x0 * TILE, y * TILE); ctx.lineTo(x1 * TILE, y * TILE); }
    ctx.stroke();
  }
  ctx.strokeStyle = 'rgba(255,255,255,0.14)'; ctx.beginPath();
  for (let x = Math.ceil(x0 / 10) * 10; x <= x1; x += 10) { ctx.moveTo(x * TILE, y0 * TILE); ctx.lineTo(x * TILE, y1 * TILE); }
  for (let y = Math.ceil(y0 / 10) * 10; y <= y1; y += 10) { ctx.moveTo(x0 * TILE, y * TILE); ctx.lineTo(x1 * TILE, y * TILE); }
  ctx.stroke();
  ctx.strokeStyle = '#ffd97888'; ctx.strokeRect(0, 0, pw, ph);

  // decor outlines (in the decor tool, or selected)
  for (const d of S.decor) {
    const sel = ED.sel && ED.sel.d === d;
    if (!sel && ED.tool !== 'decor') continue;
    const b = decorBox(d);
    ctx.strokeStyle = sel ? '#ffd978' : 'rgba(160,200,255,0.5)'; ctx.strokeRect(b.x + 0.5 / z, b.y + 0.5 / z, b.w - 1 / z, b.h - 1 / z);
  }
  // things
  const labels = [];
  for (const e of S.ents) {
    try { drawEntIcon(ctx, e); } catch (err) { /* sprite missing */ }
    const b = entBox(e), sel = ED.sel && ED.sel.e === e;
    const hov = ED.hover && ED.hover.e === e;
    if (sel || hov) {
      ctx.strokeStyle = sel ? '#ffd978' : 'rgba(255,255,255,0.6)'; ctx.lineWidth = (sel ? 2 : 1) / z;
      ctx.strokeRect(b.x - 1 / z, b.y - 1 / z, b.w + 2 / z, b.h + 2 / z); ctx.lineWidth = 1 / z;
    }
    if (sel || hov || z >= 2 || ED.pick) labels.push({ e, x: e.x, y: b.y, sel });
  }
  // the selected thing: its range, what it is wired to, its waves
  const s = ED.sel;
  if (s && s.kind === 'ent') {
    const e = s.e;
    const hs = rangeHandles(e);
    if (hs.length) {
      const y = rangeY(e), a = hs.find((h) => h.f === 'x0'), bb = hs.find((h) => h.f === 'x1');
      const xa = a ? a.x : e.x, xb = bb ? bb.x : e.x;
      ctx.fillStyle = 'rgba(255,217,120,0.18)'; ctx.fillRect(xa, y - 3, xb - xa, 6);
      ctx.strokeStyle = '#ffd978'; ctx.beginPath(); ctx.moveTo(xa, y); ctx.lineTo(xb, y); ctx.stroke();
      for (const h of hs) { ctx.fillStyle = '#ffd978'; ctx.fillRect(h.x - 4 / z - 1, h.y - 4 / z - 1, 8 / z + 2, 8 / z + 2); }
    }
    if (typeof e.sea === 'number') { ctx.strokeStyle = '#60a0ff'; ctx.setLineDash([6 / z, 4 / z]); ctx.beginPath(); ctx.moveTo((e.x0 || 0) * TILE, e.sea * TILE); ctx.lineTo(((e.x1 || S.W) + 1) * TILE, e.sea * TILE); ctx.stroke(); ctx.setLineDash([]); }
    // wires
    const ids = [...(e.gates || []), ...(e.src || []), ...(e.guard ? [e.guard] : []), ...(e.lift ? [e.lift] : [])];
    const back = S.ents.filter((o) => o !== e && e.id && ([...(o.gates || []), ...(o.src || [])].includes(e.id) || o.guard === e.id || o.lift === e.id));
    ctx.strokeStyle = '#ffd978'; ctx.lineWidth = 1.5 / z; ctx.setLineDash([5 / z, 3 / z]);
    for (const o of [...S.ents.filter((o) => o.id && ids.includes(o.id)), ...back]) {
      const b1 = entBox(e), b2 = entBox(o);
      ctx.beginPath(); ctx.moveTo(b1.x + b1.w / 2, b1.y + b1.h / 2); ctx.lineTo(b2.x + b2.w / 2, b2.y + b2.h / 2); ctx.stroke();
    }
    ctx.setLineDash([]); ctx.lineWidth = 1 / z;
    if (e.type === 'ambush') {
      for (const [wi, wv] of e.waves.entries()) for (const p of wv) {
        const px = p.tx * TILE + 8, py = (p.ty + 1) * TILE - (p.fly ? 110 : 0);
        ctx.globalAlpha = 0.75; try { drawSprite(ctx, 'shadow', 'walk0', px, py); } catch (err) { /* */ } ctx.globalAlpha = 1;
        labels.push({ text: `${wi + 1}波${p.fly ? '（空）' : ''}`, x: px, y: py - 42, col: '#d0b0ff' });
      }
    }
  }
  // ambushes not selected: their shadows faintly
  for (const e of S.ents) if (e.type === 'ambush' && !(s && s.e === e)) {
    for (const wv of e.waves || []) for (const p of wv) { ctx.globalAlpha = 0.25; try { drawSprite(ctx, 'shadow', 'walk0', p.tx * TILE + 8, (p.ty + 1) * TILE - (p.fly ? 110 : 0)); } catch (err) { /* */ } ctx.globalAlpha = 1; }
  }
  // the test start flag
  if (ED.testStart) {
    const f = ED.testStart;
    ctx.fillStyle = '#ff6a6a'; ctx.fillRect(f.x - 1, f.y - 30, 2, 30);
    ctx.beginPath(); ctx.moveTo(f.x + 1, f.y - 30); ctx.lineTo(f.x + 13, f.y - 25); ctx.lineTo(f.x + 1, f.y - 20); ctx.fill();
    labels.push({ text: 'テスト開始', x: f.x, y: f.y - 32, col: '#ff9a9a' });
  }
  // region / paste ghost / tool cursor
  const m = ED.mouse;
  if (ED.region) {
    const [a, b2, cc, d] = ED.region;
    ctx.strokeStyle = '#8ee0ff'; ctx.lineWidth = 2 / z; ctx.setLineDash([6 / z, 4 / z]);
    ctx.strokeRect(a * TILE, b2 * TILE, (cc - a + 1) * TILE, (d - b2 + 1) * TILE); ctx.setLineDash([]); ctx.lineWidth = 1 / z;
  }
  if (ED.paste && ED.clip && m.in) {
    ctx.fillStyle = 'rgba(142,224,255,0.18)'; ctx.fillRect(m.tx * TILE, m.ty * TILE, ED.clip.w * TILE, ED.clip.h * TILE);
    ctx.strokeStyle = '#8ee0ff'; ctx.strokeRect(m.tx * TILE, m.ty * TILE, ED.clip.w * TILE, ED.clip.h * TILE);
  }
  const dr = ED.drag;
  if (dr && dr.rect) {
    const [a, b2, cc, d] = rectNorm(dr.a, { tx: m.tx, ty: m.ty });
    ctx.fillStyle = dr.rect === 'carve' ? 'rgba(0,0,0,0.4)' : dr.rect === 'region' ? 'rgba(142,224,255,0.15)' : dr.rect === 'dark' ? 'rgba(0,0,0,0.45)' : 'rgba(150,140,190,0.45)';
    ctx.fillRect(a * TILE, b2 * TILE, (cc - a + 1) * TILE, (d - b2 + 1) * TILE);
    ctx.strokeStyle = '#fff'; ctx.strokeRect(a * TILE, b2 * TILE, (cc - a + 1) * TILE, (d - b2 + 1) * TILE);
  }
  if (m.in && !dr) {
    if (ED.tool === 'terrain' || ED.tool === 'bg') {
      const b = ED.brush, o = Math.floor((b - 1) / 2);
      ctx.strokeStyle = '#ffffffaa'; ctx.strokeRect((m.tx - o) * TILE, (m.ty - o) * TILE, b * TILE, b * TILE);
    } else if (ED.tool === 'expand') {
      ctx.strokeStyle = '#ff9a6a'; ctx.lineWidth = 3 / z; ctx.beginPath();
      if (ED.axis === 'col') { ctx.moveTo(m.tx * TILE, 0); ctx.lineTo(m.tx * TILE, ph); } else { ctx.moveTo(0, m.ty * TILE); ctx.lineTo(pw, m.ty * TILE); }
      ctx.stroke(); ctx.lineWidth = 1 / z;
    } else if (ED.tool === 'ent' || ED.tool === 'decor' || ED.tool === 'start' || ED.tool === 'rect' || ED.tool === 'dark' || ED.tool === 'region') {
      ctx.strokeStyle = '#ffffff88'; ctx.strokeRect(m.tx * TILE, m.ty * TILE, TILE, TILE);
    }
  }

  // screen space: labels, rulers
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.font = '11px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
  for (const L of labels) {
    const text = L.text || ((ENT[L.e.type] ? ENT[L.e.type].label : L.e.type) + (L.e.id ? ` ${L.e.id}` : ''));
    const sx = (L.x - c.x) * z, sy = (L.y - c.y) * z - 2;
    if (sx < -100 || sx > W + 100 || sy < -20 || sy > H + 40) continue;
    const tw = ctx.measureText(text).width;
    ctx.fillStyle = 'rgba(8,6,16,0.78)'; ctx.fillRect(sx - tw / 2 - 3, sy - 13, tw + 6, 14);
    ctx.fillStyle = L.col || (L.sel ? '#ffd978' : '#e8e4f4'); ctx.fillText(text, sx, sy);
  }
  ctx.fillStyle = 'rgba(15,13,24,0.85)'; ctx.fillRect(0, 0, W, 16); ctx.fillRect(0, 0, 26, H);
  ctx.fillStyle = '#9a96b4'; ctx.font = '10px sans-serif'; ctx.textBaseline = 'top';
  const step = z >= 1 ? 5 : z >= 0.5 ? 10 : 20;
  for (let x = Math.ceil(x0 / step) * step; x <= x1; x += step) { const sx = (x * TILE - c.x) * z; if (sx > 26) { ctx.fillText(x, sx, 2); ctx.fillRect(sx, 12, 1, 4); } }
  ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
  for (let y = Math.ceil(y0 / step) * step; y <= y1; y += step) { const sy = (y * TILE - c.y) * z; if (sy > 16) { ctx.fillText(y, 23, sy); } }
  if (m.in) {
    ctx.fillStyle = '#ffd978';
    ctx.fillRect((m.tx * TILE - c.x) * z, 13, TILE * z, 3); ctx.fillRect(23, (m.ty * TILE - c.y) * z, 3, TILE * z);
  }
  // the minimap's view box
  if (mini.k) {
    mctx.save(); drawMiniOnce();
    mctx.strokeStyle = '#ffd978'; mctx.lineWidth = 1;
    mctx.strokeRect(c.x / TILE * mini.k + 0.5, c.y / TILE * mini.k + 0.5, W / z / TILE * mini.k, H / z / TILE * mini.k);
    mctx.restore();
  }
}
// the minimap is redrawn from a cached copy each frame (the view box moves)
let miniCache = null;
function drawMiniOnce() {
  if (!miniCache || miniCache.width !== mini.width || miniCache.height !== mini.height || miniCache.stale) {
    miniCache = miniCache && miniCache.width === mini.width && miniCache.height === mini.height ? miniCache : document.createElement('canvas');
    miniCache.width = mini.width; miniCache.height = mini.height; miniCache.stale = false;
    miniCache.getContext('2d').drawImage(mini, 0, 0);
  }
  mctx.drawImage(miniCache, 0, 0);
}

// ---- mouse ----------------------------------------------------------------------------------
function updateMouse(ev) {
  const r = cv.getBoundingClientRect(), c = ED.cam, m = ED.mouse;
  m.sx = ev.clientX - r.left; m.sy = ev.clientY - r.top;
  m.mx = c.x + m.sx / c.z; m.my = c.y + m.sy / c.z;
  m.tx = tileOf(m.mx); m.ty = tileOf(m.my);
  $('stPos').textContent = `列 ${m.tx} ・ 行 ${m.ty}`;
}
cv.addEventListener('contextmenu', (e) => e.preventDefault());
cv.addEventListener('pointerenter', () => { ED.mouse.in = true; });
cv.addEventListener('pointerleave', () => { ED.mouse.in = false; ED.hover = null; });
cv.addEventListener('wheel', (ev) => {
  ev.preventDefault(); updateMouse(ev);
  if (ev.ctrlKey || Math.abs(ev.deltaY) >= Math.abs(ev.deltaX)) stepZoom(ev.deltaY < 0 ? 1 : -1, ED.mouse.sx, ED.mouse.sy);
  else ED.cam.x += ev.deltaX / ED.cam.z;
}, { passive: false });

cv.addEventListener('pointerdown', (ev) => {
  updateMouse(ev); cv.setPointerCapture(ev.pointerId);
  const m = ED.mouse, right = ev.button === 2, tool = ED.tool;
  // pan: middle button, space held, or the hand tool
  if (ev.button === 1 || ED.space || tool === 'hand') { ED.drag = { pan: true, sx: m.sx, sy: m.sy, cx: ED.cam.x, cy: ED.cam.y }; return; }
  // picking a thing to wire to (from the inspector's 「地図で選ぶ」)
  if (ED.pick) {
    const h = hitTest(m.mx, m.my);
    if (h && h.kind === 'ent' && h.e.id && h.e !== ED.pick.e) {
      pushUndo();
      const e = ED.pick.e, f = ED.pick.f;
      if (FIELDS[f] && FIELDS[f][1] === 'id') e[f] = h.e.id;
      else { const a = e[f] || (e[f] = []); const i = a.indexOf(h.e.id); if (i >= 0) a.splice(i, 1); else a.push(h.e.id); }
      toast(`${f}：${(Array.isArray(e[f]) ? e[f] : [e[f]]).join('、') || '（なし）'}`);
      changed(false); inspect();
    } else { ED.pick = null; inspect(); }
    return;
  }
  if (ED.paste) { if (right) { ED.paste = false; return; } pasteAt(m.tx, m.ty); return; }
  if (ED.spawnWave != null) {
    const e = ED.sel && ED.sel.e;
    if (right || !e || e.type !== 'ambush') { ED.spawnWave = null; inspect(); return; }
    pushUndo();
    e.waves[ED.spawnWave].push(ED.spawnFly ? { tx: m.tx, ty: m.ty, fly: true } : { tx: m.tx, ty: m.ty });
    changed(false); inspect();
    return;
  }
  switch (tool) {
    case 'select': {
      const h = hitTest(m.mx, m.my);
      if (!h) { select(null); ED.drag = { pan: true, sx: m.sx, sy: m.sy, cx: ED.cam.x, cy: ED.cam.y }; return; }
      if (right) { removeHit(h); return; }
      if (h.kind === 'handle') { ED.drag = { handle: h, undo: false }; return; }
      if (h.kind === 'spawn') { ED.drag = { spawn: h, undo: false, tx: m.tx, ty: m.ty }; return; }
      select(h.kind === 'dark' ? { kind: 'dark', dk: h.dk } : h);
      ED.drag = { move: h, undo: false, tx: m.tx, ty: m.ty, ox: m.mx, oy: m.my };
      return;
    }
    case 'terrain': case 'bg': {
      pushUndo();
      const layer = tool === 'terrain' ? 'solid' : 'noBg', v = tool === 'terrain' ? (right ? 0 : ED.mat) : (right ? 0 : ED.bg);
      paintAt(m.tx, m.ty, layer, v);
      ED.drag = { paint: true, layer, v, last: { tx: m.tx, ty: m.ty } };
      return;
    }
    case 'rect': ED.drag = { rect: right ? 'carve' : 'fill', a: { tx: m.tx, ty: m.ty } }; return;
    case 'dark':
      if (right) { const h = hitTest(m.mx, m.my); if (h && h.kind === 'dark') removeHit(h); return; }
      ED.drag = { rect: 'dark', a: { tx: m.tx, ty: m.ty } }; return;
    case 'region':
      if (right) { ED.region = null; inspect(); return; }
      ED.drag = { rect: 'region', a: { tx: m.tx, ty: m.ty } }; return;
    case 'ent': {
      if (right) { const h = hitTest(m.mx, m.my); if (h && h.kind === 'ent') removeHit(h); return; }
      const h = hitTest(m.mx, m.my);
      if (h && h.kind === 'ent' && h.e.type === ED.entType && !ENT[h.e.type].unique) { select(h); ED.drag = { move: h, undo: false, tx: m.tx, ty: m.ty, ox: m.mx, oy: m.my }; return; }
      placeEnt(ED.entType, m.tx, m.ty); return;
    }
    case 'decor': {
      const h = hitTest(m.mx, m.my);
      if (right) { if (h && h.kind === 'decor') removeHit(h); return; }
      if (h && h.kind === 'decor') { select(h); ED.drag = { move: h, undo: false, tx: m.tx, ty: m.ty, ox: m.mx, oy: m.my }; return; }
      placeDecor(ED.decType, m.tx, m.ty); return;
    }
    case 'start':
      pushUndo();
      ED.testStart = right ? null : { x: m.tx * TILE + 8, y: (m.ty + 1) * TILE };
      changed(false); inspect();
      toast(right ? 'テストは 章のはじめから 始まります' : `テストは ここ（列 ${m.tx}・行 ${m.ty}）から 始まります`);
      return;
    case 'expand': {
      pushUndo();
      const n = Math.max(1, ED.count | 0), at = ED.axis === 'col' ? m.tx : m.ty;
      if (at < 0 || at >= (ED.axis === 'col' ? ED.S.W : ED.S.H)) { ED.undo.pop(); return; }
      if (right) { const k = deleteLines(ED.axis, at, n); if (!k) { ED.undo.pop(); return; } toast(`${ED.axis === 'col' ? '列' : '行'}を ${k} 本 削除しました`); }
      else { insertLines(ED.axis, at, n); toast(`${ED.axis === 'col' ? '列' : '行'}を ${n} 本 挿入しました（その${ED.axis === 'col' ? '列' : '行'}と同じ地形）`); }
      rebuildWorld(); rebuildDecor(); inspect(); changed(false);
      return;
    }
  }
});
cv.addEventListener('pointermove', (ev) => {
  updateMouse(ev);
  const m = ED.mouse, d = ED.drag;
  if (!d) { ED.hover = ED.tool === 'select' || ED.tool === 'ent' || ED.pick ? hitTest(m.mx, m.my) : null; cv.style.cursor = ED.space || ED.tool === 'hand' ? 'grab' : ED.hover ? 'pointer' : 'crosshair'; return; }
  if (d.pan) { ED.cam.x = d.cx - (m.sx - d.sx) / ED.cam.z; ED.cam.y = d.cy - (m.sy - d.sy) / ED.cam.z; return; }
  if (d.paint) { paintLine(d.last, { tx: m.tx, ty: m.ty }, d.layer, d.v); d.last = { tx: m.tx, ty: m.ty }; return; }
  if (d.handle) {
    const e = d.handle.e, f = d.handle.f, v = f === 'x0' ? Math.round(m.mx / TILE) : Math.round(m.mx / TILE) - 1;
    if (v !== e[f]) { if (!d.undo) { pushUndo(); d.undo = true; } e[f] = v; if ('x0' in e && e.x0 > e.x1) [e.x0, e.x1] = [e.x1, e.x0], d.handle.f = f === 'x0' ? 'x1' : 'x0'; inspect(); }
    return;
  }
  if (d.spawn) {
    const p = d.spawn.e.waves[d.spawn.wi][d.spawn.pi], dx = m.tx - d.tx, dy = m.ty - d.ty;
    if (dx || dy) { if (!d.undo) { pushUndo(); d.undo = true; } p.tx += dx; p.ty += dy; d.tx = m.tx; d.ty = m.ty; }
    return;
  }
  if (d.move) {
    const dx = m.tx - d.tx, dy = m.ty - d.ty;
    if (!dx && !dy) return;
    if (!d.undo) { pushUndo(); d.undo = true; }
    const h = d.move;
    if (h.kind === 'ent') relEnt(h.e, dx, dy);
    else if (h.kind === 'decor') { h.d.x += dx * TILE; h.d.y += dy * TILE; rebuildDecor(); }
    else if (h.kind === 'dark') { h.dk[0] += dx; h.dk[2] += dx; h.dk[1] += dy; h.dk[3] += dy; }
    d.tx = m.tx; d.ty = m.ty;
    inspect();
  }
});
cv.addEventListener('pointerup', (ev) => {
  updateMouse(ev);
  const d = ED.drag, m = ED.mouse;
  ED.drag = null;
  if (!d) return;
  if (d.paint) { changed(); return; }
  if (d.rect) {
    const [a, b, c, e] = rectNorm(d.a, { tx: m.tx, ty: m.ty });
    if (d.rect === 'region') { ED.region = [Math.max(0, a), Math.max(0, b), Math.min(ED.S.W - 1, c), Math.min(ED.S.H - 1, e)]; inspect(); return; }
    pushUndo();
    if (d.rect === 'dark') { ED.S.darks.push([a, b, c, e]); select({ kind: 'dark', dk: ED.S.darks[ED.S.darks.length - 1] }); changed(false); return; }
    for (let y = b; y <= e; y++) for (let x = a; x <= c; x++) setTile(x, y, 'solid', d.rect === 'carve' ? 0 : ED.mat);
    changed();
    return;
  }
  if (d.move || d.handle || d.spawn) { if (d.undo) changed(false); }
});
mini.addEventListener('pointerdown', (ev) => {
  const go = (e) => { const r = mini.getBoundingClientRect(); centerOn((e.clientX - r.left) / mini.k * TILE, (e.clientY - r.top) / mini.k * TILE); };
  go(ev); mini.setPointerCapture(ev.pointerId);
  const mv = (e) => go(e), up = () => { mini.removeEventListener('pointermove', mv); mini.removeEventListener('pointerup', up); };
  mini.addEventListener('pointermove', mv); mini.addEventListener('pointerup', up);
});

// ---- keys -----------------------------------------------------------------------------------
const TOOLS = [
  ['select', '選択', 'V', '選ぶ・動かす・範囲の調整。何もない所をドラッグで画面の移動。'],
  ['terrain', '地形', 'B', '壁や空洞を塗る。右ドラッグで空洞。'],
  ['rect', '四角', 'R', '四角く塗る。左＝素材、右＝空洞。'],
  ['bg', '背景', 'G', '奥の壁の種類を塗る。'],
  ['ent', '置く', 'E', '仕掛け・敵・収集物を置く。右クリックで消す。'],
  ['decor', '装飾', 'D', '絵だけの飾りを置く。右クリックで消す。'],
  ['expand', '広げる', 'W', 'コースを伸ばす・縮める。'],
  ['region', '範囲', 'C', '範囲を選んで コピー・貼り付け。'],
  ['dark', '暗がり', 'K', '暗い区域を置く。'],
  ['start', '開始位置', 'T', 'テストプレイを始める場所。'],
];
addEventListener('keydown', (ev) => {
  if ($('test').style.display === 'flex') return;
  const tag = document.activeElement && document.activeElement.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') { if (ev.key === 'Escape') document.activeElement.blur(); return; }
  const k = ev.key.toLowerCase(), ctrl = ev.ctrlKey || ev.metaKey;
  if (ctrl && k === 'z') { ev.preventDefault(); ev.shiftKey ? redo() : undo(); return; }
  if (ctrl && k === 'y') { ev.preventDefault(); redo(); return; }
  if (ctrl && k === 's') { ev.preventDefault(); save(); return; }
  if (ctrl && k === 'c') { ev.preventDefault(); copyRegion(); return; }
  if (ctrl && k === 'v') { ev.preventDefault(); if (ED.clip) { ED.paste = true; toast('貼り付ける場所をクリック（右クリックでやめる）'); } return; }
  if (ctrl && k === 'd') { ev.preventDefault(); duplicateSelection(); return; }
  if (ctrl) return;
  if (ev.key === ' ') { ED.space = true; cv.style.cursor = 'grab'; ev.preventDefault(); return; }
  if (ev.key === 'Delete' || ev.key === 'Backspace') { deleteSelection(); return; }
  if (ev.key === 'Escape') { ED.paste = false; ED.pick = null; ED.spawnWave = null; ED.region = null; select(null); return; }
  if (ev.key === 'F1') { ev.preventDefault(); $('help').style.display = 'flex'; return; }
  if (ev.key.startsWith('Arrow') && ED.sel && ED.sel.kind !== 'dark') {
    ev.preventDefault();
    const dx = ev.key === 'ArrowLeft' ? -1 : ev.key === 'ArrowRight' ? 1 : 0, dy = ev.key === 'ArrowUp' ? -1 : ev.key === 'ArrowDown' ? 1 : 0;
    pushUndo();
    if (ED.sel.kind === 'ent') relEnt(ED.sel.e, dx, dy); else { ED.sel.d.x += dx * TILE; ED.sel.d.y += dy * TILE; rebuildDecor(); }
    inspect(); changed(false); return;
  }
  if (k === 'p') { startTest(); return; }
  if (k === '+' || k === ';') { stepZoom(1); return; }
  if (k === '-') { stepZoom(-1); return; }
  const t = TOOLS.find((t) => t[2].toLowerCase() === k);
  if (t) setTool(t[0]);
  if (k === 'h') setTool('hand');
});
addEventListener('keyup', (ev) => { if (ev.key === ' ') { ED.space = false; cv.style.cursor = 'crosshair'; } });

// ---- left: tools and palettes ----------------------------------------------------------------
function buildTools() {
  $('tools').innerHTML = TOOLS.map(([id, label, key, tip]) => `<button data-tool="${id}" title="${esc(tip)}">${label}<kbd>${key}</kbd></button>`).join('');
  $('tools').onclick = (e) => { const b = e.target.closest('button'); if (b) setTool(b.dataset.tool); };
}
function setTool(t) {
  ED.tool = t; ED.paste = false; ED.spawnWave = null;
  for (const b of $('tools').querySelectorAll('button')) b.classList.toggle('on', b.dataset.tool === t);
  const tip = TOOLS.find((x) => x[0] === t);
  $('stHint').textContent = tip ? tip[3] : '手のひら：ドラッグで画面の移動';
  buildPalette();
}
function buildPalette() {
  const P = $('palette'), n = ED.n, t = ED.tool;
  let h = '';
  const matBtns = (items, cur, attr) => `<div class="row">${items.map(([v, l, col]) => `<button class="pitem ${cur === v ? 'on' : ''}" data-${attr}="${v}" style="width:auto"><span class="chip" style="background:${col}"></span>${l}</button>`).join('')}</div>`;
  const brush = () => `<h3>筆の大きさ</h3><div class="row">${[1, 2, 3, 5].map((b) => `<button class="${ED.brush === b ? 'on' : ''}" data-brush="${b}">${b}</button>`).join('')}</div>`;
  if (t === 'terrain' || t === 'rect') {
    const mats = [[1, '壁（岩・石）', '#6a6078'], [0, '空洞', '#1a1826']];
    if (n === 5) mats.push([3, '影の道', '#4a2c86'], [4, '光の苔', '#3a7a40']);
    h += `<h3>素材</h3>${matBtns(mats, ED.mat, 'mat')}`;
    if (t === 'terrain') h += brush();
    h += `<p class="help">${t === 'terrain' ? '左ドラッグで塗る、右ドラッグで空洞にする。' : 'ドラッグで四角。左＝素材、右＝空洞。'}${n === 5 ? '<br>影の道はルミナの光で溶け、光の苔は光の中で固まる。' : ''}</p>`;
  } else if (t === 'bg') {
    h += `<h3>奥の壁</h3>${matBtns([[0, '壁紙', '#3a3450'], [1, '空（屋外）', '#1a1830'], [2, 'もう一つの壁紙', '#5a5070']], ED.bg, 'bg')}${brush()}
      <p class="help">「空」は奥の壁がなく 遠景が見える。「もう一つの壁紙」は章ごとに違う（白壁・影絵の壁など）。</p>`;
  } else if (t === 'ent') {
    for (const cat of CATS) {
      h += `<h3>${cat}</h3>`;
      for (const [type, info] of Object.entries(ENT)) {
        if (info.cat !== cat) continue;
        const far = info.ch && !info.ch.includes(n);
        h += `<button class="pitem ${ED.entType === type ? 'on' : ''} ${far ? 'far' : ''}" data-ent="${type}" title="${esc(info.desc || '')}"><span class="chip" style="background:${info.col}"></span>${info.label}${info.ch ? `<span class="note">${info.ch.join('・')}章</span>` : ''}</button>`;
      }
    }
    h += `<p class="help">薄い項目は ほかの章のための物（動かないこともある）。</p>`;
  } else if (t === 'decor') {
    const mine = Object.entries(DECOR).filter(([, d]) => d[1] === n), rest = Object.entries(DECOR).filter(([, d]) => d[1] !== n);
    const item = ([type, d]) => `<button class="pitem ${ED.decType === type ? 'on' : ''} ${d[1] !== n ? 'far' : ''}" data-dec="${type}">${d[0]}<span class="note">${d[1]}章</span></button>`;
    h += `<h3>この章の飾り</h3>${mine.map(item).join('')}<h3>ほかの章の飾り</h3>${rest.map(item).join('')}`;
  } else if (t === 'expand') {
    h += `<h3>向き</h3><div class="row"><button class="${ED.axis === 'col' ? 'on' : ''}" data-axis="col">横に（列）</button><button class="${ED.axis === 'row' ? 'on' : ''}" data-axis="row">縦に（行）</button></div>
      <h3>本数</h3><div class="row"><input type="number" id="expCount" min="1" max="200" value="${ED.count}"></div>
      <p class="help">左クリック：その${ED.axis === 'col' ? '列の左' : '行の上'}に ${ED.count} 本 挿入（クリックした${ED.axis === 'col' ? '列' : '行'}と同じ地形で 伸びる）。<br>右クリック：その${ED.axis === 'col' ? '列から右' : '行から下'}へ ${ED.count} 本 削除。<br>仕掛け・敵・装飾・範囲も 一緒にずれる。</p>`;
  } else if (t === 'region') {
    h += `<p class="help">ドラッグで範囲を選ぶ（右クリックで解除）。</p><div class="btns"><button id="rgCopy">コピー（Ctrl+C）</button><button id="rgPaste" ${ED.clip ? '' : 'disabled'}>貼り付け（Ctrl+V）</button></div>
      <div class="btns"><button id="rgWall" ${ED.region ? '' : 'disabled'}>範囲を壁で埋める</button><button id="rgHollow" ${ED.region ? '' : 'disabled'}>範囲を空洞に</button><button id="rgClear" ${ED.region ? '' : 'disabled'}>範囲の物を消す</button></div>
      <p class="help">コピーには 地形・背景・仕掛け・敵・収集物・装飾が入る。貼り付けた物には 新しいIDが付き、中どうしのつながりは保たれる。</p>`;
  } else if (t === 'dark') {
    h += `<p class="help">ドラッグで 暗い区域を置く（ルミナの光だけが届く）。右クリックで消す。選択ツールで動かせる。</p>`;
  } else if (t === 'start') {
    h += `<p class="help">クリックした場所から テストプレイが始まる（ルミナは すぐ左）。右クリックで消すと 章のはじめから。<br>この旗は テスト用で、本編には入らない。</p>`;
  } else if (t === 'select') {
    h += `<p class="help">クリックで選ぶ、ドラッグで動かす（マス単位）。<br>範囲のある物（消灯番の見回り・待ち伏せ・ボスの部屋など）は 両端の□を ドラッグ。<br>待ち伏せを選ぶと 波ごとの影が見え、ドラッグで動かせる。<br>Delete：削除　Ctrl+D：複製　矢印：1マス移動<br>何もない所をドラッグ：画面の移動</p>`;
  } else h += `<p class="help">ドラッグで画面の移動。</p>`;
  P.innerHTML = h;
  P.onclick = (e) => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.mat) ED.mat = +b.dataset.mat;
    else if (b.dataset.bg) ED.bg = +b.dataset.bg;
    else if (b.dataset.brush) ED.brush = +b.dataset.brush;
    else if (b.dataset.ent) ED.entType = b.dataset.ent;
    else if (b.dataset.dec) ED.decType = b.dataset.dec;
    else if (b.dataset.axis) ED.axis = b.dataset.axis;
    else if (b.id === 'rgCopy') { copyRegion(); }
    else if (b.id === 'rgPaste') { if (ED.clip) { ED.paste = true; toast('貼り付ける場所をクリック（右クリックでやめる）'); } return; }
    else if (b.id === 'rgWall' || b.id === 'rgHollow') {
      const [a, bb, c, d] = ED.region; pushUndo();
      for (let y = bb; y <= d; y++) for (let x = a; x <= c; x++) setTile(x, y, 'solid', b.id === 'rgWall' ? 1 : 0);
      changed();
    } else if (b.id === 'rgClear') {
      const [a, bb, c, d] = ED.region; pushUndo();
      const inR = (px, py) => tileOf(px) >= a && tileOf(px) <= c && tileOf(py - 1) >= bb && tileOf(py - 1) <= d;
      ED.S.ents = ED.S.ents.filter((e2) => ENT[e2.type] && ENT[e2.type].unique || !inR(e2.x, e2.y));
      ED.S.decor = ED.S.decor.filter((d2) => !inR(d2.x + 1, d2.y + 1));
      ED.sel = null; rebuildDecor(); inspect(); changed(false);
    }
    if (ED.tool === 'ent' && b.dataset.ent) { const info = ENT[ED.entType]; $('stHint').textContent = `${info.label}：${info.desc || ''}`; }
    buildPalette();
  };
  const ec = $('expCount'); if (ec) ec.onchange = () => { ED.count = Math.max(1, Math.min(200, +ec.value || 1)); buildPalette(); };
}

// ---- right: the inspector ---------------------------------------------------------------------
function inspect() {
  const I = $('inspector'), s = ED.sel, S = ED.S;
  if (!S) return;
  let h = '';
  if (!s) {
    const cnt = (t) => S.ents.filter((e) => e.type === t).length;
    h = `<h2>第${ED.n}章「${esc(CHAPTERS[ED.n].title)}」</h2>
      <div class="stat"><span>大きさ</span><span>${S.W} × ${S.H} マス</span><span>灯籠</span><span>${cnt('shrine')}</span>
      <span>影絵の欠片</span><span>${cnt('shard')}</span><span>手記</span><span>${cnt('page')}</span><span>待ち伏せ</span><span>${cnt('ambush')}</span>
      <span>テスト開始</span><span>${ED.testStart ? `列 ${tileOf(ED.testStart.x)}・行 ${ED.testStart.y / TILE - 1}` : '章のはじめ'}</span></div>
      <h3>大きさを変える（右端・下端で）</h3>
      <div class="field inl"><label style="margin:0">幅</label><input type="number" id="mapW" value="${S.W}" min="20"><label style="margin:0">高さ</label><input type="number" id="mapH" value="${S.H}" min="14"><button id="mapApply">変える</button></div>
      <p class="desc">途中を伸ばすときは「広げる（W）」が便利。</p>
      ${ED.region ? `<h3>範囲</h3><p class="desc">列 ${ED.region[0]}〜${ED.region[2]}、行 ${ED.region[1]}〜${ED.region[3]}（${ED.region[2] - ED.region[0] + 1}×${ED.region[3] - ED.region[1] + 1}）</p>` : ''}`;
    I.innerHTML = h;
    $('mapApply').onclick = () => {
      const W2 = Math.max(20, +$('mapW').value | 0), H2 = Math.max(14, +$('mapH').value | 0);
      if (W2 === S.W && H2 === S.H) return;
      pushUndo();
      if (W2 > S.W) insertLines('col', S.W, W2 - S.W); else if (W2 < S.W) deleteLines('col', W2, S.W - W2);
      if (H2 > S.H) insertLines('row', S.H, H2 - S.H); else if (H2 < S.H) deleteLines('row', H2, S.H - H2);
      rebuildWorld(); rebuildDecor(); inspect(); changed(false);
    };
    return;
  }
  if (s.kind === 'dark') {
    I.innerHTML = `<h2>暗がり</h2><p class="desc">ルミナの光しか届かない区域。</p>
      <div class="stat"><span>列</span><span>${s.dk[0]}〜${s.dk[2]}</span><span>行</span><span>${s.dk[1]}〜${s.dk[3]}</span></div>
      <div class="btns"><button id="bDel">削除</button></div>`;
    $('bDel').onclick = deleteSelection;
    return;
  }
  if (s.kind === 'decor') {
    const d = s.d, info = DECOR[d.type];
    h = `<h2>装飾：${info ? info[0] : esc(d.type)}</h2><div class="stat"><span>位置</span><span>列 ${tileOf(d.x)}・行 ${tileOf(d.y)}</span></div><h3>くわしく</h3>`;
    for (const [k, v] of Object.entries(d)) if (!['type', 'x', 'y'].includes(k) && typeof v !== 'object') h += fieldHtml(k, v, { len: ['長さ（マス）', 'num'], v: ['絵の種類（番号）', 'num'], to: ['下端（行）', 'num'], ox: ['ずらし x', 'num'], oy: ['ずらし y', 'num'] }[k]);
    if (!('v' in d) && ['shopsign', 'bush', 'flower', 'gear'].includes(d.type)) h += fieldHtml('v', 0, ['絵の種類（番号）', 'num']);
    h += `<div class="btns"><button id="bDel">削除</button></div>`;
    I.innerHTML = h; bindFields(d, true);
    $('bDel').onclick = deleteSelection;
    return;
  }
  // a thing
  const e = s.e, info = ENT[e.type] || { label: e.type };
  h = `<h2>${esc(info.label)}</h2>${info.desc ? `<p class="desc">${esc(info.desc)}</p>` : ''}
    <div class="stat"><span>位置</span><span>列 ${tileOf(e.x)}・行 ${e.y / TILE - 1}${e.x % TILE !== 8 ? `（+${e.x % TILE - 8}px）` : ''}</span></div>`;
  if (info.ch && !info.ch.includes(ED.n)) h += `<p class="desc" style="color:var(--warn)">※ ${info.ch.join('・')}章のための物。この章では うまく動かないことがあります。</p>`;
  h += `<h3>くわしく</h3>`;
  for (const [k, v] of Object.entries(e)) {
    if (['type', 'x', 'y', 'waves'].includes(k)) continue;
    h += fieldHtml(k, v, FIELDS[k]);
  }
  if (e.type === 'sign') h += `<p class="desc">書式：&lt;span class="name"&gt;名前：&lt;/span&gt;文。{jump} {attack} などは 操作名に変わる。</p>`;
  if (e.type === 'shard') h += `<div class="field"><label>欠片の ことば</label><textarea id="txShard">${esc(S.shards[e.id] || '')}</textarea></div>`;
  if (e.type === 'page') {
    const p = S.pages[e.id] || { title: '', body: '' };
    h += `<div class="field"><label>題</label><input type="text" id="txTitle" value="${esc(p.title)}" style="width:100%"></div>
      <div class="field"><label>本文（&lt;p&gt;…&lt;/p&gt; で段落）</label><textarea id="txBody" style="min-height:140px">${esc(p.body.trim())}</textarea></div>`;
  }
  if (e.type === 'ambush') {
    h += `<h3>波（${e.waves.length}）</h3>`;
    e.waves.forEach((w, i) => {
      const on = ED.spawnWave === i;
      h += `<div class="wave"><div class="hd"><b>${i + 1}波目</b>影 ${w.filter((p) => !p.fly).length}・空の影 ${w.filter((p) => p.fly).length}
        <button data-wdel="${i}" title="この波を消す">✕</button></div>
        <div class="btns" style="margin:0"><button data-wadd="${i}" class="${on && !ED.spawnFly ? 'on' : ''}">＋影を置く</button><button data-wfly="${i}" class="${on && ED.spawnFly ? 'on' : ''}">＋空の影</button></div></div>`;
    });
    h += `<div class="btns"><button id="wNew">＋ 波を足す</button></div>
      <p class="desc">「＋影を置く」を押してから 地図をクリックで影を置く（右クリックで終わり）。置いた影は 選択ツールでドラッグ、右クリックで消せる。</p>`;
  }
  h += `<div class="btns">${info.unique ? '' : '<button id="bDup">複製（Ctrl+D）</button><button id="bDel">削除（Delete）</button>'}<button id="bGo">ここを表示</button></div>`;
  I.innerHTML = h;
  bindFields(e, false);
  const on = (id, f) => { const el = $(id); if (el) el.onclick = f; };
  on('bDel', deleteSelection); on('bDup', duplicateSelection); on('bGo', () => centerOn(e.x, e.y - 20));
  const tx = $('txShard'); if (tx) tx.onchange = () => { pushUndo(); S.shards[e.id] = tx.value; changed(false); };
  const tt = $('txTitle'), tb = $('txBody');
  if (tt) tt.onchange = tb.onchange = () => { pushUndo(); S.pages[e.id] = { title: tt.value, body: tb.value }; changed(false); };
  if (e.type === 'ambush') {
    I.onclick = (ev) => {
      const b = ev.target.closest('button'); if (!b) return;
      if (b.dataset.wadd || b.dataset.wfly) { ED.spawnWave = +(b.dataset.wadd || b.dataset.wfly); ED.spawnFly = !!b.dataset.wfly; inspect(); toast('地図をクリックして影を置く（右クリックで終わり）'); }
      else if (b.dataset.wdel) { if (e.waves.length <= 1) { toast('波は 1つ以上 必要です'); return; } pushUndo(); e.waves.splice(+b.dataset.wdel, 1); ED.spawnWave = null; inspect(); changed(false); }
      else if (b.id === 'wNew') { pushUndo(); e.waves.push([]); ED.spawnWave = e.waves.length - 1; ED.spawnFly = false; inspect(); changed(false); toast('地図をクリックして影を置く（右クリックで終わり）'); }
    };
  } else I.onclick = null;
}
function fieldHtml(k, v, meta) {
  const [label, kind] = meta || [k, typeof v === 'boolean' ? 'bool' : typeof v === 'number' ? 'num' : Array.isArray(v) ? 'ids' : 'text'];
  const id = 'f_' + k;
  if (kind === 'bool') return `<div class="field"><label><input type="checkbox" id="${id}" ${v ? 'checked' : ''}> ${esc(label)}</label></div>`;
  if (kind === 'num') return `<div class="field"><label>${esc(label)}</label><input type="number" id="${id}" value="${v}" step="any"></div>`;
  if (kind === 'textarea') return `<div class="field"><label>${esc(label)}</label><textarea id="${id}">${esc(v)}</textarea></div>`;
  if (kind === 'ids' || kind === 'id') {
    const val = Array.isArray(v) ? v.join(', ') : v;
    const picking = ED.pick && ED.pick.f === k;
    return `<div class="field"><label>${esc(label)}</label><div class="inl"><input type="text" id="${id}" value="${esc(val)}"><button data-pick="${k}" class="${picking ? 'on' : ''}">${picking ? '選択中…' : '地図で選ぶ'}</button></div></div>`;
  }
  if (typeof v === 'object') return `<div class="field"><label>${esc(label)}（JSON）</label><textarea id="${id}">${esc(JSON.stringify(v))}</textarea></div>`;
  return `<div class="field"><label>${esc(label)}</label><input type="text" id="${id}" value="${esc(v)}" style="width:100%"></div>`;
}
function bindFields(obj, isDecor) {
  const S = ED.S;
  for (const k of Object.keys(obj).concat(isDecor && !('v' in obj) ? ['v'] : [])) {
    const el = $('f_' + k); if (!el) continue;
    el.onchange = () => {
      const old = obj[k];
      let v;
      if (el.type === 'checkbox') v = el.checked;
      else if (el.type === 'number') v = +el.value;
      else if (Array.isArray(old) || (FIELDS[k] && FIELDS[k][1] === 'ids')) v = el.value.split(/[,、\s]+/).filter(Boolean);
      else if (old !== null && typeof old === 'object') { try { v = JSON.parse(el.value); } catch (e) { toast('JSONの形が正しくありません'); inspect(); return; } }
      else v = el.value;
      pushUndo();
      if (k === 'id' && old !== v) {
        if (!v || usedIds().has(v)) { ED.undo.pop(); toast('そのIDは 使えません（空か、もう使われています）'); inspect(); return; }
        // follow the rename: wires, texts
        for (const o of S.ents) {
          for (const f of ['gates', 'src']) if (Array.isArray(o[f])) o[f] = o[f].map((x) => (x === old ? v : x));
          if (o.guard === old) o.guard = v;
          if (o.lift === old) o.lift = v;
        }
        if (obj.type === 'shard') { S.shards[v] = S.shards[old]; delete S.shards[old]; }
        if (obj.type === 'page') { S.pages[v] = S.pages[old]; delete S.pages[old]; }
      }
      obj[k] = v;
      if (isDecor) rebuildDecor();
      changed(false); inspect();
    };
  }
  for (const b of $('inspector').querySelectorAll('[data-pick]')) {
    b.onclick = () => {
      const f = b.dataset.pick;
      ED.pick = ED.pick && ED.pick.f === f ? null : { e: obj, f };
      if (ED.pick && !Array.isArray(obj[f]) && FIELDS[f] && FIELDS[f][1] === 'ids') obj[f] = obj[f] ? [obj[f]] : [];
      inspect();
      if (ED.pick) toast('つなぐ相手を 地図でクリック（もう一度で はずす）。空いた所をクリックで終わり');
    };
  }
}

// ---- checks ------------------------------------------------------------------------------------
function runChecks() {
  const S = ED.S, out = [];
  const add = (lv, msg, e) => out.push({ lv, msg, e });
  for (const t of ['hero', 'heroine']) {
    const n = S.ents.filter((e) => e.type === t).length;
    if (n !== 1) add('bad', `${ENT[t].label}が ${n} 個（1つだけ必要）`);
  }
  const ids = new Map();
  // (the game looks guards up apart from the rest: a guard and a gate may share a name)
  const key = (e) => (e.type === 'guard' ? 'guard:' : '') + e.id;
  for (const e of S.ents) if (e.id) { if (ids.has(key(e))) add('bad', `ID「${e.id}」が重なっている`, e); ids.set(key(e), e); }
  for (const e of S.ents) {
    for (const f of ['gates', 'src']) for (const id of e[f] || []) if (!ids.has(id)) add('warn', `${ENT[e.type] ? ENT[e.type].label : e.type} ${e.id || ''}：つながる先「${id}」がない`, e);
    if (e.guard && !ids.has('guard:' + e.guard)) add('warn', `${ENT[e.type] ? ENT[e.type].label : e.type} ${e.id || ''}：消灯番「${e.guard}」がない`, e);
    const tx = tileOf(e.x), ty = e.y / TILE - 1;
    if (tx < 0 || tx >= S.W || ty < 0 || ty >= S.H) add('bad', `${ENT[e.type] ? ENT[e.type].label : e.type} ${e.id || ''}：地図の外にある`, e);
    else if (['hero', 'heroine', 'shrine', 'shard', 'page', 'sign', 'lever', 'guard'].includes(e.type) && S.solid[ty * S.W + tx]) add('warn', `${ENT[e.type].label} ${e.id || ''}：壁に埋まっている`, e);
    if (e.type === 'shard' && !(S.shards[e.id] || '').trim()) add('warn', `影絵の欠片 ${e.id}：ことばが空`, e);
    if (e.type === 'ambush' && e.waves.some((w) => !w.length)) add('warn', `待ち伏せ ${e.id}：影のいない波がある`, e);
  }
  if (!S.ents.some((e) => ['exit', 'lookout', 'escape', 'epiend', 'boss', 'finalboss', 'whale'].includes(e.type))) add('warn', '章の終わり（出口など）がない');
  const C = $('checks');
  C.innerHTML = out.length ? out.map((c, i) => `<div class="ck ${c.lv}" data-i="${i}">${c.lv === 'bad' ? '✖' : '⚠'} ${esc(c.msg)}</div>`).join('') : '<div class="ok">✔ 問題は見つかりません</div>';
  C.onclick = (ev) => { const d = ev.target.closest('.ck'); if (!d) return; const c = out[+d.dataset.i]; if (c.e) { setTool('select'); select({ kind: 'ent', e: c.e }); centerOn(c.e.x, c.e.y - 20); } };
  ED.checks = out;
}

// ---- test play -----------------------------------------------------------------------------------
function startTest() {
  const bad = (ED.checks || []).filter((c) => c.lv === 'bad');
  if (bad.length && !confirm(`直したほうがよい所があります：\n${bad.map((c) => '・' + c.msg).join('\n')}\n\nこのまま テストしますか？`)) return;
  const data = packState(ED.S);
  try {
    localStorage.setItem('lumina.editor.test', JSON.stringify({ chapter: ED.n, stage: data, start: ED.testStart, hard: $('optHard').checked, fire: ED.n === 6 && $('optFire').checked }));
  } catch (e) { alert('テスト用のデータを 保存できませんでした（ブラウザの保存領域）。'); return; }
  $('testTitle').textContent = `テストプレイ ─ 第${ED.n}章${$('optHard').checked ? '（試練）' : ''}${ED.testStart ? ' ・ 旗の位置から' : ' ・ 章のはじめから'}　（Enter：ポーズ）`;
  $('test').style.display = 'flex';
  const f = $('testFrame');
  f.onload = () => { try { f.contentWindow.focus(); } catch (e) { /* */ } };
  f.src = 'index.html?test&t=' + Date.now();
}
function closeTest() { $('test').style.display = 'none'; $('testFrame').src = 'about:blank'; cv.focus(); }

// ---- save / load ------------------------------------------------------------------------------------
async function save() {
  const bad = (ED.checks || []).filter((c) => c.lv === 'bad');
  if (bad.length && !confirm(`直したほうがよい所があります：\n${bad.map((c) => '・' + c.msg).join('\n')}\n\nこのまま 保存しますか？`)) return;
  const data = packState(ED.S), edits = clone(ED.saved);
  const isOrig = JSON.stringify(data) === JSON.stringify(origPacked(ED.n));
  if (isOrig) delete edits[ED.n]; else edits[ED.n] = data;
  try {
    const r = await fetch('api/stage-edits', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ edits }) });
    const j = await r.json();
    if (!j.ok) throw new Error(j.error || 'error');
  } catch (e) {
    // no dev server: hand over the file instead
    const blob = new Blob([stageEditsJs(edits)], { type: 'text/javascript' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'stage_edits.js'; a.click();
    alert('開発サーバー（python tools/devserver.py 8932）に つながらなかったので、ファイルとしてダウンロードしました。\nダウンロードした stage_edits.js を src/ フォルダに 上書きで置いてください。');
  }
  ED.saved = edits; ED.baseline = JSON.stringify(isOrig ? origPacked(ED.n) : data);
  clearDraft(ED.n); writeDraft();
  toast(isOrig ? `第${ED.n}章を 元の状態に戻して 保存しました` : `第${ED.n}章を 保存しました（src/stage_edits.js）。本編を 読み込み直すと 反映されます`);
}
function stageEditsJs(edits) {
  return ["'use strict';",
    "// Stages changed in the stage editor (editor.html). Written by the editor's 「保存」 - edit there, not here.",
    "// Each entry replaces that chapter's build(). Remove an entry (or use 「オリジナルに戻す」 → 保存) to go back.",
    'for (const [n, d] of Object.entries({',
    ...Object.keys(edits).sort((a, b) => a - b).map((n) => `  ${n}: ${JSON.stringify(edits[n])},`),
    '})) { STAGE_EDITS[n] = d; applyStageTexts(+n, d); }', ''].join('\n');
}
function loadState(d, msg) {
  pushUndo();
  ED.S = stateFrom(unpackStage(d), ED.n, textsFor(ED.n, d));
  ED.sel = null; rebuildWorld(); rebuildDecor(); inspect(); changed(false); toast(msg);
}
$('moreSel').onchange = () => {
  const v = $('moreSel').value; $('moreSel').value = '';
  if (v === 'revertOrig') { if (confirm(`第${ED.n}章を 元の（作ったときの）状態に戻しますか？\n（保存するまで 本編は変わりません。戻すで取り消せます）`)) loadState(origPacked(ED.n), '元の状態に戻しました'); }
  if (v === 'revertSaved') { const d = ED.saved[ED.n] || origPacked(ED.n); if (confirm('最後に保存した状態に戻しますか？')) loadState(d, '保存済みの状態に戻しました'); }
  if (v === 'export') {
    const blob = new Blob([JSON.stringify({ chapter: ED.n, stage: packState(ED.S) })], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `lumina_ch${ED.n}.json`; a.click();
  }
  if (v === 'import') $('fileIn').click();
};
$('fileIn').onchange = async () => {
  const f = $('fileIn').files[0]; $('fileIn').value = '';
  if (!f) return;
  try {
    const j = JSON.parse(await f.text()), d = j.stage || j;
    if (!d.W || !d.solid) throw new Error('形式');
    if (j.chapter && j.chapter !== ED.n && !confirm(`このファイルは 第${j.chapter}章のものです。第${ED.n}章に 読み込みますか？`)) return;
    loadState(d, 'ファイルを読み込みました');
  } catch (e) { alert('読み込めませんでした（エディタで書き出した .json を選んでください）'); }
};

// ---- misc UI -------------------------------------------------------------------------------------------
let toastT = 0;
function toast(msg) { const t = $('toast'); t.textContent = msg; t.style.display = 'block'; clearTimeout(toastT); toastT = setTimeout(() => { t.style.display = 'none'; }, 2600); }

function init() {
  for (const [n, d] of Object.entries(STAGE_EDITS)) ED.saved[n] = clone(d);
  $('chapterSel').innerHTML = Object.keys(CHAPTERS).map((n) => `<option value="${n}">第${n}章 ${CHAPTERS[n].title}${ED.saved[n] ? '（編集済み）' : ''}</option>`).join('');
  $('chapterSel').onchange = () => { writeDraft(); openChapter(+$('chapterSel').value); };
  $('bUndo').onclick = undo; $('bRedo').onclick = redo;
  $('bTest').onclick = startTest; $('bSave').onclick = save;
  $('bTestClose').onclick = closeTest;
  $('bTestRestart').onclick = () => { $('testFrame').src = 'index.html?test&t=' + Date.now(); };
  $('bHelp').onclick = () => { $('help').style.display = 'flex'; };
  $('bHelpClose').onclick = () => { $('help').style.display = 'none'; };
  $('help').onclick = (e) => { if (e.target.id === 'help') $('help').style.display = 'none'; };
  for (const b of $('zoomui').querySelectorAll('button')) b.onclick = () => { const d = +b.dataset.z; if (d) stepZoom(d); else setZoom(1); };
  addEventListener('resize', resize);
  addEventListener('beforeunload', () => writeDraft());
  buildTools(); resize();
  const q = +(new URLSearchParams(location.search).get('ch') || 0);
  openChapter(CHAPTERS[q] ? q : 1);
  setTool('select');
  setZoom(ED.cam.z);
  $('loading').style.display = 'none';
  requestAnimationFrame(draw);
  if (!localStorage.getItem('lumina.editor.seenHelp')) { $('help').style.display = 'flex'; try { localStorage.setItem('lumina.editor.seenHelp', '1'); } catch (e) { /* */ } }
}
loadSheets().then(init);
