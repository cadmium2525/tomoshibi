"""Home-screen / favicon icons for the PWA.

    python tools/make_icons.py                 # placeholder built from the game sprites
    python tools/make_icons.py path/to/art.png # use your own square artwork

Writes icons/icon-32.png, icon-192.png, icon-512.png, icon-maskable-512.png and
apple-touch-icon.png. Keep the important part of your artwork inside the central
80% so the maskable version (round / squircle crops on Android) does not cut it.
"""
import os, sys
import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
OUT = os.path.join(ROOT, "icons")
BG = (14, 12, 26)


def placeholder():
    sys.path.insert(0, HERE)
    import heroine
    n = 64
    y, x = np.mgrid[0:n, 0:n]
    # night-blue backdrop with a warm, banded lantern glow behind her
    top, bot = np.array([34, 30, 70]), np.array([10, 8, 20])
    img = (top * (1 - y / n)[..., None] + bot * (y / n)[..., None])
    d = np.hypot(x - n / 2, y - n * 0.46)
    for r, col, a in ((30, (255, 200, 120), 0.10), (22, (255, 210, 140), 0.16), (14, (255, 226, 170), 0.22)):
        m = d < r
        img[m] = img[m] * (1 - a) + np.array(col) * a
    base = np.dstack([img, np.full((n, n), 255)]).astype(np.uint8)
    canvas = Image.fromarray(base, "RGBA")
    girl = Image.fromarray(heroine.frames()["joy"], "RGBA")
    canvas.alpha_composite(girl, ((n - girl.width) // 2, n - girl.height - 6))
    return canvas.resize((512, 512), Image.NEAREST)


def load(path):
    im = Image.open(path).convert("RGBA")
    s = min(im.size)
    im = im.crop(((im.width - s) // 2, (im.height - s) // 2, (im.width + s) // 2, (im.height + s) // 2))
    flat = Image.new("RGBA", im.size, BG + (255,))
    flat.alpha_composite(im)
    return flat


def fit(im, size):
    method = Image.NEAREST if im.width <= 128 or im.width % size == 0 or size % im.width == 0 else Image.LANCZOS
    return im.resize((size, size), method)


def main():
    src = load(sys.argv[1]) if len(sys.argv) > 1 else placeholder()
    os.makedirs(OUT, exist_ok=True)
    for size, name in ((32, "icon-32.png"), (192, "icon-192.png"), (512, "icon-512.png"), (180, "apple-touch-icon.png")):
        fit(src, size).convert("RGB").save(os.path.join(OUT, name), optimize=True)
    # maskable: artwork shrunk into the 80% safe zone on a full-bleed background
    mask = Image.new("RGBA", (512, 512), BG + (255,))
    inner = fit(src, 410)
    mask.alpha_composite(inner, ((512 - 410) // 2, (512 - 410) // 2))
    mask.convert("RGB").save(os.path.join(OUT, "icon-maskable-512.png"), optimize=True)
    print("icons written to", OUT)


if __name__ == "__main__":
    main()
