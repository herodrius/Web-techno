"""Prépare les packshots 8.6 pour les cartes et les textures Three.js."""

from pathlib import Path
from math import sin

from PIL import Image, ImageDraw, ImageEnhance, ImageFont


ROOT = Path(__file__).resolve().parents[1] / "my-app" / "public" / "products"

PRODUCTS = {
    "original": {
        "source": "real-original.jpg",
        "crop": (400, 105, 805, 1070),
        "label": (414, 145, 786, 1045),
        "base": (7, 40, 55),
    },
    "gold": {
        "source": "real-gold.jpg",
        "crop": (345, 30, 825, 1165),
        "label": (368, 75, 805, 1120),
        "base": (184, 132, 52),
    },
    "red": {
        "source": "real-red.png",
        "crop": (300, 10, 700, 990),
        "label": (326, 43, 678, 953),
        "base": (155, 27, 42),
    },
}


def remove_white(image: Image.Image) -> Image.Image:
    rgba = image.convert("RGBA")
    pixels = []
    for red, green, blue, _ in rgba.getdata():
        distance = 255 - min(red, green, blue)
        alpha = max(0, min(255, (distance - 5) * 18))
        pixels.append((red, green, blue, alpha))
    rgba.putdata(pixels)
    return rgba


def font(size: int, bold: bool = False):
    family = "arialbd.ttf" if bold else "arial.ttf"
    try:
        return ImageFont.truetype(family, size)
    except OSError:
        return ImageFont.load_default(size=size)


def draw_back(name: str, color: tuple[int, int, int], ink: tuple[int, int, int]) -> Image.Image:
    """Dessine un dos crédible, centré sur la couture de la texture 360°."""
    panel = Image.new("RGBA", (740, 1490), (*color, 255))
    draw = ImageDraw.Draw(panel)
    pale = (*ink, 225)
    faint = (*ink, 125)
    draw.text((52, 50), "8.6", font=font(118, True), fill=pale)
    draw.text((54, 185), f"{name.upper()}  /  INTENSE BEER", font=font(25, True), fill=pale)
    draw.line((54, 233, 686, 233), fill=faint, width=2)
    draw.text((54, 276), "BREWED WITH NATURAL MINERAL WATER", font=font(21, True), fill=pale)
    body = [
        "Strong beer brewed in Holland.",
        "Ingredients: water, barley malt, wheat,",
        "hop extract and the signature 8.6 yeast.",
        "Serve chilled. Store in a cool, dry place.",
    ]
    for index, line in enumerate(body):
        draw.text((54, 333 + index * 35), line, font=font(20), fill=pale)

    draw.rounded_rectangle((54, 515, 686, 810), radius=12, outline=faint, width=2)
    draw.text((78, 540), "AVERAGE NUTRITIONAL VALUES", font=font(20, True), fill=pale)
    rows = [("Energy", "214 kJ / 51 kcal"), ("Carbohydrate", "4.2 g"), ("of which sugars", "0.4 g"), ("Protein", "0.5 g")]
    for index, (label, value) in enumerate(rows):
        y = 600 + index * 48
        draw.line((78, y - 12, 662, y - 12), fill=faint, width=1)
        draw.text((78, y), label, font=font(19), fill=pale)
        draw.text((650, y), value, font=font(19, True), fill=pale, anchor="ra")

    # Code-barres et détails réglementaires donnent une vraie lecture au dos.
    draw.rectangle((120, 875, 620, 1125), fill=(244, 241, 225, 245))
    x = 145
    for index in range(70):
        width = 3 if index % 7 in (0, 3) else 1 + index % 2
        gap = 2 + (index * 3) % 4
        draw.rectangle((x, 900, x + width, 1070), fill=(10, 18, 19, 255))
        x += width + gap
    draw.text((370, 1083), "8 714800 000860", font=font(19), fill=(10, 18, 19), anchor="ma")
    draw.text((54, 1182), "ROYAL SWINKELS FAMILY BREWERS", font=font(20, True), fill=pale)
    draw.text((54, 1221), "LIESHOUT · THE NETHERLANDS", font=font(19), fill=pale)
    for x in (80, 165, 250):
        draw.ellipse((x, 1300, x + 58, 1358), outline=pale, width=3)
    draw.text((680, 1300), "50 CL", font=font(42, True), fill=pale, anchor="ra")
    draw.text((680, 1360), "PLEASE RECYCLE", font=font(18, True), fill=pale, anchor="ra")
    return panel


for name, config in PRODUCTS.items():
    source = Image.open(ROOT / config["source"]).convert("RGB")

    if name == "gold":
        source = ImageEnhance.Contrast(source).enhance(1.28)
        source = ImageEnhance.Color(source).enhance(1.16)
        source = ImageEnhance.Sharpness(source).enhance(1.7)

    packshot = remove_white(source.crop(config["crop"]))
    packshot.save(ROOT / f"{name}.png", optimize=True)

    # La vraie face avant occupe le centre de la texture ; les côtés reprennent
    # la teinte du produit pour rester propres pendant la rotation à 360°.
    front = remove_white(source.crop(config["label"]))
    atlas = Image.new("RGBA", (2048, 1536), (*config["base"], 255))
    atlas_draw = ImageDraw.Draw(atlas)
    for x in range(atlas.width):
        light = round(13 * sin(x / 92) + 7 * sin(x / 21))
        tone = tuple(max(0, min(255, channel + light)) for channel in config["base"])
        atlas_draw.line((x, 0, x, atlas.height), fill=(*tone, 255))
    ratio = min(740 / front.width, 1490 / front.height)
    front = front.resize((round(front.width * ratio), round(front.height * ratio)), Image.Resampling.LANCZOS)
    atlas.alpha_composite(front, ((atlas.width - front.width) // 2, (atlas.height - front.height) // 2))

    back_ink = (12, 35, 50) if name == "gold" else (240, 236, 215)
    back = draw_back(name, config["base"], back_ink)
    half = back.width // 2
    atlas.alpha_composite(back.crop((half, 0, back.width, back.height)), (0, 23))
    atlas.alpha_composite(back.crop((0, 0, half, back.height)), (atlas.width - half, 23))
    atlas.convert("RGB").save(ROOT / f"label-{name}.jpg", quality=92, optimize=True)

    print(f"{name}: {packshot.size} / texture {atlas.size}")
