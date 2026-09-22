"""Dungeon tileset, props and parallax backgrounds (all pixel-exact numpy)."""
import math
import numpy as np
from pixlib import SS, snap, outline, rgba

RNG = np.random.default_rng(7)

# foreground stone
F_MORTAR = (30, 26, 38)
F_DARK = (60, 54, 74)
F_MID = (86, 79, 102)
F_LIGHT = (116, 108, 132)
F_HI = (152, 144, 164)
MOSS = [(44, 74, 50), (70, 108, 60), (112, 150, 78)]
# background stone
B_MORTAR = (15, 13, 24)
B_DARK = (27, 25, 40)
B_MID = (36, 34, 54)
B_LIGHT = (47, 44, 68)
IRON = [(20, 20, 28), (48, 50, 62), (84, 88, 104), (130, 136, 150)]
GLOW = [(40, 120, 150), (80, 200, 220), (190, 250, 255)]
GOLD = [(120, 76, 30), (196, 140, 50), (250, 212, 110)]


def col(c, a=255):
    return np.array([*c, a], np.uint8)


def fill(img, x, y, w, h, c):
    img[y:y + h, x:x + w] = col(c)


def brick_tile(seed, palette, big=False, crack=False, moss=0.0):
    mortar, dark, mid, light = palette[:4]
    hi = palette[4] if len(palette) > 4 else light
    r = np.random.default_rng(seed)
    t = rgba(16, 16)
    t[:] = col(mid)
    rows = [(0, 8, 0 if seed % 2 == 0 else 4), (8, 8, 8 if seed % 2 == 0 else 12)] if not big else [(0, 16, seed % 16)]
    for y0, h, joint in rows:
        # bricks separated by vertical mortar at `joint` (and joint+16 wrap)
        starts = sorted({joint % 16, (joint + (16 if big else 16)) % 16})
        # draw brick bodies with bevel
        for yy in range(y0, y0 + h):
            for xx in range(16):
                rel_y = yy - y0
                rel_x = (xx - joint) % 16
                c = mid
                if rel_y == h - 1 or rel_x == 15:
                    c = mortar
                elif rel_y == 0 or rel_x == 0:
                    c = light
                elif rel_y == h - 2 or rel_x == 14:
                    c = dark
                else:
                    n = r.random()
                    if n < 0.10:
                        c = dark
                    elif n < 0.16:
                        c = light
                t[yy, xx] = col(c)
        # highlight chips
        for _ in range(2):
            x, y = r.integers(2, 13), r.integers(y0 + 2, y0 + h - 2)
            t[y, x] = col(hi)
    if crack:
        x, y = int(r.integers(4, 12)), 1
        while y < 15:
            t[y, x] = col(mortar)
            y += 1
            x = int(np.clip(x + r.integers(-1, 2), 1, 14))
    if moss > 0:
        for x in range(16):
            ln = int(max(0, r.normal(moss * 4, 1.5)))
            for y in range(min(ln, 15)):
                t[y, x] = col(MOSS[2 if y == 0 else (1 if y < ln - 1 else 0)])
    return t


def top_overlay(seed):
    r = np.random.default_rng(seed + 100)
    t = rgba(16, 16)
    t[0, :] = col(F_HI)
    t[1, :] = col(F_LIGHT)
    for x in range(16):
        if r.random() < 0.55:
            ln = int(r.integers(1, 4))
            for y in range(ln):
                t[y, x] = col(MOSS[2 if y == 0 else 1])
            if r.random() < 0.3:
                t[ln, x] = col(MOSS[0])
    # dangling vines sometimes
    if seed % 3 == 0:
        x = int(r.integers(3, 13))
        for y in range(2, int(r.integers(6, 12))):
            t[y, x] = col(MOSS[1 if y % 3 else 0])
    return t


