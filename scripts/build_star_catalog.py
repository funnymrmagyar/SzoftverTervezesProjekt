#!/usr/bin/env python3
"""Csillagkatalógus előállítása a HYG adatbázisból (assets/data/stars.json).

Bekerül minden csillag, amely
  * szabad szemmel látható (fényrend <= MAG_LIMIT), vagy
  * valamelyik égi kultúra vonalrajzában szerepel (assets/data/cultures/*.json).

Ezért előbb a kultúrákat kell importálni:  npm run data   (mindkettőt futtatja)
Csak a Python standard könyvtárát használja.
"""

from __future__ import annotations

import csv
import json
import sys
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
RAW_FILE = ROOT / "data-raw" / "hygdata_v41.csv"
CULTURES_DIR = ROOT / "assets" / "data" / "cultures"
OUT_FILE = ROOT / "assets" / "data" / "stars.json"

HYG_URL = "https://raw.githubusercontent.com/astronexus/HYG-Database/main/hyg/CURRENT/hygdata_v41.csv"
MAG_LIMIT = 6.5


def download() -> None:
    if RAW_FILE.exists():
        return
    RAW_FILE.parent.mkdir(parents=True, exist_ok=True)
    print(f"Letöltés: {HYG_URL} (kb. 34 MB)")
    urllib.request.urlretrieve(HYG_URL, RAW_FILE)


def required_hips() -> set[int]:
    hips: set[int] = set()
    for path in CULTURES_DIR.glob("*.json"):
        culture = json.loads(path.read_text(encoding="utf-8"))
        for con in culture["constellations"]:
            for line in con["lines"]:
                hips.update(line)
    return hips


def main() -> int:
    download()
    needed = required_hips()
    if not needed:
        print("Figyelem: nincs importált kultúra — előbb futtasd: npm run data:cultures")

    stars: dict[int, list] = {}
    names: dict[str, str] = {}
    with RAW_FILE.open(encoding="utf-8", newline="") as f:
        for row in csv.DictReader(f):
            if not row["hip"] or not row["mag"]:
                continue
            hip = int(row["hip"])
            mag = float(row["mag"])
            if mag > MAG_LIMIT and hip not in needed:
                continue
            if hip in stars and stars[hip][3] <= mag:
                continue  # ugyanaz a HIP többször: a fényesebbet tartjuk meg
            bv = round(float(row["ci"]), 2) if row["ci"] else None
            stars[hip] = [
                hip,
                round(float(row["ra"]) * 15, 4),  # óra -> fok
                round(float(row["dec"]), 4),
                round(mag, 2),
                bv,
            ]
            if row["proper"]:
                names[str(hip)] = row["proper"]

    missing = sorted(needed - stars.keys())
    if missing:
        print(f"Figyelem: {len(missing)} vonalcsillag hiányzik a HYG-ből: {missing[:20]}")

    rows = sorted(stars.values(), key=lambda s: s[3])  # fényesebbek elöl
    data = {
        "version": 1,
        "source": "HYG Database v4.1 (astronexus), CC BY-SA 4.0",
        "magLimit": MAG_LIMIT,
        "fields": ["hip", "ra", "dec", "mag", "bv"],
        "stars": rows,
        "names": {k: v for k, v in names.items() if int(k) in stars},
    }
    OUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    OUT_FILE.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(
        f"{OUT_FILE.relative_to(ROOT)}: {len(rows)} csillag "
        f"({sum(1 for r in rows if r[3] > MAG_LIMIT)} halványabb vonalcsillag), "
        f"{len(data['names'])} név, {OUT_FILE.stat().st_size // 1024} KB"
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
