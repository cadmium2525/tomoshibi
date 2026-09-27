'use strict';
// ---------------------------------------------------------------------------
// Chapter 5: 影の谷 (see docs/CHAPTER5.md)
// Down into the valley of shadows. Two new kinds of ground, both set by Lumina's
// light (a ring around her): the shadow road melts in it, the light moss sets in
// it. Under Grey's coat she gives no light: the road holds everywhere, the moss
// nowhere. "surface" = row of the first solid tile under a floor.
// ---------------------------------------------------------------------------
function buildStage5() {
  const W = 476, H = 56;
  const solid = new Uint8Array(W * H).fill(1);
  const noBg = new Uint8Array(W * H);
  const soft = new Uint8Array(W * H);
  const ents = [], decor = [], darks = [];
  const idx = (x, y) => y * W + x;
  const rect = (arr, v, x0, y0, x1, y1) => {
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (x >= 0 && y >= 0 && x < W && y < H) arr[idx(x, y)] = v;
  };
  const carve = (x0, y0, x1, y1) => rect(solid, 0, x0, y0, x1, y1);
  const fill = (x0, y0, x1, y1) => rect(solid, 1, x0, y0, x1, y1);
  // open sky down to a floor at surface s
  const air = (x0, x1, s) => { carve(x0, 2, x1, s - 1); rect(noBg, 1, x0, 0, x1, s - 1); };
  // inside the rock (cave wall behind)
  const cave = (x0, y0, x1, y1, bg = 0) => { carve(x0, y0, x1, y1); rect(noBg, bg, x0, y0, x1, y1); };
  // a drop into the dark (bottomless: a fall there counts as a fall)
  const pit = (x0, x1, from) => { carve(x0, from, x1, H - 1); rect(noBg, 1, x0, from, x1, H - 1); };
  const shade = (x0, x1, row) => { carve(x0, row, x1, row); rect(soft, 1, x0, row, x1, row); };
  const moss = (x0, x1, row) => { carve(x0, row, x1, row); rect(soft, 2, x0, row, x1, row); };
  const at = (tx, ty, dx = 8) => ({ x: tx * TILE + dx, y: (ty + 1) * TILE });
  const ent = (type, tx, ty, o = {}) => { const e = Object.assign({ type }, at(tx, ty), o); ents.push(e); return e; };
  const dec = (type, tx, s, o = {}) => decor.push(Object.assign({ type, x: tx * TILE, y: s * TILE }, o));
  // stairs made of single floating tiles: [x0, x1, row] for each step
  const steps = (kind, list) => { for (const [x0, x1, row] of list) (kind === 'shade' ? shade : kind === 'moss' ? moss : (a, b, r) => fill(a, r, b, r))(x0, x1, row); };

  // ===== A: the tower's shadow, laid across the valley (surface 16) =====================
  air(2, 76, 16);
  ent('hero', 9, 15); ent('heroine', 7, 15);
  ent('shrine', 12, 15, { id: 's1' });
  ent('sign', 14, 15, { text: 'sign_shade' });
  pit(16, 27, 16); shade(16, 27, 16);                 // 1: she cannot set foot on it while she shines
  pit(45, 56, 16); shade(45, 56, 16);                 // a second one
  // under the second: a lower road to a niche (a fragment). Leave her lit at the edge and the
  // near end of the bridge melts under Grey; the poles below it lead back up.
  shade(47, 56, 22); cave(57, 19, 63, 21);
  ent('pole', 45, 19, { w: 2 }); ent('pole', 45, 17, { w: 2 });
  // down to the cave mouth
  for (const [x, s] of [[67, 17], [69, 18], [71, 19], [73, 20], [75, 21]]) { carve(x, 16, x + 1, s - 1); rect(noBg, 1, x, 16, x + 1, s - 1); }

  // ===== B: the cave of light moss (surface 22, ceiling row 15) ===========================
  cave(77, 16, 140, 21);
  ent('shrine', 80, 21, { id: 's2' });
  // 2: a moss bridge over a trench (a fall only costs the climb back)
  cave(88, 22, 96, 24); moss(88, 96, 22);
  fill(88, 23, 88, 24); fill(89, 24, 89, 24);          // steps up out of the trench
  cave(97, 23, 104, 25); cave(96, 25, 96, 25);        // ... and a crawlway off it (a page), a step down into it
  // moss stairs up to a ledge, over a second trench
  cave(105, 22, 110, 25); fill(105, 24, 105, 25); fill(106, 25, 106, 25);
  steps('moss', [[105, 106, 21], [107, 108, 20], [109, 110, 19]]);
  fill(111, 19, 124, 21);                             // the ledge (surface 19)
  // a longer moss bridge over the dark: Grey must not run ahead of her light
  cave(125, 19, 133, H - 1); moss(125, 133, 19);
  fill(134, 19, 137, 21);
  ent('ambush', 131, 18, { id: 'a1', x0: 127, x1: 132, waves: [[{ tx: 122, ty: 18 }, { tx: 136, ty: 18 }]] });

  // ===== C: the shadow children's village (surface 26) ===================================
  air(141, 214, 26);
  // out of the cave and down into the village, a step at a time
  for (const [x, s] of [[138, 20], [140, 21], [142, 22], [144, 23], [145, 24], [146, 25]]) fill(x, s, x + 1, 25);
  ent('shrine', 150, 25, { id: 's3' });
  ent('sign', 152, 25, { text: 'sign_village' });
  // they potter about; lit, she is noticed. Under the coat she can pass right by.
  ent('villager', 157, 25, { x0: 154, x1: 164 });
  ent('villager', 169, 25, { x0: 166, x1: 175, hop: 90 });
  ent('villager', 182, 25, { x0: 181, x1: 184, dir: -1 });
  ent('villager', 188, 25, { x0: 185, x1: 192, hop: 70 });   // the dancers in the square
  ent('villager', 191, 25, { x0: 186, x1: 193, dir: -1 });
  ent('villager', 210, 25, { x0: 207, x1: 213 });
  // a stream with a shadow-road footbridge
  cave(177, 26, 180, 27); rect(noBg, 1, 177, 26, 180, 27); shade(177, 180, 26);
  // in the square, a ledge of moss above the dancers (a fragment): only her light sets it
  moss(188, 190, 24);
  // a ditch just past the square with moss over it: the coat has to come off to cross,
  // so wait until the one who lives there has wandered off to the far end
  cave(200, 26, 202, 27); rect(noBg, 1, 200, 26, 202, 27); moss(200, 202, 26);
  fill(200, 27, 200, 27); fill(202, 27, 202, 27);     // (a step at either side: anyone who falls in climbs out)
  dec('shut', 158, 26); dec('shut', 172, 26); dec('shut', 196, 26); dec('shut', 210, 26);
  dec('slaundry', 164, 22); dec('slaundry', 203, 22);

  // ===== D: the cave of shadow plays (surface 26, the pale wall behind) ==================
  cave(215, 16, 244, 25, 2);
  ent('playwall', 229, 25, { x0: 219, y0: 16.2 });
  ent('shrine', 240, 25, { id: 's4' });

  // ===== E: under way again - a moss bridge in an ambush, a road with a way down ==========
  air(245, 300, 26);
  pit(251, 266, 27); moss(251, 266, 26);
  ent('ambush', 259, 25, { id: 'a2', x0: 255, x1: 262, waves: [[{ tx: 248, ty: 25 }, { tx: 268, ty: 25 }], [{ tx: 247, ty: 25 }, { tx: 269, ty: 25, fly: true }]] });
  pit(273, 284, 27); shade(273, 284, 26);
  // below its near end: a ledge and a pocket in the rock (a fragment); back up by the poles,
  // which are clear only while her light melts the road above them
  fill(273, 31, 276, 31); cave(268, 28, 272, 30);
  ent('pole', 274, 28, { w: 2 }); ent('pole', 274, 26, { w: 2 });

  // ===== F: the cliff down to the valley floor: road and moss by turns ====================
  ent('shrine', 290, 25, { id: 's5' });
  air(301, 333, 26); pit(301, 333, 26);
  steps('shade', [[301, 302, 27], [303, 304, 28], [305, 306, 29]]);
  steps('rock', [[307, 309, 30]]);
  steps('moss', [[310, 311, 31], [312, 313, 32], [314, 315, 33]]);
  steps('rock', [[316, 318, 34]]);
  steps('shade', [[319, 320, 35], [321, 322, 36], [323, 324, 37]]);
  steps('rock', [[325, 327, 38]]);
  steps('moss', [[328, 329, 39], [330, 331, 40], [332, 333, 41]]);

  // ===== G: the valley floor: a sea of shadow, the whale, the great shadow asleep ========
  air(334, 475, 42);
  cave(344, 42, 376, 44); rect(noBg, 1, 344, 42, 376, 44);
  shade(344, 376, 42);                                // the sea (a shallow trench under it)
  // steps out of the trench, one row at a time (she can climb them too), at either end and by the rock in the middle
  fill(344, 43, 344, 44); fill(345, 44, 345, 44); fill(376, 43, 376, 44); fill(375, 44, 375, 44);
  fill(357, 42, 359, 44); rect(soft, 0, 357, 42, 359, 42);   // a rock in the middle of the sea
  fill(356, 43, 356, 44); fill(355, 44, 355, 44); fill(360, 43, 360, 44); fill(361, 44, 361, 44);
  ent('shrine', 336, 41, { id: 's6' });
  // an old jetty of stakes off the rock: where her light dries the sea up, Grey still has
  // footing (the whale does not: it lands in the dry trench under it)
  ent('pole', 344, 41, { w: 4 });
  ent('whale', 360, 41, { x0: 344, x1: 376, sea: 42 });
  ent('ookage', 384, 41);

  // ===== the way up out of the valley as it falls in (the escape) =========================
  ent('escape', 386, 41, { id: 's7' });
  pit(391, 452, 42);
  steps('moss', [[391, 392, 41], [393, 394, 40], [395, 396, 39]]);
  steps('rock', [[397, 399, 38]]);
  steps('shade', [[400, 401, 37], [402, 403, 36], [404, 405, 35]]);
  steps('rock', [[406, 408, 34]]);
  steps('moss', [[409, 410, 33], [411, 412, 32], [413, 414, 31]]);
  steps('rock', [[415, 417, 30]]);
  steps('shade', [[418, 419, 29], [420, 421, 28], [422, 423, 27]]);
  steps('rock', [[424, 428, 26]]);
  shade(429, 440, 26);
  steps('rock', [[441, 446, 26]]);
  steps('moss', [[447, 448, 25], [449, 450, 24], [451, 452, 23]]);
  fill(453, 22, 475, H - 1);
  ent('exit', 468, 21, { dx: 0 });

  // ===== collectibles ======================================================================
  ent('shard', 62, 21, { id: 'c5f1' });               // A: the niche under the second bridge
  ent('page', 103, 25, { id: 'c5j1' });               // B: the crawlway off the trench
  ent('shard', 189, 23, { id: 'c5f2' });              // C: on the moss above the dancers
  ent('shard', 269, 30, { id: 'c5f3' });              // E: the pocket under the road
  ent('page', 317, 31, { id: 'c5j2' });               // F: over a landing on the cliff
  ent('shard', 385, 38, { id: 'c5f4' });              // G: where the great shadow slept (a jump as the valley starts to fall)
  ent('shard', 398, 34, { id: 'c5f5' });              // escape: over the first landing
  ent('page', 407, 30, { id: 'c5j3' });               // escape: over the second

  return { W, H, solid, noBg, soft, ents, decor, darks, name: '影の谷' };
}

