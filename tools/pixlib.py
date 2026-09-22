"""Small helpers shared by the asset scripts: supersampled drawing, palette
snapping, outlines and atlas packing."""
import base64, io, math
import numpy as np
from PIL import Image, ImageDraw

OUTLINE = (24, 14, 18)


class SS:
    """Supersampled canvas. All coordinates are in *low-res* pixels."""

    def __init__(self, w, h, ss=8):
        self.w, self.h, self.ss = w, h, ss
        self.img = Image.new("RGBA", (w * ss, h * ss), (0, 0, 0, 0))
        self.d = ImageDraw.Draw(self.img)

    def _p(self, pts):
        return [(x * self.ss, y * self.ss) for x, y in pts]

    def poly(self, pts, col):
        self.d.polygon(self._p(pts), fill=col)

    def ellipse(self, cx, cy, rx, ry, col):
        s = self.ss
        self.d.ellipse([(cx - rx) * s, (cy - ry) * s, (cx + rx) * s, (cy + ry) * s], fill=col)

    def circle(self, cx, cy, r, col):
        self.ellipse(cx, cy, r, r, col)

    def line(self, pts, width, col):
        s = self.ss
        p = self._p(pts)
        self.d.line(p, fill=col, width=max(1, int(round(width * s))), joint="curve")
        for x, y in pts:
            self.circle(x, y, width / 2, col)

    def rect(self, x, y, w, h, col):
        s = self.ss
        self.d.rectangle([x * s, y * s, (x + w) * s - 1, (y + h) * s - 1], fill=col)

    def down(self):
        small = self.img.resize((self.w, self.h), Image.BOX)
        return np.array(small).astype(np.float32)


def snap(arr, palette, alpha_thr=110):
    """Map to nearest palette colour, binary alpha."""
    pal = np.array(palette, np.float32)
    rgb = arr[..., :3]
    a = arr[..., 3] >= alpha_thr
    d = ((rgb[:, :, None, :] - pal[None, None]) ** 2).sum(-1)
    idx = d.argmin(-1)
    out = np.zeros(arr.shape[:2] + (4,), np.uint8)
    out[..., :3] = pal[idx].astype(np.uint8)
    out[..., 3] = np.where(a, 255, 0)
    return out


def outline(rgba, col=OUTLINE, grow=True):
    """1px outline around the silhouette (4-neighbourhood)."""
    if grow:
        h, w = rgba.shape[:2]
        pad = np.zeros((h + 2, w + 2, 4), np.uint8)
        pad[1:-1, 1:-1] = rgba
    else:
        pad = rgba.copy()
    a = pad[..., 3] > 0
    nb = np.zeros_like(a)
    nb[1:, :] |= a[:-1, :]
    nb[:-1, :] |= a[1:, :]
    nb[:, 1:] |= a[:, :-1]
    nb[:, :-1] |= a[:, 1:]
    edge = nb & ~a
    pad[edge] = (*col, 255)
    return pad


def put(dst, src, ox, oy):
    """Alpha-over (binary) src onto dst at offset."""
    h, w = src.shape[:2]
    H, W = dst.shape[:2]
    for y in range(h):
        ty = oy + y
        if not 0 <= ty < H:
            continue
        row = src[y]
        m = row[:, 3] > 0
        xs = np.nonzero(m)[0]
        for x in xs:
            tx = ox + x
            if 0 <= tx < W:
                dst[ty, tx] = row[x]
    return dst


def rgba(w, h):
    return np.zeros((h, w, 4), np.uint8)


class Atlas:
    """Shelf packer. Each entry: name -> (x, y, w, h, ax, ay)."""

    def __init__(self, width=512):
        self.width = width
        self.items = []

    def add(self, name, arr, ax=0, ay=0):
        self.items.append((name, np.asarray(arr, np.uint8), ax, ay))

    def build(self):
        items = sorted(self.items, key=lambda t: -t[1].shape[0])
        x = y = shelf_h = 0
        rects = {}
        placed = []
        for name, arr, ax, ay in items:
            h, w = arr.shape[:2]
            if x + w > self.width:
                x = 0
                y += shelf_h + 1
                shelf_h = 0
            placed.append((name, arr, x, y))
            rects[name] = [x, y, w, h, ax, ay]
            x += w + 1
            shelf_h = max(shelf_h, h)
        H = y + shelf_h
        img = np.zeros((H, self.width, 4), np.uint8)
        for name, arr, px, py in placed:
            h, w = arr.shape[:2]
            img[py:py + h, px:px + w] = arr
        return Image.fromarray(img, "RGBA"), rects


def to_data_uri(im):
    buf = io.BytesIO()
    im.save(buf, "PNG", optimize=True)
    return "data:image/png;base64," + base64.b64encode(buf.getvalue()).decode()


def rot(p, ang, origin=(0, 0)):
    c, s = math.cos(ang), math.sin(ang)
    x, y = p[0] - origin[0], p[1] - origin[1]
    return (origin[0] + x * c - y * s, origin[1] + x * s + y * c)


def polar(origin, ang, length):
    """Angle 0 = straight down, positive = towards +x (forward)."""
    return (origin[0] + math.sin(ang) * length, origin[1] + math.cos(ang) * length)
