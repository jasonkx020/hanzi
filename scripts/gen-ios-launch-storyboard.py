#!/usr/bin/env python3
"""生成 iOS 云打包用 CustomStoryboard.zip（米色底 + 居中 happy.png 大图）。"""

from __future__ import annotations

import re
import zipfile
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
MASCOT = ROOT / "static" / "mengmeng" / "ip" / "happy.png"
TEMPLATE_DIR = ROOT / "static" / "splash" / "ios" / "_template" / "CustomStoryboard"
SRC_DIR = ROOT / "static" / "splash" / "ios" / "storyboard-src"
ZIP_OUT = ROOT / "static" / "splash" / "ios" / "CustomStoryboard.zip"

# 启动页中部萌萌（@2x / @3x 逻辑像素约 200pt / 300pt）
ICON_SIZES = {"dc_launchscreen_icon@2x.png": 400, "dc_launchscreen_icon@3x.png": 600}

BG_RGB = (246, 243, 236)  # #F6F3EC


def _rgb01(c: int) -> str:
    return f"{c / 255:.14g}"


def patch_storyboard(xml: str) -> str:
    bg = (
        f'<color key="backgroundColor" red="{_rgb01(BG_RGB[0])}" '
        f'green="{_rgb01(BG_RGB[1])}" blue="{_rgb01(BG_RGB[2])}" '
        f'alpha="1" colorSpace="calibratedRGB"/>'
    )
    xml = re.sub(
        r'<color key="backgroundColor" systemColor="systemBackgroundColor"/>',
        bg,
        xml,
        count=1,
    )
    xml = xml.replace('text="hello uniapp"', 'text=""', 1)
    xml = xml.replace(
        'contentMode="scaleAspectFill" horizontalHuggingPriority="251" verticalHuggingPriority="251" image="dc_launchscreen_icon.png"',
        'contentMode="scaleAspectFit" horizontalHuggingPriority="251" verticalHuggingPriority="251" image="dc_launchscreen_icon.png"',
    )
    return xml


def render_icon(path: Path, edge: int) -> None:
    mascot = Image.open(MASCOT).convert("RGBA")
    mw, mh = mascot.size
    scale = edge / max(mw, mh)
    nw = max(1, int(mw * scale))
    nh = max(1, int(mh * scale))
    resized = mascot.resize((nw, nh), Image.Resampling.LANCZOS)
    canvas = Image.new("RGBA", (edge, edge), (0, 0, 0, 0))
    canvas.paste(resized, ((edge - nw) // 2, (edge - nh) // 2), resized)
    canvas.save(path, "PNG", optimize=True)


def write_zip(src_dir: Path, zip_path: Path) -> None:
    zip_path.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(zip_path, "w", compression=zipfile.ZIP_DEFLATED) as zf:
        for f in sorted(src_dir.iterdir()):
            if f.is_file() and f.suffix.lower() in {".storyboard", ".png"}:
                zf.write(f, arcname=f.name)


def main() -> None:
    if not MASCOT.is_file():
        raise SystemExit(f"missing mascot: {MASCOT}")
    template_sb = TEMPLATE_DIR / "LaunchScreen.storyboard"
    if not template_sb.is_file():
        raise SystemExit(
            f"missing template: {template_sb}\n"
            "请先下载 DCloud CustomStoryboard.zip 到 static/splash/ios/_template/"
        )

    SRC_DIR.mkdir(parents=True, exist_ok=True)
    storyboard = patch_storyboard(template_sb.read_text(encoding="utf-8"))
    (SRC_DIR / "LaunchScreen.storyboard").write_text(storyboard, encoding="utf-8")

    for name, edge in ICON_SIZES.items():
        out = SRC_DIR / name
        render_icon(out, edge)
        print(f"wrote {out.relative_to(ROOT)} ({edge}x{edge})")

    write_zip(SRC_DIR, ZIP_OUT)
    print(f"wrote {ZIP_OUT.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
