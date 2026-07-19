#!/usr/bin/env python3
"""Render the NOD-I read-only cockpit to a 320x240 ST7789 screen or PNG."""

from __future__ import annotations

import argparse
import json
import logging
import time
from pathlib import Path
from typing import Any

import requests
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent
COLORS = {
    "background": "#080b09",
    "panel": "#111612",
    "line": "#2a352d",
    "text": "#eef7ef",
    "muted": "#91a092",
    "green": "#58e083",
    "amber": "#f2ba54",
    "red": "#ff6b5f",
}


def font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    candidates = [
        "/usr/share/fonts/truetype/dejavu/DejaVuSansMono-Bold.ttf" if bold else "/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf",
        "/usr/share/fonts/dejavu/DejaVuSans-Bold.ttf" if bold else "/usr/share/fonts/dejavu/DejaVuSans.ttf",
    ]
    for candidate in candidates:
        if Path(candidate).exists():
            return ImageFont.truetype(candidate, size)
    return ImageFont.load_default()


def status_color(status: str) -> str:
    if status in {"online", "running", "approved"}:
        return COLORS["green"]
    if status in {"offline", "blocked", "thermal-stop", "rejected"}:
        return COLORS["red"]
    return COLORS["amber"]


def text(draw: ImageDraw.ImageDraw, xy: tuple[int, int], value: Any, *, size: int = 12,
         color: str = COLORS["text"], bold: bool = False) -> None:
    draw.text(xy, str(value), font=font(size, bold), fill=color)


def panel(draw: ImageDraw.ImageDraw, box: tuple[int, int, int, int]) -> None:
    draw.rounded_rectangle(box, radius=5, fill=COLORS["panel"], outline=COLORS["line"], width=1)


def metric(draw: ImageDraw.ImageDraw, x: int, y: int, label: str, value: str, color: str) -> None:
    text(draw, (x, y), label.upper(), size=9, color=COLORS["muted"], bold=True)
    text(draw, (x, y + 15), value, size=14, color=color, bold=True)


def truncate(value: Any, length: int) -> str:
    rendered = str(value)
    return rendered if len(rendered) <= length else f"{rendered[:length - 1]}…"


def render(payload: dict[str, Any]) -> Image.Image:
    image = Image.new("RGB", (320, 240), COLORS["background"])
    draw = ImageDraw.Draw(image)
    bitcoin = payload.get("bitcoin", {})
    miner = payload.get("miner", {})
    device = payload.get("device", {})
    store = payload.get("store", {})

    text(draw, (12, 9), "NOD-I", size=18, color=COLORS["green"], bold=True)
    text(draw, (79, 14), "COMMUNITY NODE", size=10, color=COLORS["muted"], bold=True)
    temp = device.get("temperatureC")
    temp_label = "--°C" if temp is None else f"{temp:.0f}°C"
    text(draw, (270, 12), temp_label, size=12, color=status_color("offline" if temp and temp >= 75 else "online"), bold=True)

    panel(draw, (8, 39, 312, 112))
    text(draw, (18, 48), "BITCOIN NODE", size=10, color=COLORS["muted"], bold=True)
    node_status = str(bitcoin.get("status", "offline"))
    text(draw, (208, 47), node_status.upper(), size=11, color=status_color(node_status), bold=True)
    progress = float(bitcoin.get("progress", 0) or 0)
    text(draw, (18, 68), f"SYNC {progress:05.2f}%", size=19, color=COLORS["text"], bold=True)
    draw.rounded_rectangle((18, 94, 302, 101), radius=3, fill="#1d2820")
    fill_width = int(284 * max(0, min(100, progress)) / 100)
    if fill_width:
        draw.rounded_rectangle((18, 94, 18 + fill_width, 101), radius=3, fill=status_color(node_status))

    panel(draw, (8, 120, 203, 191))
    metric(draw, 18, 130, "Loterie", str(miner.get("status", "offline")).upper(), status_color(str(miner.get("status", "offline"))))
    metric(draw, 126, 130, "Hashrate", f"{float(miner.get('hashRateKh', 0) or 0):.1f}k", COLORS["text"])
    text(draw, (18, 174), truncate(miner.get("message", ""), 29), size=8, color=COLORS["muted"])

    panel(draw, (211, 120, 312, 191))
    metric(draw, 221, 130, "Store", f"{int(store.get('candidates', 0))} vote(s)", COLORS["amber"])
    text(draw, (221, 174), f"{int(store.get('core', 0))} core", size=9, color=COLORS["muted"])

    attention = payload.get("attention")
    level = str(attention.get("level", "info")) if isinstance(attention, dict) else "info"
    alert_color = COLORS["red"] if level == "error" else COLORS["amber"] if level == "warning" else COLORS["green"]
    draw.rectangle((8, 201, 312, 232), fill="#0d120e", outline=alert_color, width=1)
    text(draw, (17, 208), "!" if attention else "✓", size=12, color=alert_color, bold=True)
    message = attention.get("message", "Système nominal") if isinstance(attention, dict) else "Système nominal"
    text(draw, (36, 209), truncate(message, 38), size=10, color=COLORS["text"], bold=True)
    return image


def load_config(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def fetch_payload(config: dict[str, Any], fixture: Path | None) -> dict[str, Any]:
    if fixture:
        return json.loads(fixture.read_text(encoding="utf-8"))
    response = requests.get(str(config["apiUrl"]), timeout=3)
    response.raise_for_status()
    return response.json()


def open_display(config: dict[str, Any]):
    try:
        import ST7789
    except ImportError as error:
        raise RuntimeError("ST7789 is not installed; use --output for PNG mode") from error
    return ST7789.ST7789(
        port=int(config["spiPort"]), cs=int(config["spiChipSelect"]),
        dc=int(config["dcPin"]), backlight=int(config["backlightPin"]),
        rst=int(config["resetPin"]), width=int(config["width"]), height=int(config["height"]),
        rotation=int(config["rotation"]), spi_speed_hz=80_000_000,
    )


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--config", type=Path, default=ROOT / "config.example.json")
    parser.add_argument("--fixture", type=Path)
    parser.add_argument("--output", type=Path, help="Write a PNG instead of using the physical screen")
    parser.add_argument("--once", action="store_true", help="Render one frame and exit")
    args = parser.parse_args()
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
    config = load_config(args.config)
    display = None if args.output else open_display(config)
    if display:
        display.begin()

    while True:
        try:
            image = render(fetch_payload(config, args.fixture))
            if args.output:
                args.output.parent.mkdir(parents=True, exist_ok=True)
                image.save(args.output)
                logging.info("Wrote %s", args.output)
            else:
                display.display(image)
        except Exception:
            logging.exception("Screen refresh failed")
            if args.once:
                return 1
        if args.once or args.output:
            return 0
        time.sleep(max(1, int(config.get("pollSeconds", 5))))


if __name__ == "__main__":
    raise SystemExit(main())
