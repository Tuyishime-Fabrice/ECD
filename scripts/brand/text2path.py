# Turns a line of text into one SVG path (baseline at y=0) for the logo lettering.
# Usage: python3 text2path.py <font.woff> <text> <size_px> <tracking_em> > name.json
# Prints {"d": path, "width": advance width, "cap": cap height}. Needs fontTools.
import json
import sys

from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.ttLib import TTFont

font = TTFont(sys.argv[1])
text, size, track = sys.argv[2], float(sys.argv[3]), float(sys.argv[4])
scale = size / font["head"].unitsPerEm
cmap, glyphs, hmtx = font.getBestCmap(), font.getGlyphSet(), font["hmtx"]

x, parts = 0.0, []
for i, ch in enumerate(text):
    name = cmap[ord(ch)]
    pen = SVGPathPen(glyphs, lambda v: f"{v:.1f}".rstrip("0").rstrip("."))
    glyphs[name].draw(TransformPen(pen, (scale, 0, 0, -scale, x, 0)))
    parts.append(pen.getCommands())
    x += hmtx[name][0] * scale + (track * size if i < len(text) - 1 else 0)

cap = font["OS/2"].sCapHeight * scale
print(json.dumps({"d": " ".join(parts), "width": round(x, 1), "cap": round(cap, 1)}))
