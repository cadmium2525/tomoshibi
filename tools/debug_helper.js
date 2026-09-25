// paste into the browser console (or load with ?debug) to drive the game frame by frame
window.T = {
  run(frames, keys = [], taps = []) {
    if (game.state === 'title') game.startNew();
    if (game.state === 'cutscene') game.finishPrologue();     // tests start right after the prologue
    for (let i = 0; i < frames; i++) {
      Input.keys.clear(); keys.forEach((k) => Input.keys.add(k));
      if (i === 0) taps.forEach((k) => Input.taps.add(k));
      Input.poll(); game.update();
    }
    Input.keys.clear(); game.render(); return T.st();
  },
  st() {
    const g = game, h = g.hero, y = g.heroine, f = (v) => +(v / 16).toFixed(2);
    return { hx: f(h.x), hy: f(h.y), hs: h.state, hf: h.facing, yx: f(y.x), yy: f(y.y), ys: y.state, ym: y.mode, an: y.anim,
      stuck: y.stuckT, sh: g.shadows.map((s) => s.state + ':' + f(s.x)).join(','), st: g.state, danger: g.dangerT,
      gates: g.gates.map((x) => x.open.toFixed(2)).join(','), plates: g.plates.map((p) => +p.pressed).join('') };
  },
  tp(tx, ty, htx) {
    const g = game; g.hero.x = tx * 16 + 8; g.hero.y = ty * 16; g.hero.vx = g.hero.vy = 0; g.hero.setState('normal');
    if (htx !== undefined) { g.heroine.x = htx * 16 + 8; g.heroine.y = ty * 16; g.heroine.setState('normal'); g.heroine.vx = 0; }
    g.hero.checkGround(g.world); g.heroine.checkGround(g.world); g.updateCamera(true); return T.st();
  },
};
// save the current canvas frame to tools/_shot_<name>.png (needs tools/devserver.py)
T.shot = (name = 'shot') => { game.render(); return fetch('/shot?name=' + name, { method: 'POST', body: game.cv.toDataURL() }).then((r) => r.text()); };
