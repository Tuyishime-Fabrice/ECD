# Prepares the app's logo files from the official CED Imuhira logo (scripts/brand/official-logo.webp,
# kept exactly as supplied). The artwork itself is not redrawn or recolored: the files are crops of
# the original, scaled down, with the plain white background around the logo made transparent.
#
#   python3 scripts/brand/prepare-logo.py      (needs Pillow)
#
# Writes public/brand/logo.webp (the full logo), public/brand/logo-sm.webp (the same, smaller, for
# top bars), both lossless, and public/brand/mark.png (the house-and-book icon alone: favicon and
# app icons).
from pathlib import Path

from PIL import Image

HERE = Path(__file__).resolve().parent
OUT = HERE.parent.parent / "public" / "brand"
WHITE_MIN = 245  # background pixels are near-white (JPEG/WebP noise around 254)


def transparent_background(img):
    """Background = near-white pixels connected to the image edge; they become transparent.
    Pixels touching the background (anti-aliased edges) are un-mixed from white so the edge stays
    smooth on any page color. Everything inside the logo keeps its exact color, fully opaque."""
    img = img.convert("RGBA")
    w, h = img.size
    px = img.load()
    near_white = lambda p: min(p[0], p[1], p[2]) >= WHITE_MIN
    bg = bytearray(w * h)
    stack = [(x, y) for x in range(w) for y in (0, h - 1)] + [(x, y) for y in range(h) for x in (0, w - 1)]
    while stack:
        x, y = stack.pop()
        i = y * w + x
        if bg[i] or not near_white(px[x, y]):
            continue
        bg[i] = 1
        if x > 0: stack.append((x - 1, y))
        if x < w - 1: stack.append((x + 1, y))
        if y > 0: stack.append((x, y - 1))
        if y < h - 1: stack.append((x, y + 1))
    out = img.copy()
    op = out.load()
    for y in range(h):
        for x in range(w):
            i = y * w + x
            if bg[i]:
                op[x, y] = (255, 255, 255, 0)
                continue
            edge = any(
                0 <= x + dx < w and 0 <= y + dy < h and bg[(y + dy) * w + x + dx]
                for dx in (-2, -1, 0, 1, 2) for dy in (-2, -1, 0, 1, 2)
            )
            if edge:
                r, g, b, _ = px[x, y]
                a = max(255 - r, 255 - g, 255 - b) / 255
                if a <= 0:
                    op[x, y] = (255, 255, 255, 0)
                else:
                    un = lambda c: max(0, min(255, round((c - 255 * (1 - a)) / a)))
                    op[x, y] = (un(r), un(g), un(b), round(a * 255))
    return out


src = Image.open(HERE / "official-logo.webp").convert("RGB")
PAD = 24
# The whole logo (artwork spans x 111-1167, y 131-507 in the 2000 x 667 original).
full = transparent_background(src.crop((111 - PAD, 131 - PAD, 1168 + PAD, 508 + PAD)))
full.save(OUT / "logo.webp", lossless=True, quality=100, method=6)
small = full.resize((round(full.width * 168 / full.height), 168), Image.LANCZOS)
small.save(OUT / "logo-sm.webp", lossless=True, quality=100, method=6)
# The icon alone (x 111-438), centred on a square.
mark = transparent_background(src.crop((111 - PAD, 131 - PAD, 439 + PAD, 508 + PAD)))
side = max(mark.size)
square = Image.new("RGBA", (side, side), (255, 255, 255, 0))
square.paste(mark, ((side - mark.width) // 2, (side - mark.height) // 2))
square.resize((256, 256), Image.LANCZOS).save(OUT / "mark.png", optimize=True)
print("public/brand: logo.webp", full.size, "logo-sm.webp", small.size, "mark.png (256, 256)")
