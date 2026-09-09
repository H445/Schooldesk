"""Extract individual room anchors from the bundled campus overview.

Blue room labels belong to the drawing. White range labels, floor headings,
and the directory on the right are deliberately excluded.
Requires pdfplumber; run from the repository root.
"""

import json
import re
from pathlib import Path

import pdfplumber

root = Path(__file__).resolve().parents[1]
rooms = {}
with pdfplumber.open(root / "public/windsor-campus-map.pdf") as document:
    page = document.pages[0]
    for word in page.extract_words(extra_attrs=["non_stroking_color"], return_chars=True):
        if word["x1"] / page.width > 0.72:
            continue
        if tuple(word["non_stroking_color"]) != (0.816, 0.398, 0.0, 0.0):
            continue
        # Some adjacent room labels are returned as a single word by the PDF.
        for match in re.finditer(r"[A-Z]\d{4}[A-Z]?(?=[A-Z]\d|$)", word["text"]):
            chars = word["chars"][match.start():match.end()]
            room = match.group()
            if room in rooms:
                raise ValueError(f"Ambiguous room label: {room}")
            rooms[room] = {
                "x": round((min(c["x0"] for c in chars) + max(c["x1"] for c in chars)) / 2 / page.width * 100, 4),
                "y": round((min(c["top"] for c in chars) + max(c["bottom"] for c in chars)) / 2 / page.height * 100, 4),
            }

(root / "lib/campus-overview-positions.json").write_text(
    json.dumps(rooms, indent=2, sort_keys=True) + "\n", encoding="utf-8"
)
print(f"Located {len(rooms)} individual room labels on the overview.")
