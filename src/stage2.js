'use strict';
// ---------------------------------------------------------------------------
// Chapter 2: 薄明の森 (see docs/CHAPTER2.md)
// Outdoors: every open cell shows the dawn sky unless marked as a tunnel.
// "surface" = row of the first solid tile under a floor (feet y = surface * 16).
// ---------------------------------------------------------------------------
function buildStage2() {
  const W = 284, H = 40;
  const solid = new Uint8Array(W * H).fill(1);
  const noBg = new Uint8Array(W * H);
  const ents = [], decor = [];
  const idx = (x, y) => y * W + x;
  const rect = (arr, v, x0, y0, x1, y1) => {
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (x >= 0 && y >= 0 && x < W && y < H) arr[idx(x, y)] = v;
  };
  const carve = (x0, y0, x1, y1) => rect(solid, 0, x0, y0, x1, y1);
  const fill = (x0, y0, x1, y1) => rect(solid, 1, x0, y0, x1, y1);
  const tunnel = (x0, y0, x1, y1) => { carve(x0, y0, x1, y1); rect(noBg, 0, x0, y0, x1, y1); };
  // open ground under the sky, and bottomless pits
  const ground = (x0, x1, s) => { carve(x0, 2, x1, s - 1); rect(noBg, 1, x0, 0, x1, s - 1); };
  const pit = (x0, x1) => { carve(x0, 2, x1, H - 1); rect(noBg, 1, x0, 0, x1, H - 1); };
  const at = (tx, ty, dx = 8) => ({ x: tx * TILE + dx, y: (ty + 1) * TILE });
  const ent = (type, tx, ty, o = {}) => { const e = Object.assign({ type }, at(tx, ty), o); ents.push(e); return e; };
  // decor standing on the ground: pass the surface row
  const dec = (type, tx, s, o = {}) => decor.push(Object.assign({ type, x: tx * TILE, y: s * TILE }, o));

  // ===== A: the forest's edge ================================================
  for (const [x0, x1, s] of [[2, 14, 28], [15, 15, 29], [16, 19, 28], [20, 25, 27], [26, 30, 26], [31, 44, 24]]) ground(x0, x1, s);
  rect(noBg, 0, 2, 18, 6, 27);                   // the cathedral's back door is in the rock face
  fill(2, 2, 3, 17);
  ent('doorway', 4, 27);
  ent('hero', 9, 27);
  ent('heroine', 7, 27);
  ent('sign', 12, 27, { text: 'hint_sky', hidden: true });
  ent('sign', 28, 25, { text: 'hint_pull', hidden: true });
  ent('shrine', 34, 23, { id: 's1' });
  dec('tree', 11, 28); dec('tree_s', 23, 27); dec('tree', 38, 24); dec('tree_s', 43, 24);
  dec('bush', 17, 28); dec('bush', 29, 26, { v: 1 }); dec('fern', 21, 27); dec('fern', 40, 24);
  dec('flower', 13, 28); dec('flower', 19, 28, { v: 1 }); dec('flower', 33, 24); dec('stump', 26, 26);

  // ===== B: the first shadow step ==============================================
  ground(45, 52, 24);
  pit(53, 59);
  ground(60, 80, 24);
  ent('sign', 48, 23, { text: 'sign_marker' });
  ent('marker', 52, 23, { id: 'm1' });
  ent('lightbridge', 53, 23, { id: 'lb1', w: 7, log: true });
  ent('lever', 61, 23, { id: 'lv1', gates: ['lb1'] });
  ent('shrine', 66, 23, { id: 's2' });
  dec('tree', 46, 24); dec('tree_s', 64, 24); dec('tree', 72, 24); dec('bush', 69, 24); dec('fern', 50, 24); dec('flower', 76, 24, { v: 1 });

  // ===== C: climbing on a shadow ===============================================
  ground(81, 88, 24);
  ground(89, 104, 20);                            // the cliff top ...
  tunnel(89, 21, 104, 23);                        // ... with a tunnel under it for her
  ground(105, 108, 24);
  ground(109, 124, 22);
  ent('marker', 86, 23, { id: 'm2' });
  ent('gate', 89, 21, { id: 'g1', wood: true });
  ent('lever', 93, 19, { id: 'lv2', gates: ['g1'] });
  ent('sign', 83, 23, { text: 'sign_climb' });
  dec('tree_s', 82, 24); dec('tree', 94, 20); dec('tree_s', 102, 20); dec('bush', 106, 24, { v: 1 }); dec('tree', 113, 22);

  // ===== D: the valley of fallen trees =========================================
  ground(125, 140, 27);                            // five tiles down: she has to be caught
  carve(141, 24, 141, 26);                         // an iron gate in a rock wall
  ground(142, 163, 27);
  ent('block', 118, 21, { id: 'b1' });
  ent('plate', 136, 26, { id: 'p1', gates: ['g2'] });
  ent('gate', 141, 24, { id: 'g2' });
  ent('sign', 127, 26, { text: 'sign_valley' });
  ent('shrine', 145, 26, { id: 's3' });
  dec('stump', 121, 22); dec('tree', 130, 27); dec('bush', 138, 27); dec('tree_s', 149, 27); dec('tree', 155, 27); dec('fern', 133, 27);

  // ===== E: two stones =========================================================
  pit(164, 167);
  ground(168, 171, 27);                            // a little island
  pit(172, 177);
  ground(178, 236, 27);
  ent('shrine', 157, 26, { id: 's4' });
  ent('sign', 160, 26, { text: 'sign_two' });
  ent('marker', 163, 26, { id: 'm3' });
  ent('marker', 170, 26, { id: 'm4' });
  ent('lightbridge', 172, 26, { id: 'lb2', w: 6, log: true });
  ent('lever', 180, 26, { id: 'lv3', gates: ['lb2'] });
  dec('tree_s', 169, 27); dec('tree', 184, 27); dec('flower', 179, 27);

  // ===== F: the shadowed wood (ambush) =========================================
  fill(231, 26, 233, 26);                          // a low rock
  ent('shrine', 206, 26, { id: 's5' });
  ent('ambush', 216, 26, { id: 'a1', x0: 214, x1: 219, waves: [[{ tx: 210, ty: 26 }, { tx: 222, ty: 26 }], [{ tx: 211, ty: 26 }, { tx: 225, ty: 26 }]] });
  for (const x of [199, 204, 209, 213, 218, 223, 228, 234]) dec(x % 2 ? 'tree' : 'tree_s', x, 27);
  dec('bush', 201, 27); dec('bush', 220, 27, { v: 1 }); dec('fern', 215, 27); dec('fern', 229, 27);

  // ===== G: the hill at dawn =====================================================
  ground(237, 242, 26); ground(243, 248, 25); ground(249, 283, 24);
  ent('shrine', 245, 24, { id: 's6' });
  ent('dawn', 252, 23, { x1: 266 });
  ent('mist', 268, 23);
  ent('lookout', 279, 23);
  dec('tree', 240, 26); dec('stump', 256, 24); dec('bush', 262, 24); dec('flower', 272, 24); dec('flower', 275, 24, { v: 1 });

  // ===== collectibles ==============================================================
  ent('shard', 37, 20, { id: 'c2f1' });
  ent('shard', 92, 16, { id: 'c2f2' });
  ent('shard', 126, 23, { id: 'c2f3' });
  ent('shard', 175, 21, { id: 'c2f4' });
  ent('shard', 262, 20, { id: 'c2f5' });
  ent('page', 96, 23, { id: 'c2j1' });              // in the tunnel under the cliff
  ent('page', 232, 22, { id: 'c2j2' });             // on the low rock
  ent('page', 257, 20, { id: 'c2j3' });

  return { W, H, solid, noBg, ents, decor, name: '薄明の森' };
}

