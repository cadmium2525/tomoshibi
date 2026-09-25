'use strict';
// ---------------------------------------------------------------------------
// Stage 1: 忘れられた地下聖堂
// Built from rectangle operations on a tile grid. "surface" = row index of the
// first solid tile under a floor (feet y = surface * 16).
// ---------------------------------------------------------------------------
function buildStage1() {
  const W = 424, H = 48;
  const solid = new Uint8Array(W * H).fill(1);
  const noBg = new Uint8Array(W * H);          // 1 = no back wall (parallax shows)
  const ents = [];
  const decor = [];
  const idx = (x, y) => y * W + x;
  const rect = (arr, v, x0, y0, x1, y1) => {
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      if (x >= 0 && y >= 0 && x < W && y < H) arr[idx(x, y)] = v;
    }
  };
  const carve = (x0, y0, x1, y1) => rect(solid, 0, x0, y0, x1, y1);
  const fill = (x0, y0, x1, y1) => rect(solid, 1, x0, y0, x1, y1);
  const sky = (x0, y0, x1, y1) => rect(noBg, 1, x0, y0, x1, y1);
  // cell (tx, ty) is the open cell an object stands in; feet at (ty+1)*16
  const at = (tx, ty, dx = 8) => ({ x: tx * TILE + dx, y: (ty + 1) * TILE });
  const ent = (type, tx, ty, o = {}) => { const e = Object.assign({ type }, at(tx, ty), o); ents.push(e); return e; };
  const dec = (type, tx, ty, o = {}) => {
    const d = Object.assign({ type, x: tx * TILE + (o.ox || 0), y: ty * TILE + (o.oy || 0) }, o);
    decor.push(d);
    return d;
  };

  // ===== Zone 1: Lumina's cell and the entrance corridor (tutorial) ========
  carve(2, 6, 45, 14);
  carve(2, 15, 12, 15);                 // her cell is one step lower (surface 16)
  fill(13, 6, 13, 11);                  // cell wall; its barred door (g0) below
  carve(19, 15, 19, 16);                // small ditch (surface 17)
  fill(29, 6, 31, 11);                  // lintel above gate 1
  ent('hero', 9, 15);                   // where the prologue leaves them
  ent('heroine', 7, 15);
  ent('gate', 13, 12, { id: 'g0' });    // opened with Marta's key in the prologue
  ent('sign', 9, 15, { text: 'hint_move', hidden: true });
  ent('sign', 16, 14, { text: 'hint_follow', hidden: true });
  ent('sign', 22, 14, { text: 'sign_wait' });
  ent('plate', 25, 14, { id: 'p1', gates: ['g1'] });
  ent('gate', 30, 12, { id: 'g1', dx: 0 });
  ent('sign', 33, 14, { text: 'sign_lever' });
  ent('lever', 35, 14, { id: 'l1', gates: ['g1'] });
  ent('shrine', 39, 14, { id: 's1' });
  // the cell: a straw bed, the drawings she made on her wall, Marta's candle
  dec('bed', 2, 15, { ox: 6, oy: 4 });
  dec('drawings', 5, 9, { ox: 2 });
  dec('candle', 10, 15, { ox: 4, oy: 6, light: true });
  dec('banner', 4, 7);
  // the shaft Grey climbed down; it caves in when the shadows wake
  dec('hole', 16, 5, { ox: -4, oy: 6 });
  dec('rope', 17, 6, { ox: 6, len: 9 });
  dec('rubble', 16, 14, { ox: -6, oy: 6 });
  dec('window', 36, 7);
  dec('torch', 21, 10); dec('torch', 27, 10); dec('torch', 42, 10);
  dec('banner', 33, 7);
  dec('pillar', 24, 6, { to: 14 });

  // ===== Collectibles ==========================================================
  // 影絵の欠片: memories of her shadow. 灯守りの手記: pages left by an old lamplighter.
  ent('shard', 3, 15, { id: 'f1' });                  // her cell, behind the bed
  ent('shard', 40, 22, { id: 'f2' });                 // jump from the lowest ledge of the shaft
  ent('shard', 80, 29, { id: 'f3' });                 // above the landing between chasms 2 and 3
  ent('shard', 175, 13, { id: 'f4' });                // above the highest beam of the fragile bridge
  ent('shard', 350, 16, { id: 'f5' });                // a jump that costs time while the collapse chases
  ent('page', 41, 33, { id: 'j1' });                  // corner at the bottom of the shaft
  ent('page', 160, 21, { id: 'j2' });                 // far end of the room of the stone
  ent('page', 233, 17, { id: 'j3' });                 // shelf at the back of the great hall

  // ===== Zone 2: descent shaft ==============================================
  carve(46, 6, 57, 33);
  carve(40, 17, 57, 33);
  // zig-zag ledges; every ledge you pass under is 4 tiles lower so the hero fits
  fill(46, 18, 53, 18);                 // R1  surface 18 (3 below the corridor)
  fill(50, 22, 57, 22);                 // R2  surface 22
  fill(40, 26, 49, 26);                 // R3  surface 26  -> 8 tile drop to the bottom (34)
  sky(40, 6, 57, 33);
  dec('torch', 56, 15); dec('torch', 47, 14); dec('torch', 55, 19); dec('torch', 42, 22);
  dec('chain', 43, 17, { len: 5 }); dec('chain', 55, 6, { len: 3 });
  dec('torch', 44, 30); dec('torch', 56, 29);
  ent('sign', 55, 33, { text: 'sign_catch' });

  // ===== Zone 3: bottom corridor with chasms ================================
  carve(58, 26, 101, 33);
  carve(64, 34, 66, H - 1); sky(64, 34, 66, H - 1);          // chasm 1 (3 wide)
  carve(75, 34, 78, H - 1); sky(75, 34, 78, H - 1);          // chasm 2 (4 wide)
  fill(79, 33, 82, 33);                                      // raised landing (surface 33)
  carve(83, 34, 85, H - 1); sky(83, 34, 85, H - 1);          // chasm 3
  carve(86, 34, 103, 34);                                    // lower floor (surface 35)
  ent('sign', 60, 33, { text: 'sign_gap' });
  ent('shrine', 88, 34, { id: 's2' });
  ent('sign', 90, 34, { text: 'sign_fight' });
  ent('ambush', 94, 34, { id: 'a1', x0: 93, x1: 96, waves: [[{ tx: 99, ty: 34 }, { tx: 87, ty: 34 }]] });
  dec('torch', 61, 29); dec('torch', 70, 29); dec('torch', 80, 28); dec('torch', 92, 29); dec('torch', 99, 29);
  dec('window', 68, 27); dec('window', 94, 27);
  dec('banner', 86, 27);
  dec('pillar', 63, 26, { to: 33 }); dec('pillar', 74, 26, { to: 33 }); dec('pillar', 83, 26, { to: 32 });

  // ===== Zone 4: ascending staircase =========================================
  const steps = [
    [100, 103, 35], [104, 107, 34], [108, 111, 32], [112, 115, 31], [116, 119, 30],
    [120, 121, 29], [122, 125, 28], [126, 129, 26], [130, 133, 25], [134, 137, 24],
    [138, 141, 23],
  ];
  for (const [x0, x1, s] of steps) carve(x0, s - 9, x1, s - 1);
  ent('sign', 106, 33, { text: 'sign_pull' });
  dec('torch', 105, 28); dec('torch', 114, 25); dec('torch', 124, 22); dec('torch', 132, 19); dec('torch', 139, 17);
  dec('window', 117, 22); dec('window', 129, 17);
  dec('chain', 110, 24, { len: 5 }); dec('chain', 127, 18, { len: 4 });

  // ===== Zone 5: plate + block puzzle ========================================
  carve(142, 13, 160, 21);             // surface 22
  fill(151, 13, 151, 18);              // wall with gate 2 below
  ent('shrine', 143, 21, { id: 's3' });
  ent('sign', 145, 21, { text: 'sign_block' });
  ent('plate', 147, 21, { id: 'p2', gates: ['g2'] });
  ent('plate', 149, 21, { id: 'p3', gates: ['g2'] });
  ent('gate', 151, 19, { id: 'g2' });
  ent('block', 155, 21, { id: 'b1' });
  dec('torch', 146, 17); dec('torch', 157, 17);
  dec('banner', 153, 14);

  // ===== Zone 6: the fragile bridge ===========================================
  // Old planks give way under Grey's weight but hold the light girl: she walks
  // the bridge while he hops along the broken beams above her.
  carve(161, 8, 197, 21);              // surface 22
  fill(161, 21, 163, 21);              // a step up to the beams (surface 21)
  carve(167, 22, 186, H - 1); sky(167, 22, 186, H - 1);
  for (let x = 167; x <= 186; x++) ent('crumble', x, 21);
  fill(165, 19, 166, 19);              // beams (their undersides clear her head)
  fill(169, 18, 171, 18);
  fill(174, 17, 176, 17);
  fill(179, 18, 181, 18);
  fill(184, 19, 185, 19);
  ent('shrine', 161, 20, { id: 's4' });
  ent('sign', 163, 20, { text: 'sign_bridge' });
  dec('torch', 162, 16); dec('torch', 177, 12); dec('torch', 190, 17);
  dec('chain', 172, 8, { len: 4 }); dec('chain', 182, 8, { len: 5 });
  dec('window', 168, 10); dec('window', 186, 10);

  // ===== Zone 7: the bridge of light ===========================================
  // While a plate is held, a bridge of light spans the chasm. She holds one plate;
  // Grey crosses and sets the stone on the other so she can follow.
  carve(187, 8, 214, 21);              // surface 22
  carve(197, 22, 203, H - 1); sky(197, 22, 203, H - 1);
  ent('lightbridge', 197, 21, { id: 'lb1', w: 7 });
  fill(204, 21, 204, 21);              // curb: stops the stone on the plate
  ent('shrine', 189, 21, { id: 's5' });
  ent('sign', 192, 21, { text: 'sign_light' });
  ent('plate', 195, 21, { id: 'p5', gates: ['lb1'] });
  ent('plate', 205, 21, { id: 'p6', gates: ['lb1'] });
  ent('block', 209, 21, { id: 'b2' });
  dec('torch', 193, 17); dec('torch', 207, 17); dec('torch', 212, 17);
  dec('banner', 199, 11); dec('pillar', 188, 8, { to: 21 });

  // ===== Zone 8: great hall & the sealed door =================================
  carve(215, 4, 236, 21);
  sky(215, 4, 236, 15);
  ent('ambush', 220, 21, {
    id: 'a2', x0: 221, x1: 224,
    waves: [[{ tx: 217, ty: 21 }, { tx: 227, ty: 21 }], [{ tx: 220, ty: 21 }, { tx: 230, ty: 21 }]],
  });
  ent('door', 230, 21, { dx: 0 });
  fill(236, 20, 236, 21);              // a step, then a shelf (the third page lies there)
  fill(233, 18, 234, 18);
  dec('pillar', 216, 4, { to: 21 }); dec('pillar', 225, 4, { to: 21 });
  dec('window', 219, 6); dec('window', 228, 6);
  dec('torch', 218, 16); dec('torch', 223, 16); dec('torch', 228, 16); dec('torch', 235, 16);
  dec('banner', 221, 10); dec('banner', 230, 10);

  // ===== Zone 9: the collapse (escape) =========================================
  // Beyond the door a passage climbs to the surface. The cathedral caves in
  // behind them; Grey runs holding her hand. [x0, x1, surface | null = pit]
  const run = [
    [242, 252, 30], [253, 255, null], [256, 262, 30], [263, 266, 29], [267, 270, 28],
    [271, 274, null], [275, 282, 27], [283, 292, 25], [293, 295, null], [296, 310, 24],
    [311, 318, 'plank'], [319, 324, 24], [325, 328, 22], [329, 331, null], [332, 338, 22],
    [339, 342, 20], [343, 346, null], [347, 354, 20], [355, 358, 21], [359, 366, 19],
    [367, 370, null], [371, 378, 18], [379, 382, 16], [383, 392, 16], [393, 396, null],
    [397, 404, 15], [405, 420, 14],
  ];
  let prev = 30;
  for (const [x0, x1, sf] of run) {
    if (sf === null) { carve(x0, prev - 6, x1, H - 1); sky(x0, prev, x1, H - 1); continue; }
    if (sf === 'plank') {      // old planks over a pit: they give way under Grey a moment later
      carve(x0, prev - 6, x1, H - 1); sky(x0, prev, x1, H - 1);
      for (let x = x0; x <= x1; x++) ent('crumble', x, prev - 1);
      continue;
    }
    carve(x0, sf - 6, x1, sf - 1);
    prev = sf;
  }
  ent('escape', 244, 29, { id: 's6' });
  for (const [tx, ty] of [[259, 29], [279, 26], [289, 24], [322, 23], [335, 21], [351, 19], [375, 17], [387, 15]]) ent('rock', tx, ty);
  ent('exit', 416, 13, { dx: 0 });
  dec('torch', 247, 25); dec('torch', 260, 25); dec('torch', 278, 22); dec('torch', 299, 19); dec('torch', 321, 19);
  dec('torch', 336, 17); dec('torch', 352, 15); dec('torch', 374, 13); dec('torch', 390, 11); dec('torch', 410, 9);
  dec('chain', 268, 22, { len: 3 }); dec('chain', 305, 18, { len: 3 }); dec('chain', 362, 13, { len: 3 });

  return { W, H, solid, noBg, ents, decor, name: '忘れられた地下聖堂' };
}

