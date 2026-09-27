'use strict';
// ---------------------------------------------------------------------------
// Chapter 6: 宵の王城 (see docs/CHAPTER6.md)
// Up the town below the castle, in through the moat, along the portrait gallery,
// the chapel where Grey's pole takes fire again, the tower of shadow veils, the
// great stair, the throne room - and, after, the evening in the town.
// "surface" = row of the first solid tile under a floor.
// ---------------------------------------------------------------------------
function buildStage6() {
  const W = 480, H = 44;
  const solid = new Uint8Array(W * H).fill(1);
  const noBg = new Uint8Array(W * H);
  const ents = [], decor = [], darks = [];
  const idx = (x, y) => y * W + x;
  const rect = (arr, v, x0, y0, x1, y1) => {
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (x >= 0 && y >= 0 && x < W && y < H) arr[idx(x, y)] = v;
  };
  const carve = (x0, y0, x1, y1) => rect(solid, 0, x0, y0, x1, y1);
  const fill = (x0, y0, x1, y1) => rect(solid, 1, x0, y0, x1, y1);
  const air = (x0, x1, s) => { carve(x0, 2, x1, s - 1); rect(noBg, 1, x0, 0, x1, s - 1); };
  const room = (x0, y0, x1, y1, bg = 0) => { carve(x0, y0, x1, y1); rect(noBg, bg, x0, y0, x1, y1); };
  const at = (tx, ty, dx = 8) => ({ x: tx * TILE + dx, y: (ty + 1) * TILE });
  const ent = (type, tx, ty, o = {}) => { const e = Object.assign({ type }, at(tx, ty), o); ents.push(e); return e; };
  const dec = (type, tx, s, o = {}) => decor.push(Object.assign({ type, x: tx * TILE, y: s * TILE }, o));

  // ===== A: the town below the castle, climbing (under the curfew) =========================
  for (const [x0, x1, s] of [[2, 14, 30], [15, 22, 29], [23, 30, 28], [31, 40, 27], [41, 50, 26], [51, 71, 25]]) air(x0, x1, s);
  ent('hero', 9, 29); ent('heroine', 7, 29);
  ent('shrine', 12, 29, { id: 's1' });
  ent('guard', 44, 25, { id: 'gA', x0: 33, x1: 48 });
  ent('nook', 36, 26, { w: 3 });
  ent('lamp', 47, 25, { id: 'LA', guard: 'gA' });
  ent('guard', 62, 24, { id: 'gB', dir: -1, turn: 240 });
  ent('nook', 56, 24, { w: 3 });
  // over the roofs (a fragment): up two poles to a roof ledge
  ent('pole', 64, 22, { w: 2 }); ent('pole', 64, 20, { w: 2 });
  fill(66, 19, 70, 19);
  for (const [x, s2, v] of [[20, 29, 0], [44, 26, 1], [58, 25, 2]]) dec('shopsign', x, s2 - 3, { v });
  for (const [x, s2] of [[18, 29], [27, 28], [53, 25]]) dec('flowerbox', x, s2);

  // ===== B: down into the moat (surface 34), a pale wall and her shadow ====================
  room(72, 25, 120, 33);
  carve(72, 18, 78, 24); rect(noBg, 1, 72, 0, 78, 24);                  // the mouth of the stair, open to the sky
  for (let x = 72; x <= 79; x++) fill(x, 25 + (x - 71), x, 33);         // stairs down
  ent('shrine', 82, 33, { id: 's2' });
  rect(noBg, 2, 86, 25, 110, 33);                                        // the pale wall
  ent('sign', 88, 33, { text: 'sign_latch' });
  ent('candle', 92, 33, { id: 'cB' });
  ent('slatch', 94, 28, { id: 'lB', min: 2.6, gates: ['gB'] });        // high: her shadow must be big
  ent('gate', 112, 33, { id: 'gB' });
  // a slit in the grating low down: only a small shadow reaches in (it opens a hatch overhead)
  ent('slatch', 97, 33, { id: 'lB2', max: 0.95, gates: ['hB'] });
  room(82, 20, 86, 23); carve(84, 24, 84, 24);
  ent('lightbridge', 84, 23, { id: 'hB', w: 1, log: true, invert: true });
  for (const ty of [31, 29, 27, 25]) ent('pole', 84, ty, { w: 1 });
  // up out of the moat into the castle
  room(113, 18, 130, 25);
  for (let x = 113; x <= 120; x++) fill(x, 33 - (x - 113), x, 33);

  // ===== C: the portrait gallery (surface 26) ================================================
  room(121, 17, 200, 25);
  ent('shrine', 124, 25, { id: 's3' });
  ent('guard', 145, 25, { id: 'gC', x0: 134, x1: 156 });
  ent('nook', 140, 25, { w: 3 });
  rect(noBg, 2, 156, 17, 166, 25);
  ent('candle', 160, 25, { id: 'cC', guard: 'gC' });
  ent('slatch', 162, 20, { id: 'lC', min: 2.6, gates: ['gC1'] });
  ent('nook', 163, 25, { w: 2 });
  ent('gate', 167, 25, { id: 'gC1' });
  ent('guard', 180, 25, { id: 'gD', x0: 170, x1: 190 });
  ent('nook', 175, 25, { w: 3 });
  // above the gallery ceiling (a fragment)
  for (const ty of [23, 21, 19, 17]) ent('pole', 186, ty, { w: 2 });
  carve(186, 15, 187, 16); room(184, 13, 190, 15); fill(188, 16, 190, 16);
  for (const x of [128, 150, 184, 196]) dec('portrait', x, 23);
  for (const x of [136, 172, 192]) dec('kwindow', x, 24);

  // ===== D: the chapel (surface 26, a high ceiling) ===========================================
  room(201, 15, 224, 25, 2);
  ent('chapel', 212, 25);
  ent('candle', 214, 25, { id: 'cAltar', fixed: true });
  ent('shrine', 221, 25, { id: 's4' });
  // a vestry on the gallery above, behind a veil (a fragment): the pole's flame outside, its own candle within
  for (const ty of [23, 21, 19]) ent('pole', 208, ty, { w: 2 });
  fill(210, 19, 223, 19);
  ent('veil', 215, 18, { id: 'V3', h: 4 });
  ent('candle', 221, 18, { id: 'cVestry', fixed: true });

  // ===== E: the corridor of shadow veils (surface 26) =========================================
  room(225, 17, 282, 25);
  ent('sign', 229, 25, { text: 'sign_veil' });
  ent('veil', 236, 25, { id: 'V1', h: 4 });
  ent('pole', 232, 23, { w: 2 }); ent('pole', 234, 21, { w: 2 });          // Grey over the top (the last level with it)
  // the second veil hides a guard beyond it: lit through from both sides, it shows her to him too
  ent('veil', 256, 25, { id: 'V2', h: 4 });
  ent('guard', 266, 25, { id: 'gE', x0: 260, x1: 272 });
  ent('nook', 265, 25, { w: 3 });                                          // a doorway in the middle of his beat
  ent('pole', 252, 23, { w: 2 }); ent('pole', 254, 21, { w: 2 });
  for (const x of [262, 274]) dec('portrait', x, 23);

  // ===== F: the great stair, up to the throne room (surface 26 -> 16) ========================
  for (let i = 0; i <= 10; i++) { const x0 = 283 + 5 * i; room(x0, 6, x0 + 4, 25 - i); }
  room(338, 6, 352, 15);
  ent('shrine', 285, 25, { id: 's5' });
  ent('guard', 300, 22, { id: 'gF1', x0: 293, x1: 307 });
  ent('nook', 299, 22, { w: 3 });
  ent('guard', 322, 17, { id: 'gF2', x0: 314, x1: 330 });
  ent('nook', 324, 17, { w: 2 });
  rect(noBg, 2, 336, 6, 344, 15);
  ent('candle', 338, 15, { id: 'cF' });
  ent('slatch', 340, 10, { id: 'lF', min: 2.6, gates: ['gF'] });
  ent('gate', 344, 15, { id: 'gF' });
  // a beam high over the stair (a page)
  for (const ty of [19, 17, 15, 13]) ent('pole', 302, ty, { w: 2 });
  fill(304, 12, 308, 12);

  // ===== G: the antechamber and the throne room (surface 16) =================================
  ent('shrine', 348, 15, { id: 's6' });
  for (const ty of [13, 11]) ent('pole', 350, ty, { w: 2 });
  room(353, 4, 386, 15, 2);
  ent('candle', 355, 15, { id: 'tc1', fixed: true });
  ent('candle', 384, 15, { id: 'tc2', fixed: true });
  dec('throne', 381, 16);
  ent('finalboss', 369, 15, { x0: 354, x1: 385 });

  // ===== the evening after: the town, lamps to light (reached only after the finale) =========
  for (const [x0, x1, s] of [[392, 410, 26], [411, 425, 27], [426, 440, 28], [441, 455, 29], [456, 475, 30]]) air(x0, x1, s);
  ent('epilogue', 396, 25);
  for (const [x, s] of [[404, 26], [418, 27], [433, 28], [448, 29], [462, 30]]) ent('lamp', x, s - 1, { id: 'E' + x });
  fill(436, 27, 437, 27);
  ent('epiend', 470, 29);
  for (const [x, s2, v] of [[400, 26, 0], [414, 27, 1], [428, 28, 2], [444, 29, 0], [458, 30, 1]]) dec('shopsign', x, s2 - 3, { v });
  for (const [x, s2] of [[408, 26], [422, 27], [451, 29]]) dec('flowerbox', x, s2);

  // ===== collectibles ======================================================================
  ent('shard', 69, 18, { id: 'c6f1' });               // A: on the roof ledge
  ent('page', 83, 23, { id: 'c6j1' });                // B: in the cell over the moat (the hatch)
  ent('shard', 189, 15, { id: 'c6f2' });              // C: above the gallery ceiling
  ent('shard', 222, 18, { id: 'c6f3' });              // D: in the vestry behind the veil
  ent('page', 307, 11, { id: 'c6j2' });               // F: on the beam over the stair
  ent('shard', 351, 10, { id: 'c6f4' });              // G: high in the antechamber
  ent('page', 393, 25, { id: 'c6j3' });               // the evening: at the top of the street
  ent('shard', 437, 24, { id: 'c6f5' });              // the evening: over the bench

  return { W, H, solid, noBg, ents, decor, darks, name: '宵の王城' };
}

