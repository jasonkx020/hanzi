#!/usr/bin/env python3
"""Remove Doubao (豆包) AI corner watermarks via OpenCV inpaint."""

from __future__ import annotations

import argparse
import shutil
import sys
from pathlib import Path

import cv2
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
STATIC = ROOT / "static"
BACKUP_WM = STATIC / "mengmeng" / "_before-watermark-removal"

RIGHT_FRAC = 0.22
BOTTOM_FRAC = 0.095
INPAINT_RADIUS = 8

TARGETS: list[str] = [
    "mengmeng/logo.png",
    "mengmeng/logo-icon.png",
    "mengmeng/app-icon.png",
    "mengmeng/hero-bg.png",
    "mengmeng/bg/page-soft.png",
    "mengmeng/reference/mengmeng-master.png",
    *[f"mengmeng/ip/{n}.png" for n in (
        "book", "happy", "curious", "trying", "balloon", "wave"
    )],
    *[f"mengmeng/state/{n}.png" for n in (
        "empty", "error", "loading", "success"
    )],
    *[f"mengmeng/entry/{n}.png" for n in (
        "daily", "textbook", "stroke-lab", "game"
    )],
    *[f"tab/{n}.png" for n in (
        "home", "home-active", "learn", "learn-active",
        "catalog", "catalog-active", "me", "me-active",
    )],
]


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


def corner_box(h: int, w: int) -> tuple[int, int, int, int]:
    x0 = int(w * (1 - RIGHT_FRAC))
    y0 = int(h * (1 - BOTTOM_FRAC))
    return x0, y0, w, h


def corner_mask(h: int, w: int) -> np.ndarray:
    m = np.zeros((h, w), np.uint8)
    x0, y0, _, _ = corner_box(h, w)
    m[y0:, x0:] = 255
    return m


def build_mask(bgr: np.ndarray, alpha: np.ndarray | None = None) -> np.ndarray:
    h, w = bgr.shape[:2]
    x0, y0, _, _ = corner_box(h, w)
    corner = corner_mask(h, w)
    roi = bgr[y0:, x0:]
    gray = cv2.cvtColor(roi, cv2.COLOR_BGR2GRAY)
    hsv = cv2.cvtColor(roi, cv2.COLOR_BGR2HSV)
    s, v = hsv[:, :, 1], hsv[:, :, 2]
    text = ((gray >= 158) & (v >= 135)) | ((s <= 85) & (v >= 130) & (gray >= 140))
    text = text.astype(np.uint8) * 255
    text = cv2.dilate(text, np.ones((4, 4), np.uint8), iterations=2)
    mask = np.zeros((h, w), np.uint8)
    mask[y0:, x0:] = text
    mask = cv2.bitwise_and(mask, corner)
    if alpha is not None:
        roi_a = alpha[y0:, x0:]
        a_text = (roi_a > 12) & (gray >= 150)
        extra = np.zeros((h, w), np.uint8)
        extra[y0:, x0:] = (a_text.astype(np.uint8) * 255)
        mask = cv2.bitwise_or(mask, cv2.bitwise_and(extra, corner))
    if cv2.countNonZero(mask) < 80:
        mask = cv2.bitwise_or(mask, corner)
    return cv2.dilate(mask, np.ones((3, 3), np.uint8), iterations=1)


def inpaint_gray(channel: np.ndarray, mask: np.ndarray) -> np.ndarray:
    if mask.max() == 0:
        return channel
    return cv2.inpaint(channel, mask, INPAINT_RADIUS, cv2.INPAINT_TELEA)


def process_rgba(arr: np.ndarray) -> np.ndarray:
    rgb = arr[:, :, :3]
    alpha = arr[:, :, 3]
    bgr = cv2.cvtColor(rgb, cv2.COLOR_RGB2BGR)
    mask = build_mask(bgr, alpha)
    bgr2 = cv2.inpaint(bgr, mask, INPAINT_RADIUS, cv2.INPAINT_TELEA)
    a2 = inpaint_gray(alpha, mask)
    was_transparent = alpha < 12
    a2 = np.where(was_transparent & (mask == 0), 0, a2)
    a2 = np.where(was_transparent & (mask > 0), 0, a2)
    rgb2 = cv2.cvtColor(bgr2, cv2.COLOR_BGR2RGB)
    return np.dstack([rgb2, a2]).astype(np.uint8)


def process_rgb(arr: np.ndarray) -> np.ndarray:
    bgr = cv2.cvtColor(arr, cv2.COLOR_RGB2BGR)
    mask = build_mask(bgr)
    bgr2 = cv2.inpaint(bgr, mask, INPAINT_RADIUS, cv2.INPAINT_TELEA)
    return cv2.cvtColor(bgr2, cv2.COLOR_BGR2RGB)


def process_file(rel: str) -> None:
    path = STATIC / Path(rel)
    if not path.exists():
        print(f"SKIP {rel}")
        return
    backup = BACKUP_WM / rel
    backup.parent.mkdir(parents=True, exist_ok=True)
    if not backup.exists():
        shutil.copy2(path, backup)

    im = Image.open(path)
    if im.mode == "RGBA":
        out = process_rgba(np.array(im))
        Image.fromarray(out, "RGBA").save(path, "PNG", optimize=True)
    else:
        out = process_rgb(np.array(im.convert("RGB")))
        Image.fromarray(out, "RGB").save(path, "PNG", optimize=True)
    print(f"OK {rel}")


def process_source_2048(rel: str) -> None:
    src_root = STATIC / "mengmeng" / "_source-2048"
    src = src_root / rel
    if not src.exists():
        return
    backup = src.with_suffix(".png.bak")
    if not backup.exists():
        shutil.copy2(src, backup)
    im = Image.open(src)
    if im.mode == "RGBA":
        out = process_rgba(np.array(im))
        Image.fromarray(out).save(src, "PNG", optimize=True)
    else:
        out = process_rgb(np.array(im.convert("RGB")))
        Image.fromarray(out).save(src, "PNG", optimize=True)
    print(f"OK source {rel}")


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Remove Doubao corner watermark from PNG(s) under static/."
    )
    parser.add_argument(
        "image",
        nargs="?",
        help="Image path (e.g. static/mengmeng/ip/wave.png)",
    )
    parser.add_argument(
        "--all",
        action="store_true",
        help="Process built-in TARGETS list (default when image omitted)",
    )
    parser.add_argument(
        "--source-2048",
        action="store_true",
        help="Also process matching file under mengmeng/_source-2048/",
    )
    args = parser.parse_args()

    if args.image:
        rel = path_to_rel(resolve_image_path(args.image))
        print(f"Backup: {BACKUP_WM}")
        process_file(rel)
        if args.source_2048:
            process_source_2048(rel)
        print("Done.")
        return 0

    if not args.all:
        args.all = True

    print(f"Backup: {BACKUP_WM}")
    for rel in TARGETS:
        process_file(rel)
    src_root = STATIC / "mengmeng" / "_source-2048"
    if src_root.exists():
        print("Cleaning _source-2048 ...")
        for rel in TARGETS:
            process_source_2048(rel)
    print("Done.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
