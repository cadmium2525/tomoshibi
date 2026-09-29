// PV footage recorder (load into index.html?debug served by tools/pv/pvserver.py, after
// tools/debug_helper.js). Every game update is hooked: while a watch's condition holds,
// every 2nd frame (30 fps) is drawn and sent to pv/footage/<clip>/NNNNN.png.
//   REC.watch('ch1_escape', () => game.escape, 900)   // up to 900 frames (30 s)
//   ...run an autoplay...; await REC.done()
window.REC = {
  watches: [], pending: [], n: 0,
  watch(name, cond, max = 600, gap = 45) { this.watches.push({ name, cond, max, gap, got: 0, seg: 0, idle: 999, buf: [], start: 0, clip: null }); },
  clear() { this.watches = []; },
  hook() {
    if (game.__rec) return;
    const up = game.update.bind(game);
    game.update = () => { up(); this.tick(); };
    game.__rec = true;
  },
  tick() {
    this.n++;
    if (this.n % 2) return;
    let drawn = null;
    for (const w of this.watches) {
      let ok = false;
      try { ok = w.got < w.max && w.cond(); } catch (e) { ok = false; }
      if (!ok) { if (++w.idle === w.gap) this.flush(w); continue; }
      if (w.idle >= w.gap || !w.clip) { this.flush(w); w.seg++; w.clip = `${w.name}_${w.seg}`; w.start = 0; }
      w.idle = 0;
      if (!drawn) { game.render(); drawn = document.getElementById('screen').toDataURL('image/png'); }
      w.buf.push(drawn); w.got++;
      if (w.buf.length >= 60) this.flush(w);
    }
  },
  flush(w) {
    if (!w.buf.length) return;
    const body = JSON.stringify({ start: w.start, frames: w.buf });
    w.start += w.buf.length; w.buf = [];
    this.pending.push(fetch('/pv/frames?clip=' + encodeURIComponent(w.clip), { method: 'POST', body }));
  },
  async done() { for (const w of this.watches) this.flush(w); await Promise.all(this.pending); this.pending = []; return this.watches.map((w) => `${w.name}: ${w.got}f/${w.seg}seg`); },
};