const CH6_SHARDS = {
  c6f1: 'おしろ。 あのこが うまれた ところ。 ここには、おおきな まどが あった。',
  c6f2: 'えの なかの ひと、あのこに にてる。 ランタンを もってる。',
  c6f3: 'ふたつの ひかりに はさまれると、からだが かるくなる。 ふしぎ。',
  c6f4: 'おおきな あのこは、ほんとうは ずっと ないてた。',
  c6f5: 'だいすき。 ……こんどは、ひかりの なかで いっしょに あそぼう。',
};
const CH6_PAGES = {
  c6j1: { title: '女王の手記 その一', body: `
    <p>あの子が 生まれた夜、部屋じゅうが 昼のように 明るくなった。 そして 王は、その光が 落とした 影の中へ 消えた。</p>
    <p>わたしは 光を 憎んだ。 ……あの子の 光を。</p>` },
  c6j2: { title: '女王の手記 その二', body: `
    <p>ランタンの 火を 消した。 灯の巫女は、もう いない。</p>
    <p>けれど 毎晩、消えたランタンを 胸に 抱いて 眠る。 捨てることが できない。 礼拝堂の 燭台の火も、まだ 消せずにいる。</p>` },
  c6j3: { title: '女王の手記 さいごの頁', body: `
    <p>マルタに 頼んだ。 灯守りに 手紙を 書いてほしい、と。</p>
    <p>あの夜 あの子を 運んだ人なら、きっと 迎えに 行ってくれる。 ――わたしには、その勇気が なかった。</p>` },
};
const CH6_TEXT = {
  hint_hood: N('ヒント') + '外套：ルミナの隣で {up}。 かぶせると 近衛に 見つからないが、心細さが たまっていく。',
  sign_latch: N('碑文') + '「灯の前に 立つ者の影は、灯に 近づくほど 大きくなる」',
  sign_veil: N('碑文') + '「影の帳は、ひとつの光では ひらかぬ」',
  epi_hint: N('ヒント') + '灯竿（{attack}）で 街灯に 火を ともしながら、坂を 下ろう。',
};

