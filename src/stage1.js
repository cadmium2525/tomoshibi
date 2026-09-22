'use strict';
// ---------------------------------------------------------------------------
// Stage 1: 忘れられた地下聖堂
// Built from rectangle operations on a tile grid. "surface" = row index of the
// first solid tile under a floor (feet y = surface * 16).
// ---------------------------------------------------------------------------
function buildStage1() {
  const W = 182, H = 48;
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
  const dec = (type, tx, ty, o = {}) => decor.push(Object.assign({ type, x: tx * TILE, y: ty * TILE }, o));

  // ===== Zone 1: entrance corridor (tutorial) ===============================
  carve(2, 6, 45, 14);
  carve(2, 15, 12, 15);                 // start area is one step lower (surface 16)
  carve(19, 15, 19, 16);                // small ditch (surface 17)
  fill(29, 6, 31, 11);                  // lintel above gate 1
  ent('hero', 5, 15);
  ent('heroine', 3, 15);
  ent('sign', 7, 15, { text: 'sign_move' });
  ent('sign', 11, 15, { text: 'sign_follow' });
  ent('sign', 22, 14, { text: 'sign_wait' });
  ent('plate', 25, 14, { id: 'p1', gates: ['g1'] });
  ent('gate', 30, 12, { id: 'g1', dx: 0 });
  ent('sign', 33, 14, { text: 'sign_lever' });
  ent('lever', 35, 14, { id: 'l1', gates: ['g1'] });
  ent('shrine', 39, 14, { id: 's1' });
  dec('window', 15, 8); dec('window', 36, 7);
  dec('torch', 9, 11); dec('torch', 21, 10); dec('torch', 27, 10); dec('torch', 42, 10);
  dec('banner', 4, 8); dec('banner', 33, 7);
  dec('pillar', 12, 6, { to: 14 }); dec('pillar', 24, 6, { to: 14 });

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
  fill(144, 21, 144, 21); fill(159, 21, 159, 21);   // curbs keep the block inside the room
  ent('shrine', 143, 21, { id: 's3' });
  ent('sign', 145, 21, { text: 'sign_block' });
  ent('plate', 147, 21, { id: 'p2', gates: ['g2'] });
  ent('plate', 149, 21, { id: 'p3', gates: ['g2'] });
  ent('gate', 151, 19, { id: 'g2' });
  ent('block', 155, 21, { id: 'b1' });
  dec('torch', 146, 17); dec('torch', 157, 17);
  dec('banner', 153, 14);

  // ===== Zone 6: great hall & exit door =====================================
  carve(161, 4, 180, 21);
  sky(161, 4, 180, 15);
  ent('ambush', 166, 21, {
    id: 'a2', x0: 167, x1: 170,
    waves: [[{ tx: 163, ty: 21 }, { tx: 173, ty: 21 }], [{ tx: 166, ty: 21 }, { tx: 176, ty: 21 }]],
  });
  ent('door', 177, 21, { dx: 0 });
  dec('pillar', 162, 4, { to: 21 }); dec('pillar', 171, 4, { to: 21 });
  dec('window', 165, 6); dec('window', 174, 6);
  dec('torch', 164, 16); dec('torch', 169, 16); dec('torch', 174, 16); dec('torch', 179, 16);
  dec('banner', 167, 10); dec('banner', 176, 10);

  return { W, H, solid, noBg, ents, decor, name: '忘れられた地下聖堂' };
}

const TEXT = {
  sign_move: '<span class="name">石碑：</span>{move} で移動。{dash}でダッシュ、{jump} でジャンプ。',
  sign_follow: '<span class="name">石碑：</span>少女ルミナは あなたの後をついてくる。1段の段差や 小さな溝なら 自分で越えられる。',
  sign_wait: '<span class="name">石碑：</span>{call} で ルミナに「待て」「おいで」を伝えられる。この石板は ルミナが乗ったときにだけ反応する。',
  sign_lever: '<span class="name">石碑：</span>レバーの前で {up}。一度引けば 門は開いたままになる。',
  sign_catch: '<span class="name">石碑：</span>{down} を押し続けると 手を差し伸べる。高い所や 崖の向こうのルミナは、あなたが受け止めてあげなければ 跳べない。',
  sign_gap: '<span class="name">石碑：</span>広い崖は ダッシュジャンプで越えよう。向こう岸で ルミナの方を向いて {down} … 彼女は あなたを信じて 跳ぶ。',
  sign_fight: '<span class="name">石碑：</span>ルミナから離れると 影が現れ、彼女を闇へ連れ去ろうとする。{attack} で杖を振り、影を打ち払え！',
  sign_pull: '<span class="name">石碑：</span>2段の段差は ルミナには登れない。上から {down} で 手を差し伸べ、引き上げてあげよう。',
  sign_block: '<span class="name">石碑：</span>2つの石板は 同じ門につながっている。重たいものでも 石板は沈むだろうか…？（壁に押しつけた石は 崩れて元の場所に戻る）',
  plate_hero: '<span class="name">グレイ：</span>…びくともしない。この石板は ルミナにしか応えないようだ。',
  door_sealed: '<span class="name">グレイ：</span>影の気配が 扉を封じている…！',
  hint_danger: '<span class="name">グレイ：</span>しまった、ルミナから離れすぎた…！ 影が彼女を狙っている。急いで戻らねば！',
  hint_stuck: '<span class="name">ヒント：</span>行き詰まったら ポーズ（{pause}）から「最後の灯籠から やり直す」を選べる。',
  hint_grab: '<span class="name">グレイ：</span>ルミナ！ 渦に沈められる前に、{attack} で影を打て！',
};
