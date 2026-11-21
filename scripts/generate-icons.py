#!/usr/bin/env python3
"""Generate Chipboy Studio's pixel-art favicon, app icons and social preview.

Usage: python3 scripts/generate-icons.py
Requires Pillow and the Press Start 2P TTF (downloaded to /tmp by the command in
docs/DEVELOPMENT.md, or pass a path as the first argument).
"""
from pathlib import Path
import sys
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / "public"
FONT_PATH = Path(sys.argv[1]) if len(sys.argv) > 1 else Path("/tmp/fonts/PressStart2P-Regular.ttf")

OUT = (47, 61, 40, 255)
BODY = (189, 209, 122, 255)
HIGHLIGHT = (229, 237, 168, 255)
BERRY = (147, 61, 96, 255)
BERRY_DARK = (103, 37, 65, 255)
CREAM = (255, 248, 231, 255)
CASE = (226, 224, 211, 255)
CASE_EDGE = (168, 173, 153, 255)
INK = (66, 77, 56, 255)


def controller(size: int = 32) -> Image.Image:
    image = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)
    if size == 32:
        draw.rounded_rectangle([2, 11, 29, 25], radius=6, fill=OUT)
        draw.ellipse([2, 18, 12, 30], fill=OUT)
        draw.ellipse([19, 18, 29, 30], fill=OUT)
        draw.rounded_rectangle([3, 12, 28, 24], radius=5, fill=BODY)
        draw.ellipse([3, 19, 11, 29], fill=BODY)
        draw.ellipse([20, 19, 28, 29], fill=BODY)
        draw.rounded_rectangle([5, 13, 26, 15], radius=1, fill=HIGHLIGHT)
        draw.rectangle([7, 16, 12, 18], fill=OUT)
        draw.rectangle([9, 14, 10, 20], fill=OUT)
        draw.ellipse([18, 15, 21, 18], fill=BERRY)
        draw.ellipse([22, 18, 25, 21], fill=BERRY)
        draw.ellipse([19, 21, 22, 24], fill=CREAM)
        draw.ellipse([17, 1, 23, 7], fill=OUT)
        draw.rectangle([21, 1, 24, 11], fill=OUT)
        draw.polygon([(24, 2), (28, 5), (28, 8), (24, 7)], fill=OUT)
        draw.ellipse([18, 2, 22, 6], fill=BERRY)
        draw.rectangle([22, 2, 23, 10], fill=BERRY)
        draw.polygon([(23, 3), (27, 6), (27, 7), (23, 6)], fill=BERRY)
        draw.point([(20, 3), (20, 4)], fill=CREAM)
    return image


def svg_from(image: Image.Image) -> str:
    width, height = image.size
    runs: list[str] = []
    for y in range(height):
        x = 0
        while x < width:
            color = image.getpixel((x, y))
            if color[3] == 0:
                x += 1
                continue
            start = x
            while x < width and image.getpixel((x, y)) == color:
                x += 1
            fill = "#%02x%02x%02x" % color[:3]
            runs.append(f'<rect x="{start}" y="{y}" width="{x - start}" height="1" fill="{fill}"/>')
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width} {height}" shape-rendering="crispEdges" role="img" aria-label="Pixel game controller with a music note">\n'
        + "\n".join(runs)
        + "\n</svg>\n"
    )


def app_icon(size: int) -> Image.Image:
    image = Image.new("RGBA", (size, size), CASE)
    draw = ImageDraw.Draw(image)
    radius = max(12, size // 6)
    draw.rounded_rectangle([0, 0, size - 1, size - 1], radius=radius, fill=CASE, outline=CASE_EDGE, width=max(2, size // 48))
    sprite = controller().resize((int(size * 0.78), int(size * 0.78)), Image.Resampling.NEAREST)
    image.alpha_composite(sprite, ((size - sprite.width) // 2, (size - sprite.height) // 2))
    return image


def og_image() -> Image.Image:
    image = Image.new("RGB", (1200, 630), (212, 215, 201))
    draw = ImageDraw.Draw(image)
    for y in range(0, 630, 6):
        for x in range(0, 1200, 6):
            draw.point((x, y), fill=(137, 145, 122))
    draw.rounded_rectangle([60, 60, 1140, 570], radius=42, fill=CASE, outline=CASE_EDGE, width=4)
    draw.rounded_rectangle([60, 60, 1140, 120], radius=42, fill=(189, 209, 122))
    draw.rectangle([60, 100, 1140, 120], fill=(189, 209, 122))
    icon = app_icon(230)
    image.paste(icon, (110, 190), icon)
    if FONT_PATH.exists():
        title = ImageFont.truetype(str(FONT_PATH), 58)
        sub = ImageFont.truetype(str(FONT_PATH), 22)
        small = ImageFont.truetype(str(FONT_PATH), 15)
    else:
        title = sub = small = ImageFont.load_default()
    draw.text((390, 205), "CHIPBOY", font=title, fill=INK)
    draw.text((390, 285), "STUDIO", font=title, fill=BERRY)
    draw.text((390, 390), "POCKET-SIZED SOUNDS.", font=sub, fill=INK)
    draw.text((390, 425), "BIG IDEAS.", font=sub, fill=BERRY)
    draw.text((390, 495), "SEQUENCER · PIANO ROLL · SAMPLER · WAV EXPORT", font=small, fill=(102, 108, 94))
    # Pixel equalizer decoration.
    heights = [24, 52, 36, 74, 44, 62, 30, 56]
    for index, height in enumerate(heights):
        x = 1000 + index * 14
        draw.rectangle([x, 470 - height, x + 8, 470], fill=BERRY if index % 2 else (101, 131, 66))
    draw.rectangle([110, 510, 300, 514], fill=CASE_EDGE)
    draw.text((110, 525), "OPEN SOURCE · MIT", font=small, fill=(102, 108, 94))
    return image


def main() -> None:
    PUBLIC.mkdir(exist_ok=True)
    (PUBLIC / "icons").mkdir(exist_ok=True)
    base = controller()
    (PUBLIC / "favicon.svg").write_text(svg_from(base), encoding="utf-8")
    base.resize((48, 48), Image.Resampling.NEAREST).save(PUBLIC / "favicon.ico", sizes=[(16, 16), (32, 32), (48, 48)])
    app_icon(180).save(PUBLIC / "apple-touch-icon.png")
    app_icon(192).save(PUBLIC / "icons" / "icon-192.png")
    app_icon(512).save(PUBLIC / "icons" / "icon-512.png")
    og_image().save(PUBLIC / "og-image.png", optimize=True)
    print("Generated favicon.svg, favicon.ico, apple-touch-icon.png, icons/ and og-image.png")


if __name__ == "__main__":
    main()
