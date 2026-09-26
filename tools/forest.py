"""Chapter 2 (薄明の森): earth / grass tiles, forest props and the dawn backdrop."""
import numpy as np
from pixlib import SS, snap, outline, rgba

OUT = (24, 16, 20)
# earth
E_DARK = (46, 32, 30)
E_MID = (72, 50, 40)
E_LIGHT = (98, 70, 52)
E_HI = (126, 94, 68)
STONE = [(62, 60, 72), (92, 90, 104), (130, 128, 140)]
ROOT = [(58, 38, 30), (84, 58, 42)]
GRASS = [(30, 58, 48), (44, 86, 58), (70, 122, 70), (118, 164, 92)]
BARK = [(36, 26, 30), (56, 40, 40), (80, 58, 50), (104, 78, 62)]
LEAF = [(22, 36, 42), (30, 52, 52), (42, 72, 62), (60, 98, 76)]
BACK_EARTH = [(28, 20, 24), (36, 26, 30), (46, 34, 36)]


def col(c, a=255):
    return np.array([*c, a], np.uint8)


def dirt(seed):
    r = np.random.default_rng(300 + seed)
    t = rgba(16, 16)
    t[:] = col(E_MID)
    n = r.random((16, 16))
    t[n < 0.18] = col(E_DARK)
    t[(n > 0.86)] = col(E_LIGHT)
    # pebbles
    for _ in range(1 + seed % 3):
        x, y = int(r.integers(1, 13)), int(r.integers(1, 13))
        t[y:y + 2, x:x + 3] = col(STONE[1]); t[y, x] = col(STONE[2]); t[y + 1, x + 2] = col(STONE[0])
    # a root running through
    if seed % 2 == 0:
        y = int(r.integers(3, 12))
        for x in range(16):
            y = int(np.clip(y + r.integers(-1, 2), 1, 14))
            t[y, x] = col(ROOT[1]); t[y + 1, x] = col(ROOT[0])
    return t


def grass_top(seed):
    """Overlay for tiles with open air above: a grass mat and blades."""
    r = np.random.default_rng(400 + seed)
    t = rgba(16, 16)
    for x in range(16):
        h = int(r.integers(2, 5))
        for y in range(h):
            t[y, x] = col(GRASS[2] if y == 0 else GRASS[1] if y < h - 1 else GRASS[0])
        if r.random() < 0.35:
            t[0, x] = col(GRASS[3])
    return t


def back_earth(seed):
    r = np.random.default_rng(500 + seed)
    t = rgba(16, 16)
    t[:] = col(BACK_EARTH[1])
    n = r.random((16, 16))
    t[n < 0.2] = col(BACK_EARTH[0])
    t[n > 0.9] = col(BACK_EARTH[2])
    return t


def tree(h_tiles=7):
    """Background trunk with a crown of leaves (drawn behind everything)."""
    w, h = 64, h_tiles * 16
    c = SS(w, h, ss=4)
    trunk_top = 34
    c.poly([(26, h), (38, h), (36, trunk_top), (28, trunk_top)], BARK[1] + (255,))
    c.poly([(31, h), (38, h), (36, trunk_top), (33, trunk_top)], BARK[0] + (255,))
    c.poly([(26, h), (22, h), (27, h - 8)], BARK[1] + (255,))
    c.poly([(38, h), (43, h), (37, h - 8)], BARK[1] + (255,))
    for cx, cy, rr, k in ((32, 22, 22, 1), (18, 30, 14, 1), (46, 30, 14, 1), (32, 16, 16, 2), (24, 24, 10, 3), (40, 20, 9, 3)):
        c.circle(cx, cy, rr, LEAF[k] + (255,))
    a = c.down()
    return snap(a, BARK + LEAF)


def bush(seed):
    c = SS(32, 16, ss=4)
    for cx, cy, rr, k in ((10, 11, 7, 1), (20, 10, 8, 1), (26, 12, 5, 1), (15, 8, 5, 2), (22, 7, 4, 3)):
        c.circle(cx + seed, cy, rr, GRASS[k] + (255,))
    a = c.down()
    return outline(snap(a, GRASS), OUT, grow=False)


def fern():
    t = rgba(16, 16)
    for i, (dx, ln) in enumerate(((-5, 8), (-2, 11), (2, 11), (5, 8))):
        for k in range(ln):
            x = 8 + int(dx * k / ln); y = 15 - k
            t[y, x] = col(GRASS[2] if k % 3 else GRASS[3])
    return t


def flower(kind):
    t = rgba(8, 8)
    petal = [(240, 200, 220), (250, 230, 150)][kind]
    t[4:8, 3] = col(GRASS[1])
    t[1, 2:5] = col(petal); t[2, 1:6] = col(petal); t[3, 2:5] = col(petal)
    t[2, 3] = col((250, 240, 200) if kind == 0 else (230, 140, 60))
    return t


def stump():
    c = SS(32, 16, ss=4)
    c.poly([(6, 16), (26, 16), (23, 5), (9, 5)], BARK[2] + (255,))
    c.poly([(16, 16), (26, 16), (23, 5), (17, 5)], BARK[1] + (255,))
    c.ellipse(16, 5, 7, 2.5, E_HI + (255,))
    c.ellipse(16, 5, 4, 1.2, E_LIGHT + (255,))
    a = c.down()
    return outline(snap(a, BARK + [E_HI, E_LIGHT]), OUT, grow=False)


