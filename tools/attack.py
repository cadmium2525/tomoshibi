"""Grey's attack motion (assets/chars/oldman/attack_sheet.webp, 9x6 cells, 51 frames).

The painted sheet has a huge flame arc, a white glow around it and a grey
ground shadow. Here those are stripped away (the game draws its own small
ember and trail at the pole tip), leaving Grey and his pole, and the pole tip
of every frame is located so the game knows where to put the ember.
"""
import os
from collections import deque
import numpy as np
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "assets", "chars", "oldman", "attack_sheet.webp")
COLS, ROWS, COUNT = 9, 6, 51
# frames used in the game: wind-up, raise, overhead, swing down, thrust, recover
PICK = [0, 8, 10, 12, 13, 15, 16, 38, 40, 45, 50]


def cells():
    im = Image.open(SRC).convert("RGBA")
    W, H = im.size
    out = []
    for i in range(COUNT):
        c, r = i % COLS, i // COLS
        box = (round(c * W / COLS), round(r * H / ROWS), round((c + 1) * W / COLS), round((r + 1) * H / ROWS))
        out.append(im.crop(box))
    return out


def clean(cell):
    """-> (rgba array with flame/glow/shadow removed, flame mask)."""
    a = np.array(cell).astype(np.int32)
    rgb, al = a[..., :3], a[..., 3]
    mx, mn = rgb.max(-1), rgb.min(-1)
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    clear = al < 110
    neutral = (mn > 140) & (mx - mn < 45)                  # white glow, grey ground shadow
    sat = (mx - mn) / np.maximum(mx, 1)
    flame = (mx > 200) & (sat > 0.5) & (r - b > 110) & (r >= g)   # orange / yellow fire (skin is paler)
    core = (mn > 200) & (r >= b)                           # white-hot flame centre
    soft = clear | neutral | flame | core
    # flood from the transparent background through everything "soft";
    # the dark outline of Grey stops it, so light bits inside him (collar, hair) survive
    h, w = al.shape
    gone = np.zeros((h, w), bool)
    q = deque()
    for y in range(h):
        for x in (0, w - 1):
            if soft[y, x] and not gone[y, x]:
                gone[y, x] = True; q.append((y, x))
    for x in range(w):
        for y in (0, h - 1):
            if soft[y, x] and not gone[y, x]:
                gone[y, x] = True; q.append((y, x))
    while q:
        y, x = q.popleft()
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            ny, nx = y + dy, x + dx
            if 0 <= ny < h and 0 <= nx < w and soft[ny, nx] and not gone[ny, nx]:
                gone[ny, nx] = True; q.append((ny, nx))
    # warm pixels still left (flame painted over Grey) go too
    fire = flame & ~clear
    gone |= fire
    out = a.copy()
    out[gone, 3] = 0
    # thin wisps (the dark rim of the flame) are cut off by an opening,
    # then only the biggest piece - Grey and his pole - is kept
    solid = out[..., 3] >= 110
    body = dilate(erode(solid, 1), 1) & solid
    keep = largest_blob(body)
    keep = dilate(keep, 1) & solid
    out[~keep, 3] = 0
    return out.astype(np.uint8), fire


def erode(m, n):
    for _ in range(n):
        e = m.copy()
        e[1:] &= m[:-1]; e[:-1] &= m[1:]; e[:, 1:] &= m[:, :-1]; e[:, :-1] &= m[:, 1:]
        e[1:, 1:] &= m[:-1, :-1]; e[:-1, :-1] &= m[1:, 1:]; e[1:, :-1] &= m[:-1, 1:]; e[:-1, 1:] &= m[1:, :-1]
        m = e
    return m


def dilate(m, n):
    return ~erode(~m, n)


def largest_blob(m):
    h, w = m.shape
    lab = np.zeros((h, w), np.int32)
    best, best_n, n = 0, 0, 0
    for sy in range(h):
        for sx in range(w):
            if m[sy, sx] and not lab[sy, sx]:
                n += 1; cnt = 0
                q = deque([(sy, sx)]); lab[sy, sx] = n
                while q:
                    y, x = q.popleft(); cnt += 1
                    for dy in (-1, 0, 1):
                        for dx in (-1, 0, 1):
                            ny, nx = y + dy, x + dx
                            if 0 <= ny < h and 0 <= nx < w and m[ny, nx] and not lab[ny, nx]:
                                lab[ny, nx] = n; q.append((ny, nx))
                if cnt > best_n:
                    best, best_n = n, cnt
    return lab == best


def tip(rgba, fire):
    """Pole tip: the part of Grey touching the fire that is farthest from his chest."""
    body = rgba[..., 3] >= 110
    ys, xs = np.nonzero(body)
    top, bot = ys.min(), ys.max()
    band = (ys > top + (bot - top) * 0.25) & (ys < top + (bot - top) * 0.5)
    cx, cy = np.median(xs[band]), top + (bot - top) * 0.38
    f = fire.copy()
    for _ in range(3):   # grow the fire a little so it reaches the brass cap
        g = f.copy()
        g[1:] |= f[:-1]; g[:-1] |= f[1:]; g[:, 1:] |= f[:, :-1]; g[:, :-1] |= f[:, 1:]
        f = g
    ty, tx = np.nonzero(body & f)
    if len(tx) == 0:
        return None
    d = (tx - cx) ** 2 + (ty - cy) ** 2
    k = d.argmax()
    return float(tx[k]), float(ty[k])


if __name__ == "__main__":
    # contact sheet for checking: cleaned frames over a dark background, tip marked
    out = Image.new("RGBA", (COLS * 125, ROWS * 133), (40, 30, 60, 255))
    for i, c in enumerate(cells()):
        if i not in PICK:
            continue
        rgba, fire = clean(c)
        im = Image.fromarray(rgba)
        t = tip(rgba, fire)
        if t:
            for dx in range(-2, 3):
                for p in ((int(t[0]) + dx, int(t[1])), (int(t[0]), int(t[1]) + dx)):
                    if 0 <= p[0] < im.width and 0 <= p[1] < im.height:
                        im.putpixel(p, (0, 255, 0, 255))
        out.alpha_composite(im, ((i % COLS) * 125, (i // COLS) * 133))
    out.save(os.path.join(os.environ.get("OUT", "."), "attack_clean.png"))