const CH5_SHARDS = {
  c5f1: 'ここが ぼくたちの おうち。 あのこの ひかりが とどかない、いちばん ふかい ところ。',
  c5f2: 'みんなで あそんでる。 あのこも いっしょなら いいのに。',
  c5f3: 'したへ したへ。 くらいほうへ いくと、あのこの ゆめが みえる。',
  c5f4: 'おおきな あのこが ねむってる。 おこしちゃ だめ。 ないちゃうから。',
  c5f5: 'おいていかないで。 ……ううん、いってらっしゃい。',
};
const CH5_PAGES = {
  c5j1: { title: '灯守りの手記 その十一', body: `
    <p>あの夜のあと、わたしは 灯竿を 置いた。 影を 払うための 火が、あの子を 閉じこめる 鍵のように 思えたからだ。</p>
    <p>それでも 手放せなかった。 いつか、あの扉を 開けに 行くときのために。</p>` },
  c5j2: { title: '灯守りの手記 その十二', body: `
    <p>先代から 聞いたことがある。 光が生んだ 影は、行き場を なくすと 谷へ 降りるのだと。</p>
    <p>谷の影は、生まれた光を 覚えている。 だから 光を 恋しがる。</p>` },
  c5j3: { title: '灯守りの手記 その十三', body: `
    <p>影を 消すのは 闇ではない。 もうひとつの 光だ。</p>
    <p>二つの光に 照らされた影は、薄く、やわらかくなる。 ――いつか、あの子の 大きな影にも。</p>` },
};
const CH5_TEXT = {
  sign_shade: N('碑文') + '「影の道は 光に 溶け、光苔は 光に 固まる」',
  sign_village: N('碑文') + '「ここは 影の子らの 里。 灯りを 隠して 通られよ」',
  hint_escape: N('ヒント') + '谷が 崩れる！ {dash}で走り、{jump}で跳べ。 影の道の前では 外套（{up}）を かぶせ、光苔の前では 外す。',
};