CHAPTERS[6] = {
  num: 6, title: '宵の王城', theme: 'castle', build: buildStage6, hood: true, startHooded: true, pageLabel: '女王の手記',
  text: CH6_TEXT, shards: CH6_SHARDS, pages: CH6_PAGES,
  clearQuote: '',
  intro: () => [
    Cut.run((g) => {
      const hero = g.hero, h = g.heroine;
      hero.setState('scripted'); h.setState('scripted');
      hero.x = 5.5 * TILE; h.x = 4.5 * TILE; hero.y = h.y = 30 * TILE; hero.facing = h.facing = 1;
      g.black = 1; g.updateCamera(true);
    }),
    Cut.caption('――大きな影を 追って、丘の上の 王城へ'),
    Cut.fade(0, 60),
    Cut.walk('hero', 10, 0.6),
    Cut.walk('heroine', 8.5, 0.5),
    Cut.say('heroine', '……ここが、わたしの 生まれた ところ？', 'her', 120),
    Cut.talk('グレイ', 'ああ。 ……城の中にも、消灯番が いる。 近衛だ。'),
    Cut.talk('グレイ', '外套を かぶっていなさい。 大影は、きっと 玉座の間だ。'),
    Cut.run((g) => { g.heroine.hooded = true; Sfx.play('plateoff'); }),
    Cut.chapter('第6章', '宵の王城'),
  ],
};