const CH2_SHARDS = {
  c2f1: 'そらって、かべが ないんだね。 ぼくは どこまで のびていいの？',
  c2f2: 'とりが とんだ。 あのこが みあげた。 ぼくも みあげた。',
  c2f3: 'あさの いろは、ろうそくの いろと ちがう。',
  c2f4: 'あのおじさんが、ぼくの うえを あるいた。 くすぐったい。',
  c2f5: 'ひかりが ふえると、ぼくは ちいさく なる。 でも、きえない。',
};
const CH2_PAGES = {
  c2j1: { title: '灯守りの手記 その四', body: `
    <p>森の道標石は、われら灯守りの先達が立てたものだ。 夜道を行く者が 灯を掲げれば、
       石の影が 道を示す。</p>
    <p>影はいつも、光の反対側に伸びる。 光が近ければ 長く、遠ければ 短く。</p>` },
  c2j2: { title: '灯守りの手記 その五', body: `
    <p>ある夜、灯を持った子どもが 森で迷った。 子どもは自分の影を怖がって 泣いていた。</p>
    <p>わたしは言った。「影はね、きみが 光っている しるしなんだよ」</p>` },
  c2j3: { title: '灯守りの手記 その六', body: `
    <p>夜明けの光は、どんな灯よりも 大きい。 影を消すのではなく、影をやわらかくする。</p>
    <p>……いつか この国にも、もう一度 朝が来るだろうか。</p>` },
};
const CH2_TEXT = {
  hint_sky: N('ルミナ') + '……風が、つめたくて きもちいい。',
  hint_pull: N('ヒント') + '2段の段差は、上から {down} で ルミナを 引き上げよう。',
  sign_marker: N('道標石') + '「灯を掲げし者 影をたどれ」<br>' + N('ヒント') +
    'ルミナの光が 石の影を 反対側へ伸ばす。影は グレイだけが乗れる足場になる。<br>' +
    'ルミナが石に近いほど 影は長い。石の手前で {call}「待て」をしてから渡ろう。 ついてこさせると、影の向きが変わってしまう。',
  sign_climb: N('ヒント') + '影の足場は、石の頭の高さにできる。踏み台にして 崖を登れそうだ。',
  sign_valley: N('ヒント') + '高い所のルミナは、下で {down} を押して 受け止めよう。重り石は 持ったまま 飛び降りることもできる。',
  sign_two: N('ヒント') + '石が 二つ。 小島へ渡ったら、ルミナを受け止めて 呼び寄せよう。',
  dawn_start: N('グレイ') + '影が 集まってくる……！ 日が昇るまで、ルミナを 守り抜くぞ！',
  dawn_end: N('ルミナ') + '……あったかい。 影が、光の中に とけていく……。',
  mist: N('グレイ') + '濃い霧だ……。 日が昇れば 晴れるだろう。',
};

