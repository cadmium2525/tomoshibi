"""Chapter 4 (灯守りの塔): warm stone and brass tiles, mirrors, pedestals, receptors,
lifts, gears, the great lamp, bookshelves and the dusk backdrop."""
import math
import numpy as np
from pixlib import SS, snap, outline, rgba
from tiles import brick_tile

OUT = (22, 16, 18)
STONE = [(40, 32, 34), (70, 58, 56), (96, 82, 76), (122, 106, 96), (150, 134, 120)]
BACK = [(22, 18, 24), (36, 30, 36), (46, 38, 44), (56, 48, 52)]
BRASS = [(70, 46, 22), (130, 92, 40), (190, 146, 64), (240, 206, 120)]
GLASS = [(40, 60, 80), (120, 170, 200), (230, 250, 255)]
WOOD = [(40, 26, 22), (70, 46, 34), (100, 70, 48)]
BOOKS = [(90, 40, 40), (50, 70, 90), (70, 90, 50), (120, 96, 50), (80, 60, 90)]


def col(c, a=255):
    return np.array([*c, a], np.uint8)


def top_trim(seed):
    """Floor edge: a thin brass rail on the stone."""
    t = rgba(16, 16)
    t[0, :] = col(STONE[4]); t[1, :] = col(STONE[3])
    if seed % 2 == 0:
        t[2, :] = col(BRASS[1]); t[2, ::4] = col(BRASS[2])
    return t


def pipe_wall(seed):
    """Back wall with a brass pipe now and then."""
    t = brick_tile(600 + seed, [BACK[0], BACK[1], BACK[2], BACK[3]], big=seed % 3 == 0)
    if seed == 1:
        t[:, 6:10] = col(BRASS[1]); t[:, 6] = col(BRASS[0]); t[:, 8] = col(BRASS[2])
        t[5:7, 5:11] = col(BRASS[0])
    return t


def mirror(kind):
    """16x16 mirror on a brass stand. kind 0 = '/', 1 = '\\'."""
    c = SS(16, 16, ss=4)
    c.rect(7, 12, 2, 4, BRASS[1] + (255,)); c.rect(4, 15, 8, 1, BRASS[0] + (255,))
    pts = [(2, 13), (13, 2)] if kind == 0 else [(2, 2), (13, 13)]
    c.line(pts, 3.2, BRASS[2] + (255,))
    c.line(pts, 1.6, GLASS[2] + (255,))
    a = c.down()
    return outline(snap(a, BRASS + GLASS), OUT, grow=False)


def pedestal():
    t = rgba(16, 8)
    t[2:8, 1:15] = col(BRASS[1]); t[2, 1:15] = col(BRASS[3]); t[3, 1:15] = col(BRASS[2])
    t[7, 1:15] = col(BRASS[0]); t[4:7, 6:10] = col(GLASS[1]); t[5, 7:9] = col(GLASS[2])
    t[0:2, 4:12] = col(BRASS[2])
    return outline(t, OUT, grow=False)


def receptor(on):
    c = SS(16, 16, ss=4)
    c.circle(8, 8, 7, BRASS[1] + (255,)); c.circle(8, 8, 5, BRASS[0] + (255,))
    c.circle(8, 8, 3.5, (GLASS[2] if on else GLASS[0]) + (255,))
    if on:
        c.circle(8, 8, 2, (255, 250, 220, 255))
    a = c.down()
    return outline(snap(a, BRASS + GLASS + [(255, 250, 220)]), OUT, grow=False)


def lift():
    t = rgba(48, 8)
    t[0:6, :] = col(WOOD[1]); t[0, :] = col(WOOD[2]); t[5, :] = col(WOOD[0])
    t[6:8, :] = col(BRASS[1]); t[6, :] = col(BRASS[2])
    for x in (0, 16, 32, 47):
        t[0:8, x] = col(BRASS[0])
    return outline(t, OUT, grow=False)


def gear(r=14):
    """A background gear (decor)."""
    n = 2 * r + 8
    c = SS(n, n, ss=4)
    cx = cy = n / 2
    for k in range(10):
        a = k / 10 * 2 * math.pi
        c.circle(cx + math.cos(a) * r, cy + math.sin(a) * r, 3, BACK[3] + (255,))
    c.circle(cx, cy, r, BACK[3] + (255,)); c.circle(cx, cy, r - 3, BACK[2] + (255,))
    c.circle(cx, cy, 3, BACK[3] + (255,))
    a = c.down()
    return snap(a, BACK)


