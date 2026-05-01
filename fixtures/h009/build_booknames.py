#!/usr/bin/env python3
"""
Build BookNames.xml from a directory of USFM files and repackage the bundle.

Schema (per sillsdev/machine samples/data/VBL-PT/BookNames.xml and ethnosdev/bsb
database_builder/bsb_usfm/BookNames.xml — both real-world canonical examples):

    <?xml version="1.0" encoding="utf-8"?>
    <BookNames>
      <book code="GEN" abbr="..." short="..." long="..." />
      ...
    </BookNames>

Mapping (per SIL "Building Apps" PDF §4.8 page 31):
  - long  ← \toc1 (long book name)
  - short ← \toc2 (short book name)
  - abbr  ← \toc3 (abbreviation)

Book code is read from the \id <CODE> ... line at the top of each USFM file
(this is the USFM standard and matches the filename convention
NN-CODEeng-web.usfm).

Files with a \id of FRT/INT/BAK/OTH (peripheral matter) are still emitted as
<book> entries because Paratext's BookNames.xml conventionally lists them too,
but they are placed last, after the canonical ordering.
"""
from __future__ import annotations

import io
import os
import re
import sys
import zipfile
import hashlib
import shutil
from pathlib import Path
from xml.sax.saxutils import escape


SRC_DIR = Path("/home/claude/eng-web")
OUT_BOOKNAMES = Path("/home/claude/eng-web/BookNames.xml")
OUT_ZIP = Path("/home/claude/eng-web_usfm_with_booknames.zip")

# USFM 3.0 canonical order for the OT+NT+DC range — used to sort entries so
# the file looks like a well-formed Paratext export. Codes not in this list
# (peripheral material like FRT) sort to the end.
CANONICAL_ORDER = [
    "GEN","EXO","LEV","NUM","DEU","JOS","JDG","RUT","1SA","2SA","1KI","2KI",
    "1CH","2CH","EZR","NEH","EST","JOB","PSA","PRO","ECC","SNG","ISA","JER",
    "LAM","EZK","DAN","HOS","JOL","AMO","OBA","JON","MIC","NAM","HAB","ZEP",
    "HAG","ZEC","MAL",
    "MAT","MRK","LUK","JHN","ACT","ROM","1CO","2CO","GAL","EPH","PHP","COL",
    "1TH","2TH","1TI","2TI","TIT","PHM","HEB","JAS","1PE","2PE","1JN","2JN",
    "3JN","JUD","REV",
    # Deuterocanonical / apocryphal — present in WEB:
    "TOB","JDT","ESG","WIS","SIR","BAR","LJE","S3Y","SUS","BEL","1MA","2MA",
    "3MA","4MA","1ES","2ES","MAN","PS2","ODA","PSS","JSA","JDB","TBS","SST",
    "DNT","BLT",
]
ORDER_MAP = {code: i for i, code in enumerate(CANONICAL_ORDER)}


def parse_usfm(path: Path) -> dict[str, str] | None:
    """Return {'code', 'h', 'toc1', 'toc2', 'toc3'} or None if not a real
    book file (peripherals like FRT may still be returned with code='FRT').
    Reads only enough of the file to find the markers."""
    code = h = toc1 = toc2 = toc3 = ""
    try:
        with path.open("r", encoding="utf-8") as f:
            for raw in f:
                line = raw.strip()
                if not line:
                    continue
                # \id GEN ...   → code = GEN
                if line.startswith("\\id "):
                    parts = line.split(None, 2)
                    if len(parts) >= 2:
                        code = parts[1].strip().upper()
                elif line.startswith("\\h "):
                    h = line[3:].strip()
                elif line.startswith("\\toc1 "):
                    toc1 = line[6:].strip()
                elif line.startswith("\\toc2 "):
                    toc2 = line[6:].strip()
                elif line.startswith("\\toc3 "):
                    toc3 = line[6:].strip()
                # Stop scanning once we hit chapter content; we have what we need.
                if line.startswith("\\c "):
                    break
    except Exception as e:
        print(f"WARN: could not read {path}: {e}", file=sys.stderr)
        return None
    if not code:
        return None
    return {"code": code, "h": h, "toc1": toc1, "toc2": toc2, "toc3": toc3}


def main() -> int:
    entries: list[dict[str, str]] = []
    for p in sorted(SRC_DIR.glob("*.usfm")):
        rec = parse_usfm(p)
        if rec is None:
            print(f"SKIP: no \\id in {p.name}")
            continue
        rec["_filename"] = p.name
        entries.append(rec)

    # Sort: canonical order first, peripherals last (preserve filename order
    # within the unknown bucket).
    entries.sort(key=lambda r: (ORDER_MAP.get(r["code"], 1000), r["_filename"]))

    # Emit BookNames.xml. UTF-8 with BOM matches both canonical examples
    # (sillsdev/machine and ethnosdev/bsb). Self-closing <book> tags.
    lines: list[str] = []
    lines.append('<?xml version="1.0" encoding="utf-8"?>')
    lines.append('<BookNames>')
    for rec in entries:
        code = rec["code"]
        # Per PDF §4.8: long ← \toc1, short ← \toc2, abbr ← \toc3.
        # Fall back to \h if a particular toc is empty (PDF §4.8 says SAB
        # itself falls back to \mt/\h when toc fields are absent — we match
        # that fallback here so the file we produce is at least as
        # informative as the markers in the USFM).
        long_  = rec["toc1"] or rec["h"]
        short_ = rec["toc2"] or rec["h"]
        abbr_  = rec["toc3"]
        lines.append(
            f'  <book code="{escape(code, {chr(34): "&quot;"})}" '
            f'abbr="{escape(abbr_, {chr(34): "&quot;"})}" '
            f'short="{escape(short_, {chr(34): "&quot;"})}" '
            f'long="{escape(long_, {chr(34): "&quot;"})}" />'
        )
    lines.append('</BookNames>')
    lines.append('')  # trailing newline

    body = "\n".join(lines)
    OUT_BOOKNAMES.write_bytes(b"\xef\xbb\xbf" + body.encode("utf-8"))
    print(f"WROTE: {OUT_BOOKNAMES} ({len(entries)} entries)")

    # Repackage zip: 83 *.usfm + 4 aux files + BookNames.xml, all at root.
    if OUT_ZIP.exists():
        OUT_ZIP.unlink()
    with zipfile.ZipFile(OUT_ZIP, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=9) as zf:
        for p in sorted(SRC_DIR.iterdir()):
            if p.is_file():
                zf.write(p, arcname=p.name)
    print(f"WROTE: {OUT_ZIP} ({OUT_ZIP.stat().st_size} bytes)")

    # Hash
    h = hashlib.sha256(OUT_ZIP.read_bytes()).hexdigest()
    print(f"SHA256: {h}")

    # Quick sanity print: first 5 entries
    print("--- first entries:")
    for rec in entries[:5]:
        print(f"  {rec['code']:>4}  toc1={rec['toc1']!r}  toc2={rec['toc2']!r}  toc3={rec['toc3']!r}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
