"""Chapter 3 (消灯の街): cobblestone / brick tiles, house walls, props and the night town backdrop."""
import numpy as np
from pixlib import SS, snap, outline, rgba

OUT = (20, 16, 22)
COB = [(40, 38, 48), (62, 60, 72), (86, 84, 96), (112, 110, 122)]
BRICK = [(38, 26, 30), (64, 40, 40), (88, 56, 50), (110, 74, 62)]
PLASTER = [(34, 32, 40), (44, 42, 52), (54, 52, 64)]
WOOD = [(40, 28, 26), (66, 46, 38), (92, 66, 50), (120, 90, 66)]
ROOF = [(36, 30, 44), (52, 44, 64), (72, 62, 86)]
IRON = [(24, 24, 32), (48, 50, 62), (84, 88, 104)]
WARM = [(250, 200, 110), (255, 240, 190)]


def col(c, a=255):
    return np.array([*c, a], np.uint8)


def cobble(seed):
    """Stone blocks of the streets and walls (front layer)."""
    r = np.random.default_rng(700 + seed)
    t = rgba(16, 16)
    t[:] = col(COB[1])
    off = 0 if seed % 2 else 4
    for y0 in (0, 8):
        for x0 in range(-8, 16, 8):
            x = x0 + (off if y0 == 8 else 0)
            for yy in range(y0, y0 + 8):
                for xx in range(max(0, x), min(16, x + 8)):
                    rel_x, rel_y = xx - x, yy - y0
                    c = COB[1]
                    if rel_x == 7 or rel_y == 7:
                        c = COB[0]
                    elif rel_x == 0 or rel_y == 0:
                        c = COB[2]
                    elif r.random() < 0.08:
                        c = COB[3] if r.random() < 0.5 else COB[0]
                    t[yy, xx] = col(c)
    return t


def cobble_top(seed):
    """Street surface: a lighter worn edge."""
    r = np.random.default_rng(800 + seed)
    t = rgba(16, 16)
    t[0, :] = col(COB[3]); t[1, :] = col(COB[2])
    for x in range(16):
        if r.random() < 0.2:
            t[0, x] = col(COB[2])
    return t


def brick_wall(seed):
    """House walls behind the street (back layer)."""
    r = np.random.default_rng(900 + seed)
    t = rgba(16, 16)
    t[:] = col(BRICK[1])
    for y in range(16):
        row = y // 4
        off = 0 if row % 2 else 4
        for x in range(16):
            if y % 4 == 3 or (x + off) % 8 == 7:
                t[y, x] = col(BRICK[0])
            elif r.random() < 0.07:
                t[y, x] = col(BRICK[2])
    return (t.astype(np.int32) * 0.62).astype(np.uint8) | np.array([0, 0, 0, 255], np.uint8)


def plaster(seed):
    r = np.random.default_rng(950 + seed)
    t = rgba(16, 16)
    t[:] = col(PLASTER[1])
    n = r.random((16, 16))
    t[n < 0.08] = col(PLASTER[0]); t[n > 0.94] = col(PLASTER[2])
    if seed % 2 == 0:
        t[:, 0] = col(WOOD[0]); t[:, 15] = col(WOOD[0])         # half-timbering
    return t


def boarded_window():
    t = rgba(16, 24)
    t[:] = col(OUT)
    t[1:23, 1:15] = col((16, 14, 20))
    for y in (4, 11, 18):
        t[y:y + 3, 0:16] = col(WOOD[2]); t[y, 0:16] = col(WOOD[3]); t[y + 2, 0:16] = col(WOOD[1])
    t[4:21, 7] = col(WOOD[1])
    return t


def lamp(on):
    """Street lamp, 16x48, bottom at the ground."""
    t = rgba(16, 48)
    t[14:48, 7:9] = col(IRON[1]); t[14:48, 7] = col(IRON[0])
    t[44:48, 5:11] = col(IRON[1])
    # the lantern head
    t[2:4, 5:11] = col(IRON[1]); t[1, 6:10] = col(IRON[2])
    t[4:12, 4:12] = col(IRON[0])
    glass = WARM[0] if on else (40, 44, 56)
    t[5:11, 5:11] = col(glass)
    if on:
        t[6:10, 6:10] = col(WARM[1])
    t[12:14, 5:11] = col(IRON[1])
    return t


def crate():
    t = rgba(16, 16)
    t[:] = col(WOOD[2])
    t[0, :] = col(WOOD[3]); t[15, :] = col(WOOD[0]); t[:, 0] = col(WOOD[1]); t[:, 15] = col(WOOD[0])
    for i in range(1, 15):
        t[i, i] = col(WOOD[1]); t[i, 15 - i] = col(WOOD[1])
    t[1:15, 1] = col(WOOD[3])
    return outline(t, OUT, grow=False)


def barrel():
    c = SS(16, 20, ss=4)
    c.ellipse(8, 10, 7, 10, WOOD[2] + (255,))
    c.rect(1, 3, 14, 2, IRON[1] + (255,)); c.rect(1, 15, 14, 2, IRON[1] + (255,))
    c.rect(9, 1, 4, 18, WOOD[1] + (255,))
    a = c.down()
    return outline(snap(a, WOOD + IRON), OUT, grow=False)


