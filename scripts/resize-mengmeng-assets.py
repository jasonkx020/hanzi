#!/usr/bin/env python3
"""Resize runtime Mengmeng/tab icons for MP + Android; backup originals to _source-2048."""

from __future__ import annotations

import argparse
import io
import shutil
import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
STATIC = ROOT / "static"
BACKUP = STATIC / "mengmeng" / "_source-2048"

# rel path -> spec: int = max edge; (w,h) = box fit; ("exact", n) = force square
SPECS: dict[str, tuple[int, int] | int | tuple[str, int]] = {
	# brand / chrome (display ~52rpx)
	"mengmeng/logo.png": (480, 144),
	"mengmeng/logo-icon.png": 128,
	"mengmeng/laba.png": 128,
	"mengmeng/app-icon.png": 1024,
	# hero (first screen)
	"mengmeng/hero-bg.png": (1125, 750),
	# IP avatars (meng-avatar up to ~320rpx)
	"mengmeng/ip/book.png": 512,
	"mengmeng/ip/happy.png": 512,
	"mengmeng/ip/curious.png": 512,
	"mengmeng/ip/trying.png": 512,
	"mengmeng/ip/balloon.png": 512,
	"mengmeng/ip/wave.png": 512,
	# empty states
	"mengmeng/state/empty.png": 400,
	"mengmeng/state/error.png": 400,
	"mengmeng/state/loading.png": 400,
	"mengmeng/state/success.png": 400,
	# home entry tiles (~48rpx)
	"mengmeng/entry/daily.png": 128,
	"mengmeng/entry/textbook.png": 128,
	"mengmeng/entry/stroke-lab.png": 128,
	"mengmeng/entry/game.png": 128,
	# medals (~120rpx)
	"mengmeng/medals/m01.png": 256,
	"mengmeng/medals/m02.png": 256,
	"mengmeng/medals/m03.png": 256,
	"mengmeng/medals/m04.png": 256,
	"mengmeng/medals/m05.png": 256,
	"mengmeng/medals/m06.png": 256,
	"mengmeng/medals/m07.png": 256,
	"mengmeng/medals/m08.png": 256,
	"mengmeng/medals/m09.png": 256,
	"mengmeng/medals/m10.png": 256,
	"mengmeng/medals/m11.png": 256,
	"mengmeng/medals/m12.png": 256,
	# WeChat tabBar: official 81px, ≤40KB
	"tab/home.png": ("exact", 81),
	"tab/home-active.png": ("exact", 81),
	"tab/learn.png": ("exact", 81),
	"tab/learn-active.png": ("exact", 81),
	"tab/catalog.png": ("exact", 81),
	"tab/catalog-active.png": ("exact", 81),
	"tab/me.png": ("exact", 81),
	"tab/me-active.png": ("exact", 81),
}

# Soft KB budgets after resize; over → palette quantize (keep alpha)
SIZE_BUDGET_KB: dict[str, int] = {
	"mengmeng/logo-icon.png": 40,
	"mengmeng/laba.png": 40,
	"mengmeng/logo.png": 80,
	"mengmeng/hero-bg.png": 250,
	"mengmeng/app-icon.png": 400,
	**{f"mengmeng/ip/{n}.png": 120 for n in ("book", "happy", "curious", "trying", "balloon", "wave")},
	**{f"mengmeng/state/{n}.png": 80 for n in ("empty", "error", "loading", "success")},
	**{f"mengmeng/entry/{n}.png": 40 for n in ("daily", "textbook", "stroke-lab", "game")},
	**{f"mengmeng/medals/m{i:02d}.png": 60 for i in range(1, 13)},
	**{f"tab/{n}.png": 40 for n in (
		"home", "home-active", "learn", "learn-active",
		"catalog", "catalog-active", "me", "me-active",
	)},
}

COVER = {"mengmeng/hero-bg.png"}

KEY_WHITE = {f"tab/{n}" for n in [
	"home.png", "home-active.png", "learn.png", "learn-active.png",
	"catalog.png", "catalog-active.png", "me.png", "me-active.png",
]}

# Prefer reading these from repo root static when mengmeng copy missing
LOGO_FALLBACK = STATIC / "logo.png"


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


def resize_exact_square(im: Image.Image, edge: int) -> Image.Image:
	im = ensure_rgba(im)
	return im.resize((edge, edge), Image.Resampling.LANCZOS)


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


def png_bytes(im: Image.Image, force_rgba: bool) -> bytes:
	buf = io.BytesIO()
	if force_rgba:
		ensure_rgba(im).save(buf, "PNG", optimize=True)
	elif im.mode == "RGBA":
		bg = Image.new("RGB", im.size, (255, 255, 255))
		bg.paste(im, mask=im.split()[3])
		bg.save(buf, "PNG", optimize=True)
	else:
		im.convert("RGB").save(buf, "PNG", optimize=True)
	return buf.getvalue()


