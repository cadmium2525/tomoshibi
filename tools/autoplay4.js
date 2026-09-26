// Scripted full run of chapter 4 (load the page with ?debug, then load this file and call autoplay4()).
window.autoplay4 = function () {
  const log = [];
  const H = () => game.hero, Y = () => game.heroine;
  const tile = (v) => v / 16;
  const note = (m) => log.push(m + ' ' + JSON.stringify(Object.assign(T.st(), { lifts: game.lifts.map((l) => `${l.id}:${tile(l.y).toFixed(1)}`).join(' ') })));
  const fail = (m) => { note('FAIL ' + m); throw new Error(m + '\n' + log.join('\n')); };
  function frames(n, keys = [], taps = []) {
    T.run(n, keys, taps);
    if (game.state === 'gameover') fail('gameover ' + game.goReason);
    if (Y().state === 'carried' && !frames.rescuing) { frames.rescuing = true; fight(); frames.rescuing = false; }
    if (game.state === 'read') { T.run(24); T.run(2, [], ['KeyZ']); note('read a page'); }
    if (game.state === 'cutscene') { let c = 0; while (game.state === 'cutscene' && c++ < 3000) T.run(1, [], c % 20 === 0 ? ['KeyZ'] : []); note('scene'); }
  }
  function land() { let j = 0; while (!H().onGround && j++ < 160) frames(1); frames(2); }
  function walkTo(tx, max = 900) {
    let i = 0;
    while (Math.abs(tile(H().x) - tx) > 0.25 && i++ < max) {
      const keys = [tile(H().x) < tx ? 'ArrowRight' : 'ArrowLeft'];
      if (H().onGround && Math.abs(H().vx) < 0.05 && i > 3) { frames(16, [...keys, 'KeyZ']); i += 16; continue; }
      frames(1, keys);
    }
    land();
  }
  const hop = (tx, n = 16) => { for (let i = 0; i < 60; i++) { const k = Math.abs(tile(H().x) - tx) > 0.15 ? [tile(H().x) < tx ? 'ArrowRight' : 'ArrowLeft'] : []; frames(1, i < n ? [...k, 'KeyZ'] : k); if (i > 4 && H().onGround) break; } land(); };
  function waitFor(cond, max = 600, what = '') { let i = 0; while (!cond() && i++ < max) frames(1); if (!cond()) fail('timeout ' + what); }
  function herNear(d = 40) { return Y().state === 'normal' && Math.abs(Y().x - H().x) < d && Math.abs(Y().y - H().y) < 20; }
  function face(dir) { frames(2, [dir > 0 ? 'ArrowRight' : 'ArrowLeft']); }
  function call() { frames(1, [], ['KeyC']); frames(10); }
  const up = () => { frames(1, [], ['ArrowUp']); frames(6); };
  // fight whatever is around; `stay` keeps Grey within [x0, x1] (on a lift)
  function fight(until = () => false, stay = null) {
    let n = 0;
    while (n++ < 8000) {
      const alive = game.shadows.filter((s) => s.alive && s.state !== 'die' && Math.abs(s.y - H().y) < 5 * 16);
      const amb = game.ambushes.some((a) => a.wave >= 0 && !a.done);
      if (!alive.length && !amb && !until()) break;
      const s = alive.filter((s) => s.state !== 'emerge').sort((a, b) => Math.hypot(a.x - H().x, a.y - H().y) - Math.hypot(b.x - H().x, b.y - H().y))[0];
      const keys = [];
      if (s) {
        const dx = s.x - H().x;
        const canMove = !stay || (dx > 0 ? H().x < stay[1] : H().x > stay[0]);
        if (Math.abs(dx) > 20 && canMove) keys.push(dx > 0 ? 'ArrowRight' : 'ArrowLeft');
        else if (sign(dx) !== H().facing) keys.push(dx > 0 ? 'ArrowRight' : 'ArrowLeft');
        else if (H().state === 'normal' && n % 6 === 0 && Math.abs(s.y - H().y) < 50) keys.push('KeyX');
      }
      frames(1, keys);
    }
  }
  // tell her to wait next to a pedestal: she steps onto it
  function toPedestal(id, heroX) {
    const p = game.pedestals.find((q) => q.id === id);
    walkTo(heroX); waitFor(() => herNear(48), 400, 'near ' + id);
    call(); waitFor(() => p.on, 300, 'on ' + id);
    if (p.lift) { walkTo(tile(p.x) + (tile(H().x) < tile(p.x) ? -0.9 : 0.9)); }
  }
  const R = (id) => game.receptors.find((q) => q.id === id);
  const L = (id) => game.lifts.find((q) => q.id === id);

  if (game.state === 'title' || game.chapter !== 4) game.startChapter(4);
  if (game.state === 'cutscene') game.finishIntro();
  frames(2);
  // --- A: the village and the great door
  walkTo(20); walkTo(40); fight(); walkTo(46);
  toPedestal('P1', 50.5);
  walkTo(54.3); face(1); up();
  waitFor(() => game.gates.find((g) => g.id === 'gB').open > 0.95, 200, 'door open');
  walkTo(62.3); up(); call(); walkTo(67); waitFor(() => herNear(48), 600, 'into the hall'); note('hall');
  // --- B: ride her light up to the mezzanine
  walkTo(89); toPedestal('P1L', 92.3);
  waitFor(() => Math.abs(L('L1').y - L('L1').y1) < 1, 600, 'L1 up'); note('mezzanine');
  walkTo(88); call(); waitFor(() => herNear(48), 300, 'off L1');
  // --- C: a mirror, a receptor that holds, and the lift up to the archive
  toPedestal('P2', 84.5);
  walkTo(70.8); face(-1); up();
  waitFor(() => R('R2').pressed, 200, 'R2');
  call(); walkTo(65.2); waitFor(() => herNear(24), 400, 'on L2');
  frames(4);
  waitFor(() => Math.abs(L('L2').y - L('L2').y1) < 1, 600, 'L2 up'); note('archive');
  // --- D: the archive
  walkTo(84); frames(10); note('after logbook');
  toPedestal('P3L', 65.4);
  waitFor(() => Math.abs(L('L3').y - L('L3').y1) < 1, 900, 'L3 up'); note('engine room');
  fight();
  // --- E: two mirrors, a receptor that holds long, the lift to the upper landing
  walkTo(72); call(); toPedestal('P4', 73);
  walkTo(76.8); face(-1); up();
  fight(); walkTo(81.6); hop(81.6); hop(81.6); hop(79.4); walkTo(77.3); note('balcony');
  if (Math.abs(H().y - 58 * 16) > 2) fail('not on the balcony');
  face(-1); up();
  waitFor(() => R('R4').pressed, 200, 'R4');
  walkTo(74); call(); fight(); walkTo(87.2); waitFor(() => herNear(24), 500, 'on L4');
  frames(4);
  waitFor(() => Math.abs(L('L4').y - L('L4').y1) < 1, 800, 'L4 up'); note('upper landing');
  walkTo(98); walkTo(103); waitFor(() => herNear(60), 600, 'outside'); fight();
  // --- F: the slow lift up the outer wall, flying shadows on the way
  fight();
  toPedestal('P5L', 109.6);
  // ride up: stand still on the lift, swing only at shadows that come close
  let r = 0;
  while (Math.abs(L('L5').y - L('L5').y1) > 1 && r++ < 3000) {
    const s = game.shadows.filter((q) => q.alive && q.state !== 'die').sort((a, b) => Math.hypot(a.x - H().x, a.y - H().y) - Math.hypot(b.x - H().x, b.y - H().y))[0];
    const keys = [];
    if (s && Math.hypot(s.x - H().x, s.y - H().y) < 34) {
      if (sign(s.x - H().x) !== H().facing) keys.push(s.x > H().x ? 'ArrowRight' : 'ArrowLeft');
      else if (H().state === 'normal' && r % 6 === 0) keys.push('KeyX');
    }
    frames(1, keys);
  }
  if (Math.abs(L('L5').y - L('L5').y1) > 1) fail('L5 did not reach the top');
  note('top of the wall');
  fight(); if (Y().mode === 'wait') call(); walkTo(99); fight(); waitFor(() => herNear(60), 600, 'into the lamp room');
  // --- G: the flood of shadows
  walkTo(92); waitFor(() => game.boss || game.bossDone, 600, 'boss begins');
  let turns = 0;
  fight(() => game.boss && !game.bossDone);
  note('boss done');
  // --- the great lamp: turn the pedestal's light upward
  if (Y().mode === 'wait') call();
  toPedestal('P6', 83.4);
  walkTo(81.9);
  let k = 0; while (!(game.pedestals.find((p) => p.id === 'P6').dir[1] === -1) && k++ < 4) up();
  waitFor(() => game.state === 'ending' || game.state === 'clear', 800, 'lamp');
  waitFor(() => game.state === 'clear', 600, 'clear');
  note('CLEAR 4 ' + JSON.stringify(game.stats));
  return log.join('\n');
};
