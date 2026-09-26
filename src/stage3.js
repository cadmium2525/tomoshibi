'use strict';
// ---------------------------------------------------------------------------
// Chapter 3: 消灯の街 (see docs/CHAPTER3.md)
// Streets have house walls behind them (sky above the roofs); indoors uses
// plaster (noBg 2). "surface" = row of the first solid tile under a floor.
// ---------------------------------------------------------------------------
function buildStage3() {
  const W = 412, H = 44;
  const solid = new Uint8Array(W * H).fill(1);
  const noBg = new Uint8Array(W * H);
  const ents = [], decor = [], darks = [];
  const idx = (x, y) => y * W + x;
  const rect = (arr, v, x0, y0, x1, y1) => {
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (x >= 0 && y >= 0 && x < W && y < H) arr[idx(x, y)] = v;
  };
  const carve = (x0, y0, x1, y1) => rect(solid, 0, x0, y0, x1, y1);
  const fill = (x0, y0, x1, y1) => rect(solid, 1, x0, y0, x1, y1);
  // a street: house walls up to 8 tiles above it, sky higher up
  const street = (x0, x1, s) => { carve(x0, 2, x1, s - 1); rect(noBg, 1, x0, 0, x1, s - 9); rect(noBg, 0, x0, s - 8, x1, s - 1); };
  // open air over the rooftops
  const air = (x0, x1, s) => { carve(x0, 2, x1, s - 1); rect(noBg, 1, x0, 0, x1, s - 1); };
  const pit = (x0, x1, from) => { carve(x0, from, x1, H - 1); rect(noBg, 1, x0, from, x1, H - 1); };
  const indoors = (x0, y0, x1, y1) => { carve(x0, y0, x1, y1); rect(noBg, 2, x0, y0, x1, y1); };
  const tunnel = (x0, y0, x1, y1) => { carve(x0, y0, x1, y1); rect(noBg, 0, x0, y0, x1, y1); };
  const at = (tx, ty, dx = 8) => ({ x: tx * TILE + dx, y: (ty + 1) * TILE });
  const ent = (type, tx, ty, o = {}) => { const e = Object.assign({ type }, at(tx, ty), o); ents.push(e); return e; };
  const dec = (type, tx, s, o = {}) => decor.push(Object.assign({ type, x: tx * TILE, y: s * TILE }, o));

  // ===== A: outside the town gate ============================================
  street(2, 44, 30);
  rect(noBg, 1, 2, 0, 26, 29);                      // outside the walls: open sky
  // behind us (to the left): a garden wall with a sunken yard behind it - a side trip
  fill(5, 28, 5, 29);
  carve(2, 30, 4, 30); rect(noBg, 1, 2, 30, 4, 30);
  fill(27, 12, 29, 26);                             // the town wall; the gate arch below is open
  ent('hero', 8, 29); ent('heroine', 6, 29);
  ent('block', 4, 30, { id: 'k1' });                // a crate in the yard to climb back out
  ent('guard', 31, 29, { id: 'gA', dir: -1, turn: 240 });   // the gatekeeper watches the road, now and then the town
  ent('sign', 20, 29, { text: 'sign_curfew' });
  ent('shrine', 41, 29, { id: 's1' });
  dec('poster', 22, 27); dec('barrel', 34, 30); dec('bwindow', 37, 27); dec('bwindow', 43, 27);

  // ===== B: back streets ========================================================
  street(45, 69, 30);
  street(70, 108, 28);                               // two tiles up: she needs a hand
  ent('guard', 58, 29, { id: 'gB', x0: 50, x1: 66 });
  ent('nook', 57, 29, { w: 3 });
  ent('guard', 86, 27, { id: 'gC', x0: 78, x1: 95 });
  ent('nook', 83, 27, { w: 3 });
  // a lamp, a barrel's shadow and a balcony: the first lure (a page lies up there)
  ent('lamp', 91, 27, { id: 'L1', guard: 'gC' });
  ent('marker', 94, 27, { id: 'b1', look: 'barrel', h: 28, lamp: 'L1' });
  fill(96, 24, 99, 24);
  ent('block', 104, 27, { id: 'k2' });
  dec('bwindow', 48, 27); dec('bwindow', 61, 27); dec('bwindow', 74, 25); dec('poster', 79, 25); dec('bwindow', 100, 25);
  dec('barrel', 67, 30);

  // ===== C: over the rooftops ===================================================
  air(109, 112, 26); rect(noBg, 0, 109, 18, 112, 25);    // a shed against the last house
  air(113, 120, 24);                                 // roof A
  pit(121, 123, 2);
  air(124, 131, 24);                                 // roof B
  pit(132, 134, 2);
  air(135, 145, 23);                                 // roof C
  air(146, 151, 22);                                 // roof D
  // poles strung between the chimneys: only Grey can climb them (a fragment waits on top)
  ent('pole', 137, 20, { w: 2 }); ent('pole', 139, 18, { w: 2 }); ent('pole', 141, 16, { w: 2 });
  ent('shrine', 110, 25, { id: 's2' });
  ent('ambush', 127, 23, { id: 'a1', x0: 125, x1: 130, waves: [[{ tx: 124, ty: 23, fly: true }, { tx: 131, ty: 23, fly: true }]] });
  dec('chimney', 116, 24); dec('laundry', 125, 22); dec('chimney', 141, 23); dec('chimney', 148, 22);

  // ===== D: the sewers (dark) ===================================================
  air(152, 155, 26); air(156, 159, 28); street(160, 170, 30);
  pit(167, 168, 30); fill(167, 36, 168, 43);          // a grate: down into the sewer
  tunnel(167, 31, 232, 35);                            // the sewer (surface 36)
  darks.push([167, 30, 232, 40]);
  const water = (x0, x1) => { carve(x0, 36, x1, H - 1); rect(noBg, 0, x0, 36, x1, H - 1); };
  water(175, 175); water(178, 178); water(183, 186); water(193, 193); water(201, 204);
  ent('shrine', 170, 35, { id: 's3' });
  ent('lever', 207, 35, { id: 'lvS', gates: ['gS'] });
  ent('gate', 211, 33, { id: 'gS' });
  fill(211, 31, 211, 32);
  // the way up: out of the sewer by a stair of ledges
  tunnel(227, 26, 232, 30); fill(229, 34, 232, 35); fill(231, 32, 232, 33);
  street(233, 236, 30);
  // a hole in the sewer's ceiling and poles only Grey can climb: an old overflow channel above,
  // dark, with gaps you only see by her light (a fragment and a page lie in it)
  carve(195, 28, 197, 30);
  ent('pole', 195, 33, { w: 3 }); ent('pole', 195, 31, { w: 3 }); ent('pole', 195, 29, { w: 3 }); ent('pole', 195, 27, { w: 3 });
  tunnel(186, 23, 212, 27);                          // the channel (floor at row 28)
  carve(200, 28, 201, 30); carve(206, 28, 206, 30);  // gaps: a fall back into the sewer
  darks.push([186, 22, 212, 30]);
  dec('chain', 190, 31, { len: 2 });

  // ===== E: the town square ======================================================
  street(237, 294, 30);
  rect(noBg, 1, 237, 0, 294, 25);                     // an open square: more sky
  // the clock tower stands behind the street: only its top and a ledge can be stood on
  rect(noBg, 0, 238, 18, 240, 29);
  fill(238, 24, 240, 24);                             // top (surface 24)
  fill(241, 26, 242, 26);                             // ledge
  ent('marker', 246, 29, { id: 'st1', look: 'marker', h: 32, lamp: 'L2' });   // a statue
  ent('lamp', 250, 29, { id: 'L2', guard: 'gD' });
  ent('nook', 242, 29, { w: 3 });
  ent('guard', 258, 29, { id: 'gD', dir: -1, turn: 300 });
  // a watchman on a balcony above the street: he cannot bump into her, but he looks down
  fill(262, 26, 276, 26);
  ent('guard', 268, 25, { id: 'gE', x0: 262, x1: 276 });
  ent('lamp', 277, 29, { id: 'L3', guard: 'gF' });
  ent('nook', 280, 29, { w: 3 });
  ent('plate', 283, 29, { id: 'pP', gates: ['gP'] });
  ent('guard', 286, 29, { id: 'gF', dir: -1 });
  ent('gate', 289, 27, { id: 'gP' });
  fill(289, 12, 289, 26);
  ent('lever', 291, 29, { id: 'lvP', gates: ['gP'] });
  ent('shrine', 235, 29, { id: 's4' });
  dec('bwindow', 254, 27); dec('poster', 266, 27); dec('barrel', 284, 30);

  // ===== F: the sanatorium ========================================================
  indoors(295, 23, 318, 29);
  fill(295, 23, 295, 26);                             // its door is the gap below
  // a few steps up to a landing by the window (Marta's diary lies up on the shelf)
  fill(300, 29, 300, 29); fill(301, 28, 301, 29); fill(302, 27, 304, 29); fill(305, 28, 305, 29); fill(306, 29, 306, 29);
  ent('shrine', 298, 29, { id: 's5' });
  ent('marta', 313, 29);
  ent('npcspot', 316, 29, { name: 'marta' });

  // ===== G: the night of bells (run over the roofs) ================================
  const run = [
    [319, 330, 22], [331, 333, null], [334, 340, 22], [341, 345, 20], [346, 349, 'plank'], [350, 356, 20],
    [357, 359, null], [360, 366, 21], [367, 370, 19], [371, 374, null], [375, 382, 19], [383, 386, 'plank'],
    [387, 392, 19], [393, 395, null], [396, 410, 20],
  ];
  let prev = 22;
  for (const [x0, x1, sf] of run) {
    if (sf === null) { pit(x0, x1, 2); continue; }
    if (sf === 'plank') { pit(x0, x1, 2); for (let x = x0; x <= x1; x++) ent('crumble', x, prev - 1); continue; }
    air(x0, x1, sf); prev = sf;
  }
  ent('escape', 321, 21, { id: 's6' });
  ent('exit', 406, 19, { dx: 0 });
  dec('chimney', 325, 22); dec('chimney', 352, 20); dec('chimney', 378, 19);

  // ===== small things that make it a lived-in town (no lit windows: the curfew) ====
  for (const [x, s2, v] of [[48, 26, 0], [62, 26, 1], [76, 24, 2], [89, 24, 0], [250, 26, 1], [271, 26, 2]]) dec('shopsign', x, s2, { v });
  for (const [x, s2] of [[37, 29], [43, 29], [48, 29], [61, 29], [74, 27], [100, 27], [254, 29]]) dec('flowerbox', x, s2);
  for (const [x, s2] of [[116, 21], [141, 20], [148, 19], [325, 19], [352, 17], [378, 16]]) dec('smoke', x, s2);
  dec('cat', 128, 24); dec('cat', 344, 20); dec('cat', 67, 30);

  // ===== collectibles ===============================================================
  ent('shard', 2, 30, { id: 'c3f1' });               // A: in the sunken yard
  ent('page', 97, 23, { id: 'c3j1' });               // B: on the balcony (lamp + barrel shadow)
  ent('shard', 142, 14, { id: 'c3f2' });             // C: on the highest pole above the roofs
  ent('shard', 203, 26, { id: 'c3f3' });             // D: in the overflow channel above the sewer
  ent('page', 211, 27, { id: 'c3j2' });              // D: at its dead end
  ent('shard', 239, 22, { id: 'c3f4' });             // E: on top of the clock tower
  ent('page', 303, 23, { id: 'c3j3' });              // F: Marta's diary on the shelf above the landing
  ent('shard', 400, 16, { id: 'c3f5' });             // G: high over the last roof - a jump that costs a moment

  return { W, H, solid, noBg, ents, decor, darks, name: '消灯の街' };
}

