"""Chapter 5 (影の谷): blue-grey valley rock, lichen edges, cave walls, the wall of
shadow plays, and the twilight backdrop (the lit tower far off, its long shadow)."""
import numpy as np
from pixlib import SS, snap, outline, rgba

OUT = (16, 14, 24)
ROCK = [(40, 40, 58), (58, 58, 80), (78, 80, 104), (104, 108, 132)]
LICHEN = [(52, 70, 70), (78, 104, 92), (130, 150, 120)]
CAVE = [(20, 18, 32), (28, 26, 42), (36, 34, 52)]
SHADOW = [(14, 10, 24), (32, 22, 52), (60, 44, 96)]


def col(c, a=255):
    return np.array([*c, a], np.uint8)


def rock(seed):
    """Layered valley rock with a few slanted cracks."""
    r = np.random.default_rng(900 + seed)
    t = rgba(16, 16)
    t[:] = col(ROCK[1])
    n = r.random((16, 16))
    t[n < 0.16] = col(ROCK[0])
    t[n > 0.88] = col(ROCK[2])
    # strata
    y = int(r.integers(3, 12))
    t[y, :] = col(ROCK[0]); t[y - 1, ::3] = col(ROCK[2])
    if seed % 2:
        x, yy = int(r.integers(2, 12)), int(r.integers(1, 8))
        for k in range(5):
            if 0 <= yy + k < 16 and 0 <= x + k // 2 < 16:
                t[yy + k, x + k // 2] = col(ROCK[0])
    if seed == 3:
        t[9:12, 4:9] = col(ROCK[3]); t[9, 4:9] = col((140, 146, 170))
    return t


def lichen_top(seed):
    """Overlay for rock with open air above: a pale crust of lichen."""
    r = np.random.default_rng(950 + seed)
    t = rgba(16, 16)
    for x in range(16):
        h = int(r.integers(1, 4))
        for y in range(h):
            t[y, x] = col(LICHEN[1] if y == 0 else LICHEN[0])
        if r.random() < 0.25:
            t[0, x] = col(LICHEN[2])
    return t


def cave_back(seed):
    r = np.random.default_rng(980 + seed)
    t = rgba(16, 16)
    t[:] = col(CAVE[1])
    n = r.random((16, 16))
    t[n < 0.22] = col(CAVE[0])
    t[n > 0.92] = col(CAVE[2])
    return t


def play_wall(seed):
    """The cave where she made shadow plays: smooth pale wall, softly lit."""
    r = np.random.default_rng(990 + seed)
    t = rgba(16, 16)
    t[:] = col((64, 58, 74))
    n = r.random((16, 16))
    t[n < 0.12] = col((56, 50, 66))
    t[n > 0.95] = col((74, 68, 84))
    return t


def shadow_hut():
    """A little hut made of shadow (48x40), for the shadow children's village."""
    c = SS(48, 40, ss=4)
    body = SHADOW[1] + (230,)
    c.poly([(4, 40), (4, 18), (24, 4), (44, 18), (44, 40)], body)
    c.rect(18, 26, 12, 14, SHADOW[0] + (255,))
    c.circle(34, 22, 3, (200, 190, 120, 255))       # a round window, warm
    a = c.down()
    return a


def laundry():
    """Shadow washing on a line (48x16)."""
    t = rgba(48, 16)
    t[1, :] = col((70, 60, 90))
    for x0, w, h in ((4, 8, 9), (16, 6, 12), (26, 10, 8), (38, 7, 11)):
        t[2:2 + h, x0:x0 + w] = col(SHADOW[1], 220)
        t[2 + h - 1, x0:x0 + w:2] = col(SHADOW[0], 220)
    return t


def twilight_sky(h=216):
    stops = [(0.0, (22, 16, 44)), (0.5, (56, 40, 84)), (0.8, (104, 72, 112)), (1.0, (140, 104, 128))]
    t = rgba(1, h)
    for y in range(h):
        k = y / (h - 1)
        for (k0, c0), (k1, c1) in zip(stops, stops[1:]):
            if k0 <= k <= k1:
                f = (k - k0) / (k1 - k0)
                t[y, 0] = col(tuple(int(c0[i] + (c1[i] - c0[i]) * f) for i in range(3)))
                break
    return t


def far_tower():
    """Far layer: the valley rim, the tower with its great lamp lit, and its long shadow."""
    w, h = 384, 216
    t = rgba(w, h)
    r = np.random.default_rng(31)
    for _ in range(30):
        x, y = int(r.integers(0, w)), int(r.integers(0, 80))
        t[y, x] = col((190, 180, 220))
    c = SS(w, h, ss=2)
    base = (48, 38, 70, 255)
    c.poly([(0, 216), (0, 120), (60, 104), (140, 128), (230, 110), (300, 124), (384, 100), (384, 216)], base)
    c.rect(52, 40, 14, 70, base); c.poly([(48, 40), (70, 40), (59, 26)], base)
    a = c.down()
    t[a[..., 3] > 128] = col(base[:3])
    # the lamp at the top of the tower, and the band of its shadow across the valley
    t[34:38, 57:61] = col((255, 230, 160)); t[35:37, 56:62] = col((255, 210, 130))
    for x in range(66, w):
        y0 = 108 + int((x - 66) * 0.12)
        t[y0:y0 + 6, x] = col((30, 22, 46))
    return t


def cliffs():
    """Mid layer: steep valley walls either side, tileable."""
    w, h = 256, 216
    c = SS(w, h, ss=2)
    base = (26, 22, 40, 255)
    r = np.random.default_rng(12)
    x = 0
    pts = [(0, 216)]
    while x <= w:
        pts.append((x, int(r.integers(120, 176))))
        x += int(r.integers(10, 24))
    pts[-1] = (w, pts[1][1])
    pts.append((w, 216))
    c.poly(pts, base)
    a = c.down()
    t = rgba(w, h)
    t[a[..., 3] > 128] = col(base[:3])
    return t


def all_items():
    items = {}
    for i in range(4):
        items[f"vrock{i}"] = rock(i)
        items[f"vtop{i}"] = lichen_top(i)
        items[f"vcave{i}"] = cave_back(i)
        items[f"vplay{i}"] = play_wall(i)
    items["shut"] = shadow_hut()
    items["slaundry"] = laundry()
    return items


if __name__ == "__main__":
    import os
    from PIL import Image
    from pixlib import Atlas
    at = Atlas(256)
    for k, v in all_items().items():
        at.add(k, v)
    im, _ = at.build()
    bg = Image.new("RGBA", im.size, (90, 90, 110, 255)); bg.alpha_composite(im)
    out = os.environ.get("OUT", os.path.dirname(__file__))
    bg.resize((im.width * 4, im.height * 4), Image.NEAREST).save(os.path.join(out, "valley_tiles.png"))
    s = Image.fromarray(twilight_sky(), "RGBA").resize((384, 216))
    s.alpha_composite(Image.fromarray(far_tower(), "RGBA"))
    s.alpha_composite(Image.fromarray(cliffs(), "RGBA"), (0, 0))
    s.resize((768, 432), Image.NEAREST).save(os.path.join(out, "valley_bg.png"))
