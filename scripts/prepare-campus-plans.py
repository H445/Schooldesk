"""Render the official Main Building PDF and extract room-label coordinates.

Requires pdfplumber and Poppler's pdftoppm on PATH. Run from the repo root:
  python scripts/prepare-campus-plans.py
Source: https://www.stclaircollege.ca/sites/default/files/inline-files/maps/maps-building-a-main.pdf
"""

import json
import re
import subprocess
from pathlib import Path

import pdfplumber

root = Path(__file__).resolve().parents[1]
source = root / "public/main-building-detailed.pdf"
rooms = {}
with pdfplumber.open(source) as document:
    for index, page in enumerate(document.pages):
        for word in page.extract_words():
            if re.fullmatch(r"A\d{4}[A-Z]?", word["text"]):
                rooms.setdefault(word["text"], {
                    "page": index + 1,
                    "x": round((word["x0"] + word["x1"]) / 2 / page.width * 100, 4),
                    "y": round((word["top"] + word["bottom"]) / 2 / page.height * 100, 4),
                })
        subprocess.run([
            "pdftoppm", "-f", str(index + 1), "-l", str(index + 1),
            "-scale-to", "3200", "-singlefile", "-png", str(source),
            str(root / f"public/main-building-page-{index + 1}"),
        ], check=True)

(root / "lib/campus-room-positions.json").write_text(
    json.dumps(rooms, indent=2, sort_keys=True) + "\n", encoding="utf-8"
)
print(f"Rendered {len(document.pages)} pages and located {len(rooms)} room labels.")