const N = (who) => `<span class="name">${who}：</span>`;

// memories held by the shadow children (shown when a fragment is found)
const SHARDS = {
  f1: 'ちいさな てが、かべに うさぎを つくった。 ぼくは うさぎに なった。',
  f2: 'ろうそくが ゆれると、ぼくも ゆれた。 あのこは わらった。',
  f3: 'あのこが なくと、ぼくは おおきく なった。 だきしめたかった。',
  f4: 'あのこが ねむると、ぼくも ねむった。 おなじ ゆめを みた。',
  f5: '「きょうも ふたりきり だね」 ……うん。 ずっと いっしょ。',
};
// pages of an old lamplighter's notebook
const PAGES = {
  j1: { title: '灯守りの手記 その一', body: `
    <p>灯をともす者は、その灯が落とす影からも 目をそらしてはならない。</p>
    <p>光あるところ、影は必ず生まれる。 影を嫌う者は、いずれ光までも嫌うようになる。</p>
    <p>――灯守りの心得より</p>` },
  j2: { title: '灯守りの手記 その二', body: `
    <p>この聖堂は、代々の「灯の巫女」が 祈りを捧げた場所だという。</p>
    <p>巫女の光は あまりに強く、それゆえ 巫女の影もまた深い。 古い巫女たちは 自らの影を 名で呼び、
       友のように 語りかけたと 碑に残る。</p>` },
  j3: { title: '灯守りの手記 その三', body: `
    <p>影を闇に閉じこめても 消えはしない。 ひとりにされた影は、ただ 寂しさの分だけ 大きくなる。</p>
    <p>影をやわらげるのは 闇ではなく、もうひとつの光だ。</p>
    <p>……この言葉を、いつか 誰かが 思い出してくれるとよいのだが。</p>` },
};
const TEXT = {
  hint_move: N('ヒント') + '{move} で移動、{dash}でダッシュ、{jump} でジャンプ。',
  hint_follow: N('ヒント') + 'ルミナは あなたの後をついてくる。1段の段差や 小さな溝なら 自分で越えられる。',
  sign_wait: N('石碑') + '「灯の巫女 此の石に立つとき 門は開かれん」<br>' + N('ヒント') +
    '{call} で ルミナに「待て」「おいで」を伝えられる。石板は ルミナが乗ったときにだけ応える。',
  sign_lever: N('石碑') + '「門番の梃子」<br>' + N('ヒント') + 'レバーの前で {up}。一度引けば 門は開いたままになる。',
  sign_catch: N('石碑') + '「光を抱く者 落ちるを恐れず」<br>' + N('ヒント') +
    '{down} を押し続けると 手を差し伸べる。高い所や 崖の向こうのルミナは、受け止めてあげなければ 跳べない。',
  sign_gap: N('石碑') + '「奈落の回廊」<br>' + N('ヒント') +
    '広い崖は ダッシュジャンプで越えよう。向こう岸で ルミナの方を向いて {down} … 彼女は あなたを信じて 跳ぶ。',
  sign_fight: N('石碑') + '「影は灯の子 火にて散らし 光へ還すべし」<br>' + N('ヒント') +
    'ルミナから離れると 影が現れ、彼女を闇へ連れ戻そうとする。{attack} で灯竿を振り、影を光へ還せ！',
  sign_pull: N('石碑') + '「高きに登れぬ者あらば 手を差し伸べよ」<br>' + N('ヒント') +
    '2段の段差は ルミナには登れない。上から {down} で 引き上げてあげよう。',
  sign_block: N('石碑') + '「二つの石 一つの門」<br>' + N('ヒント') +
    '2つの石板は 同じ門につながっている。重たい石でも 石板は沈むだろうか…？<br>石の前で {up} で持ち上げ、もう一度 {up} で下ろす。歩いて押すこともできる。',
  plate_hero: N('グレイ') + '…びくともしない。この石板は ルミナにしか応えないようだ。',
  door_sealed: N('グレイ') + '影の気配が 扉を封じている…！',
  door_open: N('グレイ') + '……この扉は、あの子の光にしか 応えないのか。',
  hint_danger: N('グレイ') + 'しまった、ルミナから離れすぎた…！ 心細さに 彼女の光が揺らいでいる。急いで戻らねば！',
  hint_stuck: N('ヒント') + '行き詰まったら ポーズ（{pause}）から「最後の灯籠から やり直す」を選べる。',
  sign_bridge: N('石碑') + '「朽ちし橋 重き者を拒み 軽き光を渡す」<br>' + N('ヒント') +
    '古い橋板は グレイが乗ると 崩れてしまう。ルミナは軽いので 渡れる。グレイは 上の梁を跳んで進もう。',
  sign_light: N('石碑') + '「巫女の立つ間 光は橋となる」<br>' + N('ヒント') +
    'ルミナが石板に乗っている間だけ、光の橋が架かる。向こう岸にも 石板があるようだ…。',
  hint_escape: N('ヒント') + '崩落に 追いつかれる前に 出口へ！ {dash}で走り、{jump}で跳べ。ルミナは 手をつないで ついてくる。',
  bridge_crumble: N('グレイ') + 'くっ…！ わたしの重さでは 橋板が もたないか。',
  hint_grab: N('グレイ') + 'ルミナ！ 渦に沈められる前に、{attack} で灯竿を振れ！',
};
