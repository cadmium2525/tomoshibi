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

// the tables of the chapter being played
let TEXT = {}, SHARDS = {}, PAGES = {};
function useChapter(n) {
  const C = CHAPTERS[n];
  TEXT = Object.assign({}, COMMON_TEXT, C.text);
  SHARDS = C.shards || {};
  PAGES = C.pages || {};
  return C;
}
