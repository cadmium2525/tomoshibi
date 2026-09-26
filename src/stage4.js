'use strict';
// ---------------------------------------------------------------------------
// Chapter 4: 灯守りの塔 (see docs/CHAPTER4.md)
// A vertical chapter: the village at the foot (bottom left), then up through the
// tower (x 60-99) floor by floor, out along its outer wall (x 101-110), and into the
// great lamp's room at the top. "surface" = row of the first solid tile under a floor.
// ---------------------------------------------------------------------------
function buildStage4() {
  const W = 112, H = 120;
  const solid = new Uint8Array(W * H).fill(1);
  const noBg = new Uint8Array(W * H);
  const ents = [], decor = [];
  const idx = (x, y) => y * W + x;
  const rect = (arr, v, x0, y0, x1, y1) => {
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (x >= 0 && y >= 0 && x < W && y < H) arr[idx(x, y)] = v;
  };
  const carve = (x0, y0, x1, y1) => rect(solid, 0, x0, y0, x1, y1);
  const fill = (x0, y0, x1, y1) => rect(solid, 1, x0, y0, x1, y1);
  const air = (x0, y0, x1, y1) => { carve(x0, y0, x1, y1); rect(noBg, 1, x0, y0, x1, y1); };
  const room = (x0, y0, x1, y1, bg = 0) => { carve(x0, y0, x1, y1); rect(noBg, bg, x0, y0, x1, y1); };
  const at = (tx, ty, dx = 8) => ({ x: tx * TILE + dx, y: (ty + 1) * TILE });
  const ent = (type, tx, ty, o = {}) => { const e = Object.assign({ type }, at(tx, ty), o); ents.push(e); return e; };
  const dec = (type, tx, ty, o = {}) => decor.push(Object.assign({ type, x: tx * TILE, y: ty * TILE }, o));

  // ===== A: the lamplighters' village (ground at surface 112) ========================
  air(2, 60, 58, 111);
  ent('hero', 9, 111); ent('heroine', 7, 111);
  ent('shrine', 14, 111, { id: 's1' });
  // a cellar under the square, its hatch answers to light (a page inside)
  room(19, 113, 24, 115); carve(21, 112, 21, 112);
  ent('lightbridge', 21, 111, { id: 'trap', w: 1, log: true, invert: true });
  ent('pole', 21, 113, { w: 1 });                      // under the hatch: ↓ to drop off it, jump from it to get out
  ent('receptor', 26, 111, { id: 'Rs', gates: ['trap'], hold: 600 });
  ent('pedestal', 32, 111, { id: 'Ps', dir: [-1, 0] });
  // the ruined bell tower behind us: poles up to its top (a fragment)
  fill(2, 104, 3, 111);
  ent('pole', 4, 109, { w: 1 }); ent('pole', 5, 107, { w: 1 }); ent('pole', 4, 105, { w: 1 });
  // the great door: one mirror to turn
  ent('pedestal', 48, 111, { id: 'P1', dir: [1, 0] });
  ent('mirror', 54, 111, { id: 'M1', kind: 1 });
  ent('receptor', 54, 104, { id: 'R1', gates: ['gB'] });
  ent('sign', 44, 111, { text: 'sign_mirror' });
  ent('ambush', 40, 111, { id: 'a1', x0: 38, x1: 44, waves: [[{ tx: 34, ty: 106, fly: true }, { tx: 46, ty: 106, fly: true }]] });
  dec('twindow', 64, 96); dec('twindow', 80, 96);

  // ===== B: the entrance hall (surface 112) ==========================================
  carve(59, 109, 59, 111); ent('gate', 59, 109, { id: 'gB' });
  room(60, 100, 99, 111);
  ent('lever', 62, 111, { id: 'lvB', gates: ['gB'] });
  ent('shrine', 66, 111, { id: 's2' });
  // a lift with a pedestal on it: her own light carries them up to the mezzanine
  carve(90, 98, 92, 99);
  ent('lift', 90, 111, { id: 'L1', w: 3, dy: -14, src: ['P1L'] });
  ent('pedestal', 91, 111, { id: 'P1L', lift: 'L1', dir: [-1, 0] });
  dec('gear', 70, 101); dec('gear', 80, 103, { v: -1 });

  // ===== C: the mezzanine (surface 98) ===============================================
  room(60, 88, 99, 97);
  ent('pedestal', 86, 97, { id: 'P2', dir: [-1, 0] });
  ent('mirror', 70, 97, { id: 'M2', kind: 0 });
  ent('receptor', 70, 89, { id: 'R2', hold: 600 });
  carve(64, 84, 66, 87);
  ent('lift', 64, 97, { id: 'L2', w: 3, dy: -14, src: ['R2'] });
  // Grey's poles up to a shelf under the ceiling (a fragment)
  room(92, 85, 97, 87); fill(95, 90, 97, 90);         // a shelf high on the wall (a recess in the ceiling above it)
  ent('pole', 92, 95, { w: 2 }); ent('pole', 92, 93, { w: 2 }); ent('pole', 92, 91, { w: 2 }); ent('pole', 93, 89, { w: 2 });

  // ===== D: the archive (surface 84) ================================================
  room(60, 74, 99, 83, 2);
  ent('shrine', 70, 83, { id: 's3' });
  ent('logbook', 84, 83);
  // pull-out drawers climbing the last bookcase (a page on top)
  fill(94, 83, 94, 83); fill(95, 81, 95, 83); fill(96, 79, 96, 83); fill(97, 77, 98, 83);
  carve(66, 64, 68, 73);
  ent('lift', 66, 83, { id: 'L3', w: 3, dy: -20, src: ['P3L'] });
  ent('pedestal', 67, 83, { id: 'P3L', lift: 'L3', dir: [1, 0] });

  // ===== E: the engine room (surface 64) ==============================================
  room(60, 44, 99, 63);
  ent('shrine', 82, 63, { id: 's4' });
  ent('pedestal', 70, 63, { id: 'P4', dir: [1, 0] });
  ent('mirror', 76, 63, { id: 'M4a', kind: 1 });
  ent('mirror', 76, 57, { id: 'M4b', kind: 1 });
  fill(77, 58, 80, 58);                                // the balcony by the upper mirror
  for (const ty of [61, 59]) ent('pole', 81, ty, { w: 2 });   // beside the balcony, not under it
  ent('receptor', 96, 57, { id: 'R4', hold: 900 });
  ent('receptor', 64, 57, { id: 'R4b', gates: ['gE'], hold: 600 });
  fill(60, 58, 63, 60); ent('gate', 63, 61, { id: 'gE' });   // a locked alcove (a fragment)
  ent('lift', 86, 63, { id: 'L4', w: 3, dy: -16, src: ['R4'] });
  fill(89, 48, 99, 48);                                // the upper landing, and a window out
  carve(100, 45, 100, 47);
  dec('gear', 66, 46); dec('gear', 88, 55, { v: -1 }); dec('gear', 94, 58);

  // ===== F: the outer wall (outside, x 101-110) ========================================
  air(101, 2, 110, 47);
  ent('shrine', 102, 47, { id: 's5' });
  ent('lift', 106, 47, { id: 'L5', w: 3, dy: -24, src: ['P5L'], speed: 0.5 });
  ent('pedestal', 107, 47, { id: 'P5L', lift: 'L5', dir: [1, 0] });
  fill(101, 24, 105, 24);                              // the landing by the top window
  carve(100, 21, 100, 23);
  ent('ambush', 106, 36, { id: 'a2', x0: 104, x1: 110, waves: [[{ tx: 103, ty: 30, fly: true }, { tx: 110, ty: 28, fly: true }], [{ tx: 102, ty: 22, fly: true }, { tx: 109, ty: 20, fly: true }]] });
  ent('pole', 102, 21, { w: 2 }); ent('pole', 102, 19, { w: 2 });   // up the wall above the landing (a fragment)

  // ===== G: the room of the great lamp (surface 24) ======================================
  room(60, 6, 99, 23);
  ent('shrine', 96, 23, { id: 's6' });
  ent('pedestal', 80, 23, { id: 'P6', dir: [1, 0], turn: true });
  ent('mirror', 62, 23, { id: 'M6a', kind: 1 });
  ent('mirror', 98, 23, { id: 'M6b', kind: 0 });
  ent('boss', 80, 23, { x0: 62, x1: 98 });
  ent('greatlamp', 80, 9);
  fill(76, 12, 79, 12); fill(81, 12, 84, 12);         // the lamp's dais (a slot in the middle lets the light through)
  for (const ty of [21, 19, 17, 15, 13, 11]) ent('pole', 74, ty, { w: 2 });   // right beside the dais; the last one level with it
  dec('gear', 64, 8); dec('gear', 90, 10, { v: -1 });

  // ===== collectibles ======================================================================
  ent('shard', 2, 102, { id: 'c4f1' });                // A: on the ruined bell tower
  ent('page', 23, 115, { id: 'c4j1' });                // A: in the cellar under the hatch
  ent('shard', 96, 88, { id: 'c4f2' });                // C: the shelf under the ceiling
  ent('page', 98, 76, { id: 'c4j2' });                 // D: on top of the last bookcase
  ent('shard', 61, 63, { id: 'c4f3' });                // E: the locked alcove
  ent('shard', 103, 18, { id: 'c4f4' });               // F: up the wall above the landing
  ent('shard', 78, 11, { id: 'c4f5' });                // G: beside the great lamp
  ent('page', 83, 11, { id: 'c4j3' });                 // G: behind the great lamp (signed)

  return { W, H, solid, noBg, ents, decor, name: '灯守りの塔' };
}

