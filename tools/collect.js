// Can every collectible actually be picked up? One small scripted detour per item.
// Load the page with ?debug, load this file, then: collectTest() -> list of results.
window.collectTest = function (only = null) {
  const H = () => game.hero, Y = () => game.heroine, tile = (v) => v / 16;
  const run = (n, keys = [], taps = []) => { for (let i = 0; i < n; i++) { T.run(1, keys, i === 0 ? taps : []); if (game.state === 'read') { T.run(20); T.run(2, [], ['KeyZ']); } } };
  const land = () => { let j = 0; while (!H().onGround && j++ < 120) run(1); run(2); };
  const walk = (tx, max = 400) => { let i = 0; while (Math.abs(tile(H().x) - tx) > 0.2 && i++ < max) run(1, [tile(H().x) < tx ? 'ArrowRight' : 'ArrowLeft']); land(); };
  // jump and steer toward tile x while in the air
  const hop = (tx, n = 16) => { for (let i = 0; i < 60; i++) { const k = Math.abs(tile(H().x) - tx) > 0.15 ? [tile(H().x) < tx ? 'ArrowRight' : 'ArrowLeft'] : []; run(1, i < n ? [...k, 'KeyZ'] : k); if (i > 4 && H().onGround) break; } land(); };
  const jump = (dir = 0, n = 16) => { const k = dir > 0 ? ['ArrowRight'] : dir < 0 ? ['ArrowLeft'] : []; run(n, [...k, 'KeyZ']); run(10, k); land(); };
  // hero feet on surface row `s` (tile x hx), Lumina at yx
  const tp = (hx, s, yx = hx - 1.5, ys = s) => {
    const h = H(), y = Y();
    h.x = hx * 16; h.y = s * 16; h.vx = h.vy = 0; h.setState('normal'); h.held = null;
    y.x = yx * 16; y.y = ys * 16; y.vx = y.vy = 0; y.setState('normal'); y.mode = 'wait';
    h.checkGround(game.world); y.checkGround(game.world); game.updateCamera(true);
  };
  const start = (ch, cp = null) => {
    game.chapter = ch; useChapter(ch);
    game.checkpoint = cp; game.collected = new Set(); game.stats = { time: 0, grabs: 0, kills: 0, retries: 0 };
    game.load(cp);
    if (game.state === 'cutscene' && game.cutSkip) game.cutSkip();
    game.state = 'play'; game.hideCenter();
    game.guards = []; game.dawnZone = null; game.ambushes = []; game.spawnCd = 99999;
    if (game.collapse) game.collapse.x = -9999;
  };
  const esc = (x, y) => ({ x: x * 16, y: y * 16, escape: true, levers: [], shrines: [], ambush: [], blocks: {} });
  const lampOn = (id, x, s) => { tp(x - 3, s, x, s); Y().hooded = false; run(20); if (!game.lamps.find((l) => l.id === id).lit) throw new Error('lamp ' + id); };
  const got = (id) => game.collected.has(id);

  const tests = {
    // ---- chapter 1
    f1: () => { start(1); tp(9, 16); walk(3); },
    f2: () => { start(1); tp(40.6, 26, 44); jump(); },
    f3: () => { start(1); tp(80.6, 33, 79.5); jump(); },
    f4: () => { start(1); tp(175.2, 17, 172, 22); jump(); },
    f5: () => { start(1, esc(258.5, 30)); tp(364.5, 20, 362); jump(); },
    j1: () => { start(1); tp(44, 34, 46); walk(41.2); },
    j2: () => { start(1); tp(157, 22, 156); walk(160.4); },
    j3: () => { start(1); game.door.opening = true; game.door.passed = true; tp(234.6, 22, 226); walk(235.3); jump(1); jump(-1, 16); walk(233.5); },
    // ---- chapter 2
    c2f1: () => { start(2); tp(37.4, 24, 35); jump(); },
    c2f2: () => { start(2); tp(92.4, 20, 84, 24); jump(); },
    c2f3: () => { start(2); tp(126.4, 27, 124); jump(); },
    c2f4: () => { start(2); tp(150.5, 27, 155.8); run(40); jump(-1, 16); walk(149); jump(-1, 16); walk(147.5); },
    c2f5: () => { start(2); tp(262.4, 24, 260); jump(); },
    c2j1: () => { start(2); tp(93, 24, 92); walk(96.4); },
    c2j2: () => { start(2); tp(229.5, 27, 227); walk(230.6); jump(1); walk(232.4); jump(); },
    c2j3: () => { start(2); tp(257.4, 24, 255); jump(); },
    // ---- chapter 3
    c3f1: () => { start(3); tp(7.5, 30, 10); jump(-1, 16); walk(2.6); walk(3.4); jump(1, 16); walk(4.6); jump(1, 16); walk(7); if (tile(H().x) < 6) throw new Error('stuck in the yard'); },
    c3j1: () => { start(3); lampOn('L1', 91.5, 28); tp(95, 28, 91.5); run(20); jump(0, 16); walk(95.4); jump(1, 16); walk(97.5); },
    c3f2: () => { start(3); tp(136.4, 23, 135); hop(137.6); hop(139.8); hop(142); },
    c3f3: () => { start(3); tp(233.4, 36, 231, 32); hop(235.5); hop(237.5); hop(239.5); },
    c3j2: () => { start(3); tp(233.4, 36, 231, 32); for (const x of [235.5, 237.5, 239.5, 241.5, 243.5, 245.6]) hop(x); walk(246.5); },
    c3f4: () => { start(3); lampOn('L2', 250.5, 30); tp(244.5, 30, 250.5); jump(-1, 16); walk(242.6); jump(-1, 16); walk(241.6); jump(-1, 16); walk(239.4); },
    c3j3: () => { start(3); tp(303.4, 27, 299, 30); jump(); },
    c3f5: () => { start(3, esc(321.5, 22)); tp(400.5, 20, 398.5); jump(); },
  };
  const out = [];
  for (const id in tests) {
    if (only && !only.includes(id)) continue;
    let res;
    try { tests[id](); res = got(id) ? 'ok' : 'NOT COLLECTED'; } catch (e) { res = 'ERR ' + e.message; }
    out.push(`${id}: ${res}  (hero ${tile(H().x).toFixed(1)},${tile(H().y).toFixed(1)})`);
  }
  return out.join('\n');
};
