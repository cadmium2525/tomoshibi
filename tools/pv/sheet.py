"""Contact sheet of a footage clip: python tools/pv/sheet.py CLIP [every] -> pv/sheets/CLIP.png"""
import os, sys
from PIL import Image, ImageDraw
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
clip = sys.argv[1]; every = int(sys.argv[2]) if len(sys.argv) > 2 else 15
folder = os.path.join(ROOT, "pv", "footage", clip)
files = sorted(os.listdir(folder))[::every]
cols = 6; tw, th = 192, 108
rows = (len(files) + cols - 1) // cols
sheet = Image.new("RGB", (cols * tw, rows * (th + 12)), (20, 20, 30))
d = ImageDraw.Draw(sheet)
for i, f in enumerate(files):
    im = Image.open(os.path.join(folder, f)).convert("RGB").resize((tw, th), Image.BILINEAR)
    x, y = (i % cols) * tw, (i // cols) * (th + 12)
    sheet.paste(im, (x, y + 12)); d.text((x + 2, y), f[:-4], fill=(255, 220, 120))
os.makedirs(os.path.join(ROOT, "pv", "sheets"), exist_ok=True)
out = os.path.join(ROOT, "pv", "sheets", clip + ".png"); sheet.save(out); print(out, len(files))
