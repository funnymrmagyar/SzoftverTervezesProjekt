"""A projekt .env.local és .env fájljainak beolvasása az adatszkriptekhez.

A Python magától nem olvassa a .env-et, ezért ez a kis segéd teszi meg (csak a standard
könyvtárral). A sorrend ugyanaz, mint az Expónál: a shellben megadott változó a legerősebb,
utána a .env.local, végül a .env. Az üres értékeket (pl. „HYG_URL=” a .env.example-ből)
kihagyja, így azoknál a szkript saját alapértéke marad érvényben.
"""

from __future__ import annotations

import os
from pathlib import Path


def load_env(root: Path) -> None:
    for name in (".env.local", ".env"):
        path = root / name
        if not path.is_file():
            continue
        for raw_line in path.read_text(encoding="utf-8").splitlines():
            line = raw_line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, _, value = line.partition("=")
            key = key.strip()
            value = value.strip().strip("\"'")
            if key and value and key not in os.environ:
                os.environ[key] = value