const CH4_SHARDS = {
  c4f1: 'このまちの ひとたちは、ひかりを まもっていた。 ぼくたちは、それを とおくから みていた。',
  c4f2: 'たかい ところは こわい。 でも、あのこが いっしょなら へいき。',
  c4f3: 'くらい すみっこ。 ぼくたちの いばしょ。 ……でも ほんとうは、あかるい ところに いたい。',
  c4f4: 'かぜが つよい。 あのこの ひかりが ゆれて、ぼくも ゆれる。',
  c4f5: 'あのこが ないた。 ぼくは おおきく なった。 おじさんが、ぼくを とめてくれた。',
};
const CH4_PAGES = {
  c4j1: { title: '灯守りの手記 その九', body: `
    <p>十三年前の あの夜、大影が 王都を 呑んだ。 陛下は 光を 恐れ、生まれたばかりの 王女殿下の 光をも 恐れた。</p>
    <p>命じられたのは、灯守りの 務めではなかった。 それでも わたしは、断れなかった。</p>` },
  c4j2: { title: '灯守りの手記 その十', body: `
    <p>聖堂の 階段は 長かった。 腕の中の 小さな光だけが、足元を 照らしていた。</p>
    <p>扉を 閉めたとき、あの子は 泣かなかった。 泣いたのは、わたしの ほうだった。</p>` },
  c4j3: { title: '灯守りの手記 さいごの頁', body: `
    <p>わたしは 灯を 消した。 街の灯も、塔の灯も、あの子の 暮らしから 光も。</p>
    <p>だから 今度は、ともしに 行こう。 あの子が 自分で 扉を 開けられる日まで、そばにいよう。</p>
    <p class="sig">―― 灯守り グレイ</p>` },
};
const CH4_TEXT = {
  sign_mirror: N('碑') + '「光は まっすぐ進み、鏡に 折れる」<br>' + N('ヒント') + 'ルミナを 灯台座に 立たせると 光の筋が 伸びる。鏡の前で {up} を押すと 向きが変わる。',
  boss_start: N('グレイ') + 'ルミナ！ 台座から 離れるな！ 光で 影を 還すんだ！',
  boss_turn: N('ヒント') + '台座の前で {up} を押すと、光の向きが変わる（右 → 上 → 左）。',
  lamp_hint: N('グレイ') + '……ルミナ。 台座の光を、上へ。 大灯に 届けてくれ。',
  flicker: N('グレイ') + 'ルミナの光が 揺らいでいる……。 そばを 離れないように しなければ。',
};

