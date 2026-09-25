"""Grey lifting and carrying the weight stone (assets/chars/oldman/carry_sheet.webp,
14x13 cells, 181 frames).

The painted box is smaller than the game's 16px stone, so the game draws its own
stone over it: here we only find where the box is in every frame we use.
"""
import os
from collections import deque
import numpy as np
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "assets", "chars", "oldman", "carry_sheet.webp")
COLS, ROWS = 14, 13
STAND = 0                                       # plain standing frame (sets the scale)
LIFT = [14, 20, 28, 50, 62, 74, 84]             # stand by the stone -> crouch -> rise holding it
WALK = [112, 114, 116, 118, 120, 122, 124]      # one stride cycle while carrying


def cell(i):
    im = Image.open(SRC).convert("RGBA")
    W, H = im.size
    c, r = i % COLS, i // COLS
    a = np.array(im.crop((round(c * W / COLS), round(r * H / ROWS), round((c + 1) * W / COLS), round((r + 1) * H / ROWS))))
    a[a[..., 3] < 110] = 0
    return Image.fromarray(a)


def box_center(im):
    """Centre of the cardboard box: the biggest blob of its flat tan colour."""
    a = np.array(im).astype(int)
    r, g, b, al = a[..., 0], a[..., 1], a[..., 2], a[..., 3]
    tan = (al > 0) & (r > 150) & (g > 110) & (b > 70) & (r - b > 45) & (r - b < 120) & (g - b > 20)
    h, w = tan.shape
    seen = np.zeros_like(tan)
    best = []
    for sy in range(h):
        for sx in range(w):
            if tan[sy, sx] and not seen[sy, sx]:
                blob, q = [], deque([(sy, sx)]); seen[sy, sx] = True
                while q:
                    y, x = q.popleft(); blob.append((y, x))
                    for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                        ny, nx = y + dy, x + dx
                        if 0 <= ny < h and 0 <= nx < w and tan[ny, nx] and not seen[ny, nx]:
                            seen[ny, nx] = True; q.append((ny, nx))
                if len(blob) > len(best):
                    best = blob
    ys = np.array([p[0] for p in best]); xs = np.array([p[1] for p in best])
    return float(xs.mean()), float(ys.mean())


def head_x(im):
    a = np.array(im)[..., 3] > 0
    ys, xs = np.nonzero(a)
    top, bot = ys.min(), ys.max()
    band = ys <= top + (bot - top) * 0.16
    return float(np.median(xs[band]))


if __name__ == "__main__":
    out = Image.new("RGBA", (len(LIFT + WALK) * 110, 116), (40, 30, 60, 255))
    for k, i in enumerate(LIFT + WALK):
        im = cell(i)
        bx, by = box_center(im)
        for d in range(-3, 4):
            im.putpixel((int(bx) + d, int(by)), (0, 255, 0, 255)); im.putpixel((int(bx), int(by) + d), (0, 255, 0, 255))
        out.alpha_composite(im, (k * 110, 0))
    out.save(os.path.join(os.environ.get("OUT", "."), "carry_check.png"))
