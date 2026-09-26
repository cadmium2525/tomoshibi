// Scripted full run of chapter 3 (load the page with ?debug, then load this file and call autoplay3()).
window.autoplay3 = function () {
  const log = [];
  const H = () => game.hero, Y = () => game.heroine;
  const tile = (v) => v / 16;
  const note = (m) => log.push(m + ' ' + JSON.stringify(Object.assign(T.st(), { hood: Y().hooded, fear: +game.fear.toFixed(2),
    guards: game.guards.map((g) => `${g.id}:${g.state}:${tile(g.x).toFixed(1)}:${g.facing}`).join(' ') })));
  const fail = (m) => { note('FAIL ' + m); throw new Error(m + '\n' + log.join('\n')); };
  function frames(n, keys = [], taps = []) {
    T.run(n, keys, taps);
    if (game.state === 'gameover') fail('gameover ' + game.goReason);
    if (game.state === 'read') { T.run(24); T.run(2, [], ['KeyZ']); note('read a page'); }
  }
  function land() { let j = 0; while (!H().onGround && j++ < 120) frames(1); frames(2); }
  function walkTo(tx, { dash = false, max = 900 } = {}) {
    let i = 0;
    while (Math.abs(tile(H().x) - tx) > 0.25 && i++ < max) {
      const keys = [tile(H().x) < tx ? 'ArrowRight' : 'ArrowLeft'];
      if (dash) keys.push('ShiftLeft');
      if (H().onGround && Math.abs(H().vx) < 0.05 && i > 3) { frames(16, [...keys, 'KeyZ']); i += 16; continue; }
      // hop over a hole in front (water, gaps) unless we are about to arrive
      const dir = keys[0] === 'ArrowRight' ? 1 : -1, w = game.world, fx = H().x + dir * 9;
      if (H().onGround && Math.abs(tile(H().x) - tx) > 1.2 && !w.pointSolid(fx, H().y + 2) && !w.pointSolid(fx, H().y + 40)) {
        frames(18, [...keys, 'KeyZ']); i += 18; continue;
      }
      frames(1, keys);
    }
    land();
  }
  function waitFor(cond, max = 600, what = '') { let i = 0; while (!cond() && i++ < max) frames(1); if (!cond()) fail('timeout ' + what); }
  function herNear(d = 40) { return Y().state === 'normal' && Math.abs(Y().x - H().x) < d && Math.abs(Y().y - H().y) < 20; }
  function face(dir) { frames(2, [dir > 0 ? 'ArrowRight' : 'ArrowLeft']); }
  function call() { frames(1, [], ['KeyC']); frames(10); }
  function reach(what) {
    let i = 0;
    while (i++ < 240) { frames(1, ['ArrowDown']); if (['caught', 'pulled'].includes(Y().state)) break; }
    if (!['caught', 'pulled'].includes(Y().state)) fail('reach ' + what);
    waitFor(() => Y().state === 'normal' && H().state === 'normal', 200, 'after reach');
    note('ok ' + what);
  }
  function fight(until = () => false) {
    let n = 0;
    while (n++ < 6000) {
      const alive = game.shadows.filter((s) => s.alive && s.state !== 'die');
      const amb = game.ambushes.some((a) => a.wave >= 0 && !a.done);
      if (!alive.length && !amb && !until()) break;
      const s = alive.filter((s) => s.state !== 'emerge').sort((a, b) => Math.abs(a.x - H().x) - Math.abs(b.x - H().x))[0];
      const keys = [];
      if (s) {
        const dx = s.x - H().x;
        if (Math.abs(dx) > 20) keys.push(dx > 0 ? 'ArrowRight' : 'ArrowLeft');
        else if (sign(dx) !== H().facing) keys.push(dx > 0 ? 'ArrowRight' : 'ArrowLeft');
        else if (H().state === 'normal' && n % 6 === 0) keys.push('KeyX');
      }
      frames(1, keys);
    }
  }
  const G = (id) => game.guards.find((g) => g.id === id);
  // put the coat on (true) or take it off (false): walk up next to her and press ↑
  function hood(on) {
    if (Y().hooded === on) return;
    let i = 0;
    while (Math.abs(Y().x - H().x) > 20 && i++ < 200) frames(1, [Y().x > H().x ? 'ArrowRight' : 'ArrowLeft']);
    frames(4);
    frames(1, [], ['ArrowUp']); frames(4);
    if (Y().hooded !== on) fail('hood ' + on);
  }
  // run up to an edge and dash-jump across the gap after it
  function leapGap(edgeTx) {
    let i = 0;
    while (tile(H().x) < edgeTx && i++ < 300) frames(1, ['ArrowRight', 'ShiftLeft']);
    frames(22, ['ArrowRight', 'ShiftLeft', 'KeyZ']); frames(10, ['ArrowRight']); land();
  }
  function catchHer(what) { face(-1); frames(40); reach(what); face(1); }
  // stand at the top of a step; pull her up if she cannot follow on her own
  function up(tx, what) {
    walkTo(tx);
    waitFor(() => herNear(30) || Y().stuckT > 30, 400, what);
    if (Y().y - H().y > 20) { face(-1); reach(what); face(1); }
  }

  if (game.state === 'title' || game.chapter !== 3) game.startChapter(3);
  if (game.state === 'cutscene') game.finishIntro();
  frames(2);
  // --- A: slip past the gatekeeper while he looks toward the town
  walkTo(24); waitFor(() => herNear(), 300, 'A');
  waitFor(() => G('gA').facing === 1 && G('gA').t % 240 < 20, 800, 'gatekeeper turns');
  walkTo(43.5); waitFor(() => herNear(48), 400, 'past the gate');
  hood(false); frames(30); waitFor(() => game.shrines[0].lit, 300, 'shrine 1'); note('shrine1');
  // --- B: hide in the nooks while the patrols pass
  hood(true);
  // bring her into a nook and tell her to wait there
  const toNook = (nook, what) => {
    walkTo(nook + 1.5); waitFor(() => herNear(), 200, what + ' nook');
    let i = 0; while (!game.inNook(Y()) && i++ < 40) { frames(4, ['ArrowRight']); frames(20); }
    if (!game.inNook(Y())) fail('not in the nook ' + what);
    call();
  };
  const passPatrol = (g, nook, beyond, what) => {
    waitFor(() => G(g).facing === 1 && G(g).state === 'patrol' && tile(G(g).x) > nook + 4, 1500, what + ' walks away');
    toNook(nook, what);
    waitFor(() => G(g).facing === -1 && tile(G(g).x) < nook - 1.5, 1500, what + ' passes');
    call(); walkTo(beyond, { dash: false });
  };
  passPatrol('gB', 57, 69.6, 'gB');
  fight(); walkTo(71); waitFor(() => Y().stuckT > 30, 300, 'she stops at the step'); face(-1); reach('pull B'); face(1);
  fight(); passPatrol('gC', 83, 100, 'gC'); fight();
  waitFor(() => herNear(48), 400, 'B end');
  hood(false);
  // --- C: roofs
  up(110.5, 'shed'); up(113.4, 'roof A');
  walkTo(118); leapGap(120.6); walkTo(125); catchHer('roof B');
  walkTo(128); fight();
  walkTo(129); leapGap(131.6); walkTo(136); catchHer('roof C');
  up(146.4, 'roof D');
  walkTo(153); waitFor(() => Y().y > 25 * 16 || Y().stuckT > 30, 300, 'drop 1');
  walkTo(157); walkTo(162); waitFor(() => herNear(60), 400, 'street');
  // --- D: into the sewer
  walkTo(166.5); walkTo(167.6); land(); walkTo(169.5); catchHer('grate');
  walkTo(172); waitFor(() => game.shrines[2].lit, 300, 'shrine 3');
  walkTo(181); waitFor(() => herNear(48), 400, 'D1');
  leapGap(182.6); walkTo(187.5); catchHer('water 1');
  walkTo(200); waitFor(() => herNear(48), 300, 'D2');
  leapGap(200.6); walkTo(205.5); catchHer('water 2');
  walkTo(207.5); frames(1, [], ['ArrowUp']); frames(40);
  walkTo(226); waitFor(() => herNear(48), 400, 'D3');
  up(229.4, 'stair 1'); up(231.4, 'stair 2'); up(233.4, 'stair 3');
  // --- E: the square
  walkTo(245); waitFor(() => game.shrines[3].lit, 300, 'shrine 4');
  hood(true);
  walkTo(252); waitFor(() => herNear(), 200, 'E');
  waitFor(() => G('gD').facing === 1 && G('gD').t % 300 < 20, 900, 'gD turns');
  walkTo(262); waitFor(() => herNear(48), 300, 'past gD');
  // gE walks the balcony above: pass under it hooded, light the lamp while he looks away
  walkTo(276.2); waitFor(() => herNear(30), 300, 'under the balcony');
  waitFor(() => G('gE').facing === -1 && G('gE').state === 'patrol' && tile(G('gE').x) < 271, 1500, 'gE looks away');
  walkTo(277.6); waitFor(() => herNear(), 300, 'under L3');
  hood(false); walkTo(279.2); waitFor(() => game.lamps.find((l) => l.id === 'L3').lit, 200, 'L3 lit');
  hood(true);
  toNook(280, 'E2');
  waitFor(() => G('gF').state === 'snuff', 900, 'gF at the lamp');
  hood(false); call(); walkTo(285);
  let k = 0; while (!game.plates.find((p) => p.id === 'pP').pressed && k++ < 30) { frames(3, ['ArrowLeft']); frames(12); }
  call();
  waitFor(() => game.plates.find((p) => p.id === 'pP').pressed, 200, 'plate');
  waitFor(() => game.gates.find((g) => g.id === 'gP').open > 0.95, 100, 'gate open');
  walkTo(291.4, { dash: true }); frames(1, [], ['ArrowUp']); frames(6);
  walkTo(284); hood(true); call(); walkTo(294); waitFor(() => herNear(48), 400, 'through the gate');
  note('square done');
  // --- F: sanatorium
  hood(false);
  walkTo(299); waitFor(() => game.shrines[4].lit, 300, 'shrine 5');
  walkTo(312);
  let c = 0; while (game.state === 'cutscene' && c++ < 3000) T.run(1, [], c % 20 === 0 ? ['KeyZ'] : []);
  if (!game.escape) fail('bells did not start');
  // --- G: run over the roofs
  let hold = 0; c = 0;
  while (game.state === 'play' && c++ < 3000) {
    const h = H(), w = game.world, keys = ['ArrowRight', 'ShiftLeft'];
    if (hold > 0) { keys.push('KeyZ'); hold--; }
    else if (h.onGround) {
      const a = h.x + 14;
      if ((!w.pointSolid(a + 6, h.y + 2) && !w.pointSolid(a + 6, h.y + 18)) || w.pointSolid(a, h.y - 4) || w.pointSolid(a, h.y - 20)) hold = 16;
    }
    const r = game.stats.retries;
    frames(1, keys);
    if (game.stats.retries > r) fail('caught on the roofs');
  }
  waitFor(() => game.state === 'clear', 400, 'clear');
  note('CLEAR 3 ' + JSON.stringify(game.stats));
  return log.join('\n');
};
