// PV captions, drawn in the game's pixel font at the game's own resolution (384x216 for
// 16:9, 216x384 for 9:16) with hard pixel edges and a dark rim; saved to pv/stills/<name>.png
// by tools/pv/pvserver.py and scaled x5 (nearest) by tools/pv/compose.py.
// lines: [text, size (16 | 32), colour]; y: 'low' | 'mid' | 'top' | number (top of the block)
window.PVCAP = {
  async make(name, lines, { w = 384, h = 216, y = 'low', gap = 4 } = {}) {
    await document.fonts.load('16px DotGothic16'); await document.fonts.load('32px DotGothic16');
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const g = c.getContext('2d');
    const total = lines.reduce((s, l) => s + (l[1] || 16), 0) + gap * (lines.length - 1);
    let top = y === 'low' ? h - 22 - total : y === 'mid' ? Math.round((h - total) / 2) : y === 'top' ? 14 : y;
    // the letters: solid, no half-tones
    const t = document.createElement('canvas'); t.width = w; t.height = h;
    const tg = t.getContext('2d');
    tg.textAlign = 'center'; tg.textBaseline = 'top';
    for (const [text, size = 16, col = '#fff4d8'] of lines) {
      tg.font = `${size}px DotGothic16`; tg.fillStyle = col;
      tg.fillText(text, Math.round(w / 2), top);
      top += size + gap;
    }
    const d = tg.getImageData(0, 0, w, h), p = d.data;
    for (let i = 0; i < p.length; i += 4) p[i + 3] = p[i + 3] > 100 ? 255 : 0;
    // a dark rim (8 neighbours) and a soft drop shadow under it
    const out = g.createImageData(w, h), o = out.data;
    const on = (x, y) => x >= 0 && y >= 0 && x < w && y < h && p[(y * w + x) * 4 + 3];
    for (let y2 = 0; y2 < h; y2++) for (let x = 0; x < w; x++) {
      const i = (y2 * w + x) * 4;
      if (p[i + 3]) { o[i] = p[i]; o[i + 1] = p[i + 1]; o[i + 2] = p[i + 2]; o[i + 3] = 255; continue; }
      let rim = false;
      for (let dy = -1; dy <= 1 && !rim; dy++) for (let dx = -1; dx <= 1; dx++) if (on(x + dx, y2 + dy)) { rim = true; break; }
      if (rim) { o[i] = 12; o[i + 1] = 8; o[i + 2] = 22; o[i + 3] = 255; }
      else if (on(x - 2, y2 - 2) || on(x - 1, y2 - 2) || on(x - 2, y2 - 1)) { o[i] = 12; o[i + 1] = 8; o[i + 2] = 22; o[i + 3] = 150; }
    }
    g.putImageData(out, 0, 0);
    await fetch('/pv/still?name=' + encodeURIComponent(name), { method: 'POST', body: c.toDataURL('image/png') });
    return name;
  },
};
