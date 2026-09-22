"""Heroine (Lumina) sprites, built from the illustration assets/chars/lumina/side.png.

The painted side view is cut into a body part (hair, torso, skirt) and the legs;
legs and - for poses that need them - arms are redrawn from a tiny skeleton in
colours sampled from the painting. Every pose is composed at 8x resolution and
then box-filtered down, so all frames share the painting's look.
Facing right; the game mirrors for left.
"""
import math, os
import numpy as np
from PIL import Image, ImageDraw
from pixlib import SS, snap, outline, polar

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SIDE = os.path.join(ROOT, "assets", "chars", "lumina", "side.png")
FRONT = os.path.join(ROOT, "assets", "chars", "lumina", "front.png")

W, H = 40, 44                 # output frame
AX, AY = 20, 42               # feet anchor inside the frame
FIG_H = 36                    # figure height in game pixels (hero is 46)
S = 8                         # work resolution multiplier
BW, BH = 64, 58               # big work canvas (game px) - room for rotations
HX, HY = 32, 34               # hip position on the big canvas (game px)
D = math.radians

# --- landmarks on the painting (source pixels) --------------------------------
TOP, SOLE, LEFT = 61, 1235, 349
HIP = (655, 868)
WAIST_Y, HEM_Y = 630, 958     # skirt sway happens between these rows
CUT_Y = 948                   # everything below is legs (redrawn)
SHOULDER = (622, 598)         # where the arm leaves the puffy sleeve
ARM_POLY = [(588, 596), (664, 590), (706, 640), (786, 664), (796, 768), (700, 776), (636, 706), (596, 646)]
SASH = (592, 632)             # y range of the blue sash
K = FIG_H / (SOLE - TOP)      # source px -> game px

LEG_THIGH = (1040 - HIP[1]) * K
LEG_SHIN = (1195 - 1040) * K


