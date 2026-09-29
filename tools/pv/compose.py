"""Put the PV together: footage (pv/footage, recorded with tools/pv/recorder.js), captions
(pv/stills, from tools/pv/captions.js), the story pictures and pv/music.wav (tools/pv/music.py).
  python tools/pv/compose.py [wide|tall|both] [--preview]
wide = 1920x1080 (footage x5, nearest), tall = 1080x1920 (footage x3 on a blurred fill).
--preview writes a contact sheet of the cut (one frame every 0.5 s) instead of the video."""
import os, subprocess, sys
import numpy as np
from PIL import Image, ImageFilter
import imageio_ffmpeg

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
PV = os.path.join(ROOT, 'pv')
FPS = 30
LEN = 46.0

# ---- the cut ------------------------------------------------------------------------------
# (start s, length s, source, first frame | still options, transition in)
SHOTS = [
    (0.0, 4.0, 'c6_final_1', 0, 'black'),
    (4.0, 4.0, 'op_1', {'f': 930, 'zoom': 2, 'c': (196, 112)}, 'fade'),
    (8.0, 4.0, 'c1_start_1', {'f': 20, 'zoom': 2, 'c': (192, 112)}, 'fade'),
    (12.0, 4.0, 'c1_fight_2', 150, 'fade'),
    # the montage: a bar each, on the beat
    (16.0, 2.0, 'c1_escape_1', 90, 'flash'),
    (18.0, 2.0, 'c2_dawn_1', 400, 'flash'),
    (20.0, 2.0, 'c3_guard_2', {'f': 100, 'zoom': 2, 'c': (220, 110)}, 'flash'),
    (22.0, 2.0, 'c4_beam_7', 280, 'flash'),
    (24.0, 2.0, 'c5_soft_2', {'f': 150, 'zoom': 2, 'c': (200, 118)}, 'flash'),
    (26.0, 2.0, 'c6_shadow_5', 80, 'flash'),
    # the great shadows: half a bar each
    (28.0, 1.0, 'c4_moth_1', 2320, 'flash'),
    (29.0, 1.0, 'c5_whale_1', 405, 'flash'),
    (30.0, 1.0, 'c4_moth_1', 1998, 'flash'),
    (31.0, 1.0, 'c6_final_1', 495, 'flash'),
    # the hush, the title
    (32.0, 4.0, 'still:memory.webp', {'zoom': (1.0, 1.08), 'dim': 1.0}, 'black'),
    (36.0, 6.0, 'still:title.webp', {'zoom': (1.06, 1.0), 'dim': 1.0}, 'white'),
    (42.0, 4.0, 'still:title.webp', {'zoom': (1.0, 1.02), 'dim': 0.45}, 'fade'),
]
# (caption, from s, to s)
CAPS = [
    ('hook', 0.9, 3.8), ('lumina', 4.4, 7.8), ('grey', 8.3, 11.8), ('shadow', 12.3, 15.8),
    ('m1', 16.1, 17.9), ('m2', 18.1, 19.9), ('m3', 20.1, 21.9), ('m4', 22.1, 23.9), ('m5', 24.1, 25.9), ('m6', 26.1, 27.9),
    ('boss', 28.1, 31.9),
    ('q1', 32.5, 34.3), ('q2', 34.4, 35.85),
    ('logo', 36.8, 41.8), ('info', 42.3, 46.0),
]

LUT = np.clip(255 * (np.arange(256) / 255) ** 0.78 * 1.06, 0, 255).astype(np.uint8)      # lift the dark footage a little
_cache = {}


def footage(clip, i):
    folder = os.path.join(PV, 'footage', clip)
    files = _cache.get(clip) or sorted(os.listdir(folder))
    _cache[clip] = files
    im = Image.open(os.path.join(folder, files[min(i, len(files) - 1)])).convert('RGB')
    return LUT[np.asarray(im)]


def still(name, k, zoom, dim, W, H, tall):
    key = (name, W, H)
    if key not in _cache:
        _cache[key] = Image.open(os.path.join(ROOT, 'assets', 'story', name)).convert('RGB')
    im = _cache[key]
    z = zoom[0] + (zoom[1] - zoom[0]) * k
    if not tall:
        s = max(W / im.width, H / im.height) * z
        r = im.resize((round(im.width * s), round(im.height * s)), Image.LANCZOS)
        x, y = (r.width - W) // 2, (r.height - H) // 2
        a = np.asarray(r.crop((x, y, x + W, y + H))).astype(np.float32)
    else:   # the picture across the middle, a blurred copy of it filling the rest
        a = fill(np.asarray(im), W, H)
        s = W / im.width * z
        r = im.resize((round(im.width * s), round(im.height * s)), Image.LANCZOS)
        x = (r.width - W) // 2
        band = np.asarray(r.crop((x, 0, x + W, r.height))).astype(np.float32)
        y = (H - band.shape[0]) // 2
        a[y:y + band.shape[0]] = band
    return a * dim


def fill(rgb, W, H):
    im = Image.fromarray(rgb).resize((48, 27), Image.BILINEAR).filter(ImageFilter.GaussianBlur(2))
    s = max(W / 48, H / 27)
    im = im.resize((round(48 * s), round(27 * s)), Image.BILINEAR)
    x, y = (im.width - W) // 2, (im.height - H) // 2
    return np.asarray(im.crop((x, y, x + W, y + H))).astype(np.float32) * 0.45