const CH3_SHARDS = {
  c3f1: 'まどが みんな しまってる。 ここの ひとたちも、くらいのが こわいのかな。',
  c3f2: 'やねうらは、せいどうに にてる。 でも ここには だれも いない。',
  c3f3: 'みずの おとが する。 あのこの ひかりが、みずに うつって ゆれた。',
  c3f4: 'たかい ところから みた まちは、ほしぞらを ひっくりかえした みたい。 ほしは ひとつも ないけど。',
  c3f5: 'かねが なってる。 みんな、あのこを さがしてる。 ぼくも さがしてる。',
};
const CH3_PAGES = {
  c3j1: { title: '灯守りの手記 その七', body: `
    <p>消灯令が出た夜、わたしは 王都の街灯を ひとつずつ 消して回った。 灯守りが 灯を消すのは、生まれて初めてだった。</p>
    <p>最後の一本を消したとき、街は 驚くほど 静かになった。 静かで、冷たかった。</p>` },
  c3j2: { title: '灯守りの手記 その八', body: `
    <p>光を禁じても、人は 影を怖がることを やめなかった。 暗い街では、影は 見えないだけで、どこにでもいる。</p>
    <p>見えない影ほど、人を 怯えさせるものはない。</p>` },
  c3j3: { title: 'マルタの日記', body: `
    <p>あの子が 聖堂で 十三回目の 冬を 越した。 壁の影に 名前を つけて、毎晩 話しかけている。</p>
    <p>わたしの体は もう 長い階段を 降りられない。 ……グレイに 手紙を 書こう。 あの夜 あの子を 抱いて 聖堂へ 降りた人に。</p>` },
};
const CH3_TEXT = {
  sign_curfew: N('張り紙') + '「消灯令 ― 夜間の灯火を 固く禁ず。 灯りを見た者は 消灯番に 届け出よ」',
  hint_hood: N('ヒント') + '外套：ルミナの隣で {up}。 かぶせると 消灯番に 見つからないが、心細さが たまっていく。',
};

