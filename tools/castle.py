"""Chapter 6 (宵の王城): navy and gold castle stone, carpet edges, the pale wall that
shadows fall on, candelabra, covered portraits, boarded windows, shadow latches,
the throne, and the night backdrop (the lake, the town below, the castle walls)."""
import numpy as np
from pixlib import SS, snap, outline, rgba
from tiles import brick_tile

OUT = (14, 14, 26)
STONE = [(34, 36, 58), (52, 56, 84), (72, 78, 110), (96, 104, 140), (124, 132, 168)]
WALL = [(20, 22, 42), (30, 34, 60), (38, 42, 72), (46, 50, 84)]
PALE = [(150, 146, 160), (168, 164, 178), (182, 178, 190)]
GOLD = [(90, 66, 24), (150, 112, 40), (210, 170, 80), (246, 220, 140)]
CARPET = [(40, 30, 86), (58, 44, 120), (160, 124, 52)]
WOOD = [(40, 26, 22), (70, 46, 34), (100, 70, 48)]
CLOTH = [(60, 56, 70), (86, 82, 98), (112, 108, 124)]


def col(c, a=255):
    return np.array([*c, a], np.uint8)


def carpet_top(seed):
    """Floor edge: a navy runner with a gold border."""
    t = rgba(16, 16)
    t[0, :] = col(CARPET[2]); t[1:4, :] = col(CARPET[1]); t[4, :] = col(CARPET[0])
    if seed % 2 == 0:
        t[2, 3::8] = col(CARPET[2]); t[2, 4::8] = col(CARPET[2])
    return t


def navy_wall(seed):
    """Back wall: dark navy blocks, a thin gold line now and then."""
    t = brick_tile(700 + seed, WALL, big=seed % 3 == 0)
    if seed == 1:
        t[7, :] = col(GOLD[1]); t[8, :] = col(GOLD[0])
    return t


def pale_wall(seed):
    """The pale plaster wall that shadows are thrown on."""
    r = np.random.default_rng(760 + seed)
    t = rgba(16, 16)
    t[:] = col(PALE[1])
    n = r.random((16, 16))
    t[n < 0.1] = col(PALE[0]); t[n > 0.94] = col(PALE[2])
    return t


def candelabra(lit):
    """16x32 standing candelabra: three candles on a brass stem."""
    c = SS(16, 32, ss=4)
    c.rect(7, 12, 2, 18, GOLD[1] + (255,)); c.rect(4, 29, 8, 3, GOLD[0] + (255,)); c.rect(5, 28, 6, 1, GOLD[2] + (255,))
    c.rect(2, 11, 12, 2, GOLD[1] + (255,)); c.rect(2, 9, 2, 3, GOLD[1] + (255,)); c.rect(12, 9, 2, 3, GOLD[1] + (255,))
    for x in (2, 7, 12):
        c.rect(x, 5, 2, 4, (230, 226, 210, 255))
        if lit:
            c.ellipse(x + 1, 3, 1.4, 2.4, (255, 200, 90, 255)); c.ellipse(x + 1, 3.5, 0.7, 1.2, (255, 250, 220, 255))
    a = c.down()
    return outline(snap(a, GOLD + [(230, 226, 210), (255, 200, 90), (255, 250, 220)]), OUT, grow=False)


def portrait():
    """32x32 portrait in a gold frame with a cloth thrown over it."""
    t = rgba(32, 32)
    t[0:32, 0:32] = col(GOLD[1]); t[1, 1:31] = col(GOLD[3]); t[30, 1:31] = col(GOLD[0])
    t[3:29, 3:29] = col((40, 44, 70))
    c = SS(32, 32, ss=4)
    c.poly([(2, 2), (30, 2), (29, 22), (24, 30), (16, 26), (8, 31), (3, 24)], CLOTH[1] + (255,))
    c.poly([(8, 2), (12, 2), (10, 28), (8, 31)], CLOTH[0] + (255,))
    c.poly([(20, 2), (24, 2), (25, 28), (24, 30)], CLOTH[2] + (255,))
    a = c.down()
    m = a[..., 3] > 128
    t[m] = a[m]
    return outline(t, OUT, grow=False)


def boarded_window():
    """16x32 tall window, boarded up."""
    t = rgba(16, 32)
    t[0:32, 1:15] = col(STONE[0]); t[2:30, 3:13] = col((16, 18, 34))
    for y in (6, 13, 20, 26):
        t[y:y + 3, 1:15] = col(WOOD[1]); t[y, 1:15] = col(WOOD[2]); t[y + 2, 1:15] = col(WOOD[0])
        t[y + 1, 3] = col((180, 170, 150)); t[y + 1, 12] = col((180, 170, 150))
    return outline(t, OUT, grow=False)


