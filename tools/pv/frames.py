"""Frames side by side at their own size: python tools/pv/frames.py OUT clip:frame ... -> pv/sheets/OUT.png"""
import os, sys
from PIL import Image, ImageDraw
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
items = sys.argv[2:]; cols = 3
sheet = Image.new('RGB', (cols * 384, ((len(items) + cols - 1) // cols) * 228), (20, 20, 30)); d = ImageDraw.Draw(sheet)
for i, it in enumerate(items):
    c, f = it.split(':'); x, y = (i % cols) * 384, (i // cols) * 228
    sheet.paste(Image.open(os.path.join(ROOT, 'pv', 'footage', c, f'{int(f):05d}.png')).convert('RGB'), (x, y + 12)); d.text((x + 2, y), it, fill=(255, 220, 120))
sheet.save(os.path.join(ROOT, 'pv', 'sheets', sys.argv[1] + '.png'))
