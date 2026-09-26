// Scripted full run of chapter 2 (load the page with ?debug, then load this file and call autoplay2()).
window.autoplay2 = function () {
  const log = [];
  const H = () => game.hero, Y = () => game.heroine;
  const tile = (v) => v / 16;
  const note = (m) => log.push(m + ' ' + JSON.stringify(T.st()));
  const fail = (m) => { note('FAIL ' + m); throw new Error(m + '\n' + log.join('\n')); };
  function frames(n, keys = [], taps = []) {
    T.run(n, keys, taps);
    if (game.state === 'gameover') fail('gameover');
    if (game.state === 'read') { T.run(24); T.run(2, [], ['KeyZ']); note('read a page'); }
  }
  function land() { let j = 0; while (!H().onGround && j++ < 120) frames(1); frames(2); }
  function walkTo(tx, { dash = false, max = 900 } = {}) {
    let i = 0;
    while (Math.abs(tile(H().x) - tx) > 0.25 && i++ < max) {
      const keys = [tile(H().x) < tx ? 'ArrowRight' : 'ArrowLeft'];
      if (dash) keys.push('ShiftLeft');
      if (H().onGround && Math.abs(H().vx) < 0.05 && i > 3) { frames(16, [...keys, 'KeyZ']); i += 16; continue; }
      frames(1, keys);
    }
    land();
  }
  function jumpRight(n = 16) { frames(n, ['ArrowRight', 'KeyZ']); land(); }
  function waitFor(cond, max = 600, what = '') { let i = 0; while (!cond() && i++ < max) frames(1); if (!cond()) fail('timeout ' + what); }
  function herNear(d = 40) { return Y().state === 'normal' && Math.abs(Y().x - H().x) < d && Math.abs(Y().y - H().y) < 20; }
  function face(dir) { frames(2, [dir > 0 ? 'ArrowRight' : 'ArrowLeft']); }
  function call() { frames(1, [], ['KeyC']); frames(20); }
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
      } else if (Math.abs(Y().x - H().x) > 30) keys.push(Y().x > H().x ? 'ArrowRight' : 'ArrowLeft');
      frames(1, keys);
    }
    note('fight done');
  }
  const M = (id) => game.markers.find((m) => m.id === id);

  if (game.state === 'title' || game.chapter !== 2) { game.startChapter(2); }
  if (game.state === 'cutscene') game.finishIntro();
  frames(2);
  // --- A
  walkTo(20); walkTo(31.5); waitFor(() => Y().stuckT > 30, 400, 'she stops at the step');
  face(-1); reach('pull A'); face(1);
  walkTo(36); waitFor(() => herNear(48), 300, 'A follow'); note('shrine1 ' + game.shrines[0].lit);
  // --- B: wait behind the stone, cross on its shadow, lever drops the logs
  walkTo(51.2); waitFor(() => herNear(), 300, 'B'); frames(30); call();
  if (Y().mode !== 'wait') fail('not waiting');
  jumpRight(); walkTo(61); note('crossed on shadow');
  walkTo(61.5); frames(1, [], ['ArrowUp']); frames(40); call();
  waitFor(() => Y().x > 60 * 16 && Y().state === 'normal', 600, 'she crossed the logs');
  // --- C: climb on the shadow, lever opens the wooden gate, pull her up at the end
  walkTo(85); waitFor(() => herNear(), 300, 'C'); frames(30); call();
  jumpRight(); frames(4); jumpRight(); walkTo(93.5); note('on the cliff');
  frames(1, [], ['ArrowUp']); frames(40); call();
  walkTo(104); frames(24, ['ArrowRight', 'ShiftLeft', 'KeyZ']); land(); walkTo(109.4);
  waitFor(() => Y().x > 105 * 16 && Y().stuckT > 30, 900, 'she came through the tunnel');
  face(-1); reach('pull C'); face(1);
  // --- D: carry the stone down, onto the plate; catch her below the ledge
  fight();
  walkTo(117.2); face(1); frames(1, [], ['ArrowUp']); frames(34);
  if (H().state !== 'carry') fail('lift');
  walkTo(135.6); frames(1, [], ['ArrowUp']); frames(30);
  if (!game.plates[0].pressed) fail('stone not on the plate');
  fight(); walkTo(126); waitFor(() => Y().stuckT > 30 || Y().x > 125 * 16, 900, 'she waits at the ledge');
  if (Y().y < H().y - 20) { face(-1); reach('catch D'); }
  walkTo(146); waitFor(() => herNear(48), 600, 'through gate'); note('shrine3 ' + game.shrines[2].lit);
  // --- E: two stones
  walkTo(162.5); waitFor(() => herNear(), 300, 'E'); frames(30); call();
  jumpRight(); walkTo(169.2); note('on the island');
  call(); frames(60); face(-1); reach('catch E');
  // she landed just left of the second stone: keep her there, then step onto its shadow
  call(); if (Y().mode !== 'wait' || Y().x > M('m4').x) fail('wait E2');
  walkTo(170.6); jumpRight(); walkTo(179); walkTo(180.5); frames(1, [], ['ArrowUp']); frames(40); call();
  waitFor(() => Y().x > 178 * 16 && Y().state === 'normal', 600, 'she crossed E');
  // --- F: ambush
  walkTo(207); waitFor(() => herNear(48), 400, 'F');
  walkTo(216); fight(); waitFor(() => Y().state === 'normal', 300, 'recover F');
  // --- G: dawn
  walkTo(246); waitFor(() => herNear(48), 400, 'G');
  walkTo(253); waitFor(() => game.dawn, 200, 'dawn begins');
  fight(() => !game.dawnDone);
  note('sun up');
  walkTo(279); waitFor(() => game.state === 'ending', 400, 'lookout');
  waitFor(() => game.state === 'clear', 400, 'clear');
  note('CLEAR 2 ' + JSON.stringify(game.stats));
  return log.join('\n');
};