def place_footage(fr, W, H, tall):
    if not tall:
        return np.repeat(np.repeat(fr, 5, 0), 5, 1).astype(np.float32)
    a = fill(fr, W, H)
    big = np.repeat(np.repeat(fr, 3, 0), 3, 1)[:, 36:36 + W]            # x3, trimmed to 1080 wide
    y = (H - big.shape[0]) // 2
    a[y:y + big.shape[0]] = big
    return a


def caption(name, tall):
    key = ('cap', name, tall)
    if key not in _cache:
        im = Image.open(os.path.join(PV, 'stills', ('v_' if tall else '') + name + '.png')).convert('RGBA')
        a = np.repeat(np.repeat(np.asarray(im), 5, 0), 5, 1).astype(np.float32)
        _cache[key] = (a[..., :3], a[..., 3:] / 255)
    return _cache[key]


# the address in a plain, clear font (the pixel font makes i and l alike)
URL = 'cadmium2525.github.io/tomoshibi'


def url_layer(W, H, tall):
    key = ('url', tall)
    if key not in _cache:
        from PIL import ImageDraw, ImageFont
        font = ImageFont.truetype('C:/Windows/Fonts/BIZ-UDGothicB.ttc', 44 if tall else 58)
        im = Image.new('RGBA', (W, H)); d = ImageDraw.Draw(im)
        y = 1650 if tall else 660
        w = d.textlength(URL, font=font)
        d.text(((W - w) / 2, y), URL, font=font, fill=(184, 196, 255, 255), stroke_width=5, stroke_fill=(12, 8, 22, 255))
        a = np.asarray(im).astype(np.float32)
        _cache[key] = (a[..., :3], a[..., 3:] / 255)
    return _cache[key]


def frame(t, W, H, tall):
    shot = max((s for s in SHOTS if s[0] <= t), key=lambda s: s[0])
    t0, dur, src, opt, tr = shot
    k = (t - t0) / dur
    if src.startswith('still:'):
        img = still(src[6:], k, opt['zoom'], opt['dim'], W, H, tall)
    else:
        o = opt if isinstance(opt, dict) else {'f': opt}
        fr = footage(src, o['f'] + int((t - t0) * FPS))
        if o.get('zoom'):                  # a closer look: crop around the two of them, keep the pixels square
            z = o['zoom']; cw, ch = round(384 / z), round(216 / z)
            x = min(max(0, o['c'][0] - cw // 2), 384 - cw); y = min(max(0, o['c'][1] - ch // 2), 216 - ch)
            fr = np.asarray(Image.fromarray(fr[y:y + ch, x:x + cw]).resize((384, 216), Image.NEAREST))
        img = place_footage(fr, W, H, tall)
    # transitions into the shot
    dt = t - t0
    if tr == 'black' and dt < 0.7: img *= dt / 0.7
    if tr == 'fade' and dt < 0.35: img *= 0.35 + 0.65 * dt / 0.35
    if tr == 'flash' and dt < 0.12: img = img + (255 - img) * (0.55 * (1 - dt / 0.12))
    if tr == 'white' and dt < 0.8: img = img + (255 - img) * (1 - dt / 0.8)
    # the cut to the hush: out through black
    if 31.85 <= t < 32.0: img *= (32.0 - t) / 0.15
    caps = CAPS + ([('brand', 4.4, 32.0)] if tall else [])      # 9:16: the name stays under the picture
    for name, a, b in caps:
        if a <= t < b:
            fade = min(1, (t - a) / 0.25, (b - t) / 0.25) if not name.startswith('m') else min(1, (t - a) / 0.08, (b - t) / 0.12)
            rgb, al = caption(name, tall)
            img = img * (1 - al * fade) + rgb * al * fade
    if t >= 42.3:
        rgb, al = url_layer(W, H, tall); fade = min(1, (t - 42.3) / 0.25)
        img = img * (1 - al * fade) + rgb * al * fade
    if t > LEN - 1.0: img *= (LEN - t) / 1.0
    return np.clip(img, 0, 255).astype(np.uint8)


def render(kind, preview=False):
    tall = kind == 'tall'
    W, H = (1080, 1920) if tall else (1920, 1080)
    n = int(LEN * FPS)
    if preview:
        ts = np.arange(0, LEN, 0.5)
        tw = 240 if not tall else 108; th = tw * H // W
        cols = 12
        sheet = Image.new('RGB', (cols * tw, ((len(ts) + cols - 1) // cols) * th))
        for i, t in enumerate(ts):
            sheet.paste(Image.fromarray(frame(t, W, H, tall)).resize((tw, th), Image.BILINEAR), ((i % cols) * tw, (i // cols) * th))
        p = os.path.join(PV, f'preview_{kind}.png'); sheet.save(p); print(p); return
    out = os.path.join(PV, f'lumina_pv_{"9x16" if tall else "16x9"}.mp4')
    cmd = [imageio_ffmpeg.get_ffmpeg_exe(), '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-',
           '-i', os.path.join(PV, 'music.wav'), '-c:v', 'libx264', '-preset', 'slow', '-crf', '17', '-pix_fmt', 'yuv420p',
           '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', out]
    p = subprocess.Popen(cmd, stdin=subprocess.PIPE, stderr=subprocess.DEVNULL)
    for i in range(n):
        p.stdin.write(frame(i / FPS, W, H, tall).tobytes())
    p.stdin.close(); p.wait()
    print(out, os.path.getsize(out) // 1024, 'KB')


if __name__ == '__main__':
    kinds = {'wide': ['wide'], 'tall': ['tall'], 'both': ['wide', 'tall']}[sys.argv[1] if len(sys.argv) > 1 else 'both']
    for k in kinds: render(k, '--preview' in sys.argv)