def pillar(part):
    t = rgba(16, 16)
    for x in range(2, 14):
        shade = B_LIGHT if x in (4, 5) else (B_MID if x < 10 else B_DARK)
        t[:, x] = col(shade)
    t[:, 2] = col(B_MORTAR)
    t[:, 13] = col(B_MORTAR)
    if part == "top":
        fill(t, 0, 0, 16, 5, B_LIGHT)
        fill(t, 0, 4, 16, 1, B_MORTAR)
        fill(t, 1, 5, 14, 2, B_MID)
        fill(t, 1, 7, 14, 1, B_MORTAR)
        fill(t, 0, 0, 16, 1, B_MORTAR)
    elif part == "bot":
        fill(t, 1, 9, 14, 2, B_MID)
        fill(t, 1, 11, 14, 1, B_MORTAR)
        fill(t, 0, 12, 16, 4, B_LIGHT)
        fill(t, 0, 15, 16, 1, B_MORTAR)
    else:
        for y in (5, 11):
            t[y, 3:13] = col(B_DARK)
    return t


def window():
    w, h = 32, 48
    t = rgba(w, h)
    # frame stones
    c = SS(w, h)
    c.ellipse(16, 16, 14, 14, B_LIGHT + (255,))
    c.rect(2, 16, 28, 32, B_LIGHT + (255,))
    c.ellipse(16, 16, 11, 11, (60, 72, 120, 255))
    c.rect(5, 16, 22, 30, (60, 72, 120, 255))
    # moonlit sky gradient
    arr = c.down()
    sky_top, sky_bot = np.array([90, 110, 170]), np.array([40, 48, 96])
    for y in range(h):
        k = y / h
        sk = sky_top * (1 - k) + sky_bot * k
        for x in range(w):
            if abs(arr[y, x, 2] - 120) < 30 and arr[y, x, 3] > 128 and arr[y, x, 0] < 80:
                arr[y, x, :3] = sk
    out = snap(arr, [B_LIGHT, B_MID, (90, 110, 170), (74, 92, 150), (58, 72, 128), (44, 54, 104)])
    # bars and moon
    for x in (11, 16, 21):
        out[6:46, x] = col(IRON[1])
    out[22, 6:27] = col(IRON[1])
    for yy in range(-2, 3):
        for xx in range(-2, 3):
            if xx * xx + yy * yy <= 5:
                out[12 + yy, 23 + xx] = col((230, 236, 210))
    out = outline(out, B_MORTAR, grow=False)
    fill(out, 0, 44, 32, 4, B_LIGHT)
    out[44, :] = col(B_MORTAR)
    return out


def chain():
    t = rgba(8, 16)
    for i in range(4):
        y = i * 4
        if i % 2 == 0:
            fill(t, 2, y, 4, 4, IRON[2]); fill(t, 3, y + 1, 2, 2, (0, 0, 0))
            t[y + 1:y + 3, 3:5] = 0
            t[y, 2] = col(IRON[3])
        else:
            fill(t, 3, y, 2, 4, IRON[1])
    return t


def banner():
    t = rgba(16, 32)
    fill(t, 0, 0, 16, 2, IRON[2])
    for y in range(2, 30):
        for x in range(2, 14):
            if y > 22 and (x + y) % 5 < 2 and y > 26 - (x % 4):
                continue
            c = (96, 28, 40) if x > 4 else (70, 20, 30)
            if x == 13:
                c = (60, 16, 26)
            t[y, x] = col(c)
    # emblem
    for y in range(8, 16):
        for x in range(5, 11):
            if abs(x - 7.5) + abs(y - 12) < 4:
                t[y, x] = col(GOLD[1])
    t[12, 7:9] = col(GOLD[2])
    return t


def sconce():
    t = rgba(8, 10)
    fill(t, 2, 4, 4, 6, IRON[1])
    fill(t, 0, 2, 8, 3, IRON[2])
    t[2, 0:8] = col(IRON[3])
    fill(t, 3, 8, 2, 2, IRON[0])
    return t


