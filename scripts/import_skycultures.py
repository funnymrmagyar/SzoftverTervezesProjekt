#!/usr/bin/env python3
"""Égi kultúrák importja az app formátumába (assets/data/cultures/*.json).

Források:
  * Stellarium „modern” égi kultúra (index.json + description.md), CC BY-SA 4.0
  * Stellarium magyar fordítások (po/stellarium-skycultures/hu.po), GPL-2.0+
  * data-src/cultures/*.json — a csapat saját kultúrái, már az app formátumában

Futtatás:  python3 scripts/import_skycultures.py   (vagy: npm run data:cultures)
Csak a Python standard könyvtárát használja.
"""

from __future__ import annotations

import json
import re
import sys
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
RAW_DIR = ROOT / "data-raw" / "stellarium"
SRC_DIR = ROOT / "data-src" / "cultures"
OUT_DIR = ROOT / "assets" / "data" / "cultures"

STELLARIUM_RAW = "https://raw.githubusercontent.com/Stellarium/stellarium/master"
DOWNLOADS = {
    "modern_index.json": f"{STELLARIUM_RAW}/skycultures/modern/index.json",
    "modern_description.md": f"{STELLARIUM_RAW}/skycultures/modern/description.md",
    "hu.po": f"{STELLARIUM_RAW}/po/stellarium-skycultures/hu.po",
}

REQUIRED_CULTURE_FIELDS = ("id", "name", "summary", "source", "license", "lineColor", "constellations")


def download_sources() -> None:
    RAW_DIR.mkdir(parents=True, exist_ok=True)
    for name, url in DOWNLOADS.items():
        target = RAW_DIR / name
        if target.exists():
            continue
        print(f"Letöltés: {url}")
        urllib.request.urlretrieve(url, target)


def parse_po(path: Path) -> dict[tuple[str | None, str], str]:
    """Egyszerű .po-olvasó: (msgctxt, msgid) -> msgstr. Többsoros msgid-ket kihagyja."""
    translations: dict[tuple[str | None, str], str] = {}
    for entry in path.read_text(encoding="utf-8").split("\n\n"):
        ctx = re.search(r'^msgctxt "(.*)"$', entry, re.M)
        msgid = re.search(r'^msgid "(.*)"$', entry, re.M)
        msgstr = re.search(r'^msgstr "(.*)"$', entry, re.M)
        if msgid and msgstr and msgstr.group(1):
            translations[(ctx.group(1) if ctx else None, msgid.group(1))] = msgstr.group(1)
    return translations


def parse_descriptions(path: Path) -> dict[str, str]:
    """A description.md „##### Név” szakaszai: angol név -> leírás."""
    text = path.read_text(encoding="utf-8")
    section = re.split(r"^## Constellations\s*$", text, maxsplit=1, flags=re.M)[1]
    section = re.split(r"^## ", section, flags=re.M)[0]
    result: dict[str, str] = {}
    for block in re.split(r"^##### ", section, flags=re.M)[1:]:
        title, _, body = block.partition("\n")
        body = re.sub(r"\n{3,}", "\n\n", body).strip()
        if body:
            result[title.strip()] = body
    return result


def build_western() -> dict:
    index = json.loads((RAW_DIR / "modern_index.json").read_text(encoding="utf-8"))
    hu = parse_po(RAW_DIR / "hu.po")
    descriptions = parse_descriptions(RAW_DIR / "modern_description.md")

    constellations = []
    for con in index["constellations"]:
        common = con["common_name"]
        english = common["english"]
        name_hu = hu.get((common.get("context"), english)) or hu.get((None, english)) or english
        item = {
            "id": con["id"].split()[-1],
            "name": name_hu,
            "nativeName": common.get("native", english),
            "lines": [[int(h) for h in line] for line in con["lines"]],
        }
        if english in descriptions:
            item["description"] = descriptions[english]
            item["descriptionLang"] = "en"
        constellations.append(item)

    constellations.sort(key=lambda c: c["name"])
    return {
        "id": "western",
        "name": "Nyugati (modern)",
        "summary": "A Nemzetközi Csillagászati Unió 88 csillagképe, a Stellarium „modern” vonalrajzaival.",
        "source": "Stellarium – modern égi kultúra; magyar nevek: Stellarium-fordítás",
        "license": "CC BY-SA 4.0 (adatok, leírások); GPL-2.0+ (magyar nevek)",
        "lineColor": "#6aa9ff",
        "constellations": constellations,
    }


def validate(culture: dict) -> None:
    missing = [f for f in REQUIRED_CULTURE_FIELDS if f not in culture]
    if missing:
        raise ValueError(f"{culture.get('id', '?')}: hiányzó mezők: {missing}")
    ids = set()
    for con in culture["constellations"]:
        if con["id"] in ids:
            raise ValueError(f"{culture['id']}: duplikált csillagkép-azonosító: {con['id']}")
        ids.add(con["id"])
        for line in con["lines"]:
            if len(line) < 2 or not all(isinstance(h, int) for h in line):
                raise ValueError(f"{culture['id']}/{con['id']}: hibás vonal: {line}")


def write_culture(culture: dict) -> None:
    validate(culture)
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    out = OUT_DIR / f"{culture['id']}.json"
    out.write_text(json.dumps(culture, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"{out.relative_to(ROOT)}: {len(culture['constellations'])} csillagkép, {out.stat().st_size // 1024} KB")


def main() -> int:
    download_sources()
    write_culture(build_western())
    for src in sorted(SRC_DIR.glob("*.json")):
        write_culture(json.loads(src.read_text(encoding="utf-8")))
    return 0


if __name__ == "__main__":
    sys.exit(main())
