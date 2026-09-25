"""Hero sprite pipeline (used by build_assets.py).

Slices the hi-res sheets in assets/chars/oldman, shrinks every frame to an
SFC-sized sprite (about 46px tall), quantises all frames to one shared palette
and adds a dark outline.
"""
import os
import numpy as np
from PIL import Image
import attack
import carry

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "assets", "chars", "oldman")

TARGET_H = 46          # standing height in game pixels
FRAME_W, FRAME_H = 56, 54
ANCHOR_X, ANCHOR_Y = 28, 52   # feet position inside a frame cell
PALETTE_SIZE = 28
OUTLINE = (24, 14, 18)


def grid_cells(img, cell_w, cell_h, count, cols):
    out = []
    for i in range(count):
        cx, cy = (i % cols) * cell_w, (i // cols) * cell_h
        out.append(img.crop((cx, cy, cx + cell_w, cy + cell_h)))
    return out


def opaque_bbox(im, thr=128):
    a = np.array(im)[..., 3] >= thr
    ys, xs = np.nonzero(a)
    return xs.min(), ys.min(), xs.max() + 1, ys.max() + 1


def body_anchor_x(im, thr=128):
    """x of the upper-body centre (head + chest), stable across leg poses."""
    a = np.array(im)[..., 3] >= thr
    ys, xs = np.nonzero(a)
    top, bot = ys.min(), ys.max()
    band = (ys >= top + (bot - top) * 0.05) & (ys <= top + (bot - top) * 0.42)
    return float(np.median(xs[band]))


def shrink(im, scale):
    x0, y0, x1, y1 = opaque_bbox(im, 20)
    ax = body_anchor_x(im)
    # pad crop so that anchor maps onto integer pixel after scaling
    crop = im.crop((x0, y0, x1, y1))
    w, h = crop.size
    nw, nh = max(1, round(w * scale)), max(1, round(h * scale))
    small = crop.resize((nw, nh), Image.BOX)
    arr = np.array(small).astype(np.float32)
    anchor_small_x = (ax - x0) * scale
    return arr, anchor_small_x


def load_frames():
    frames = {}
    walk = Image.open(os.path.join(SRC, "walk_sheet.png")).convert("RGBA")
    run = Image.open(os.path.join(SRC, "run.png")).convert("RGBA")
    jump = Image.open(os.path.join(SRC, "jump.png")).convert("RGBA")
    idle = Image.open(os.path.join(SRC, "idle01.png")).convert("RGBA")

    walk_cells = grid_cells(walk, 512, 542, 30, 11)
    run_cells = grid_cells(run, 256, 256, 21, 5)
    jump_cells = grid_cells(jump, 256, 256, 25, 5)

    # scale so the standing pose becomes TARGET_H
    def stand_h(cells, idx):
        x0, y0, x1, y1 = opaque_bbox(cells[idx])
        return y1 - y0

    s_walk = TARGET_H / np.median([stand_h(walk_cells, i) for i in range(30)])
    s_jump = TARGET_H / np.median([stand_h(jump_cells, i) for i in range(20, 25)])
    s_run = s_jump
    s_idle = TARGET_H / (opaque_bbox(idle)[3] - opaque_bbox(idle)[1])
    for i, c in enumerate(walk_cells):
        frames[f"walk{i}"] = shrink(c, s_walk)
    for i, c in enumerate(run_cells):
        frames[f"run{i}"] = shrink(c, s_run)
    for i, c in enumerate(jump_cells):
        frames[f"jump{i}"] = shrink(c, s_jump)
    frames["front"] = shrink(idle, s_idle)
    # attack swing: same size as the idle pose; anchor between the feet
    cells = attack.cells()
    s_atk = None
    for i in attack.PICK:
        rgba, fire = attack.clean(cells[i])
        im = Image.fromarray(rgba)
        x0, y0, x1, y1 = opaque_bbox(im, 110)
        if s_atk is None:   # first pick: wind-up, pole held at head height
            s_atk = TARGET_H * 0.97 / (y1 - y0)
        a = rgba[..., 3] >= 110
        ys, xs = np.nonzero(a)
        ax = float(np.median(xs[ys >= y1 - (y1 - y0) * 0.08]))
        crop = im.crop((x0, y0, x1, y1))
        nw, nh = round((x1 - x0) * s_atk), round((y1 - y0) * s_atk)
        arr = np.array(crop.resize((nw, nh), Image.BOX)).astype(np.float32)
        tx, ty = attack.tip(rgba, fire)
        # tip relative to the feet anchor, in game pixels
        ATTACK_TIPS[f"atk{i}"] = [round((tx - ax) * s_atk, 1), round((ty - y1) * s_atk, 1)]
        frames[f"atk{i}"] = (arr, (ax - x0) * s_atk)
    # lifting / carrying the weight stone: anchored under the head, box centre exported
    st = carry.cell(carry.STAND)
    x0, y0, x1, y1 = opaque_bbox(st, 110)
    s_car = TARGET_H / (y1 - y0)
    for name, ids in (("lift", carry.LIFT), ("carry", carry.WALK)):
        for k, i in enumerate(ids):
            im = carry.cell(i)
            x0, y0, x1, y1 = opaque_bbox(im, 110)
            ax = carry.head_x(im)
            bx, by = carry.box_center(im)
            crop = im.crop((x0, y0, x1, y1))
            arr = np.array(crop.resize((round((x1 - x0) * s_car), round((y1 - y0) * s_car)), Image.BOX)).astype(np.float32)
            BOXES[f"{name}{k}"] = [round((bx - ax) * s_car, 1), round((by - y1) * s_car, 1)]
            frames[f"{name}{k}"] = (arr, (ax - x0) * s_car)
    return frames


ATTACK_TIPS = {}
BOXES = {}


def alpha_cut(arr, thr=110):
    """PIL's BOX resize already un-premultiplies, so only the alpha needs a cut."""
    return arr[..., :3], arr[..., 3] >= thr


def build_palette(frames):
    pix = []
    for arr, _ in frames.values():
        rgb, a = alpha_cut(arr)
        pix.append(rgb[a])
    pix = np.concatenate(pix).astype(np.uint8)
    img = Image.fromarray(pix.reshape(1, -1, 3), "RGB")
    q = img.quantize(colors=PALETTE_SIZE, method=Image.Quantize.MEDIANCUT, kmeans=4)
    pal = np.array(q.getpalette()[: PALETTE_SIZE * 3]).reshape(-1, 3)
    return pal


def apply_palette(arr, pal):
    rgb, a = alpha_cut(arr)
    d = ((rgb[:, :, None, :] - pal[None, None, :, :]) ** 2).sum(-1)
    idx = d.argmin(-1)
    out = np.zeros(arr.shape[:2] + (4,), np.uint8)
    out[..., :3] = pal[idx]
    out[..., 3] = np.where(a, 255, 0)
    return out


def add_outline(rgba):
    h, w = rgba.shape[:2]
    pad = np.zeros((h + 2, w + 2, 4), np.uint8)
    pad[1:-1, 1:-1] = rgba
    a = pad[..., 3] > 0
    nb = np.zeros_like(a)
    nb[1:, :] |= a[:-1, :]
    nb[:-1, :] |= a[1:, :]
    nb[:, 1:] |= a[:, :-1]
    nb[:, :-1] |= a[:, 1:]
    edge = nb & ~a
    pad[edge] = (*OUTLINE, 255)
    return pad


def place(rgba, anchor_x):
    """Place a small sprite into a fixed frame cell, feet on ANCHOR_Y."""
    cell = np.zeros((FRAME_H, FRAME_W, 4), np.uint8)
    h, w = rgba.shape[:2]
    ox = int(round(ANCHOR_X - (anchor_x + 1)))
    oy = ANCHOR_Y + 1 - h   # +1: outline row under the feet
    for y in range(h):
        ty = oy + y
        if 0 <= ty < FRAME_H:
            for x in range(w):
                tx = ox + x
                if 0 <= tx < FRAME_W and rgba[y, x, 3]:
                    cell[ty, tx] = rgba[y, x]
    return cell


def hero_items():
    """name -> (rgba, ax, ay); ax/ay = feet anchor."""
    frames = load_frames()
    pal = build_palette(frames)
    out = {}
    for name, (arr, ax) in frames.items():
        o = add_outline(apply_palette(arr, pal))
        if name == "front":
            out[name] = (o, o.shape[1] // 2, o.shape[0] - 1)
        elif name.startswith(("atk", "lift", "carry")):
            out[name] = (o, int(round(ax)) + 1, o.shape[0] - 2)
        else:
            out[name] = (place(o, ax), ANCHOR_X, ANCHOR_Y)
    return out
