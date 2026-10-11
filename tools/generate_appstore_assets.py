from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageFilter


OUT = Path.home() / "Downloads" / "Kairum-AppStore-Assets"
VISION = Path.home() / "OneDrive" / "Immagini" / "kairum.jpeg"
LIFE = Path.home() / "OneDrive" / "Immagini" / "WhatsApp Image 2026-10-11 at 15.16.20.jpeg"


def font(size, bold=False):
    candidates = [
        Path("C:/Windows/Fonts/arialbd.ttf" if bold else "C:/Windows/Fonts/arial.ttf"),
        Path("C:/Windows/Fonts/segoeuib.ttf" if bold else "C:/Windows/Fonts/segoeui.ttf"),
    ]
    for candidate in candidates:
        if candidate.exists():
            return ImageFont.truetype(str(candidate), size)
    return ImageFont.load_default()


def cover_image(path, size):
    image = Image.open(path).convert("RGB")
    target_w, target_h = size
    scale = max(target_w / image.width, target_h / image.height)
    resized = image.resize((round(image.width * scale), round(image.height * scale)), Image.LANCZOS)
    left = (resized.width - target_w) // 2
    top = (resized.height - target_h) // 2
    return resized.crop((left, top, left + target_w, top + target_h))


def contain_image(path, size, bg=(8, 11, 13)):
    image = Image.open(path).convert("RGB")
    target_w, target_h = size
    scale = min(target_w / image.width, target_h / image.height)
    resized = image.resize((round(image.width * scale), round(image.height * scale)), Image.LANCZOS)
    canvas = Image.new("RGB", size, bg)
    canvas.paste(resized, ((target_w - resized.width) // 2, (target_h - resized.height) // 2))
    return canvas


def rounded_paste(canvas, image, box, radius=72, shadow=True):
    x, y, w, h = box
    img = cover_image(image, (w, h))
    mask = Image.new("L", (w, h), 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, w, h), radius=radius, fill=255)
    if shadow:
        shadow_layer = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
        shadow_mask = Image.new("L", (w, h), 0)
        ImageDraw.Draw(shadow_mask).rounded_rectangle((0, 0, w, h), radius=radius, fill=170)
        shadow_img = Image.new("RGBA", (w, h), (0, 0, 0, 170))
        shadow_layer.paste(shadow_img, (x + 28, y + 34), shadow_mask)
        shadow_layer = shadow_layer.filter(ImageFilter.GaussianBlur(36))
        canvas.paste(Image.alpha_composite(canvas.convert("RGBA"), shadow_layer).convert("RGB"))
    canvas.paste(img, (x, y), mask)
    border = ImageDraw.Draw(canvas)
    border.rounded_rectangle((x, y, x + w, y + h), radius=radius, outline=(54, 60, 62), width=8)


def text(draw, xy, value, size, fill, bold=False, anchor=None, spacing=0):
    draw.multiline_text(xy, value, font=font(size, bold), fill=fill, anchor=anchor, spacing=spacing)


def add_brand(draw, x, y, scale=1.0):
    gold = (232, 196, 104)
    red = (218, 90, 58)
    w = int(38 * scale)
    h = int(130 * scale)
    gap = int(26 * scale)
    draw.rounded_rectangle((x, y, x + w, y + h), radius=int(8 * scale), fill=gold)
    draw.rounded_rectangle((x + w + gap, y, x + w * 2 + gap, y + h), radius=int(8 * scale), fill=gold)
    draw.ellipse((x + w * 2 + gap + int(16 * scale), y + h - int(42 * scale), x + w * 2 + gap + int(58 * scale), y + h), fill=red)


def make_gradient(size):
    w, h = size
    base = Image.new("RGB", size, (8, 11, 13))
    px = base.load()
    for y in range(h):
        for x in range(w):
            gx = x / w
            gy = y / h
            r = int(8 + 26 * gx + 34 * (1 - gy))
            g = int(11 + 20 * gy)
            b = int(13 + 18 * gx)
            px[x, y] = (r, g, b)
    return base


def creative(size, filename, layout):
    canvas = make_gradient(size)
    draw = ImageDraw.Draw(canvas)
    w, h = size
    draw.ellipse((int(w * 0.68), -int(h * 0.18), int(w * 1.08), int(h * 0.52)), fill=(42, 38, 22))
    draw.ellipse((-int(w * 0.18), int(h * 0.62), int(w * 0.25), int(h * 1.2)), fill=(40, 16, 15))

    if layout == "header":
        add_brand(draw, 250, 190, 1.2)
        text(draw, (250, 420), "Kairum", 150, (255, 249, 237), True)
        text(draw, (255, 610), "See your time.\nKeep your future visible.", 74, (232, 196, 104), True, spacing=12)
        text(draw, (260, 825), "Life Clock  |  Vision decks  |  Self Speech", 46, (216, 209, 194), True)
        rounded_paste(canvas, LIFE, (1990, 155, 760, 1320), 86)
        rounded_paste(canvas, VISION, (2820, 250, 760, 1320), 86)
    elif layout == "search":
        add_brand(draw, 240, 210, 1.25)
        text(draw, (240, 465), "Kairum", 158, (255, 249, 237), True)
        text(draw, (245, 680), "A private life clock\nfor urgency, vision,\nand self speech.", 92, (232, 196, 104), True, spacing=18)
        rounded_paste(canvas, LIFE, (2020, 245, 780, 1688), 90)
        rounded_paste(canvas, VISION, (2870, 575, 720, 1558), 90)
        text(draw, (245, 1380), "Your photos, goals, and voice stay local.", 52, (216, 209, 194), True)
    else:
        add_brand(draw, 330, 300, 1.55)
        text(draw, (330, 650), "Kairum", 208, (255, 249, 237), True)
        text(draw, (340, 940), "Your life, goals,\nand future in one\nprivate space.", 118, (232, 196, 104), True, spacing=18)
        text(draw, (345, 1650), "Life Clock  |  Vision  |  Anti-vision  |  Self Speech", 60, (216, 209, 194), True)
        rounded_paste(canvas, LIFE, (2840, 290, 920, 1990), 110)
        rounded_paste(canvas, VISION, (3860, 520, 920, 1990), 110)

    canvas.save(OUT / filename, quality=96)


def standard_screenshot(src, filename):
    # 1290 x 2796 is accepted for recent iPhone screenshot slots and keeps the original aspect ratio.
    image = contain_image(src, (1290, 2796))
    image.save(OUT / filename, quality=96)


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    creative((3840, 1646), "01-kairum-product-page-header-3840x1646.png", "header")
    creative((3840, 2560), "02-kairum-search-results-3840x2560.png", "search")
    creative((5244, 2950), "03-kairum-universal-header-search-5244x2950.png", "universal")
    standard_screenshot(LIFE, "04-kairum-iphone-screenshot-life-1290x2796.png")
    standard_screenshot(VISION, "05-kairum-iphone-screenshot-vision-1290x2796.png")
    readme = OUT / "README-USARE-QUESTI-FILE.txt"
    readme.write_text(
        "Per la sezione che vedi in App Store Connect:\n"
        "- Intestazione: carica 01-kairum-product-page-header-3840x1646.png\n"
        "- Risultati della ricerca: carica 02-kairum-search-results-3840x2560.png\n"
        "- Se vuoi fare piu veloce, puoi caricare 03-kairum-universal-header-search-5244x2950.png e usare lo stesso asset per entrambe le posizioni.\n\n"
        "Per gli screenshot iPhone standard, se richiesti:\n"
        "- 04-kairum-iphone-screenshot-life-1290x2796.png\n"
        "- 05-kairum-iphone-screenshot-vision-1290x2796.png\n",
        encoding="utf-8",
    )
    print(OUT)


if __name__ == "__main__":
    main()
