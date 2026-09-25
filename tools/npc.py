"""Cutscene characters (queen Noctia, sister Marta) from their standing
illustrations in assets/chars/<name>/front.png.

Both face the viewer, SFC-style. Each gets a still frame and a breathing
frame; the spot of their lantern is exported so the game can light it.
"""
import os
import numpy as np
from PIL import Image
from pixlib import outline

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# name -> figure height in game px (Grey is 46, Lumina 36), lantern spot in the painting
CHARS = {
    "queen": dict(h=48, lamp=(505, 945), colors=24, eyes=[(480, 252), (545, 252)], eye=(38, 44, 96),
                  keep=[((400, 60, 620, 190), 0.08)], crown=(510, 100)),
    "marta": dict(h=40, lamp=(510, 612), colors=20, eyes=[(452, 286), (563, 283)], eye=(56, 32, 24), keep=[]),
}


def _small(name):
    """Shrink by taking the most common palette colour of every block (keeps
    the painting's flat colours crisp instead of averaging them to mud)."""
    c = CHARS[name]
    im = Image.open(os.path.join(ROOT, "assets", "chars", name, "front.png")).convert("RGBA")
    a = np.array(im)
    a[a[..., 3] < 110] = 0
    rows = np.nonzero((a[..., 3] > 0).sum(1) >= 4)[0]       # ignore stray specks
    cols = np.nonzero((a[..., 3] > 0).sum(0) >= 4)[0]
    x0, y0, x1, y1 = cols.min(), rows.min(), cols.max() + 1, rows.max() + 1
    a = a[y0:y1, x0:x1]
    k = c["h"] / (y1 - y0)
    pal = _palette(a.astype(np.float32), c["colors"])
    idx = _nearest(a[..., :3].astype(np.float32), pal)
    idx[a[..., 3] == 0] = -1
    ink = [i for i, col in enumerate(pal) if max(col) < 40]
    w, h = round((x1 - x0) * k), c["h"]
    out = np.zeros((h, w, 4), np.uint8)
    for ty in range(h):
        for tx in range(w):
            blk = idx[int(ty / k):max(int(ty / k) + 1, int((ty + 1) / k)), int(tx / k):max(int(tx / k) + 1, int((tx + 1) / k))]
            v, n = np.unique(blk, return_counts=True)
            sx, sy = x0 + tx / k, y0 + ty / k
            inkeep = any(b[0] <= sx < b[2] and b[1] <= sy < b[3] for b, _ in c["keep"])
            if (blk >= 0).mean() < (0.25 if inkeep else 0.45):
                continue
            n = np.where(v >= 0, n, 0).astype(np.float32)
            # the painting's thick black line art would swallow small details;
            # our own 1px outline replaces it, so it only wins when it clearly dominates
            n = np.where(np.isin(v, ink), n * 0.45, n)
            pick = v[n.argmax()]
            # inside a detail box, gold wins even as a minority of the block
            for (bx0, by0, bx1, by1), share in c["keep"]:
                if bx0 <= sx < bx1 and by0 <= sy < by1:
                    g = [(cnt, i) for i, cnt in zip(v, n) if i >= 0 and _gold(pal[i])]
                    if g and max(g)[0] >= share * blk.size:
                        pick = max(g)[1]
            out[ty, tx, :3] = pal[pick]
            out[ty, tx, 3] = 255
    if "crown" in c:
        # the tiara is too fine to survive the shrink: set it by hand
        cx, cy = int((c["crown"][0] - x0) * k), max(1, int((c["crown"][1] - y0) * k))
        gold, lite, gem = (214, 168, 74), (250, 222, 140), (60, 80, 200)
        for dx in (-3, 0, 3):
            out[cy - 1, cx + dx] = (*lite, 255)
        for dx in range(-3, 4):
            out[cy, cx + dx] = (*gold, 255)
        out[cy, cx] = (*gem, 255)
    # both eyes on one row (a pixel of difference reads as a lopsided face)
    ey = int((sum(e[1] for e in c["eyes"]) / len(c["eyes"]) - y0) * k)
    for ex, _ in c["eyes"]:
        out[ey, int((ex - x0) * k), :3] = c["eye"]
    lamp = ((c["lamp"][0] - x0) * k, (c["lamp"][1] - y0) * k)
    return out, lamp


def _gold(col):
    r, g, b = col
    return r > 110 and g > b and r - b > 40


def _nearest(rgb, pal):
    p = np.array(pal, np.float32)
    best = np.zeros(rgb.shape[:2], np.int32)
    bd = np.full(rgb.shape[:2], 1e18, np.float32)
    for i, col in enumerate(p):
        d = ((rgb - col) ** 2).sum(-1)
        m = d < bd
        bd[m] = d[m]; best[m] = i
    return best


def _palette(sm, n):
    pix = sm[..., :3][sm[..., 3] >= 110].astype(np.uint8)[::7]
    q = Image.fromarray(pix.reshape(1, -1, 3), "RGB").quantize(colors=n, method=Image.Quantize.MEDIANCUT, kmeans=4)
    return [tuple(c) for c in np.array(q.getpalette()[: n * 3]).reshape(-1, 3)]


def _breathe(arr, chest_y):
    """Breathing frame: everything above the chest line sinks by one pixel."""
    out = arr.copy()
    out[1:chest_y + 1] = arr[0:chest_y]
    out[0] = 0
    return out


def items():
    """name -> (rgba, ax, ay) with the feet anchor at the bottom centre; plus lamp offsets."""
    out, lamps = {}, {}
    for name, c in CHARS.items():
        px, lamp = _small(name)
        for i, fr in enumerate((px, _breathe(px, round(c["h"] * 0.38)))):
            o = outline(fr)
            ax, ay = o.shape[1] // 2, o.shape[0] - 1
            out[f"{name}{i}"] = (o, ax, ay)
        # lantern spot relative to the feet anchor (outline adds 1px)
        lamps[name] = [round(lamp[0] + 1 - ax, 1), round(lamp[1] + 1 - ay, 1)]
    return out, lamps


if __name__ == "__main__":
    it, lamps = items()
    W = sum(v[0].shape[1] + 8 for v in it.values())
    sheet = Image.new("RGBA", (W, 60), (40, 30, 60, 255))
    x = 4
    for k, (a, ax, ay) in it.items():
        sheet.alpha_composite(Image.fromarray(a), (x, 56 - ay))
        lx, ly = lamps[k[:-1]]
        sheet.putpixel((int(x + ax + lx), int(56 + ly)), (0, 255, 0, 255))
        x += a.shape[1] + 8
    sheet.resize((W * 5, 300), Image.NEAREST).save(os.path.join(os.environ.get("OUT", "."), "npc.png"))
    print(lamps)