CHAPTERS[5] = {
  num: 5, title: '影の谷', theme: 'valley', build: buildStage5, hood: true, escapeSpeed: 1.45, escapeLead: 170,
  escapeScript: (retry) => valleyEscapeScript(retry),
  text: CH5_TEXT, shards: CH5_SHARDS, pages: CH5_PAGES,
  clearQuote: '「大きな影は、王城へ……」<br>「……おかあさまの ところへ？」',
  intro: () => [
    Cut.run((g) => {
      const hero = g.hero, h = g.heroine;
      hero.setState('scripted'); h.setState('scripted');
      hero.x = 5.5 * TILE; h.x = 4.5 * TILE; hero.y = h.y = 16 * TILE; hero.facing = h.facing = 1;
      g.black = 1; g.updateCamera(true);
    }),
    Cut.fade(0, 60),
    Cut.walk('hero', 10, 0.6),
    Cut.walk('heroine', 8.5, 0.5),
    Cut.say('heroine', '……ここ、なんだか なつかしい。', 'her', 110),
    Cut.talk('グレイ', '塔の影が、谷の底まで 伸びている……。 影の子らは、この道を 通って 帰っていったんだ。'),
    Cut.talk('ルミナ', 'みんなの おうちが、この下に あるの？'),
    Cut.talk('グレイ', 'たぶんな。 ……行こう。 足元に 気をつけるんだぞ。'),
    Cut.chapter('第5章', '影の谷'),
  ],
};