def great_lamp(lit):
    c = SS(48, 56, ss=4)
    c.rect(20, 44, 8, 12, BRASS[1] + (255,)); c.rect(10, 52, 28, 4, BRASS[0] + (255,))
    c.poly([(8, 12), (40, 12), (36, 44), (12, 44)], BRASS[0] + (255,))
    c.poly([(11, 15), (37, 15), (33, 41), (15, 41)], (GLASS[2] if lit else GLASS[0]) + (255,))
    c.poly([(6, 12), (42, 12), (24, 0)], BRASS[1] + (255,))
    if lit:
        c.ellipse(24, 30, 7, 10, (255, 200, 110, 255)); c.ellipse(24, 32, 4, 6, (255, 250, 220, 255))
    a = c.down()
    return outline(snap(a, BRASS + GLASS + [(255, 200, 110), (255, 250, 220)]), OUT, grow=False)


def bookshelf():
    t = rgba(16, 16)
    t[:] = col(WOOD[1]); t[:, 0] = col(WOOD[0]); t[:, 15] = col(WOOD[0])
    r = np.random.default_rng(31)
    for y0 in (1, 9):
        t[y0 + 6, :] = col(WOOD[2])
        x = 1
        while x < 15:
            w = int(r.integers(1, 3)); h = int(r.integers(4, 7))
            t[y0 + 6 - h:y0 + 6, x:x + w] = col(BOOKS[int(r.integers(0, len(BOOKS)))])
            x += w
    return t


def tower_window():
    t = rgba(16, 32)
    t[:] = col(STONE[1]); t[2:30, 3:13] = col((70, 50, 80)); t[2:12, 3:13] = col((150, 90, 90))
    t[12:20, 3:13] = col((110, 70, 90)); t[16, 3:13] = col(STONE[2]); t[2:30, 8] = col(STONE[2])
    t[0:2, :] = col(STONE[3])
    return outline(t, OUT, grow=False)


def dusk_sky(h=216):
    stops = [(0.0, (30, 24, 60)), (0.5, (90, 50, 90)), (0.8, (190, 100, 90)), (1.0, (240, 160, 100))]
    t = rgba(1, h)
    for y in range(h):
        k = y / (h - 1)
        for (k0, c0), (k1, c1) in zip(stops, stops[1:]):
            if k0 <= k <= k1:
                f = (k - k0) / (k1 - k0)
                t[y, 0] = col(tuple(int(c0[i] + (c1[i] - c0[i]) * f) for i in range(3)))
                break
    return t


def far_hills():
    """Far layer: the town on its hill and the castle beyond, against the dusk."""
    w, h = 384, 216
    c = SS(w, h, ss=2)
    base = (60, 36, 60, 255)
    c.poly([(0, 216), (0, 170), (120, 150), (260, 160), (384, 140), (384, 216)], base)
    for x in range(140, 250, 12):
        c.rect(x, 140 - (x * 7) % 18, 9, 30, base)
    c.rect(300, 96, 10, 50, base); c.rect(318, 80, 14, 64, base); c.rect(338, 104, 10, 40, base)
    c.poly([(296, 96), (314, 96), (305, 80)], base); c.poly([(314, 80), (336, 80), (325, 60)], base)
    a = c.down()
    t = rgba(w, h)
    t[a[..., 3] > 128] = col(base[:3])
    return t


def ruins():
    """Mid layer: the lamplighters' ruined village."""
    w, h = 256, 216
    c = SS(w, h, ss=2)
    base = (34, 22, 36, 255)
    c.rect(0, 180, w, 36, base)
    r = np.random.default_rng(8)
    x = 0
    while x < w:
        ww = int(r.integers(24, 40)); top = int(r.integers(140, 170))
        c.rect(x, top, ww, 216 - top, base)
        c.poly([(x, top), (x + ww * 0.6, top - int(r.integers(8, 20))), (x + ww, top)], base)
        x += ww + int(r.integers(6, 20))
    a = c.down()
    t = rgba(w, h)
    t[a[..., 3] > 128] = col(base[:3])
    return t


def all_items():
    items = {}
    for i in range(4):
        items[f"tst{i}"] = brick_tile(640 + i, STONE, crack=i == 3)
        items[f"ttop{i}"] = top_trim(i)
        items[f"twall{i}"] = pipe_wall(i)
    items["mirror0"] = mirror(0)
    items["mirror1"] = mirror(1)
    items["pedestal"] = pedestal()
    items["receptor_off"] = receptor(False)
    items["receptor_on"] = receptor(True)
    items["lift"] = lift()
    items["gear"] = gear()
    items["glamp_off"] = great_lamp(False)
    items["glamp_on"] = great_lamp(True)
    items["shelf0"] = bookshelf()
    items["twindow"] = tower_window()
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
    bg.resize((im.width * 4, im.height * 4), Image.NEAREST).save(os.path.join(out, "tower_tiles.png"))
    s = Image.fromarray(dusk_sky(), "RGBA").resize((384, 216))
    s.alpha_composite(Image.fromarray(far_hills(), "RGBA"))
    s.alpha_composite(Image.fromarray(ruins(), "RGBA"), (0, 0))
    s.resize((768, 432), Image.NEAREST).save(os.path.join(out, "tower_bg.png"))
