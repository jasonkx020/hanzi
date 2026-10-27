#!/usr/bin/env python3
"""
按实际 UI 展示尺寸压缩 static 图片，减小安装包体积。

策略：
- 删除无代码引用的大图
- 按 @3x 展示需求缩小常用美术
- PNG optimize；JPEG 适度降质
- 勋章 12 张为同一图：压成小图后统一覆盖
"""

from __future__ import annotations

import hashlib
import shutil
import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
STATIC = ROOT / "static"

# 确认无运行时引用（仅 assets 常量或零引用）→ 删除以减包
DELETE_UNUSED = [
    "db.png",  # 与 bg/bg.png 重复且无引用
    "bg/bg.png",
    "mengmeng/bg/page-soft.png",  # 仅出现在 mengmeng-assets 常量
    "mengmeng/reference/mengmeng-master.png",  # 设计参考，不进业务页
]

# rel -> max edge (int) or cover box (w,h)
RESIZE: dict[str, int | tuple[int, int]] = {
    # IP 头像最大 xl≈320rpx → @3x ~480，留余量 512
    "mengmeng/ip/book.png": 512,
    "mengmeng/ip/happy.png": 512,
    "mengmeng/ip/curious.png": 512,
    "mengmeng/ip/trying.png": 512,
    "mengmeng/ip/balloon.png": 512,
    "mengmeng/ip/wave.png": 512,
    # 小图标 / 角标
    "mengmeng/logo-icon.png": 256,
    "mengmeng/logo.png": (800, 240),
    "mengmeng/app-icon.png": 512,
    "mengmeng/laba.png": 160,
    # 顶图背景（不透明 cover）
    "mengmeng/hero-bg.png": (900, 600),
    # 入口图：首页按钮/横幅装饰最大约 200rpx
    "mengmeng/entry/daily.png": 256,
    "mengmeng/entry/textbook.png": 256,
    "mengmeng/entry/stroke-lab.png": 256,
    "mengmeng/entry/game.png": 256,
    # 空态
    "mengmeng/state/empty.png": 400,
    "mengmeng/state/error.png": 400,
    "mengmeng/state/loading.png": 400,
    "mengmeng/state/success.png": 400,
    # Tab 已较小，再压一点
    "tab/home.png": 128,
    "tab/home-active.png": 128,
    "tab/learn.png": 128,
    "tab/learn-active.png": 128,
    "tab/catalog.png": 128,
    "tab/catalog-active.png": 128,
    "tab/me.png": 128,
    "tab/me-active.png": 128,
}

MEDAL_EDGE = 192
JPEG_QUALITY = 78
COVER = {"mengmeng/hero-bg.png"}


def ensure_rgba(im: Image.Image) -> Image.Image:
    if im.mode == "RGBA":
        return im
    if im.mode == "P" and "transparency" in im.info:
        return im.convert("RGBA")
    if im.mode == "LA":
        return im.convert("RGBA")
    return im.convert("RGBA")


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
    scale = min(bw / w, bh / h, 1.0)
    nw, nh = max(1, int(w * scale)), max(1, int(h * scale))
    resized = im.resize((nw, nh), Image.Resampling.LANCZOS)
    if (nw, nh) == (bw, bh):
        return resized
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
    return cropped.convert("RGB")


def save_png(im: Image.Image, path: Path, *, keep_alpha: bool) -> None:
    if keep_alpha:
        ensure_rgba(im).save(path, "PNG", optimize=True, compress_level=9)
    else:
        if im.mode == "RGBA":
            bg = Image.new("RGB", im.size, (255, 255, 255))
            bg.paste(im, mask=im.split()[3])
            bg.save(path, "PNG", optimize=True, compress_level=9)
        else:
            im.convert("RGB").save(path, "PNG", optimize=True, compress_level=9)


