#!/usr/bin/env python3
"""Print PNG size / mode / alpha for one file or all mengmeng + tab assets."""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
STATIC = ROOT / "static"


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


def inspect_file(path: Path) -> None:
    im = Image.open(path)
    has_a = im.mode in ("RGBA", "LA") or (im.mode == "P" and "transparency" in im.info)
    try:
        rel = path.relative_to(ROOT)
    except ValueError:
        rel = path
    print(f"{im.size[0]}x{im.size[1]} {im.mode} alpha={has_a} | {rel}")


def iter_default_targets() -> list[Path]:
    out: list[Path] = []
    meng = STATIC / "mengmeng"
    if meng.is_dir():
        for p in sorted(meng.rglob("*.png")):
            if "_source" not in str(p):
                out.append(p)
    tab = STATIC / "tab"
    if tab.is_dir():
        out.extend(sorted(tab.glob("*.png")))
    return out


def main() -> int:
    parser = argparse.ArgumentParser(description="Inspect PNG dimensions and color mode.")
    parser.add_argument(
        "image",
        nargs="?",
        help="Image path (e.g. static/mengmeng/ip/wave.png or mengmeng/ip/wave.png)",
    )
    parser.add_argument(
        "--all",
        action="store_true",
        help="Inspect all mengmeng + tab PNGs (default when image omitted)",
    )
    args = parser.parse_args()

    if args.image:
        inspect_file(resolve_image_path(args.image))
        return 0

    if not args.all and args.image is None:
        args.all = True

    targets = iter_default_targets()
    if not targets:
        print("No PNG files found.", file=sys.stderr)
        return 1
    for p in targets:
        inspect_file(p)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