CHAPTERS[2] = {
  num: 2, title: '薄明の森', theme: 'forest', build: buildStage2,
  text: CH2_TEXT, shards: CH2_SHARDS, pages: CH2_PAGES,
  clearQuote: '「どうして あの街は 暗いの？」<br>「……灯りを ともすことが、禁じられているんだ」',
  safe: (h) => h.x < 20 * TILE,
  intro: () => [
    Cut.run((g) => {
      const hero = g.hero, h = g.heroine;
      hero.setState('scripted'); h.setState('scripted');
      hero.x = 4.5 * TILE; h.x = 4 * TILE; hero.y = h.y = 28 * TILE; hero.facing = h.facing = 1;
      g.black = 1; g.updateCamera(true);
    }),
    Cut.fade(0, 60),
    Cut.walk('hero', 8, 0.7),
    Cut.walk('heroine', 6.5, 0.5),
    Cut.run((g) => g.heroine.emote('!', 60)),
    Cut.wait(50),
    Cut.say('heroine', '……これが、そら？', 'her', 100),
    Cut.talk('グレイ', 'ああ。 夜明け前の 空だ。'),
    Cut.talk('ルミナ', 'ひろい……。 どこにも かべが ない。'),
    Cut.talk('グレイ', 'この森を 抜ければ、麓に 街がある。 マルタも そこで 療養しているはずだ。'),
    Cut.talk('ルミナ', 'マルタに 会えるの……！'),
    Cut.talk('グレイ', 'ああ。 ……さあ、行こう。 森の影にも 気をつけるんだぞ。'),
    Cut.chapter('第2章', '薄明の森'),
  ],
};
