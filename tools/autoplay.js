// Scripted full run of stage 1 without teleports (load the page with ?debug, then paste/eval).
window.autoplay = function () {
  const log = [];
  const H = () => game.hero, Y = () => game.heroine;
  const tile = (v) => v / 16;
  const note = (m) => log.push(m + ' ' + JSON.stringify(T.st()));
  const fail = (m) => { note('FAIL ' + m); throw new Error(m + '\n' + log.join('\n')); };
  function frames(n, keys = [], taps = []) { T.run(n, keys, taps); if (game.state === 'gameover') fail('gameover'); }
  function walkTo(tx, { dash = false, max = 900 } = {}) {
    let i = 0;
    while (Math.abs(tile(H().x) - tx) > 0.25 && i++ < max) {
      const dir = tile(H().x) < tx ? 'ArrowRight' : 'ArrowLeft';
      const keys = [dir]; if (dash) keys.push('ShiftLeft');
      const blocked = H().onGround && Math.abs(H().vx) < 0.05 && i > 3;
      if (blocked) frames(16, [...keys, 'KeyZ']);   // hold jump for a full-height jump
      else frames(1, keys);
    }
    let j = 0; while (!H().onGround && j++ < 120) frames(1);
    frames(2);
  }
  function waitFor(cond, max = 600, what = '') { let i = 0; while (!cond() && i++ < max) frames(1); if (!cond()) fail('timeout ' + what); }
  function herNear(d = 40) { return Y().state === 'normal' && Math.abs(Y().x - H().x) < d && Math.abs(Y().y - H().y) < 20; }
  function face(dir) { frames(2, [dir > 0 ? 'ArrowRight' : 'ArrowLeft']); }
  function reach(what) {
    let i = 0;
    while (i++ < 200) {
      frames(1, ['ArrowDown']);
      if (['caught', 'pulled'].includes(Y().state)) break;
    }
    if (!['caught', 'pulled'].includes(Y().state)) fail('reach ' + what);
    waitFor(() => Y().state === 'normal' && H().state === 'normal', 200, 'after reach');
    note('ok ' + what);
  }
  function dashJump(fromTx, edgeTx, dir = 1) {
    walkTo(fromTx);
    const k = dir > 0 ? 'ArrowRight' : 'ArrowLeft';
    let i = 0;
    while ((dir > 0 ? tile(H().x) < edgeTx : tile(H().x) > edgeTx) && i++ < 120) frames(1, [k, 'ShiftLeft']);
    frames(24, [k, 'ShiftLeft', 'KeyZ']);
    frames(12, [k]);
    waitFor(() => H().onGround, 120, 'land');
    frames(10);
  }
  function fight() {
    let n = 0;
    while (n++ < 4000) {
      const alive = game.shadows.filter((s) => s.alive && s.state !== 'die');
      const amb = game.ambushes.some((a) => a.wave >= 0 && !a.done);
      if (!alive.length && !amb) break;
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
    note('fight done');
  }

  T.run(1);
  // --- zone 1
  walkTo(27.5); waitFor(() => herNear(), 400, 'follow z1'); frames(20);
  frames(1, [], ['KeyC']); waitFor(() => game.plates[0].pressed, 200, 'plate1'); note('plate');
  waitFor(() => game.gates[0].open >= 1, 100, 'gate1');
  walkTo(35.5); frames(1, [], ['ArrowUp']); if (!game.levers[0].on) fail('lever');
  frames(1, [], ['KeyC']); frames(30);
  walkTo(43.5); waitFor(() => herNear(), 500, 'follow to shrine'); note('shrine1 ' + game.shrines[0].lit);
  // --- zone 2 descent
  walkTo(48); waitFor(() => herNear(48), 400, 'R1');
  walkTo(55.5); waitFor(() => herNear(48), 400, 'R2');
  walkTo(48.5); waitFor(() => herNear(48), 400, 'R3');
  walkTo(53.5); frames(40); face(-1); reach('shaft catch');
  // --- zone 3 chasms
  walkTo(61); dashJump(61, 63.4); frames(40); face(-1); reach('chasm1');
  walkTo(70); dashJump(70, 74.4); frames(40); face(-1); reach('chasm2');
  walkTo(81); dashJump(81, 82.4); frames(40); face(-1); reach('chasm3');
  walkTo(92); waitFor(() => herNear(48), 300, 'pre ambush'); note('shrine2 ' + game.shrines[1].lit);
  walkTo(94); fight(); waitFor(() => Y().state === 'normal', 300, 'recover');
  // --- zone 4 stairs: jump up each step, pull her up the 2-tile ones
  const steps = [[104, 34], [108, 32], [112, 31], [116, 30], [120, 29], [122, 28], [126, 26], [130, 25], [134, 24], [138, 23], [142, 22]];
  for (const [x0, s] of steps) {
    walkTo(x0 + 1.2);
    if (Math.abs(tile(H().y) - s) > 0.1) fail('step ' + x0);
    frames(50);
    if (Y().y - H().y > 20) { face(-1); reach('pull ' + x0); face(1); }
    waitFor(() => Math.abs(Y().y - H().y) < 4, 300, 'step follow ' + x0);
  }
  note('stairs done shrine3 ' + game.shrines[2].lit);
  // --- zone 5 block puzzle
  walkTo(148.4); waitFor(() => herNear(), 300, 'z5'); frames(20);
  frames(1, [], ['KeyC']); waitFor(() => game.plates[1].pressed || game.plates[2].pressed, 200, 'plate2');
  waitFor(() => game.gates[1].open >= 1, 100, 'gate2');
  walkTo(153.6); frames(22, ['ArrowRight', 'KeyZ']); walkTo(157.2); frames(10);
  let i = 0; while (game.blocks[0].x > 149.5 * 16 + 0.5 && i++ < 800) frames(1, ['ArrowLeft']);
  note('block ' + tile(game.blocks[0].x));
  if (!game.plates[2].pressed) fail('block not on plate');
  walkTo(157); frames(1, [], ['KeyC']);
  waitFor(() => Y().x > 152 * 16 && Y().state === 'normal', 600, 'through gate2');
  // --- zone 6 hall
  walkTo(168); fight(); waitFor(() => Y().state === 'normal', 300, 'recover2');
  walkTo(177.5); waitFor(() => game.state !== 'play', 600, 'door');
  waitFor(() => game.state === 'clear', 400, 'clear');
  note('CLEAR stats ' + JSON.stringify(game.stats));
  return log.join('\n');
};
