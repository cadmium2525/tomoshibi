// Scripted full run of chapter 5 (load the page with ?debug, then load this file and call autoplay5()).
// autoplay5(upTo) stops after the named zone ('A' ... 'G') and returns the log so far.
window.autoplay5 = function (upTo = null, from = null) {
  const log = [];
  const H = () => game.hero, Y = () => game.heroine;
  const tile = (v) => v / 16;
  const note = (m) => log.push(m + ' ' + JSON.stringify(Object.assign(T.st(), { hood: Y().hooded, fear: +game.fear.toFixed(2), sec: Math.round(game.stats.time / 60) })));
  const fail = (m) => { note('FAIL ' + m); throw new Error(m + '\n' + log.join('\n')); };
  function frames(n, keys = [], taps = []) {
    const r0 = game.stats.retries, before = { hx: tile(H().x), hy: tile(H().y), yx: tile(Y().x), yy: tile(Y().y), hood: Y().hooded };
    T.run(n, keys, taps);
    if (game.stats.retries > r0) log.push('FELL near ' + JSON.stringify(before) + ' hood ' + before.hood);
    if (game.state === 'gameover' && !frames.boss) fail('gameover ' + game.goReason);
    if (Y().state === 'carried' && !frames.rescuing) { frames.rescuing = true; fight(); frames.rescuing = false; }
    if (game.state === 'read') { T.run(24); T.run(2, [], ['KeyZ']); note('read a page'); }
    if (game.state === 'cutscene') { let c = 0; while (game.state === 'cutscene' && c++ < 4000) T.run(1, [], c % 20 === 0 ? ['KeyZ'] : []); note('scene'); }
  }
  function land() { let j = 0; while (!H().onGround && j++ < 160) frames(1); frames(2); }
  function walkTo(tx, max = 1200) {
    let i = 0;
    while (Math.abs(tile(H().x) - tx) > 0.25 && i++ < max) {
      const keys = [tile(H().x) < tx ? 'ArrowRight' : 'ArrowLeft'];
      if (H().onGround && Math.abs(H().vx) < 0.05 && i > 3) { frames(16, [...keys, 'KeyZ']); i += 16; continue; }
      frames(1, keys);
    }
    land();
  }
  // walk on with her close behind (moss only holds near her)
  function lead(tx, gap = 22) {
    let i = 0;
    while (Math.abs(tile(H().x) - tx) > 0.25 && i++ < 3000) {
      const dir = tile(H().x) < tx ? 1 : -1;
      const ahead = (H().x - Y().x) * dir;
      if (ahead > gap && Y().state === 'normal') { frames(1); continue; }
      const keys = [dir > 0 ? 'ArrowRight' : 'ArrowLeft'];
      const step = game.world.pointSolid(H().x + dir * 8, H().y - 4) && !game.world.pointSolid(H().x + dir * 8, H().y - 36);
      if (H().onGround && Math.abs(H().vx) < 0.05 && i > 3 && ahead < gap && step) { frames(14, [...keys, 'KeyZ']); i += 14; continue; }
      frames(1, keys);
    }
    land();
  }
  const hop = (tx, n = 16) => { for (let i = 0; i < 60; i++) { const k = Math.abs(tile(H().x) - tx) > 0.15 ? [tile(H().x) < tx ? 'ArrowRight' : 'ArrowLeft'] : []; frames(1, i < n ? [...k, 'KeyZ'] : k); if (i > 4 && H().onGround) break; } land(); };
  function waitFor(cond, max = 600, what = '') { let i = 0; while (!cond() && i++ < max) frames(1); if (!cond()) fail('timeout ' + what); }
  function herNear(d = 30) { return ['normal', 'hand'].includes(Y().state) && Math.abs(Y().x - H().x) < d && Math.abs(Y().y - H().y) < 20; }
  function call() { frames(1, [], ['KeyC']); frames(10); }
  const up = () => { frames(1, [], ['ArrowUp']); frames(6); };
  // put the coat on / take it off (walk back to her first)
  function hood(on) {
    if (Y().hooded === on) return;
    waitFor(() => herNear(60) && Y().onGround && H().onGround, 600, 'her, for the coat');
    let i = 0;
    while (Math.abs(Y().x - H().x) > 20 && i++ < 200) frames(1, [Y().x < H().x ? 'ArrowLeft' : 'ArrowRight']);
    for (let t = 0; t < 4 && Y().hooded !== on; t++) { waitFor(() => H().state === 'normal', 200, 'Grey ready'); frames(4); up(); }
    if (Y().hooded !== on) fail('coat ' + on);
  }
  // fight whatever is near, staying within `leash` of her (on moss)
  function fight(until = () => false, leash = 0, max = 8000) {
    let n = 0;
    while (n++ < max) {
      const alive = game.shadows.filter((s) => s.alive && s.state !== 'die' && s.state !== 'wander' && (Math.abs(s.y - H().y) < 5 * 16 || Y().carriedBy === s) && Math.abs(s.x - H().x) < 240);
      const amb = game.ambushes.some((a) => a.wave >= 0 && !a.done);
      if (!alive.length && !amb && !until()) break;
      const s = alive.filter((s) => s.state !== 'emerge').sort((a, b) => Math.abs(a.x - H().x) - Math.abs(b.x - H().x))[0];
      const keys = [];
      if (s) {
        const dx = s.x - H().x;
        const ok = !leash || Math.abs(H().x + sign(dx) * 4 - Y().x) < leash;
        if (Math.abs(dx) > 20 && ok) keys.push(dx > 0 ? 'ArrowRight' : 'ArrowLeft');
        else if (sign(dx) !== H().facing) keys.push(dx > 0 ? 'ArrowRight' : 'ArrowLeft');
        else if (H().state === 'normal' && n % 6 === 0 && Math.abs(dx) < 36) keys.push('KeyX');
      }
      frames(1, keys);
    }
  }
  const stop = (z) => { note('zone ' + z + ' done'); return upTo === z; };
  T.fast = true;
  try { return run(); } finally { T.fast = false; game.render(); }
  function run() {
  let k = 0;

  const Z = 'ABCDEFG';
  const skip = (z) => from && Z.indexOf(z) < Z.indexOf(from);
  if (from) {
    // start at the lantern before zone `from` (as a checkpoint load would)
    const sid = { B: 's2', C: 's3', D: 's3', E: 's4', F: 's5', G: 's6' }[from];
    game.chapter = 5; useChapter(5); game.stats = { time: 0, grabs: 0, kills: 0, retries: 0 };
    game.load(null);
    const sh = game.shrines.find((q) => q.id === sid);
    const cp = { x: sh.x, y: sh.y, levers: [], shrines: game.shrines.filter((q) => q.x <= sh.x).map((q) => q.id),
      ambush: Z.indexOf(from) > 4 ? ['a1', 'a2'] : Z.indexOf(from) > 1 ? ['a1'] : [], blocks: {}, revealed: Z.indexOf(from) > 3 };
    game.checkpoint = cp; game.load(cp);
    game.state = 'play'; game.hideCenter();
  } else {
    if (game.state === 'title' || game.chapter !== 5 || game.state === 'clear') game.startChapter(5);
    if (game.state === 'cutscene') game.finishIntro(true);
  }
  frames(2);
  // --- A: the tower's shadow
  if (!skip('A')) {
  walkTo(14); hood(true); walkTo(30); waitFor(() => herNear(40), 600, 'across bridge 1');
  walkTo(64); waitFor(() => herNear(40) && tile(Y().x) > 58, 600, 'across bridge 2');
  hood(false); walkTo(79); waitFor(() => herNear(40), 900, 'into the cave');
  if (stop('A')) return log.join('\n');
  }
  if (!skip('B')) {
  // --- B: the cave of light moss
  lead(97); lead(104);
  for (const x of [105.7, 107.7, 109.7, 111.6]) { lead(x); }
  lead(124); waitFor(() => herNear(40), 400, 'on the ledge');
  k = 0;
  while (tile(H().x) < 135 && k++ < 40) { lead(Math.min(135, tile(H().x) + 1.2)); fight(() => false, 30, 240); }
  walkTo(150); waitFor(() => herNear(50), 900, 'into the village');
  if (stop('B')) return log.join('\n');
  }
  if (!skip('C')) {
  // --- C: the village of shadows (under the coat), a moss ditch to cross lit
  hood(true);
  walkTo(198.5); waitFor(() => herNear(40), 900, 'at the ditch');
  // nobody near enough to see her light: the dancers at the far end of the square, the one past the ditch far off
  const vs = game.shadows.filter((s) => s instanceof Villager);
  const clear = () => vs.every((s) => !s.alive || s.state !== 'wander' || (s.x0 > 200 * 16 ? s.x > 211 * 16 && (s.dir > 0 || s.pause > 40) : Math.abs(s.x - Y().x) > 104));
  waitFor(clear, 3000, 'nobody near the ditch');
  hood(false); lead(205.2); waitFor(() => tile(Y().x) > 203.2 && Y().onGround, 400, 'past the ditch'); hood(true);
  fight();
  walkTo(222); waitFor(() => herNear(50), 900, 'into the cave');
  hood(false);
  if (stop('C')) return log.join('\n');
  }
  if (!skip('D')) {
  // --- D: the wall of shadow plays
  walkTo(230); frames(10); walkTo(246); waitFor(() => herNear(40), 600, 'out of the cave');
  if (stop('D')) return log.join('\n');
  }
  if (!skip('E')) {
  // --- E: moss in an ambush, then a road
  k = 0;
  while (tile(H().x) < 268 && k++ < 60) { lead(Math.min(268, tile(H().x) + 1.2)); fight(() => false, 30, 240); }
  lead(269.5); waitFor(() => tile(Y().x) > 267.2 && Y().onGround, 600, 'off the moss'); hood(true); fight(); walkTo(288); waitFor(() => herNear(40), 600, 'across the road'); hood(false);
  if (stop('E')) return log.join('\n');
  }
  if (!skip('F')) {
  // --- F: down the cliff, road and moss by turns
  walkTo(300); hood(true);
  for (const x of [301.6, 303.6, 305.6, 309.4]) lead(x, 26);
  hood(false);
  for (const x of [310.6, 312.6, 314.6, 318.4]) lead(x, 26);
  hood(true);
  for (const x of [319.6, 321.6, 323.6, 327.4]) lead(x, 26);
  hood(false);
  for (const x of [328.6, 330.6, 332.6, 336]) lead(x, 26);
  if (stop('F')) return log.join('\n');
  }
  // --- G: the whale. Stand in the sea between it and her; when the ripples gather under
  // Grey, step aside (away from her) - it leaps and lands in her light, stranded.
  frames.boss = true; frames.rescuing = true;
  walkTo(341.5); waitFor(() => game.whale || game.bossDone, 600, 'the whale');
  let n = 0, losses = 0, jumpHold = 0; const T0 = game.stats.time;
  while (!game.bossDone && n++ < 60000) {
    if (game.state === 'gameover') {
      if (++losses > 4) fail('lost to the whale 5 times');
      note('lost to the whale, again from the shrine');
      T.run(80); T.run(2, [], ['KeyZ']); frames(10);
      if (Y().mode === 'wait') call();
      if (Y().hooded) hood(false);
      walkTo(341.5); waitFor(() => game.whale || game.bossDone, 900, 'the whale again');
      continue;
    }
    const W = game.whale;
    if (!W || game.state !== 'play') { frames(1); continue; }
    const keys = [];
    const at = (x, strike, tol = 14) => {
      const dx = x - H().x;
      if (Math.abs(dx) > tol) {
        keys.push(dx > 0 ? 'ArrowRight' : 'ArrowLeft');
        if (H().onGround && Math.abs(H().vx) < 0.05) jumpHold = 14;          // a step in the way
      }
      else if (sign(dx) !== H().facing && Math.abs(dx) > 2) keys.push(dx > 0 ? 'ArrowRight' : 'ArrowLeft');
      else if (strike && H().state === 'normal' && n % 5 === 0) keys.push('KeyX');
    };
    const near = game.shadows.filter((s) => s.alive && s.state !== 'die' && s.state !== 'emerge').sort((a, b) => Math.abs(a.x - H().x) - Math.abs(b.x - H().x))[0];
    const inTrench = H().y > 43 * 16;
    if (Y().carriedBy === W) at(W.x, true);
    else if (Y().state === 'carried') at(Y().carriedBy.x, true);
    else if (near && Math.abs(near.x - Y().x) < 90 && W.state !== 'beached') at(near.x, true);   // a shadow child going for her first
    else if (W.state === 'beached') {
      if (H().y < W.y - 16 && game.onPole(H()) && Math.abs(H().x - W.x) < 40) keys.push('ArrowDown');   // down off the jetty onto it
      else at(W.x + (H().x < W.x ? -26 : 26), true);
    }
    else if (inTrench && !(W.state === 'beached' && Math.abs(W.x - H().x) < 60)) {                                   // in the dry trench: out by the step, back onto the jetty
      at(342.5 * 16, false, 4);
    }
    else if (near && Math.abs(near.x - Y().x) < 120) at(near.x, true);
    else if (W.state === 'ripple' && W.target === H()) at(W.x + 44, false);
    else if (Y().mode === 'wait' && Y().state === 'normal' && (tile(Y().x) > 343.8 || Y().y > 42 * 16 + 2) && !inTrench) call();   // not where she should be
    else if (Y().mode !== 'wait' && Y().state === 'normal') { if (Math.abs(tile(H().x) - 341.4) > 0.3) at(341.4 * 16, false, 3); else if (tile(Y().x) < 343.4 && tile(Y().x) > 341.9 && Math.abs(Y().y - 42 * 16) < 2 && Y().onGround) call(); }   // she comes up onto the rock after him, then waits
    else if (W.state !== 'breach') {
      // just past where her light dries the sea
      let x = 344 * 16; while (x < 356 * 16 && !(W.seaAt(game, x) && W.seaAt(game, x + 16))) x += 8;
      at(x + 20, false, 4);
    }
    if (jumpHold > 0) { jumpHold--; keys.push('KeyZ'); }
    if (n % 2500 === 0) note('boss ' + W.state + ' hp' + W.hp + ' keys ' + keys.join(','));
    frames(1, keys);
  }
  frames.boss = false; frames.rescuing = false;
  if (!game.bossDone) fail('the whale is still in the sea');
  note('whale done ' + JSON.stringify({ grabs: game.stats.grabs, losses, seconds: Math.round((game.stats.time - T0) / 60) }));
  let c = 0; while (game.state === 'cutscene' && c++ < 5000) T.run(1, [], c % 20 === 0 ? ['KeyZ'] : []);
  if (!game.escape) fail('the escape did not start');
  if (stop('G')) return log.join('\n');
  // --- the escape: hand in hand up out of the valley, the coat on for the road, off for the moss
  const w = game.world;
  const softAt = (x, y) => { const tx = Math.floor(x / 16), ty = Math.floor(y / 16); return w.soft[ty * w.W + tx] || 0; };
  let hold = 0; c = 0;
  while (game.state === 'play' && c++ < 4000) {
    const h = H(), keys = ['ArrowRight', 'ShiftLeft'];
    // what comes next: the first road or moss tile ahead (feet level, a few rows up or down)
    let next = 0;
    for (let d = 10; d < 72 && !next; d += 4) for (let r = -3; r <= 2 && !next; r++) next = softAt(h.x + d, h.y + 2 + r * 16);
    const under = softAt(h.x, h.y + 2);
    const want = next === 1 ? true : next === 2 ? false : Y().hooded;
    if (h.onGround && want !== Y().hooded && !under) { frames(1, [], ['ArrowUp']); frames(2); continue; }
    if (hold > 0) { keys.push('KeyZ'); hold--; }
    else if (h.onGround) {
      const a = h.x + 14;
      if ((!w.pointSolid(a + 6, h.y + 2) && !w.pointSolid(a + 6, h.y + 18)) || w.pointSolid(a, h.y - 4) || w.pointSolid(a, h.y - 20)) hold = 12;
    }
    const r = game.stats.retries;
    frames(1, keys);
    if (game.stats.retries > r) fail('caught by the falling valley');
  }
  waitFor(() => game.state === 'clear', 600, 'clear');
  note('CLEAR 5 ' + JSON.stringify(game.stats));
  return log.join('\n');
  }
};