def latch(on):
    """16x16 iron ring set in the wall, that answers only to a shadow's touch."""
    c = SS(16, 16, ss=4)
    c.circle(8, 8, 6.5, (28, 26, 40, 255)); c.circle(8, 8, 4.5, (0, 0, 0, 0))
    c.rect(6, 1, 4, 3, (60, 58, 80, 255))
    a = c.down()
    t = rgba(16, 16)
    m = a[..., 3] > 128
    t[m] = col((150, 110, 230) if on else (60, 56, 84))
    t[1:4, 6:10] = col((90, 86, 110))
    return outline(t, OUT, grow=False)


def throne():
    """48x48 throne: tall navy back, gold edges."""
    c = SS(48, 48, ss=4)
    c.rect(10, 0, 28, 34, GOLD[1] + (255,)); c.rect(12, 2, 24, 30, CARPET[1] + (255,))
    c.poly([(10, 0), (24, -6), (38, 0)], GOLD[1] + (255,))
    c.rect(6, 30, 36, 8, GOLD[1] + (255,)); c.rect(8, 31, 32, 6, CARPET[0] + (255,))
    c.rect(6, 38, 5, 10, GOLD[0] + (255,)); c.rect(37, 38, 5, 10, GOLD[0] + (255,))
    c.circle(24, 12, 4, GOLD[2] + (255,))
    a = c.down()
    return outline(snap(a, GOLD + CARPET[:2]), OUT, grow=False)


def night_sky(h=216):
    stops = [(0.0, (10, 12, 34)), (0.55, (28, 30, 70)), (0.85, (70, 56, 100)), (1.0, (110, 80, 110))]
    t = rgba(1, h)
    for y in range(h):
        k = y / (h - 1)
        for (k0, c0), (k1, c1) in zip(stops, stops[1:]):
            if k0 <= k <= k1:
                f = (k - k0) / (k1 - k0)
                t[y, 0] = col(tuple(int(c0[i] + (c1[i] - c0[i]) * f) for i in range(3)))
                break
    return t


def lake():
    """Far layer: the lake under the moon, the town's dark roofs on the far shore."""
    w, h = 384, 216
    t = rgba(w, h)
    r = np.random.default_rng(61)
    for _ in range(50):
        x, y = int(r.integers(0, w)), int(r.integers(0, 110))
        t[y, x] = col((210, 210, 240))
    t[24:34, 300:310] = col((230, 226, 200))            # the moon
    t[26:32, 298:312] = col((230, 226, 200))
    t[150:, :] = col((24, 28, 58))                       # the lake
    for y in range(152, 216, 3):
        xs = r.integers(0, w, 12)
        for x in xs:
            t[y, x:x + int(r.integers(3, 10))] = col((60, 66, 110))
    t[152:216:4, 302:308] = col((150, 146, 140))          # the moon on the water
    c = SS(w, h, ss=2)
    base = (18, 18, 40, 255)
    c.poly([(0, 150), (0, 136), (80, 128), (170, 140), (260, 130), (384, 138), (384, 150)], base)
    a = c.down()
    t[a[..., 3] > 128] = col(base[:3])
    return t


def ramparts():
    """Mid layer: castle walls and towers, tileable."""
    w, h = 256, 216
    c = SS(w, h, ss=2)
    base = (16, 16, 34, 255)
    c.rect(0, 150, w, 66, base)
    for x in range(0, w, 12):
        c.rect(x, 144, 7, 8, base)
    for x0, top in ((20, 80), (140, 96), (210, 70)):
        c.rect(x0, top, 26, 216 - top, base)
        for k in range(0, 26, 8):
            c.rect(x0 + k, top - 6, 5, 7, base)
    a = c.down()
    t = rgba(w, h)
    t[a[..., 3] > 128] = col(base[:3])
    for x0, top in ((20, 80), (140, 96), (210, 70)):      # a few dark window slits
        t[top + 20:top + 28, x0 + 11:x0 + 13] = col((8, 8, 20))
    return t


def all_items():
    items = {}
    for i in range(4):
        items[f"kst{i}"] = brick_tile(720 + i, STONE, crack=i == 3)
        items[f"ktop{i}"] = carpet_top(i)
        items[f"kwall{i}"] = navy_wall(i)
        items[f"kpale{i}"] = pale_wall(i)
    items["candle_off"] = candelabra(False)
    items["candle_on"] = candelabra(True)
    items["portrait"] = portrait()
    items["kwindow"] = boarded_window()
    items["latch_off"] = latch(False)
    items["latch_on"] = latch(True)
    items["throne"] = throne()
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
    bg.resize((im.width * 4, im.height * 4), Image.NEAREST).save(os.path.join(out, "castle_tiles.png"))
    s = Image.fromarray(night_sky(), "RGBA").resize((384, 216))
    s.alpha_composite(Image.fromarray(lake(), "RGBA"))
    s.alpha_composite(Image.fromarray(ramparts(), "RGBA"), (0, 0))
    s.resize((768, 432), Image.NEAREST).save(os.path.join(out, "castle_bg.png"))