CHAPTERS[4] = {
  num: 4, title: '灯守りの塔', theme: 'tower', build: buildStage4,
  text: CH4_TEXT, shards: CH4_SHARDS, pages: CH4_PAGES,
  clearQuote: '「きれい……。 これが、グレイさんの 守ってた 灯り？」<br>「ああ。 ……君の 光だよ」',
  safe: (h) => h.x < 12 * TILE,
  intro: () => [
    Cut.run((g) => {
      const hero = g.hero, h = g.heroine;
      hero.setState('scripted'); h.setState('scripted');
      hero.x = 5.5 * TILE; h.x = 4.5 * TILE; hero.y = h.y = 112 * TILE; hero.facing = h.facing = 1;
      g.black = 1; g.updateCamera(true);
    }),
    Cut.fade(0, 60),
    Cut.walk('hero', 10, 0.6),
    Cut.walk('heroine', 8.5, 0.5),
    Cut.say('heroine', '……おっきな 塔。', 'her', 90),
    Cut.talk('グレイ', '灯守りの塔だ。 国じゅうの 街灯の火種は、ここで 守られていた。'),
    Cut.talk('グレイ', '……ここに 来るのは、十三年ぶりだ。'),
    Cut.talk('ルミナ', 'グレイさんの お家？'),
    Cut.talk('グレイ', '……そうだな。 そんなものだ。 行こう。 塔の上からなら、影の行く先が 見える。'),
    Cut.chapter('第4章', '灯守りの塔'),
  ],
};
