#!/usr/bin/env python3
"""Resize Mengmeng art assets; preserve alpha, backup originals to _source-2048."""

from __future__ import annotations

import argparse
import shutil
import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
STATIC = ROOT / "static"
BACKUP = STATIC / "mengmeng" / "_source-2048"

# rel path -> spec: int = max edge; (w,h) = box fit
SPECS: dict[str, tuple[int, int] | int] = {
    "mengmeng/logo.png": (1600, 480),
    "mengmeng/logo-icon.png": 1024,
    "mengmeng/app-icon.png": 1024,
    "mengmeng/hero-bg.png": (1500, 1000),
    "mengmeng/bg/page-soft.png": (1500, 2668),
    "mengmeng/reference/mengmeng-master.png": 1200,
    "mengmeng/ip/book.png": 1200,
    "mengmeng/ip/happy.png": 1200,
    "mengmeng/ip/curious.png": 1200,
    "mengmeng/ip/trying.png": 1200,
    "mengmeng/ip/balloon.png": 1200,
    "mengmeng/ip/wave.png": 1200,
    "mengmeng/state/empty.png": 800,
    "mengmeng/state/error.png": 800,
    "mengmeng/state/loading.png": 800,
    "mengmeng/state/success.png": 800,
    "mengmeng/entry/daily.png": 512,
    "mengmeng/entry/textbook.png": 512,
    "mengmeng/entry/stroke-lab.png": 512,
    "mengmeng/entry/game.png": 512,
    "tab/home.png": 162,
    "tab/home-active.png": 162,
    "tab/learn.png": 162,
    "tab/learn-active.png": 162,
    "tab/catalog.png": 162,
    "tab/catalog-active.png": 162,
    "tab/me.png": 162,
    "tab/me-active.png": 162,
}

COVER = {"mengmeng/hero-bg.png", "mengmeng/bg/page-soft.png"}

KEY_WHITE = {f"tab/{n}" for n in [
    "home.png", "home-active.png", "learn.png", "learn-active.png",
    "catalog.png", "catalog-active.png", "me.png", "me-active.png",
]}


def resolve_image_path(arg: str) -> Path:
    raw = Path(arg)
    candidates = [
        raw.resolve() if raw.is_absolute() else None,
        (ROOT / raw).resolve(),
        (STATIC / raw).resolve(),
    ]
    for p in candidates:
        if p is not None and p.is_file():
            return p
    raise FileNotFoundError(f"Image not found: {arg}")


def path_to_rel(path: Path) -> str:
    try:
        return path.relative_to(STATIC).as_posix()
    except ValueError as e:
        raise ValueError(f"Path must be under {STATIC}: {path}") from e


def parse_spec_arg(args: argparse.Namespace) -> tuple[int, int] | int | None:
    if args.max_edge is not None:
        return int(args.max_edge)
    if args.contain is not None:
        w, h = args.contain
        return (int(w), int(h))
    if args.cover is not None:
        w, h = args.cover
        return (int(w), int(h))
    return None


def ensure_rgba(im: Image.Image) -> Image.Image:
    if im.mode == "RGBA":
        return im
    if im.mode == "P" and "transparency" in im.info:
        return im.convert("RGBA")
    if im.mode == "LA":
        return im.convert("RGBA")
    return im.convert("RGBA")


def key_near_white(im: Image.Image, threshold: int = 248) -> Image.Image:
    im = ensure_rgba(im)
    px = im.load()
    w, h = im.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a and r >= threshold and g >= threshold and b >= threshold:
                px[x, y] = (r, g, b, 0)
    return im


def resize_max_edge(im: Image.Image, edge: int) -> Image.Image:
    im = ensure_rgba(im)
    w, h = im.size
    if max(w, h) <= edge:
        return im
    scale = edge / max(w, h)
    nw, nh = max(1, int(w * scale)), max(1, int(h * scale))
    return im.resize((nw, nh), Image.Resampling.LANCZOS)


