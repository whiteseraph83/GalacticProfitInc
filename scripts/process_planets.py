import os
import numpy as np
from PIL import Image, ImageFilter, ImageDraw

REF_DIR = "src/assets/reference/planets"
OUT_DIR = "src/assets/sprites/planets"


def circular_crop(im: Image.Image, box, out_size=512, inset=0.965, feather=3):
    """Crop `box` (a square region) out of `im`, mask it to a circle, resize
    to `out_size`x`out_size`. `inset` shrinks the circle slightly below the
    box's own radius so no background corner pixels survive at the edge."""
    tile = im.crop(box).convert("RGB").resize((out_size, out_size), Image.LANCZOS)

    mask = Image.new("L", (out_size, out_size), 0)
    draw = ImageDraw.Draw(mask)
    r = out_size / 2 * inset
    cx = cy = out_size / 2
    draw.ellipse((cx - r, cy - r, cx + r, cy + r), fill=255)
    mask = mask.filter(ImageFilter.GaussianBlur(feather))

    rgba = tile.convert("RGBA")
    rgba.putalpha(mask)
    return rgba


def from_standalone(name_in, archetipo):
    im = Image.open(os.path.join(REF_DIR, name_in)).convert("RGB")
    w, h = im.size
    s = min(w, h)
    left = (w - s) // 2
    top = (h - s) // 2
    out = circular_crop(im, (left, top, left + s, top + s))
    out.save(os.path.join(OUT_DIR, f"{archetipo}.png"))
    print(archetipo, "<-", name_in, out.size)


if __name__ == "__main__":
    os.makedirs(OUT_DIR, exist_ok=True)

    # Only the standalone, individual planet photos are used as real game
    # assets. `archetipi_sheet_ref.webp` is explicitly exemplificative (a
    # reference sheet showing the archetype categories, per the user) and
    # must NOT be cropped into sprites: gassoso/cristallino/anomalo have no
    # individual photo and stay on the procedural texture
    # (src/render/planetTextures.ts), same as "desertico".
    from_standalone("roccioso_ref.webp", "roccioso")
    from_standalone("oceanico_ref.webp", "oceanico")
    from_standalone("ghiacciato_ref.webp", "ghiacciato")
    from_standalone("vulcanico_ref.webp", "vulcanico")
    from_standalone("terreno_ref_1.webp", "terrestre")
