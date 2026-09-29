'use strict';
// ---------------------------------------------------------------------------
// Chapter registry. Every stage file adds CHAPTERS[n] = {
//   num, title, theme, build(), text, shards, pages,
//   intro()   -> cutscene steps played when the chapter begins (optional),
//   after(g)  -> world state once the intro has happened (optional),
//   safe(h)   -> true where Lumina never attracts shadows (optional),
//   clearQuote (html shown on the clear screen) }
// ---------------------------------------------------------------------------
const CHAPTERS = {};
const N = (who) => `<span class="name">${who}：</span>`;

// lines used in every chapter
const COMMON_TEXT = {
  plate_hero: N('グレイ') + '…びくともしない。この石板は ルミナにしか応えないようだ。',
  hint_danger: N('グレイ') + 'しまった、ルミナから離れすぎた…！ 心細さに 彼女の光が揺らいでいる。急いで戻らねば！',
  hint_stuck: N('ヒント') + '行き詰まったら ポーズ（{pause}）から「最後の灯籠から やり直す」を選べる。',
  hint_grab: N('グレイ') + 'ルミナ！ 渦に沈められる前に、{attack} で灯竿を振れ！',
  bridge_crumble: N('グレイ') + 'くっ…！ わたしの重さでは 橋板が もたないか。',
  door_sealed: N('グレイ') + '影の気配が 扉を封じている…！',
  door_open: N('グレイ') + '……この扉は、あの子の光にしか 応えないのか。',
  hint_escape: N('ヒント') + '崩落に 追いつかれる前に 出口へ！ {dash}で走り、{jump}で跳べ。ルミナは 手をつないで ついてくる。',
};

// Stages changed in the stage editor (editor.html). src/stage_edits.js (written by the
// editor through tools/devserver.py) fills STAGE_EDITS[n]; a chapter with an entry is
// played from it instead of its build(). Tile layers are run-length coded: [value, count, ...].
const STAGE_EDITS = {};
let TEST_STAGE = null;
function unpackLayer(rle, n) {
  const a = new Uint8Array(n);
  for (let i = 0, p = 0; i < rle.length; i += 2) { a.fill(rle[i], p, p + rle[i + 1]); p += rle[i + 1]; }
  return a;
}
function packLayer(a) {
  const r = [];
  for (let i = 0; i < a.length;) { let j = i; while (j < a.length && a[j] === a[i]) j++; r.push(a[i], j - i); i = j; }
  return r;
}
function unpackStage(d) {
  const n = d.W * d.H, copy = (v) => JSON.parse(JSON.stringify(v || []));
  return { W: d.W, H: d.H, solid: unpackLayer(d.solid, n), noBg: unpackLayer(d.noBg, n), soft: d.soft ? unpackLayer(d.soft, n) : undefined,
    ents: copy(d.ents), decor: copy(d.decor), darks: copy(d.darks), name: d.name };
}
function packStage(s) {
  return { W: s.W, H: s.H, solid: packLayer(s.solid), noBg: packLayer(s.noBg), soft: s.soft ? packLayer(s.soft) : undefined,
    ents: s.ents, decor: s.decor, darks: s.darks || [], name: s.name };
}
// an edited stage may also bring its own texts for the fragments and pages it holds
function applyStageTexts(n, d) {
  if (!CHAPTERS[n] || !d) return;
  if (d.shards) CHAPTERS[n].shards = d.shards;
  if (d.pages) CHAPTERS[n].pages = d.pages;
}
function setTestStage(n, d) { TEST_STAGE = { n, d }; applyStageTexts(n, d); }
function stageFor(n) {
  const d = TEST_STAGE && TEST_STAGE.n === n ? TEST_STAGE.d : STAGE_EDITS[n];
  return d ? unpackStage(d) : CHAPTERS[n].build();
}

// the tables of the chapter being played
let TEXT = {}, SHARDS = {}, PAGES = {};
function useChapter(n) {
  const C = CHAPTERS[n];
  TEXT = Object.assign({}, COMMON_TEXT, C.text);
  SHARDS = C.shards || {};
  PAGES = C.pages || {};
  return C;
}