def flame(i):
    c = SS(8, 12)
    wob = [0, 0.7, -0.4, 0.3][i]
    h = [10, 11, 9.5, 10.5][i]
    c.poly([(4 + wob, 12 - h), (7.2, 9), (6, 12), (2, 12), (0.8, 9)], (230, 90, 40, 255))
    c.poly([(4 + wob * 0.6, 12 - h * 0.7), (6, 9.5), (5, 12), (3, 12), (2, 9.5)], (255, 180, 60, 255))
    c.ellipse(4, 10.5, 1.2, 1.5, (255, 244, 190, 255))
    return snap(c.down(), [(230, 90, 40), (255, 180, 60), (255, 244, 190)])


def gate():
    t = rgba(16, 48)
    for x in (1, 5, 10, 14):
        fill(t, x, 0, 2, 44, IRON[1])
        t[:44, x] = col(IRON[2])
        # spikes
        t[44, x:x + 2] = col(IRON[2])
        t[45, x:x + 2] = col(IRON[1])
        t[46, x] = col(IRON[1])
    for y in (4, 20, 36):
        fill(t, 0, y, 16, 3, IRON[1])
        t[y, :] = col(IRON[3])
        t[y + 2, :] = col(IRON[0])
        for x in (3, 8, 12):
            t[y + 1, x] = col(IRON[3])
    return outline(t, IRON[0], grow=False)


def plate(on):
    t = rgba(24, 6)
    fill(t, 0, 2, 24, 4, F_DARK)
    fill(t, 1, 1, 22, 2, F_LIGHT)
    t[1, 1:23] = col(F_HI)
    t[5, :] = col(F_MORTAR)
    rune = GLOW[2] if on else (60, 70, 90)
    rune2 = GLOW[1] if on else (48, 54, 72)
    for x in (5, 9, 12, 15, 18):
        t[3, x] = col(rune)
    for x in (6, 7, 10, 13, 14, 17):
        t[2 if x % 2 else 3, x] = col(rune2)
    if on:
        t[1, 3:21] = col(GLOW[1])
    return outline(t, F_MORTAR, grow=False)


def lever(on):
    c = SS(16, 16)
    ang = math.radians(35 if on else -35)
    x0, y0 = 8, 12
    x1, y1 = x0 + math.sin(ang) * 9, y0 - math.cos(ang) * 9
    c.line([(x0, y0), (x1, y1)], 1.6, IRON[2] + (255,))
    c.circle(x1, y1, 1.8, (180, 60, 50, 255) if not on else (90, 200, 120, 255))
    c.rect(3, 11, 10, 5, F_DARK + (255,))
    c.rect(4, 11, 8, 1, F_HI + (255,))
    t = snap(c.down(), [IRON[2], (180, 60, 50), (90, 200, 120), F_DARK, F_HI])
    return outline(t, F_MORTAR, grow=False)


def block():
    t = rgba(16, 16)
    fill(t, 0, 0, 16, 16, (104, 96, 84))
    fill(t, 1, 1, 14, 1, (150, 140, 120))
    fill(t, 1, 1, 1, 14, (140, 130, 112))
    fill(t, 14, 1, 1, 14, (70, 64, 58))
    fill(t, 1, 14, 14, 1, (70, 64, 58))
    # carved face / rune
    fill(t, 4, 4, 8, 8, (84, 78, 70))
    for (x, y) in [(5, 6), (6, 6), (9, 6), (10, 6), (7, 8), (8, 8), (6, 10), (7, 10), (8, 10), (9, 10)]:
        t[y, x] = col((50, 46, 42))
    t[4, 4:12] = col((70, 64, 58))
    t[4:12, 4] = col((70, 64, 58))
    r = np.random.default_rng(3)
    for _ in range(10):
        x, y = r.integers(2, 14), r.integers(2, 14)
        if not (4 <= x < 12 and 4 <= y < 12):
            t[y, x] = col((120, 110, 96))
    return outline(t, (36, 30, 28), grow=False)