def chimney():
    """16x32 chimney (a shadow caster on the roofs)."""
    t = rgba(16, 32)
    for y in range(4, 32):
        for x in range(2, 14):
            t[y, x] = col(BRICK[0] if (y % 4 == 3 or (x + (y // 4) % 2 * 3) % 6 == 5) else BRICK[2])
    t[0:4, 0:16] = col(BRICK[3]); t[3, :] = col(BRICK[0])
    return outline(t, OUT, grow=False)


def poster():
    t = rgba(12, 14)
    t[:] = col((150, 140, 120)); t[0, :] = col((180, 170, 150))
    t[3:9, 4:8] = col((30, 26, 30))                         # a snuffed candle
    t[2, 5:7] = col((30, 26, 30))
    t[10:12, 2:10] = col((60, 50, 50))
    return outline(t, OUT, grow=False)


def laundry():
    t = rgba(48, 16)
    for x in range(48):
        y = int(2 + 3 * np.sin(x / 47 * np.pi))
        t[y, x] = col((70, 66, 76))
    for i, (x0, w, cc) in enumerate(((6, 7, (170, 160, 150)), (19, 9, (120, 130, 160)), (33, 6, (160, 120, 120)))):
        y = int(2 + 3 * np.sin((x0 + w / 2) / 47 * np.pi)) + 1
        t[y:y + 8, x0:x0 + w] = col(cc)
        t[y + 8, x0:x0 + w:2] = col(cc)
    return t


def night_sky(h=216):
    stops = [(0.0, (8, 8, 22)), (0.6, (22, 20, 44)), (1.0, (44, 36, 60))]
    t = rgba(1, h)
    for y in range(h):
        k = y / (h - 1)
        for (k0, c0), (k1, c1) in zip(stops, stops[1:]):
            if k0 <= k <= k1:
                f = (k - k0) / (k1 - k0)
                t[y, 0] = col(tuple(int(c0[i] + (c1[i] - c0[i]) * f) for i in range(3)))
                break
    return t


def castle():
    """Far layer: the castle on its hill (chapter 6) and a few stars."""
    w, h = 384, 216
    c = SS(w, h, ss=2)
    base = (26, 24, 44, 255)
    c.poly([(120, 216), (190, 150), (300, 150), (360, 216)], base)
    for x, top, ww in ((200, 90, 14), (226, 70, 18), (254, 96, 12), (276, 110, 12)):
        c.rect(x, top, ww, 150 - top + 2, base)
        c.poly([(x - 3, top), (x + ww + 3, top), (x + ww / 2, top - 18)], base)
    a = c.down()
    t = rgba(w, h)
    t[a[..., 3] > 128] = col(base[:3])
    r = np.random.default_rng(3)
    for _ in range(50):
        x, y = int(r.integers(0, w)), int(r.integers(0, 120))
        if t[y, x, 3] == 0:
            t[y, x] = col((170, 170, 210))
    return t


def roofs():
    """Mid layer: rows of steep roofs and chimneys (tileable in x)."""
    w, h = 256, 216
    c = SS(w, h, ss=2)
    base = (18, 16, 30, 255)
    r = np.random.default_rng(9)
    x = -10
    while x < w:
        ww = int(r.integers(30, 52)); top = int(r.integers(120, 160))
        c.rect(x, top, ww, h - top, base)
        c.poly([(x - 4, top), (x + ww + 4, top), (x + ww / 2, top - int(r.integers(18, 30)))], base)
        if r.random() < 0.6:
            c.rect(x + 6, top - 26, 6, 20, base)
        x += ww + int(r.integers(0, 6))
    a = c.down()
    t = rgba(w, h)
    t[a[..., 3] > 128] = col(base[:3])
    # a single lit window, very rare in this town
    t[170:174, 60:63] = col((120, 96, 60))
    return t


def all_items():
    items = {}
    for i in range(4):
        items[f"cob{i}"] = cobble(i)
        items[f"ctop{i}"] = cobble_top(i)
        items[f"wall{i}"] = brick_wall(i)
        items[f"plaster{i}"] = plaster(i)
    items["bwindow"] = boarded_window()
    items["lamp_off"] = lamp(False)
    items["lamp_on"] = lamp(True)
    items["crate"] = crate()
    items["barrel"] = barrel()
    items["chimney"] = chimney()
    items["poster"] = poster()
    items["laundry"] = laundry()
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
    bg.resize((im.width * 4, im.height * 4), Image.NEAREST).save(os.path.join(out, "town_tiles.png"))
    s = Image.fromarray(night_sky(), "RGBA").resize((384, 216))
    s.alpha_composite(Image.fromarray(castle(), "RGBA"))
    s.alpha_composite(Image.fromarray(roofs(), "RGBA"), (0, 0))
    s.alpha_composite(Image.fromarray(roofs(), "RGBA"), (256, 0))
    s.resize((768, 432), Image.NEAREST).save(os.path.join(out, "town_bg.png"))