def process_one(rel: str, spec: int | tuple[int, int]) -> tuple[int, int]:
    path = STATIC / Path(rel)
    if not path.is_file():
        print(f"SKIP missing {rel}")
        return 0, 0
    before = path.stat().st_size
    im = Image.open(path)
    keep_alpha = (
        rel.startswith("mengmeng/ip/")
        or rel.startswith("mengmeng/entry/")
        or rel.startswith("mengmeng/state/")
        or rel.startswith("tab/")
        or rel.endswith("logo-icon.png")
        or rel.endswith("laba.png")
        or rel.endswith("logo.png")
        or rel.endswith("app-icon.png")
    )
    if rel in COVER:
        assert isinstance(spec, tuple)
        out = resize_cover(im, spec)
        keep_alpha = False
    elif isinstance(spec, int):
        out = resize_max_edge(im, spec)
    else:
        out = resize_contain(im, spec)
    save_png(out, path, keep_alpha=keep_alpha)
    after = path.stat().st_size
    print(f"OK {rel}: {before/1024:.0f}KB -> {after/1024:.0f}KB  {Image.open(path).size}")
    return before, after


def optimize_medals() -> tuple[int, int]:
    medal_dir = STATIC / "mengmeng" / "medals"
    files = sorted(medal_dir.glob("m*.png"))
    if not files:
        return 0, 0
    before = sum(f.stat().st_size for f in files)
    # 取第一张缩小后覆盖全部（当前 12 张内容完全相同）
    src = files[0]
    im = resize_max_edge(Image.open(src), MEDAL_EDGE)
    tmp = medal_dir / "_medal_opt.png"
    save_png(im, tmp, keep_alpha=True)
    data = tmp.read_bytes()
    for f in files:
        f.write_bytes(data)
    tmp.unlink(missing_ok=True)
    after = sum(f.stat().st_size for f in files)
    print(f"OK medals x{len(files)}: {before/1024:.0f}KB -> {after/1024:.0f}KB  edge={MEDAL_EDGE}")
    return before, after


def optimize_jpegs() -> tuple[int, int]:
    before = after = 0
    for path in sorted((STATIC / "images").glob("*.jpg")):
        b = path.stat().st_size
        im = Image.open(path)
        # 封面展示不大，最长边压到 360
        im2 = im
        if max(im.size) > 360:
            scale = 360 / max(im.size)
            im2 = im.resize(
                (max(1, int(im.size[0] * scale)), max(1, int(im.size[1] * scale))),
                Image.Resampling.LANCZOS,
            )
        im2.convert("RGB").save(path, "JPEG", quality=JPEG_QUALITY, optimize=True)
        a = path.stat().st_size
        before += b
        after += a
        print(f"OK images/{path.name}: {b/1024:.0f}KB -> {a/1024:.0f}KB  {Image.open(path).size}")
    return before, after


def delete_unused() -> int:
    freed = 0
    for rel in DELETE_UNUSED:
        path = STATIC / Path(rel)
        if path.is_file():
            sz = path.stat().st_size
            path.unlink()
            freed += sz
            print(f"DEL {rel}: -{sz/1024:.0f}KB")
        # 清理空目录
        parent = path.parent
        if parent != STATIC and parent.is_dir() and not any(parent.iterdir()):
            parent.rmdir()
            print(f"RMDIR {parent.relative_to(STATIC)}")
    return freed


def total_images_bytes() -> int:
    exts = {".png", ".jpg", ".jpeg", ".webp", ".gif"}
    return sum(p.stat().st_size for p in STATIC.rglob("*") if p.suffix.lower() in exts and p.is_file())


def main() -> int:
    before_total = total_images_bytes()
    print(f"Before: {before_total/1024/1024:.2f} MB")

    freed = delete_unused()
    saved = freed
    for rel, spec in RESIZE.items():
        b, a = process_one(rel, spec)
        saved += max(0, b - a)
    b, a = optimize_medals()
    saved += max(0, b - a)
    b, a = optimize_jpegs()
    saved += max(0, b - a)

    # 根目录 logo.png（若存在）
    root_logo = STATIC / "logo.png"
    if root_logo.is_file():
        b = root_logo.stat().st_size
        im = resize_max_edge(Image.open(root_logo), 192)
        save_png(im, root_logo, keep_alpha=True)
        a = root_logo.stat().st_size
        saved += max(0, b - a)
        print(f"OK logo.png: {b/1024:.0f}KB -> {a/1024:.0f}KB")

    after_total = total_images_bytes()
    print("---")
    print(f"After:  {after_total/1024/1024:.2f} MB")
    print(f"Saved:  {(before_total - after_total)/1024/1024:.2f} MB ({(1 - after_total / before_total) * 100:.1f}%)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
