"""消灯番 (town guard) sprites from assets/chars/guard/sheet.webp.

The generated sheet has a big portrait on the left and four labelled rows:
walk (9 drawn), idle (4), alert (2), run (6). Neighbouring frames overlap a
little, so every frame is cut at even spacing and only its biggest blob kept.
Facing right; the game mirrors for left.
"""
import os
from collections import deque
import numpy as np
from PIL import Image
from pixlib import outline

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "assets", "chars", "guard", "sheet.webp")
BODY_H = 50                         # hood to boots in game px (Grey is 46)
PAL_N = 22

# (name, y0, y1, x boundaries)
ROWS = [
    ("walk", 88, 320, np.linspace(540, 1510, 10)),
    ("idle", 410, 668, [548, 680, 812, 948, 1082]),
    ("alert", 410, 668, [1140, 1296, 1470]),
    ("run", 750, 986, np.linspace(518, 1498, 7)),
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


def body_box(c):
    ys, xs = np.nonzero(c[..., 3] > 110)
    return xs.min(), ys.min(), xs.max() + 1, ys.max() + 1


def frames():
    cs = cells()
    # scale from the walk frames: hood top is the top of the dark cloak mass (the pole is thin)
    def hood_top(c):
        m = c[..., 3] > 110
        wide = m.sum(1) > 12
        return int(np.argmax(wide))
    # each row was drawn at its own size: scale every row to the same body height
    rowk = {}
    for name, *_ in ROWS:
        hs = [body_box(c)[3] - hood_top(c) for n, c in cs if n.rstrip('0123456789') == name]
        rowk[name] = BODY_H / np.median(hs)
    small = {}
    for n, c in cs:
        k = rowk[n.rstrip('0123456789')]
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
