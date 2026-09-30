"""消灯番 (town guard) sprites.

assets/chars/guard/walk_run_sheet.webp (8 x 10 grid, the first cell unusable): standing,
starting to walk, walking, breaking into a run, running. Used for idle (standing), walk
(one 15-frame stride, 22-36) and run (one 8-frame stride, 55-62). The painted ground
shadow is taken off. All these frames share one scale.
assets/chars/guard/sheet.webp (the older sheet: a big portrait on the left and labelled
rows) still gives the alert pose. Its frames are cut at even spacing and only the biggest
blob kept.
Facing right; the game mirrors for left.
"""
import os
from collections import deque
import numpy as np
from PIL import Image
from pixlib import outline

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "assets", "chars", "guard", "sheet.webp")
SRC2 = os.path.join(ROOT, "assets", "chars", "guard", "walk_run_sheet.webp")
GRID = (8, 10)
NEW = {"idle": [1, 3, 5, 7], "walk": list(range(22, 37)), "run": list(range(55, 63))}
BODY_H = 50                         # hood to boots in game px (Grey is 46)
PAL_N = 22

# (name, y0, y1, x boundaries)
ROWS = [
    ("alert", 410, 668, [1140, 1296, 1470]),
]


def biggest_blob(m):
    h, w = m.shape
    seen = np.zeros_like(m)
    best = []
    for sy in range(0, h, 2):
        for sx in range(0, w, 2):
            if m[sy, sx] and not seen[sy, sx]:
                blob, q = [], deque([(sy, sx)]); seen[sy, sx] = True
                while q:
                    y, x = q.popleft(); blob.append((y, x))
                    for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                        ny, nx = y + dy, x + dx
                        if 0 <= ny < h and 0 <= nx < w and m[ny, nx] and not seen[ny, nx]:
                            seen[ny, nx] = True; q.append((ny, nx))
                if len(blob) > len(best):
                    best = blob
    out = np.zeros_like(m)
    ys, xs = zip(*best)
    out[list(ys), list(xs)] = True
    return out


def cells():
    a = np.array(Image.open(SRC).convert("RGBA"))
    out = []
    for name, y0, y1, xs in ROWS:
        for i in range(len(xs) - 1):
            c = a[y0:y1, int(xs[i]):int(xs[i + 1])].copy()
            keep = biggest_blob(c[..., 3] > 100)
            # grow the kept mask by a pixel so antialiased edges stay
            g = keep.copy()
            g[1:] |= keep[:-1]; g[:-1] |= keep[1:]; g[:, 1:] |= keep[:, :-1]; g[:, :-1] |= keep[:, 1:]
            c[~g] = 0
            out.append((f"{name}{i}", c))
    return out


def new_cells():
    a = np.array(Image.open(SRC2).convert("RGBA"))
    H, W = a.shape[:2]
    cw, ch = W / GRID[0], H / GRID[1]
    out = []
    for name, idx in NEW.items():
        for i, k in enumerate(idx):
            cx, cy = k % GRID[0], k // GRID[0]
            x0, x1 = max(0, int(cx * cw) - 30), min(W, int((cx + 1) * cw) + 30)      # capes reach over the lines
            c = a[int(cy * ch):int((cy + 1) * ch), x0:x1].copy()
            keep = biggest_blob(c[..., 3] > 60)
            c[~keep] = 0
            # the painted ground shadow: pale grey in the last rows (the boots are dark)
            ys = np.nonzero(keep.any(1))[0]
            bot = ys.max()
            rgb = c[..., :3].astype(int)
            pale = (rgb.mean(-1) > 88) & (rgb.max(-1) - rgb.min(-1) < 14)
            rows = np.arange(c.shape[0])[:, None] >= bot - 7
            c[pale & rows] = 0
            c[c[..., 3] < 100] = 0
            out.append((f"{name}{i}", c, "new"))
    return out


def body_box(c):
    ys, xs = np.nonzero(c[..., 3] > 110)
    return xs.min(), ys.min(), xs.max() + 1, ys.max() + 1


def frames():
    cs = [(n, c, n.rstrip('0123456789')) for n, c in cells()] + new_cells()
    # scale from the walk frames: hood top is the top of the dark cloak mass (the pole is thin)
    def hood_top(c):
        m = c[..., 3] > 110
        wide = m.sum(1) > 12
        return int(np.argmax(wide))
    # each row was drawn at its own size: scale every row to the same body height
    # (the new sheet at one scale, from its walking frames)
    rowk = {}
    for g in {g for _, _, g in cs}:
        hs = [body_box(c)[3] - hood_top(c) for n, c, g2 in cs if g2 == g and (g != "new" or n.startswith("walk"))]
        rowk[g] = BODY_H / np.median(hs)
    small = {}
    for n, c, g in cs:
        k = rowk[g]
        x0, y0, x1, y1 = body_box(c)
        crop = Image.fromarray(c[y0:y1, x0:x1])
        sm = np.array(crop.resize((max(1, round((x1 - x0) * k)), max(1, round((y1 - y0) * k))), Image.BOX)).astype(np.float32)
        m = c[..., 3] > 110
        ys, xs = np.nonzero(m)
        top, bot = ys.min(), ys.max()
        band = (ys > top + (bot - top) * 0.4) & (ys < top + (bot - top) * 0.65)
        ax = (np.median(xs[band]) - x0) * k
        small[n] = (sm, ax)
    # one palette for all frames
    pix = np.concatenate([sm[..., :3][sm[..., 3] >= 110] for sm, _ in small.values()]).astype(np.uint8)
    q = Image.fromarray(pix.reshape(1, -1, 3), "RGB").quantize(colors=PAL_N, method=Image.Quantize.MEDIANCUT, kmeans=4)
    pal = np.array(q.getpalette()[:PAL_N * 3]).reshape(-1, 3).astype(np.float32)
    out = {}
    for n, (sm, ax) in small.items():
        rgb, a = sm[..., :3], sm[..., 3] >= 110
        d = ((rgb[:, :, None, :] - pal[None, None]) ** 2).sum(-1)
        arr = np.zeros(sm.shape[:2] + (4,), np.uint8)
        arr[..., :3] = pal[d.argmin(-1)].astype(np.uint8)
        arr[..., 3] = np.where(a, 255, 0)
        o = outline(arr)
        out[n] = (o, int(round(ax)) + 1, o.shape[0] - 2)
    return out


if __name__ == "__main__":
    F = frames()
    W = sum(v[0].shape[1] + 4 for v in F.values())
    H = max(v[0].shape[0] for v in F.values()) + 4
    im = Image.new("RGBA", (W, H), (90, 90, 110, 255))
    x = 2
    for n, (a, ax, ay) in F.items():
        im.alpha_composite(Image.fromarray(a), (x, H - 2 - a.shape[0]))
        im.putpixel((x + ax, H - 1), (0, 255, 0, 255))
        x += a.shape[1] + 4
    im.resize((W * 4, H * 4), Image.NEAREST).save(os.path.join(os.environ.get("OUT", "."), "guard_frames.png"))
    print({n: v[0].shape for n, v in F.items()})
