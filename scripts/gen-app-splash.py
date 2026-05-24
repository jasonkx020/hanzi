#!/usr/bin/env python3
"""从 static/mengmeng/ip/happy.png 生成 App 云打包用启动资源（Android 图 + iOS Storyboard zip）。"""

from __future__ import annotations

from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
MASCOT = ROOT / "static" / "mengmeng" / "ip" / "happy.png"
OUT_DIR = ROOT / "static" / "splash" / "android"

# uni-app Android 自定义启动图标准尺寸（竖屏）
ANDROID_SPLASH = {
    "hdpi": (480, 762),
    "xhdpi": (720, 1242),
    "xxhdpi": (1080, 1882),
}

BG = (246, 243, 236)  # #F6F3EC


def compose_splash(canvas_w: int, canvas_h: int, mascot: Image.Image) -> Image.Image:
    base = Image.new("RGB", (canvas_w, canvas_h), BG)
    mw, mh = mascot.size
    target = int(min(canvas_w, canvas_h) * 0.52)
    scale = target / max(mw, mh)
    nw = max(1, int(mw * scale))
    nh = max(1, int(mh * scale))
    resized = mascot.resize((nw, nh), Image.Resampling.LANCZOS)
    x = (canvas_w - nw) // 2
    y = int(canvas_h * 0.38) - nh // 2
    base.paste(resized, (x, y), resized)
    return base


def main() -> None:
    if not MASCOT.is_file():
        raise SystemExit(f"missing mascot: {MASCOT}")
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    mascot = Image.open(MASCOT).convert("RGBA")
    for name, (w, h) in ANDROID_SPLASH.items():
        out = OUT_DIR / f"{name}.png"
        compose_splash(w, h, mascot).save(out, "PNG", optimize=True)
        print(f"wrote {out.relative_to(ROOT)} ({w}x{h})")


def main_ios() -> None:
    import subprocess
    import sys

    script = ROOT / "scripts" / "gen-ios-launch-storyboard.py"
    subprocess.check_call([sys.executable, str(script)])


if __name__ == "__main__":
    main()
    main_ios()
