// Scripted full run of chapter 6 (load the page with ?debug, then load this file and call autoplay6()).
// autoplay6(upTo, from): stop after zone upTo ('A'..'G'), or start at the lantern before zone `from`.
window.autoplay6 = function (upTo = null, from = null) {
  const log = [];
  const H = () => game.hero, Y = () => game.heroine;
  const tile = (v) => v / 16;
  const note = (m) => log.push(m + ' ' + JSON.stringify(Object.assign(T.st(), { hood: Y().hooded, fire: game.fire, sec: Math.round(game.stats.time / 60) })));
  const fail = (m) => { note('FAIL ' + m); throw new Error(m + '\n' + log.join('\n')); };
  function frames(n, keys = [], taps = []) {
    const r0 = game.stats.retries, before = { hx: tile(H().x), hy: tile(H().y), yx: tile(Y().x), yy: tile(Y().y) };
    T.run(n, keys, taps);
    if (game.stats.retries > r0) log.push('FELL near ' + JSON.stringify(before));
    if (game.state === 'gameover' && !frames.boss) fail('gameover ' + game.goReason);
    if (Y().state === 'carried' && !frames.rescuing) { frames.rescuing = true; fight(); frames.rescuing = false; }
    if (game.state === 'read') { T.run(24); T.run(2, [], ['KeyZ']); note('read a page'); }
    if (game.state === 'cutscene' && !frames.watch) { let c = 0; while (game.state === 'cutscene' && c++ < 5000) T.run(1, [], c % 20 === 0 ? ['KeyZ'] : []); note('scene'); }
  }
  function land() { let j = 0; while (!H().onGround && j++ < 160) frames(1); frames(2); }
  function walkTo(tx, max = 1500) {
    let i = 0;
    while (Math.abs(tile(H().x) - tx) > 0.25 && i++ < max) {
      const keys = [tile(H().x) < tx ? 'ArrowRight' : 'ArrowLeft'];
      const dir = tile(H().x) < tx ? 1 : -1;
      const step = game.world.pointSolid(H().x + dir * 8, H().y - 4) && !game.world.pointSolid(H().x + dir * 8, H().y - 36);
      if (H().onGround && Math.abs(H().vx) < 0.05 && i > 3 && step) { frames(14, [...keys, 'KeyZ']); i += 14; continue; }
      frames(1, keys);
    }
    land();
  }
  const hop = (tx, n = 16) => { for (let i = 0; i < 60; i++) { const k = Math.abs(tile(H().x) - tx) > 0.15 ? [tile(H().x) < tx ? 'ArrowRight' : 'ArrowLeft'] : []; frames(1, i < n ? [...k, 'KeyZ'] : k); if (i > 4 && H().onGround) break; } land(); };
  function waitFor(cond, max = 600, what = '') { let i = 0; while (!cond() && i++ < max) frames(1); if (!cond()) fail('timeout ' + what); }
  function herNear(d = 30) { return ['normal', 'hand'].includes(Y().state) && Math.abs(Y().x - H().x) < d && Math.abs(Y().y - H().y) < 20; }
  function call() { frames(1, [], ['KeyC']); frames(10); }
  const up = () => { frames(1, [], ['ArrowUp']); frames(6); };
  function hood(on) {
    if (Y().hooded === on) return;
    waitFor(() => herNear(60) && Y().onGround && H().onGround, 600, 'her, for the coat');
    let i = 0;
    while (Math.abs(Y().x - H().x) > 20 && i++ < 200) frames(1, [Y().x < H().x ? 'ArrowLeft' : 'ArrowRight']);
    for (let t = 0; t < 4 && Y().hooded !== on; t++) { waitFor(() => H().state === 'normal', 200, 'Grey ready'); frames(4); up(); }
    if (Y().hooded !== on) fail('coat ' + on);
  }
  function fight(until = () => false, max = 8000) {
    let n = 0;
    while (n++ < max) {
      const alive = game.shadows.filter((s) => s.alive && s.state !== 'die' && (Math.abs(s.y - H().y) < 5 * 16 || Y().carriedBy === s) && Math.abs(s.x - H().x) < 240);
      const amb = game.ambushes.some((a) => a.wave >= 0 && !a.done);
      if (!alive.length && !amb && !until()) break;
      const s = alive.find((q) => Y().carriedBy === q) || alive.filter((s) => s.state !== 'emerge').sort((a, b) => Math.abs(a.x - H().x) - Math.abs(b.x - H().x))[0];
      const keys = [];
      if (s) {
        const dx = s.x - H().x;
        if (Math.abs(dx) > 20) keys.push(dx > 0 ? 'ArrowRight' : 'ArrowLeft');
        else if (sign(dx) !== H().facing) keys.push(dx > 0 ? 'ArrowRight' : 'ArrowLeft');
        else if (H().state === 'normal' && n % 6 === 0 && Math.abs(dx) < 36) keys.push('KeyX');
      }
      frames(1, keys);
    }
  }
  const G = (id) => game.guards.find((g) => g.id === id);
  // pass a guard from behind: wait until he walks away the way we go
  function behind(id, dir = 1, near = 3) {
    const g = G(id);
    waitFor(() => g.facing === dir && ['patrol', 'look', 'return'].includes(g.state) && (tile(g.x) - tile(H().x)) * dir > near, 3000, 'guard ' + id + ' turns away');
  }
  const stop = (z) => { note('zone ' + z + ' done'); return upTo === z; };

  T.fast = true;
  try { return run(); } finally { T.fast = false; game.render(); }
  function run() {
  const Z = 'ABCDEFG';
  const skip = (z) => from && Z.indexOf(z) < Z.indexOf(from);
  if (from) {
    const sid = { B: 's2', C: 's3', D: 's3', E: 's4', F: 's5', G: 's6' }[from];
    game.chapter = 6; useChapter(6); game.stats = { time: 0, grabs: 0, kills: 0, retries: 0 };
    game.load(null);
    const ents = CHAPTERS[6].build().ents, sh = ents.find((q) => q.type === 'shrine' && q.id === sid), at = ents.indexOf(sh);
    const before = (t) => ents.filter((q, i) => q.type === t && i <= at).map((q) => q.id);
    const cp = { x: sh.x, y: sh.y, levers: before('slatch').concat(before('lever')), shrines: before('shrine'), ambush: [], blocks: {}, fire: Z.indexOf(from) > 3 };
    game.checkpoint = cp; game.load(cp);
    game.state = 'play'; game.hideCenter();
  } else {
    if (game.state === 'title' || game.chapter !== 6 || game.state === 'clear') game.startChapter(6);
    if (game.state === 'cutscene') game.finishIntro(true);
  }
  frames(2);
  if (!skip('A')) {
    // --- A: up the town under the coat, behind the watch
    walkTo(30); behind('gA'); walkTo(52); waitFor(() => herNear(40), 900, 'past gA');
    walkTo(58); behind('gB', 1, 1); walkTo(71); waitFor(() => herNear(40), 900, 'past gB');
    if (stop('A')) return log.join('\n');
  }
  if (!skip('B')) {
    // --- B: the moat: light the candelabra, stand her close to it, her big shadow moves the ring
    walkTo(86); waitFor(() => herNear(40), 900, 'down the stairs');
    hood(false);
    walkTo(93.7); waitFor(() => game.lamps.find((l) => l.id === 'cB').lit, 400, 'candle cB');
    waitFor(() => game.levers.find((l) => l.id === 'lB').on, 600, 'the high ring');
    walkTo(123.5); waitFor(() => herNear(40) && Y().y === H().y, 900, 'up into the castle');
    if (stop('B')) return log.join('\n');
  }
  if (!skip('C')) {
    // --- C: the gallery: past gC, light the candelabra while he is far, through the gate
    hood(true);
    walkTo(130); behind('gC');
    const gC = G('gC');
    walkTo(158); waitFor(() => herNear(40), 900, 'at the candle');
    waitFor(() => gC.x < 140 * 16 && gC.facing < 0, 3000, 'gC far off');
    hood(false); walkTo(162.2);
    waitFor(() => game.lamps.find((l) => l.id === 'cC').lit, 300, 'candle cC');
    waitFor(() => game.levers.find((l) => l.id === 'lC').on, 400, 'the ring in the gallery');
    hood(true);
    walkTo(168.5); waitFor(() => herNear(40), 900, 'through the gate');
    behind('gD'); walkTo(198); waitFor(() => herNear(40), 900, 'past gD');
    if (stop('C')) return log.join('\n');
  }
  if (!skip('D')) {
    // --- D: the chapel: the pole takes fire
    walkTo(212); frames(10);
    if (!game.fire) fail('no fire');
    walkTo(222); waitFor(() => herNear(40), 600, 'out of the chapel');
    if (stop('D')) return log.join('\n');
  }
  if (!skip('E')) {
    // --- E: the veils: she waits on this side, Grey goes over the top with his flame
    walkTo(230.5); waitFor(() => herNear(40), 600, 'at the first veil');
    hood(false); walkTo(232.5); waitFor(() => herNear(30) && Y().onGround, 300, 'her by V1'); call();
    hop(232.8); hop(234.8); walkTo(238.2);
    waitFor(() => game.veils.find((v) => v.id === 'V1').thin >= 1, 300, 'V1 thins');
    call(); waitFor(() => tile(Y().x) > 237, 600, 'through V1');
    const gE = G('gE');
    walkTo(252.5); waitFor(() => herNear(30) && Y().onGround, 300, 'her by V2'); call();
    // over the veil only when the guard beyond has his back to it
    waitFor(() => gE.facing > 0 && gE.x > 264 * 16 && gE.state === 'patrol', 3000, 'gE walking away');
    hop(252.8); hop(254.8); walkTo(258.2);
    waitFor(() => game.veils.find((v) => v.id === 'V2').thin >= 1, 300, 'V2 thins');
    call(); waitFor(() => tile(Y().x) > 257.5, 600, 'through V2');
    hood(true);
    // into the doorway while he walks the other way, let him pass, then out behind him
    waitFor(() => gE.x > 268 * 16, 3000, 'gE at the far end');
    walkTo(267.3); waitFor(() => herNear(24) && Y().onGround, 300, 'her in the doorway'); call();
    walkTo(262); waitFor(() => gE.facing < 0 && gE.x < 262 * 16, 3000, 'gE past the doorway'); walkTo(268); call();
    walkTo(284); waitFor(() => herNear(40), 900, 'to the stair');
    if (stop('E')) return log.join('\n');
  }
  if (!skip('F')) {
    // --- F: up the great stair
    hood(true);
    behind('gF1', 1, 2); walkTo(310); waitFor(() => herNear(50), 900, 'past gF1');
    fight();
    const gF2 = G('gF2');
    waitFor(() => gF2.x > 328 * 16, 3000, 'gF2 at the top');
    walkTo(325.6); waitFor(() => herNear(24) && Y().onGround, 400, 'her in the doorway'); call();
    walkTo(318); waitFor(() => gF2.facing < 0 && gF2.x < 321 * 16, 3000, 'gF2 past'); walkTo(326); call();
    walkTo(333); waitFor(() => herNear(50), 900, 'past gF2');
    fight();
    walkTo(336.5); waitFor(() => herNear(40) && Y().y === H().y, 600, 'on the landing');
    hood(false);
    walkTo(339.7); waitFor(() => game.lamps.find((l) => l.id === 'cF').lit, 400, 'candle cF');
    waitFor(() => game.levers.find((l) => l.id === 'lF').on, 600, 'the stair ring');
    walkTo(349); waitFor(() => herNear(40), 900, 'into the antechamber');
    if (stop('F')) return log.join('\n');
  }
  // --- G: the queen and the great shadow
  hood(false);
  frames.boss = true; frames.rescuing = true;
  walkTo(358); waitFor(() => game.finalBoss || game.bossDone, 900, 'the great shadow');
  let n = 0, losses = 0, jumpHold = 0; const T0 = game.stats.time;
  while (!game.epilogue && n++ < 60000) {
    if (game.state === 'gameover') {
      if (++losses > 4) fail('lost to the great shadow 5 times');
      note('lost, again from the shrine');
      T.run(80); T.run(2, [], ['KeyZ']); frames(10);
      if (Y().hooded) hood(false);
      walkTo(358); waitFor(() => game.finalBoss || game.epilogue, 900, 'again');
      continue;
    }
    const F = game.finalBoss;
    if (!F || game.state !== 'play') { frames(1); continue; }
    const keys = [];
    const at = (x, strike, tol = 12) => {
      const dx = x - H().x;
      if (Math.abs(dx) > tol) keys.push(dx > 0 ? 'ArrowRight' : 'ArrowLeft');
      else if (sign(dx) !== H().facing && Math.abs(dx) > 2) keys.push(dx > 0 ? 'ArrowRight' : 'ArrowLeft');
      else if (strike && H().state === 'normal' && n % 5 === 0) keys.push('KeyX');
    };
    const near = game.shadows.filter((s) => s.alive && s.state !== 'die' && s.state !== 'emerge').sort((a, b) => Math.abs(a.x - H().x) - Math.abs(b.x - H().x))[0];
    const spot = 360.3;                               // where her shadow is the right size (from the left candelabra)
    if (Y().state === 'carried') at(Y().x, true, 8);
    else if (near && Math.abs(near.x - Y().x) < 100) at(near.x, true);
    else if (F.form === 1) {
      const ab = F.armBox();
      if (ab && Math.abs(ab.x1 - Y().x) < 60) at((ab.x0 + ab.x1) / 2, true);           // cut the arm
      else if (Y().mode !== 'wait' || Math.abs(tile(Y().x) - spot) > 0.6) {
        if (Y().mode === 'wait' && Math.abs(tile(Y().x) - spot) > 0.6) call();
        else if (Math.abs(tile(H().x) - (spot + 1.3)) > 0.3) at((spot + 1.3) * 16, false, 3);
        else if (Math.abs(tile(Y().x) - spot) < 0.6 && Y().onGround) call();
      } else {
        // strike the heart when it opens (jump for it: it is high)
        const hb = F.hurtBox();
        if (hb) { at((hb.x0 + hb.x1) / 2 - H().facing * 10, false, 6); if (H().onGround && Math.abs(H().x - (hb.x0 + hb.x1) / 2) < 30 && n % 40 === 0) { frames(10, ['KeyZ']); frames(1, [], ['KeyX']); continue; } }
        else at(F.x, false, 20);
      }
    } else {
      // form 2: keep her still, stand by her with the flame, strike when the heart shows, clear the pools
      if (Y().mode !== 'wait' && Y().state === 'normal' && Y().onGround && Math.abs(Y().x - H().x) < 30) { call(); continue; }
      const pool = F.pools.find((p) => Math.abs(p.x - Y().x) < 40);
      const hb = F.hurtBox();
      if (hb) at(F.x - (sign(F.x - H().x) || 1) * 16, true, 6);
      else if (pool) at(pool.x - (sign(pool.x - H().x) || 1) * 14, true, 6);
      else at(Y().x + (sign(F.x - Y().x) || 1) * 14, false, 4);
    }
    if (H().onGround && Math.abs(H().vx) < 0.05 && keys.some((k) => k.startsWith('Arrow')) && game.world.pointSolid(H().x + H().facing * 8, H().y - 4)) jumpHold = 14;
    if (jumpHold > 0) { jumpHold--; keys.push('KeyZ'); }
    if (n % 2500 === 0) note('boss form' + F.form + ' hp' + F.hp + ' S' + F.S.toFixed(2) + ' ' + F.state);
    frames(1, keys);
  }
  frames.boss = false; frames.rescuing = false;
  if (!game.epilogue) fail('the great shadow is still up');
  note('great shadow done ' + JSON.stringify({ grabs: game.stats.grabs, losses, seconds: Math.round((game.stats.time - T0) / 60) }));
  if (stop('G')) return log.join('\n');
  // --- the evening: light the street lamps on the way down
  for (const L of game.lamps.filter((l) => l.x > game.epiSpot.x).sort((a, b) => a.x - b.x)) {
    walkTo(tile(L.x) - 1.2); frames(1, ['ArrowRight']); frames(1, [], ['KeyX']); frames(20);
    if (!L.lit) note('lamp ' + L.id + ' not lit');
  }
  walkTo(470);
  let c = 0; while (game.state === 'cutscene' && c++ < 5000) T.run(1, [], c % 20 === 0 ? ['KeyZ'] : []);
  waitFor(() => game.state === 'clear', 600, 'the end');
  note('THE END ' + JSON.stringify(game.stats));
  return log.join('\n');
  }
};