def marker():
    """道標石: a tall stone with a carved lamp. 16x32, casts the shadow platform."""
    c = SS(16, 32, ss=4)
    c.poly([(2, 32), (14, 32), (13, 4), (8, 1), (3, 4)], STONE[1] + (255,))
    c.poly([(9, 32), (14, 32), (13, 4), (9, 2)], STONE[0] + (255,))
    c.rect(3, 3, 2, 26, STONE[2] + (255,))
    # carved lantern
    c.rect(6, 10, 4, 6, (40, 38, 50, 255)); c.rect(7, 8, 2, 2, (40, 38, 50, 255))
    c.rect(7, 11, 2, 3, (190, 170, 110, 255))
    a = c.down()
    t = snap(a, STONE + [(40, 38, 50), (190, 170, 110)])
    # moss cap
    for x in range(4, 12):
        t[3 + (x % 3 == 0), x] = col(GRASS[2])
    return outline(t, OUT, grow=False)


def log_piece():
    """One 16px section of a log bridge (the top 6 px are what you stand on)."""
    t = rgba(16, 8)
    t[0, :] = col(BARK[3]); t[1:5, :] = col(BARK[2]); t[5:7, :] = col(BARK[1]); t[7, :] = col(OUT)
    for x in (3, 10):
        t[1:6, x] = col(BARK[1])
    t[2, 6] = col(BARK[0]); t[3, 13] = col(BARK[0])
    return t


def wood_gate():
    t = rgba(16, 48)
    for x in range(1, 15):
        t[:, x] = col(BARK[2] if x % 5 else BARK[1])
    for x in (0, 15):
        t[:, x] = col(OUT)
    for y in (6, 22, 40):
        t[y:y + 3, 1:15] = col(BARK[1]); t[y, 1:15] = col(BARK[3])
    t[:, 5] = col(BARK[0]); t[:, 10] = col(BARK[0])
    t[47, :] = col(OUT)
    return t


def sky(h=216):
    """Vertical dawn gradient (1px wide, stretched at draw time)."""
    stops = [(0.0, (14, 16, 44)), (0.45, (40, 36, 84)), (0.75, (110, 70, 110)), (0.92, (196, 120, 116)), (1.0, (232, 170, 130))]
    t = rgba(1, h)
    for y in range(h):
        k = y / (h - 1)
        for (k0, c0), (k1, c1) in zip(stops, stops[1:]):
            if k0 <= k <= k1:
                f = (k - k0) / (k1 - k0)
                cc = tuple(int(c0[i] + (c1[i] - c0[i]) * f) for i in range(3))
                t[y, 0] = col(cc)
                break
    return t


def hills():
    """Tileable far layer: layered hills and a few stars, transparent sky."""
    w, h = 320, 216
    t = rgba(w, h)
    r = np.random.default_rng(21)
    for _ in range(40):
        x, y = int(r.integers(0, w)), int(r.integers(0, 90))
        t[y, x] = col((200, 200, 230) if r.random() < 0.5 else (150, 150, 200))
    for base, amp, cc, ph in ((150, 18, (52, 44, 82), 0.0), (172, 14, (38, 34, 64), 1.7)):
        for x in range(w):
            yy = int(base + amp * np.sin(x / w * 2 * np.pi * 2 + ph) + 6 * np.sin(x / w * 2 * np.pi * 5 + ph))
            t[yy:, x] = col(cc)
    return t


def treeline():
    """Tileable mid layer: dark tree silhouettes along the bottom."""
    w, h = 256, 216
    c = SS(w, h, ss=2)
    base = (24, 22, 40, 255)
    c.rect(0, 170, w, 46, base)
    r = np.random.default_rng(5)
    for i in range(9):
        x = i * 30 + int(r.integers(-6, 6))
        top = 70 + int(r.integers(0, 50))
        c.rect(x + 12, top + 20, 6, 216 - top, base)
        for k in range(4):
            rr = 16 - k * 3
            c.poly([(x + 15 - rr, top + 30 + k * 16), (x + 15 + rr, top + 30 + k * 16), (x + 15, top + k * 16)], base)
            if x + 15 + rr > w:
                c.poly([(x + 15 - rr - w, top + 30 + k * 16), (x + 15 + rr - w, top + 30 + k * 16), (x + 15 - w, top + k * 16)], base)
    a = c.down()
    t = rgba(w, h)
    t[a[..., 3] > 128] = col(base[:3])
    return t


def all_items():
    items = {}
    for i in range(6):
        items[f"dirt{i}"] = dirt(i)
    for i in range(4):
        items[f"grass{i}"] = grass_top(i)
        items[f"eback{i}"] = back_earth(i)
    items["tree"] = tree(7)
    items["tree_s"] = tree(5)
    items["bush0"] = bush(0)
    items["bush1"] = bush(2)
    items["fern"] = fern()
    items["flower0"] = flower(0)
    items["flower1"] = flower(1)
    items["stump"] = stump()
    items["marker"] = marker()
    items["log"] = log_piece()
    items["woodgate"] = wood_gate()
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
    bg.resize((im.width * 4, im.height * 4), Image.NEAREST).save(os.path.join(out, "forest_tiles.png"))
    s = Image.fromarray(sky(), "RGBA").resize((320, 216))
    s.alpha_composite(Image.fromarray(hills(), "RGBA"))
    s.alpha_composite(Image.fromarray(treeline(), "RGBA").crop((0, 0, 256, 216)).resize((256, 216)), (0, 0))
    s.resize((640, 432), Image.NEAREST).save(os.path.join(out, "forest_bg.png"))
