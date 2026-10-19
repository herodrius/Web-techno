"""Precompute the existing cylindrical photo projection; run only when artwork changes.

Requires Pillow and NumPy. Generated WebP files are committed, so Vercel needs no Python.
"""
from pathlib import Path
import numpy as np
from PIL import Image, ImageColor

ROOT = Path(__file__).resolve().parents[1]
PRODUCTS = ROOT / 'my-app/public/products'
OUTPUT = ROOT / 'my-app/src/assets/cans'
OUTPUT.mkdir(parents=True, exist_ok=True)
SOURCES = {
    'original': ('real-original.jpg', 600, 183, 148, 1040, '#082c40'),
    'gold': ('real-gold.jpg', 586, 207, 68, 1114, '#af863e'),
    'red': ('real-red.png', 500, 170, 55, 925, '#a81d31'),
}

def smooth(value, start, end):
    t = np.clip((value - start) / (end - start), 0, 1)
    return t * t * (3 - 2 * t)

for variant, (filename, center, radius, top, bottom, color) in SOURCES.items():
    size = 2048
    photo = np.asarray(Image.open(PRODUCTS / filename).convert('RGB'), dtype=np.float32)
    back = Image.open(PRODUCTS / f'label-{variant}.jpg').convert('RGB')
    result = Image.new('RGB', (size, size), ImageColor.getrgb(color))
    result.paste(back.crop((0, 0, 350, back.height)).resize((350, size)), (0, 0))
    result.paste(back.crop((1698, 0, 2048, back.height)).resize((350, size)), (1698, 0))
    output = np.asarray(result).copy()
    x = np.arange(500, 1548)
    angle = (x / size - .5) * np.pi * 2
    blend = (1 - smooth(np.abs(angle), 1.38, 1.61))[:, None]
    base = np.array(ImageColor.getrgb(color))
    for y in range(size):
        v = y / (size - 1)
        source_y = top + v * (bottom - top)
        sy = int(source_y)
        fy = source_y - sy
        source_x = center + np.sin(angle) * radius * (.81 + .19 * smooth(v, 0, .10))
        sx = source_x.astype(int)
        fx = (source_x - sx)[:, None]
        upper = photo[sy, sx] * (1 - fx) + photo[sy, sx + 1] * fx
        lower = photo[sy + 1, sx] * (1 - fx) + photo[sy + 1, sx + 1] * fx
        output[y, x] = np.rint(base * (1 - blend) + (upper * (1 - fy) + lower * fy) * blend)
    atlas = Image.fromarray(output)
    atlas.save(OUTPUT / f'{variant}.webp', quality=92, method=6)
    atlas.resize((1024, 1024), Image.Resampling.LANCZOS).save(OUTPUT / f'{variant}-compact.webp', quality=90, method=6)
    card = Image.open(PRODUCTS / f'{variant}.png').convert('RGBA')
    card.thumbnail((640, 1000), Image.Resampling.LANCZOS)
    card.save(PRODUCTS / f'{variant}.webp', quality=90, method=6)
    print(variant, 'atlas:', (OUTPUT / f'{variant}.webp').stat().st_size, 'card:', (PRODUCTS / f'{variant}.webp').stat().st_size)
