#!/usr/bin/env python3
"""
Generate local placeholder images (no network) under `static/picsum/`.

Why: this repo's dev sandbox can't access the public internet, but the editor
needs some "random" images for option/stem image URLs.

If you have network access, you can later replace these with real photos by
running `scripts/download_picsum_images.py`.
"""

from __future__ import annotations

import argparse
import random
from pathlib import Path

from PIL import Image, ImageDraw, ImageEnhance, ImageFilter, ImageOps


def _rand_color(rnd: random.Random, lo: int = 30, hi: int = 225) -> tuple[int, int, int]:
    return (rnd.randint(lo, hi), rnd.randint(lo, hi), rnd.randint(lo, hi))


def _make_base(w: int, h: int, rnd: random.Random) -> Image.Image:
    g = Image.linear_gradient("L").resize((w, h))
    c1 = _rand_color(rnd)
    c2 = _rand_color(rnd)
    base = ImageOps.colorize(g, c1, c2).convert("RGBA")
    return base


def _draw_shapes(img: Image.Image, rnd: random.Random) -> Image.Image:
    w, h = img.size
    layer = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer)

    # Random translucent circles/rectangles to make it feel less synthetic.
    for _ in range(rnd.randint(6, 14)):
        shape = rnd.choice(["circle", "rect"])
        x1 = rnd.randint(-w // 6, w)
        y1 = rnd.randint(-h // 6, h)
        x2 = x1 + rnd.randint(w // 8, w // 2)
        y2 = y1 + rnd.randint(h // 8, h // 2)

        color = _rand_color(rnd, 0, 255)
        alpha = rnd.randint(30, 90)
        fill = (*color, alpha)

        if shape == "circle":
            draw.ellipse([x1, y1, x2, y2], fill=fill)
        else:
            draw.rectangle([x1, y1, x2, y2], fill=fill)

    # Add subtle noise.
    noise = Image.effect_noise((w, h), rnd.uniform(6, 14)).convert("L")
    noise_rgba = Image.merge("RGBA", (noise, noise, noise, noise.point(lambda v: int(v * 0.08))))
    layer = Image.alpha_composite(layer, noise_rgba)

    out = Image.alpha_composite(img, layer)
    return out


def make_image(w: int, h: int, seed: int) -> Image.Image:
    rnd = random.Random(seed)
    img = _make_base(w, h, rnd)
    img = _draw_shapes(img, rnd)

    # Gentle blur + contrast to read as "photo-ish" placeholders.
    img = img.filter(ImageFilter.GaussianBlur(radius=rnd.uniform(0.6, 1.8)))
    img = ImageEnhance.Contrast(img).enhance(rnd.uniform(1.05, 1.22))
    img = ImageEnhance.Color(img).enhance(rnd.uniform(1.05, 1.25))

    return img.convert("RGB")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--out", default="static/picsum", help="Output directory")
    parser.add_argument("--seed", type=int, default=20260210, help="Random seed")
    args = parser.parse_args()

    root = Path(__file__).resolve().parents[1]
    out_dir = (root / args.out).resolve()
    out_dir.mkdir(parents=True, exist_ok=True)

    rnd = random.Random(args.seed)

    # Files match the naming convention used by `download_picsum_images.py`,
    # so you can overwrite them later.
    plan = []
    plan += [("opt", 12, 512, 512)]
    plan += [("stem", 6, 1280, 720)]
    plan += [("tall", 4, 720, 1280)]

    written = []
    for prefix, count, w, h in plan:
        for i in range(1, count + 1):
            name = f"{prefix}-{i:02d}.jpg"
            path = out_dir / name
            img = make_image(w, h, seed=rnd.randint(0, 2**31 - 1))
            img.save(path, format="JPEG", quality=88, optimize=True, progressive=True)
            written.append(str(path.relative_to(root)))

    print("generated:")
    for p in written:
        print(" -", p)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