def quantize_rgba(im: Image.Image, colors: int = 64) -> Image.Image:
	im = ensure_rgba(im)
	# FASTOCTREE keeps alpha in palette PNGs better for icons
	return im.quantize(colors=colors, method=Image.Quantize.FASTOCTREE)


def save_under_budget(im: Image.Image, path: Path, force_rgba: bool, budget_kb: int | None) -> tuple[int, str]:
	data = png_bytes(im, force_rgba)
	note = "png"
	if budget_kb is not None and len(data) > budget_kb * 1024:
		for colors in (128, 64, 48, 32):
			q = quantize_rgba(im, colors)
			buf = io.BytesIO()
			q.save(buf, "PNG", optimize=True)
			cand = buf.getvalue()
			if len(cand) < len(data):
				data = cand
				note = f"q{colors}"
			if len(data) <= budget_kb * 1024:
				break
	try:
		path.write_bytes(data)
	except OSError:
		# WeChat DevTools / HBuilder 可能占用文件；经临时文件再替换
		tmp = path.with_name(path.stem + ".tmp.png")
		tmp.write_bytes(data)
		tmp.replace(path)
	return len(data), note


def source_path_for(rel: str, dest: Path) -> Path:
	"""Prefer _source-2048 backup; then dest; logo may fall back to static/logo.png."""
	backup = BACKUP / rel
	if backup.is_file():
		return backup
	if dest.is_file():
		return dest
	if rel == "mengmeng/logo.png" and LOGO_FALLBACK.is_file():
		return LOGO_FALLBACK
	return dest


def ensure_backup(rel: str, src: Path) -> None:
	backup = BACKUP / rel
	backup.parent.mkdir(parents=True, exist_ok=True)
	if not backup.exists() and src.is_file():
		# Don't nest: if src is already under BACKUP, skip
		try:
			src.resolve().relative_to(BACKUP.resolve())
			return
		except ValueError:
			shutil.copy2(src, backup)


def needs_rgba(rel: str) -> bool:
	if rel in KEY_WHITE:
		return True
	if any(x in rel for x in ("/ip/", "/state/", "/entry/", "/medals/", "logo-icon", "laba")):
		return True
	if rel.endswith("logo.png"):
		return True
	return False


def process(
	rel: str,
	spec: tuple[int, int] | int | tuple[str, int],
	*,
	use_cover: bool | None = None,
	skip_key_white: bool = False,
) -> None:
	path = STATIC / Path(rel)
	src = source_path_for(rel, path)
	if not src.exists():
		print(f"SKIP missing: {rel}")
		return

	ensure_backup(rel, src if src != (BACKUP / rel) else path if path.exists() else src)

	# Always scale from highest-quality available source
	read_from = BACKUP / rel
	if not read_from.is_file():
		read_from = src

	before = path.stat().st_size if path.is_file() else 0
	im = Image.open(read_from)
	orig = im.size
	force_rgba = needs_rgba(rel)

	if rel in KEY_WHITE and not skip_key_white:
		im = key_near_white(im)

	cover = use_cover if use_cover is not None else rel in COVER
	if cover:
		assert isinstance(spec, tuple) and not (isinstance(spec[0], str))
		out = resize_cover(im, spec)  # type: ignore[arg-type]
		force_rgba = False
	elif isinstance(spec, tuple) and len(spec) == 2 and spec[0] == "exact":
		out = resize_exact_square(im, int(spec[1]))
	elif isinstance(spec, int):
		out = resize_max_edge(im, spec)
	else:
		out = resize_contain(im, spec)  # type: ignore[arg-type]

	path.parent.mkdir(parents=True, exist_ok=True)
	budget = SIZE_BUDGET_KB.get(rel)
	nbytes, note = save_under_budget(out, path, force_rgba, budget)
	out_size = Image.open(path).size
	kb = nbytes / 1024
	before_kb = before / 1024 if before else 0
	print(
		f"OK {rel}: {orig[0]}x{orig[1]} -> {out_size[0]}x{out_size[1]} "
		f"{before_kb:.1f}KB -> {kb:.1f}KB ({note})"
		+ (f" budget≤{budget}KB" if budget else "")
	)

	# Native tabBar：同步到 static/tabbar（HBuilder 必拷）与根目录 tabbar（备用）
	if rel.startswith("tab/") and rel in {
		"tab/home.png", "tab/home-active.png",
		"tab/catalog.png", "tab/catalog-active.png",
		"tab/me.png", "tab/me-active.png",
	}:
		name = Path(rel).name
		for dest_dir in (STATIC / "tabbar", ROOT / "tabbar"):
			dest_dir.mkdir(parents=True, exist_ok=True)
			shutil.copy2(path, dest_dir / name)


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