CHAPTERS[3] = {
  num: 3, title: '消灯の街', theme: 'town', build: buildStage3, hood: true, startHooded: true,
  pursuit: 'guards', escapeScript: (retry) => bellsScript(retry),
  text: CH3_TEXT, shards: CH3_SHARDS, pages: CH3_PAGES,
  clearQuote: '「灯守りの塔へ 行こう」<br>「……わたしが、話さなければ ならないことが ある」',
  safe: (h) => h.x < 22 * TILE,
  intro: () => [
    Cut.run((g) => {
      const hero = g.hero, h = g.heroine;
      hero.setState('scripted'); h.setState('scripted');
      hero.x = 7.5 * TILE; h.x = 6.5 * TILE; hero.y = h.y = 30 * TILE; hero.facing = h.facing = 1;
      g.black = 1; g.updateCamera(true);
    }),
    Cut.fade(0, 60),
    Cut.walk('hero', 10, 0.6),
    Cut.walk('heroine', 8.5, 0.5),
    Cut.say('heroine', '……まっくら。 みんな、どうして 灯りを 消しているの？', 'her', 130),
    Cut.talk('グレイ', '怖いんだよ。 光があれば、影も できるからね。'),
    Cut.talk('グレイ', '……あの門には 消灯番がいる。 君の光は、ここでは 目立ちすぎる。'),
    Cut.face('hero', -1),
    Cut.run((g) => { g.heroine.hooded = true; Sfx.play('plateoff'); g.particles.burst(g.heroine.x, g.heroine.y - 20, 8, { col: '#5a5468', life: 18, max: 1 }); }),
    Cut.talk('グレイ', 'これを かぶっていなさい。 わたしの そばを 離れないように。'),
    Cut.talk('ルミナ', '……くらい。 でも、グレイさんの においがする。'),
    Cut.face('hero', 1),
    Cut.chapter('第3章', '消灯の街'),
    Cut.run((g) => g.notify('hint_hood', 400)),
  ],
};