def shrine(on):
    c = SS(16, 28)
    stone = (98, 92, 112, 255)
    c.rect(2, 22, 12, 6, stone)
    c.rect(4, 12, 8, 10, stone)
    c.rect(1, 8, 14, 4, stone)
    c.poly([(1, 8), (8, 2), (15, 8)], stone)
    c.rect(5, 13, 6, 6, (30, 26, 40, 255))
    t = snap(c.down(), [stone[:3], (30, 26, 40)])
    t = outline(t, F_MORTAR, grow=False)
    # stone shading
    t[9, 2:14] = col(F_HI)
    t[23, 3:13] = col(F_HI)
    if on:
        for y in range(14, 19):
            for x in range(6, 10):
                t[y, x] = col(GLOW[1] if (x in (6, 9) or y in (14, 18)) else GLOW[2])
    else:
        t[16:18, 7:9] = col((70, 60, 70))
    return t


def door_frame():
    w, h = 64, 72
    c = SS(w, h)
    stone = (74, 68, 92, 255)
    c.rect(0, 16, 64, 56, stone)
    c.ellipse(32, 24, 32, 24, stone)
    c.rect(10, 24, 44, 48, (8, 6, 14, 255))
    c.ellipse(32, 24, 22, 18, (8, 6, 14, 255))
    t = snap(c.down(), [stone[:3], (8, 6, 14)])
    # brick lines on the frame
    for y in range(4, h, 8):
        for x in range(w):
            if t[y, x, 0] == stone[0] and t[y, x, 3]:
                t[y, x] = col(F_MORTAR)
    for y in range(h):
        off = 0 if (y // 8) % 2 else 4
        for x in range(off, w, 9):
            if t[y, x, 0] == stone[0] and t[y, x, 3] and y % 8 != 4:
                t[y, x] = col(F_MORTAR)
    # keystone gem
    for yy in range(-3, 4):
        for xx in range(-3, 4):
            if abs(xx) + abs(yy) <= 3:
                t[3 + yy + 1, 32 + xx] = col(GLOW[1] if abs(xx) + abs(yy) < 2 else GLOW[0])
    return outline(t, F_MORTAR, grow=False)


def door_slab():
    w, h = 44, 50
    t = rgba(w, h)
    fill(t, 0, 0, w, h, (92, 86, 108))
    for y in range(0, h, 10):
        t[y, :] = col((64, 58, 80))
    t[:, 21:23] = col((40, 34, 52))
    for x in (1,):
        t[:, x] = col((130, 122, 146))
    t[:, w - 2] = col((64, 58, 80))
    # glowing crest
    cx, cy = 22, 22
    for yy in range(-9, 10):
        for xx in range(-9, 10):
            d = math.hypot(xx, yy)
            if 6.5 < d < 8.2 or (abs(xx) < 1 and abs(yy) < 8) or (abs(yy) < 1 and abs(xx) < 8):
                t[cy + yy, cx + xx] = col(GLOW[1])
    return outline(t, F_MORTAR, grow=False)


def sign():
    t = rgba(14, 16)
    fill(t, 1, 0, 12, 14, (108, 102, 118))
    fill(t, 0, 13, 14, 3, F_DARK)
    t[0, 1:13] = col(F_HI)
    for y in (3, 6, 9):
        t[y, 3:11] = col((60, 54, 70))
        t[y, 3 + (y % 3):6] = col((70, 64, 80))
    return outline(t, F_MORTAR, grow=False)


def bg_far():
    """Tileable (x) far layer: colossal arches in deep indigo."""
    w, h = 256, 216
    c = SS(w, h, ss=4)
    c.rect(0, 0, w, h, (14, 12, 26, 255))
    for i in range(2):
        cx = 64 + i * 128
        c.rect(cx - 64, 20, 22, h, (22, 20, 40, 255))
        c.rect(cx + 42, 20, 22, h, (22, 20, 40, 255))
        c.ellipse(cx, 60, 54, 50, (22, 20, 40, 255))
        c.ellipse(cx, 64, 44, 44, (14, 12, 26, 255))
        c.rect(cx - 44, 64, 88, h, (14, 12, 26, 255))
        # distant light slit
        c.rect(cx - 3, 40, 6, 30, (36, 40, 72, 255))
        c.ellipse(cx, 40, 3, 3, (36, 40, 72, 255))
    c.rect(0, 0, w, 20, (22, 20, 40, 255))
    arr = c.down()
    t = snap(arr, [(14, 12, 26), (22, 20, 40), (36, 40, 72)])
    # sparse brick hints on pillars
    r = np.random.default_rng(11)
    for _ in range(260):
        x, y = int(r.integers(0, w)), int(r.integers(0, h))
        if tuple(t[y, x, :3]) == (22, 20, 40):
            t[y, x:x + 3] = col((18, 16, 32))
    return t


def bg_mid():
    """Tileable (x) mid layer: columns with chains, transparent gaps."""
    w, h = 320, 216
    t = rgba(w, h)
    colr = [(24, 22, 38), (30, 28, 48), (38, 35, 58), (18, 16, 30)]
    for cx in (40, 200):
        for x in range(cx - 12, cx + 12):
            k = (x - cx + 12) / 24
            cc = colr[2] if k < 0.25 else (colr[1] if k < 0.7 else colr[0])
            t[:, x] = col(cc)
        t[:, cx - 12] = col(colr[3])
        t[:, cx + 11] = col(colr[3])
        for y in range(0, h, 12):
            t[y, cx - 11:cx + 11] = col(colr[3])
        # capital
        fill(t, cx - 16, 30, 32, 6, colr[2])
        t[30, cx - 16:cx + 16] = col(colr[1])
        t[35, cx - 16:cx + 16] = col(colr[3])
    # chains
    for cx, ln in ((110, 90), (128, 60), (270, 120)):
        for y in range(0, ln):
            if y % 4 < 2:
                t[y, cx:cx + 2] = col((40, 40, 56))
            else:
                t[y, cx - 1] = col((40, 40, 56))
                t[y, cx + 2] = col((40, 40, 56))
    return t


def all_items():
    items = {}
    for i in range(4):
        items[f"fg{i}"] = brick_tile(i, [F_MORTAR, F_DARK, F_MID, F_LIGHT, F_HI])
    items["fg4"] = brick_tile(4, [F_MORTAR, F_DARK, F_MID, F_LIGHT, F_HI], crack=True)
    items["fg5"] = brick_tile(5, [F_MORTAR, F_DARK, F_MID, F_LIGHT, F_HI], big=True)
    for i in range(4):
        items[f"top{i}"] = top_overlay(i)
    bgpal = [B_MORTAR, B_DARK, B_MID, B_LIGHT]
    for i in range(4):
        items[f"bg{i}"] = brick_tile(20 + i, bgpal)
    items["bg4"] = brick_tile(24, bgpal, crack=True)
    items["bg5"] = brick_tile(25, bgpal, moss=0.6)
    for p in ("top", "mid", "bot"):
        items[f"pillar_{p}"] = pillar(p)
    items["window"] = window()
    items["chain"] = chain()
    items["banner"] = banner()
    items["sconce"] = sconce()
    for i in range(4):
        items[f"flame{i}"] = flame(i)
    items["gate"] = gate()
    items["plate_off"] = plate(False)
    items["plate_on"] = plate(True)
    items["lever_off"] = lever(False)
    items["lever_on"] = lever(True)
    items["block"] = block()
    items["shrine_off"] = shrine(False)
    items["shrine_on"] = shrine(True)
    items["door_frame"] = door_frame()
    items["door"] = door_slab()
    items["sign"] = sign()
    return items


if __name__ == "__main__":
    import os
    from PIL import Image
    from pixlib import Atlas
    items = all_items()
    at = Atlas(256)
    for k, v in items.items():
        at.add(k, v)
    im, rects = at.build()
    bgc = Image.new("RGBA", im.size, (60, 60, 60, 255))
    bgc.alpha_composite(im)
    bgc.resize((im.width * 4, im.height * 4), Image.NEAREST).save(os.path.join(os.path.dirname(__file__), "_tiles.png"))
    far = Image.fromarray(bg_far(), "RGBA")
    mid = Image.fromarray(bg_mid(), "RGBA")
    comp = far.copy()
    comp.alpha_composite(mid.crop((0, 0, 256, 216)))
    comp.resize((512, 432), Image.NEAREST).save(os.path.join(os.path.dirname(__file__), "_bg.png"))
