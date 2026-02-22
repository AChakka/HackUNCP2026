"""
Steganography detector — run on real image files.

Usage:
    uv run python test_steg.py path/to/image.jpg
    uv run python test_steg.py path/to/image1.jpg path/to/image2.png ...
    uv run python test_steg.py path/to/folder/
"""

import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "backend"))

from forensic_engine.steganography import analyze_steganography

RISK_COLORS = {"LOW": "\033[32m", "MEDIUM": "\033[33m", "HIGH": "\033[31m"}
RESET = "\033[0m"


def print_result(path: str, r: dict):
    if "error" in r:
        print(f"\n  [ERROR] {os.path.basename(path)}: {r['error']}")
        return

    score  = r.get("score", 0)
    label  = r.get("label", "?")
    color  = RISK_COLORS.get(label, "")
    bar    = ("█" * (score // 5)).ljust(20)
    sus    = r["lsb_analysis"]["avg_suspicion"]
    ent    = r["lsb_analysis"]["avg_entropy"]
    ch     = r["lsb_analysis"]["channel"]
    app    = r["appended_data"]
    exif   = r["exif"]

    print(f"\n{'─'*60}")
    print(f"  FILE    : {os.path.basename(path)}")
    print(f"  FORMAT  : {r.get('format')}  {r.get('dimensions')}  ({r['file_size']['actual_bytes']:,} bytes)")
    print(f"  SCORE   : {color}{score}/100  [{bar}]  {label}{RESET}")
    print(f"  VERDICT : {r.get('verdict')}")
    print()
    print(f"  LSB ANALYSIS")
    print(f"    avg suspicion : {sus}   (0=natural, 1=steg)")
    print(f"    avg entropy   : {ent}   (1.0=max random)")
    print(f"    red   chi2={ch['red']['chi2']:.1f}   sus={ch['red']['suspicion']}")
    print(f"    green chi2={ch['green']['chi2']:.1f}   sus={ch['green']['suspicion']}")
    print(f"    blue  chi2={ch['blue']['chi2']:.1f}   sus={ch['blue']['suspicion']}")

    if app.get("applicable"):
        appended = app.get("appended_bytes", 0)
        if appended > 0:
            print(f"\n  ⚠ APPENDED DATA : {appended} bytes after JPEG end-of-image marker")
        else:
            print(f"\n  APPENDED DATA   : none")

    exif_flags = exif.get("flags", [])
    if exif_flags:
        for f in exif_flags:
            print(f"\n  ⚠ EXIF FLAG : {f}")

    if r["file_size"].get("suspicious"):
        print(f"\n  ⚠ FILE SIZE : {r['file_size']['note']}")


def collect_paths(args: list[str]) -> list[str]:
    paths = []
    supported = {".jpg", ".jpeg", ".png", ".bmp", ".tiff", ".tif", ".gif", ".webp"}
    for arg in args:
        if os.path.isdir(arg):
            for fname in sorted(os.listdir(arg)):
                if os.path.splitext(fname)[1].lower() in supported:
                    paths.append(os.path.join(arg, fname))
        elif os.path.isfile(arg):
            paths.append(arg)
        else:
            print(f"  [SKIP] Not found: {arg}")
    return paths


def main():
    if len(sys.argv) < 2:
        print("Usage: uv run python test_steg.py <image_or_folder> [image2 ...]")
        sys.exit(1)

    paths = collect_paths(sys.argv[1:])
    if not paths:
        print("No supported image files found.")
        sys.exit(1)

    print(f"\n{'='*60}")
    print(f"  CORONER — Steganography Analysis ({len(paths)} file(s))")
    print(f"{'='*60}")

    for path in paths:
        r = analyze_steganography(path)
        print_result(path, r)

    print(f"\n{'─'*60}\n")


if __name__ == "__main__":
    main()