def _load():
    src = Image.open(SIDE).convert("RGBA")
    a = np.array(src)
    a[a[..., 3] < 110] = 0                       # drop the soft halo of the generator
    src = Image.fromarray(a, "RGBA")
    px = np.array(src.convert("RGB")).astype(int)
    col = lambda x, y: tuple(int(v) for v in np.median(px[y - 4:y + 5, x - 4:x + 5].reshape(-1, 3), axis=0))
    colors = {
        "skin": col(662, 1010), "sock": col(652, 1112), "shoe": col(612, 1200),
        "dress": col(560, 820), "sash": col(578, 612),
    }
    colors["skin_d"] = tuple(int(c * 0.82) for c in colors["skin"])
    colors["shoe_d"] = tuple(int(c * 0.7) for c in colors["shoe"])
    colors["dress_d"] = tuple(int(c * 0.86) for c in colors["dress"])

    def body(armless):
        im = src.copy()
        d = ImageDraw.Draw(im)
        d.rectangle([0, CUT_Y, im.width, im.height], fill=(0, 0, 0, 0))
        if armless:
            # paint the clasped arms away: dress, then the sash running across it
            mask = Image.new("L", im.size, 0)
            ImageDraw.Draw(mask).polygon(ARM_POLY, fill=255)
            m = np.array(mask) > 0
            arr = np.array(im)
            inside = m & (arr[..., 3] > 0)
            arr[inside] = (*colors["dress"], 255)
            ys = np.arange(arr.shape[0])[:, None]
            arr[inside & (ys >= SASH[0]) & (ys <= SASH[1])] = (*colors["sash"], 255)
            # soft fold shading on the painted-over part
            fold = inside & (ys > SASH[1]) & ((np.arange(arr.shape[1])[None, :] // 18) % 3 == 0)
            arr[fold] = (*colors["dress_d"], 255)
            im = Image.fromarray(arr, "RGBA")
        k = K * S
        return im.resize((round(im.width * k), round(im.height * k)), Image.BOX)

    return body(False), body(True), colors


BODY_CLASP, BODY_ARMLESS, C = _load()


def _palette():
    """Palette from the painting at game resolution (+ the skeleton colours)."""
    im = Image.open(SIDE).convert("RGBA")
    sm = np.array(im.resize((round(im.width * K), round(im.height * K)), Image.BOX)).astype(np.float32)
    pix = sm[..., :3][sm[..., 3] >= 110].astype(np.uint8)
    q = Image.fromarray(pix.reshape(1, -1, 3), "RGB").quantize(colors=22, method=Image.Quantize.MEDIANCUT, kmeans=4)
    pal = [tuple(c) for c in np.array(q.getpalette()[:66]).reshape(-1, 3)]
    for key in ("skin", "skin_d", "sock", "shoe", "shoe_d", "dress", "dress_d", "sash"):
        pal.append(C[key])
    return pal


PALETTE = _palette()

BASE = dict(
    bob=0.0, lean=0.0, skirt=0.0, crouch=0.0, root=0.0, pos=None,
    thigh_b=0.0, knee_b=0.0, thigh_f=0.0, knee_f=0.0,
    arms=None,                      # None = painted clasped hands; else dict(arm_f, elb_f, arm_b, elb_b)
    eyes="open",
)
STAND_HIP_Y = AY - (LEG_THIGH + LEG_SHIN) - 0.8


def _sway(img, amount_px):
    """Shift skirt rows sideways, growing towards the hem (game px at the hem)."""
    if abs(amount_px) < 0.01:
        return img
    a = np.array(img)
    out = a.copy()
    y0 = int(WAIST_Y * K * S)
    span = max(1, (HEM_Y - WAIST_Y) * K * S)
    for y in range(y0, a.shape[0]):
        t = min(1.0, (y - y0) / span)
        dx = int(round(amount_px * S * t * t))
        if dx:
            out[y] = np.roll(a[y], dx, axis=0)
            if dx > 0:
                out[y, :dx] = 0
            else:
                out[y, dx:] = 0
    return Image.fromarray(out, "RGBA")


def draw(**kw):
    p = dict(BASE)
    p.update(kw)
    c = SS(BW, BH, S)
    hip = (HX, HY + p["crouch"] + p["bob"])
    lean = D(p["lean"])

    def rot(pt, ang):
        x, y = pt[0] - hip[0], pt[1] - hip[1]
        return (hip[0] + x * math.cos(ang) - y * math.sin(ang), hip[1] + x * math.sin(ang) + y * math.cos(ang))

    def leg(thigh, knee, skin):
        k = polar(hip, thigh, LEG_THIGH)
        a = polar(k, thigh - knee, LEG_SHIN)
        c.line([hip, k, a], 2.1, skin + (255,))
        # sock from the ankle up the shin, with a frilly top
        s_top = polar(a, thigh - knee + math.pi, 2.0)
        c.line([a, s_top], 2.3, C["sock"] + (255,))
        c.circle(*s_top, 1.35, C["sock"] + (255,))
        # Mary Jane shoe pointing forward (perpendicular to the shin)
        ang = thigh - knee
        fwd = (math.cos(ang), math.sin(ang))
        toe = (a[0] + fwd[0] * 2.3, a[1] + fwd[1] * 2.3 + 0.4)
        heel = (a[0] - fwd[0] * 0.6, a[1] - fwd[1] * 0.6 + 0.4)
        c.line([heel, toe], 1.9, C["shoe"] + (255,))
        c.line([(a[0] - fwd[0] * 0.2, a[1] + 0.9), (toe[0], toe[1] + 0.5)], 0.7, C["shoe_d"] + (255,))

    shoulder = rot((HX + (SHOULDER[0] - HIP[0]) * K, hip[1] + (SHOULDER[1] - HIP[1]) * K), lean)

    def arm(a1, e, skin, back=False):
        sh = (shoulder[0] - (0.9 if back else 0), shoulder[1])
        el = polar(sh, a1 + lean, 3.6)
        hd = polar(el, a1 + lean + e, 3.4)
        c.line([sh, el, hd], 1.8, skin + (255,))
        c.circle(*hd, 1.1, skin + (255,))

    arms = p["arms"]
    if arms:
        arm(arms["arm_b"], arms["elb_b"], C["skin_d"], back=True)
    leg(p["thigh_b"], p["knee_b"], C["skin_d"])
    leg(p["thigh_f"], p["knee_f"], C["skin"])

    body = _sway(BODY_ARMLESS if arms else BODY_CLASP, p["skirt"])
    bhip = (HIP[0] * K * S, HIP[1] * K * S)                        # hip inside the body image (work px)
    layer = Image.new("RGBA", c.img.size, (0, 0, 0, 0))
    layer.paste(body, (int(round(hip[0] * S - bhip[0])), int(round(hip[1] * S - bhip[1]))), body)
    if abs(lean) > 1e-3:
        layer = layer.rotate(-math.degrees(lean), resample=Image.BICUBIC, center=(hip[0] * S, hip[1] * S))
    c.img.alpha_composite(layer)
    if arms:
        arm(arms["arm_f"], arms["elb_f"], C["skin"])

    img = c.img
    if p["root"]:
        img = img.rotate(-p["root"], resample=Image.BICUBIC, center=(hip[0] * S, hip[1] * S))
    big = np.array(img.resize((BW, BH), Image.BOX)).astype(np.float32)

    # crop the frame so the hip lands on pos (default: standing position)
    tx, ty = p["pos"] if p["pos"] else (AX, STAND_HIP_Y + p["crouch"] + p["bob"])
    x0, y0 = int(round(hip[0] - tx)), int(round(hip[1] - ty))
    frame = np.zeros((H, W, 4), np.float32)
    sx0, sy0 = max(0, x0), max(0, y0)
    sx1, sy1 = min(BW, x0 + W), min(BH, y0 + H)
    frame[sy0 - y0:sy1 - y0, sx0 - x0:sx1 - x0] = big[sy0:sy1, sx0:sx1]
    arr = snap(frame, PALETTE)
    if p["eyes"] == "closed":
        _close_eyes(arr)
    return outline(arr, grow=False)


def _close_eyes(arr):
    """Turn the blue eye pixels into a closed-lid line."""
    rgb = arr[..., :3].astype(int)
    eye = (rgb[..., 2] > rgb[..., 0] + 40) & (rgb[..., 2] > rgb[..., 1] + 10) & (arr[..., 3] > 0)
    face = np.zeros_like(eye)
    ys, xs = np.nonzero(arr[..., 3] > 0)
    if not len(ys):
        return
    face[ys.min():ys.min() + 14] = True           # head area only (skip ribbon: it is behind, x-left)
    cx = xs.max() - 7
    face[:, :cx] = False
    ys, xs = np.nonzero(eye & face)
    for y, x in zip(ys, xs):
        arr[y, x, :3] = C["skin"]
    if len(ys):
        y = int(ys.max())
        arr[y, int(xs.min()):int(xs.max()) + 1, :3] = (70, 44, 40)


def front():
    """Front-facing still (for the ending)."""
    im = Image.open(FRONT).convert("RGBA")
    a = np.array(im)
    a[a[..., 3] < 110] = 0
    im = Image.fromarray(a, "RGBA")
    ys, xs = np.nonzero(np.array(im)[..., 3] > 0)
    im = im.crop((xs.min(), ys.min(), xs.max() + 1, ys.max() + 1))
    k = FIG_H / im.height
    sm = np.array(im.resize((round(im.width * k), FIG_H), Image.BOX)).astype(np.float32)
    return outline(snap(sm, PALETTE))


# ---------------------------------------------------------------------------
def frames():
    F = {}
    s = math.sin
    swing = lambda a, e: dict(arm_f=-a, elb_f=e, arm_b=a, elb_b=e)
    # idle (breathing) / wait: the painted pose with hands clasped
    F["idle0"] = draw()
    F["idle1"] = draw(bob=0.4)
    F["wait0"] = draw(lean=-2)
    F["wait1"] = draw(lean=-2, bob=0.4)
    # walk: timid little steps, hands still clasped
    for i in range(8):
        t = i / 8 * 2 * math.pi
        sw = s(t)
        F[f"walk{i}"] = draw(bob=-0.5 * abs(math.cos(t)) + 0.2, lean=3,
                             thigh_f=D(24) * sw, knee_f=D(max(0, -sw) * 40 + 4),
                             thigh_b=-D(24) * sw, knee_b=D(max(0, sw) * 40 + 4), skirt=0.5 * sw)
    # run: arms swing
    for i in range(6):
        t = i / 6 * 2 * math.pi
        sw = s(t)
        F[f"run{i}"] = draw(bob=-1.0 * abs(math.cos(t)) + 0.6, lean=10,
                            thigh_f=D(44) * sw + D(8), knee_f=D(max(0, -sw) * 70 + 12),
                            thigh_b=-D(44) * sw + D(8), knee_b=D(max(0, sw) * 70 + 12),
                            skirt=-0.9 + 0.8 * sw, arms=swing(D(48) * sw, D(70)))
    F["jump"] = draw(bob=-1, lean=5, thigh_f=D(55), knee_f=D(80), thigh_b=D(10), knee_b=D(60), skirt=-1.2,
                     arms=dict(arm_f=D(125), elb_f=D(15), arm_b=D(-40), elb_b=D(20)))
    F["fall"] = draw(bob=-1, thigh_f=D(28), knee_f=D(40), thigh_b=D(-10), knee_b=D(30), skirt=0.6,
                     arms=dict(arm_f=D(145), elb_f=D(-10), arm_b=D(-140), elb_b=D(10)))
    F["leap"] = draw(bob=-1, lean=16, thigh_f=D(40), knee_f=D(70), thigh_b=D(-25), knee_b=D(50), skirt=-1.4,
                     arms=dict(arm_f=D(95), elb_f=D(0), arm_b=D(80), elb_b=D(5)))
    F["land"] = draw(crouch=2.5, lean=10, thigh_f=D(60), knee_f=D(115), thigh_b=D(45), knee_b=D(105))
    F["anx0"] = draw(lean=-6)
    F["anx1"] = draw(lean=-4, bob=0.4)
    F["reachup0"] = draw(lean=-8, arms=dict(arm_f=D(165), elb_f=D(-8), arm_b=D(155), elb_b=D(0)))
    F["reachup1"] = draw(lean=-8, bob=-1.2, thigh_f=D(10), knee_f=D(20),
                         arms=dict(arm_f=D(172), elb_f=D(-4), arm_b=D(162), elb_b=D(0)))
    F["climb"] = draw(bob=-2, lean=6, thigh_f=D(70), knee_f=D(100), thigh_b=D(-10), knee_b=D(30),
                      arms=dict(arm_f=D(178), elb_f=D(0), arm_b=D(172), elb_b=D(0)))
    for i in range(2):
        F[f"cower{i}"] = draw(crouch=5.5, lean=24 + 2 * i, thigh_f=D(95), knee_f=D(165), thigh_b=D(85), knee_b=D(160),
                              pos=(AX + 0.4 * i, STAND_HIP_Y + 5.5), eyes="closed",
                              arms=dict(arm_f=D(160), elb_f=D(75), arm_b=D(150), elb_b=D(80)))
    # carried over a shoulder: body horizontal, head hanging behind. Anchor = hip.
    for i in range(2):
        F[f"carried{i}"] = draw(root=-95, pos=(AX, 22), thigh_f=D(-35 + 25 * i), knee_f=D(-70),
                                thigh_b=D(-10 - 25 * i), knee_b=D(-80), eyes="closed" if i else "open",
                                arms=dict(arm_f=D(-95 - 30 * i), elb_f=D(-10), arm_b=D(-70 - 25 * i), elb_b=D(-20)))
    F["down"] = draw(root=-90, pos=(AX + 4, 34.5), thigh_f=D(25), knee_f=D(45), thigh_b=D(10), knee_b=D(30), eyes="closed")
    F["sit"] = draw(crouch=4.5, lean=-8, thigh_f=D(88), knee_f=D(20), thigh_b=D(80), knee_b=D(35), skirt=1.5,
                    pos=(AX, STAND_HIP_Y + 4.5))
    F["joy"] = draw(bob=-1, thigh_b=D(-15), knee_b=D(50), eyes="closed",
                    arms=dict(arm_f=D(160), elb_f=D(10), arm_b=D(150), elb_b=D(10)))
    return F


ANCHORS = {"carried0": (AX, 22), "carried1": (AX, 22)}


if __name__ == "__main__":
    import sys
    F = frames()
    F["front"] = front()
    names = list(F)
    cols = 9
    rows = (len(names) + cols - 1) // cols
    sheet = Image.new("RGBA", (cols * W, rows * H), (54, 60, 80, 255))
    for i, n in enumerate(names):
        im = Image.fromarray(F[n], "RGBA")
        sheet.alpha_composite(im, ((i % cols) * W + (W - im.width) // 2, (i // cols) * H + H - im.height))
    out = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(__file__), "_heroine.png")
    sheet.resize((sheet.width * 5, sheet.height * 5), Image.NEAREST).save(out)
    print(names)