def resize_contain(im: Image.Image, box: tuple[int, int]) -> Image.Image:
    im = ensure_rgba(im)
    bw, bh = box
    w, h = im.size
    scale = min(bw / w, bh / h)
    nw, nh = max(1, int(w * scale)), max(1, int(h * scale))
    resized = im.resize((nw, nh), Image.Resampling.LANCZOS)
    canvas = Image.new("RGBA", (bw, bh), (0, 0, 0, 0))
    canvas.paste(resized, ((bw - nw) // 2, (bh - nh) // 2), resized)
    return canvas


def resize_cover(im: Image.Image, box: tuple[int, int]) -> Image.Image:
    bw, bh = box
    w, h = im.size
    scale = max(bw / w, bh / h)
    nw, nh = max(1, int(w * scale)), max(1, int(h * scale))
    resized = im.resize((nw, nh), Image.Resampling.LANCZOS)
    left = (nw - bw) // 2
    top = (nh - bh) // 2
    cropped = resized.crop((left, top, left + bw, top + bh))
    if cropped.mode != "RGB":
        return cropped.convert("RGB")
    return cropped


def save_image(im: Image.Image, path: Path, force_rgba: bool) -> None:
    if force_rgba:
        im = ensure_rgba(im)
        im.save(path, "PNG", optimize=True)
    else:
        if im.mode == "RGBA":
            bg = Image.new("RGB", im.size, (255, 255, 255))
            bg.paste(im, mask=im.split()[3])
            bg.save(path, "PNG", optimize=True)
        else:
            im.convert("RGB").save(path, "PNG", optimize=True)


def process(
    rel: str,
    spec: tuple[int, int] | int,
    *,
    use_cover: bool | None = None,
    skip_key_white: bool = False,
) -> None:
    path = STATIC / Path(rel.replace("/", "\\"))
    if not path.exists():
        print(f"SKIP missing: {rel}")
        return

    backup = BACKUP / rel
    backup.parent.mkdir(parents=True, exist_ok=True)
    if not backup.exists():
        shutil.copy2(path, backup)

    im = Image.open(path)
    orig = im.size
    force_rgba = rel in KEY_WHITE or "ip/" in rel or "state/" in rel or "entry/" in rel
    force_rgba = force_rgba or rel.endswith("logo-icon.png") or "reference/" in rel

    if rel in KEY_WHITE and not skip_key_white:
        im = key_near_white(im)

    cover = use_cover if use_cover is not None else rel in COVER
    if cover:
        assert isinstance(spec, tuple)
        out = resize_cover(im, spec)
        force_rgba = False
    elif isinstance(spec, int):
        out = resize_max_edge(im, spec)
    else:
        out = resize_contain(im, spec)

    save_image(out, path, force_rgba)
    out_size = Image.open(path).size
    print(f"OK {rel}: {orig[0]}x{orig[1]} -> {out_size[0]}x{out_size[1]}")


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Resize PNG under static/. Uses SPECS catalog or explicit dimensions."
    )
    parser.add_argument(
        "image",
        nargs="?",
        help="Image path (e.g. static/mengmeng/ip/wave.png)",
    )
    parser.add_argument(
        "--all",
        action="store_true",
        help="Process all paths in SPECS (default when image omitted)",
    )
    parser.add_argument(
        "--max-edge",
        type=int,
        metavar="N",
        help="Scale so longest edge <= N (overrides catalog)",
    )
    parser.add_argument(
        "--contain",
        nargs=2,
        type=int,
        metavar=("W", "H"),
        help="Fit inside W×H box with transparency",
    )
    parser.add_argument(
        "--cover",
        nargs=2,
        type=int,
        metavar=("W", "H"),
        help="Center-crop fill W×H (backgrounds)",
    )
    parser.add_argument(
        "--no-key-white",
        action="store_true",
        help="Skip near-white → transparent for tab icons",
    )
    args = parser.parse_args()

    override = parse_spec_arg(args)
    use_cover: bool | None = None
    if args.cover is not None:
        use_cover = True
    elif args.contain is not None or args.max_edge is not None:
        use_cover = False

    if args.image:
        rel = path_to_rel(resolve_image_path(args.image))
        if override is not None:
            spec = override
        elif rel in SPECS:
            spec = SPECS[rel]
            if rel in COVER and args.cover is None and args.contain is None and args.max_edge is None:
                use_cover = True
        else:
            print(
                f"No catalog spec for {rel}. Use --max-edge, --contain W H, or --cover W H.",
                file=sys.stderr,
            )
            return 1
        print(f"Backup: {BACKUP}")
        process(rel, spec, use_cover=use_cover, skip_key_white=args.no_key_white)
        print("Done.")
        return 0

    if not args.all:
        args.all = True

    print(f"Backup: {BACKUP}")
    for rel, spec in SPECS.items():
        process(rel, spec)
    print("Done.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
