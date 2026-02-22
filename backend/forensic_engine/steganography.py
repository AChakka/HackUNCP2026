"""
Steganography Detection Module
================================
Detects hidden data in images using statistical analysis.

Techniques implemented:
  1. Chi-square LSB attack — tests whether pixel value pairs are equalized
     (a statistical signature of LSB steganography).
  2. LSB plane visualization — extracts and renders the last bit of each channel
     as a viewable image. Steg'd images look like pure noise; natural ones show structure.
  3. Appended data detection — checks for bytes after JPEG end-of-image (FF D9) marker.
  4. File size ratio analysis — flags images significantly larger than expected.
  5. EXIF anomaly detection — many steg tools strip metadata before embedding.

Disk image support:
  carve_images_from_disk_image()         — extract JPEG/PNG files from a raw .dd image
  analyze_disk_image_for_steganography() — carve + analyze in one call
"""

import io
import os
import math
import base64
from PIL import Image


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _channel_list(img: Image.Image, ch: int) -> list[int]:
    """Return flat pixel values for a single RGB channel (0=R, 1=G, 2=B)."""
    rgb = img.convert("RGB")
    return [p[ch] for p in rgb.getdata()]


def _chi_square_lsb(pixels: list[int]) -> tuple[float, float]:
    """
    Chi-square LSB attack (Westfeld & Pfitzmann, 1999).

    Under LSB embedding, pairs (2k, 2k+1) are equalized because the
    embedding randomly flips between them. Natural images do NOT equalize
    these pairs — one value naturally dominates.

    Returns:
        chi2       : raw chi-square statistic (lower = more equalized = suspicious)
        suspicion  : 0.0 (natural) → 1.0 (likely steg)
    """
    counts = [0] * 256
    for p in pixels:
        counts[p] += 1

    chi2 = 0.0
    n_active = 0
    for i in range(0, 256, 2):
        c0, c1 = counts[i], counts[i + 1]
        expected = (c0 + c1) / 2.0
        if expected > 0:
            chi2 += ((c0 - expected) ** 2 + (c1 - expected) ** 2) / expected
            n_active += 1

    # Normalize: divide by number of active pairs
    # Natural images: normalized >> 1 (lots of variation between paired values)
    # Steg images:    normalized ~0 (pairs completely equalized)
    normalized = chi2 / n_active if n_active > 0 else 0.0

    # Map to suspicion: 10.0+ is clearly natural, 0.0 is clearly steg
    suspicion = max(0.0, min(1.0, 1.0 - (normalized / 12.0)))
    return round(chi2, 2), round(suspicion, 3)


def _lsb_entropy(pixels: list[int]) -> float:
    """
    Shannon entropy of the LSB plane (each value is 0 or 1).
    Random/encrypted hidden data has entropy ~1.0.
    Natural images are close but slightly below 1.0.
    """
    total = len(pixels)
    if total == 0:
        return 0.0
    ones = sum(1 for p in pixels if (p & 1) == 1)
    zeros = total - ones
    if zeros == 0 or ones == 0:
        return 0.0
    p1 = ones / total
    p0 = zeros / total
    return round(-(p0 * math.log2(p0) + p1 * math.log2(p1)), 4)


def _lsb_visualization(img: Image.Image, max_width: int = 420) -> str:
    """
    Generate an RGB image where each channel shows only its LSB (0→black, 1→white).

    Natural images:  LSB plane retains visible structure (edges, gradients faintly).
    Steg'd images:   LSB plane looks like pure random noise (TV static).

    Returns base64-encoded PNG string.
    """
    rgb = img.convert("RGB")
    w, h = rgb.size
    if w > max_width:
        ratio = max_width / w
        rgb = rgb.resize((max_width, int(h * ratio)), Image.LANCZOS)

    pixels = list(rgb.getdata())
    lsb_pixels = [((p[0] & 1) * 255, (p[1] & 1) * 255, (p[2] & 1) * 255) for p in pixels]
    lsb_img = Image.new("RGB", rgb.size)
    lsb_img.putdata(lsb_pixels)

    buf = io.BytesIO()
    lsb_img.save(buf, format="PNG")
    return base64.b64encode(buf.getvalue()).decode()


def _detect_appended_data(file_path: str) -> dict:
    """
    Scan for bytes after the JPEG end-of-image marker (FF D9).
    A surprisingly common and trivially detectable steganography technique.
    """
    try:
        with open(file_path, "rb") as f:
            data = f.read()
    except Exception:
        return {"applicable": False}

    if not data[:2] == b"\xff\xd8":
        return {"applicable": False}  # not a JPEG

    eoi = data.rfind(b"\xff\xd9")
    if eoi == -1:
        return {"applicable": True, "appended_bytes": 0, "suspicious": False, "note": None}

    appended = len(data) - (eoi + 2)
    return {
        "applicable": True,
        "appended_bytes": appended,
        "suspicious": appended > 0,
        "note": (
            f"{appended} bytes detected after JPEG end-of-image marker — "
            "possible appended payload" if appended > 0 else None
        ),
    }


def _file_size_check(file_path: str, img: Image.Image) -> dict:
    """
    Compare actual file size against a reasonable expected range for the format.
    Significantly oversized images may carry hidden data.
    """
    actual = os.path.getsize(file_path)
    w, h = img.size
    pixels = w * h
    fmt = (img.format or "").upper()

    # Expected byte ranges per pixel by format (empirical)
    bounds = {
        "JPEG": (0.05, 1.2),
        "PNG":  (0.2,  3.5),
        "BMP":  (2.5,  4.5),
        "TIFF": (2.0,  5.0),
        "GIF":  (0.1,  1.5),
        "WEBP": (0.05, 1.0),
    }
    lo_factor, hi_factor = bounds.get(fmt, (0.1, 5.0))
    expected_hi = pixels * hi_factor

    suspicious = actual > expected_hi * 1.5
    return {
        "actual_bytes": actual,
        "dimensions": f"{w}x{h}",
        "total_pixels": pixels,
        "suspicious": suspicious,
        "note": (
            f"File is {actual / expected_hi:.1f}× the expected maximum for {fmt}"
            if suspicious else None
        ),
    }


def _exif_check(img: Image.Image, fmt: str) -> dict:
    """Inspect EXIF for anomalies. Steg tools commonly strip all metadata."""
    flags = []
    info = {}
    try:
        exif = img.getexif()
        if exif:
            info["has_exif"] = True
            info["field_count"] = len(exif)
        else:
            info["has_exif"] = False
            if fmt in ("JPEG", "JPG"):
                flags.append(
                    "JPEG with no EXIF data — steganography tools commonly strip "
                    "metadata before embedding to reduce detection surface"
                )
    except Exception:
        info["has_exif"] = False

    return {"info": info, "flags": flags}


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def analyze_steganography(file_path: str) -> dict:
    """
    Full steganography analysis pipeline.

    Returns a dict with:
      - score (0–100), label (LOW/MEDIUM/HIGH), verdict
      - per-channel LSB chi-square and entropy
      - LSB plane visualization (base64 PNG)
      - appended data, file size, and EXIF findings
    """
    try:
        # Prevent OOM crashes on massive or heavily tampered image files
        if os.path.getsize(file_path) > 50 * 1024 * 1024:
            return {"error": f"Image file exceeds the 50MB limit for statistical analysis (size: {os.path.getsize(file_path)} bytes). Steganography analysis skipped to preserve memory."}

        img = Image.open(file_path)
        img.load()
    except Exception as e:
        return {"error": f"Cannot open image: {e}"}

    fmt = (img.format or "UNKNOWN").upper()
    mode = img.mode
    w, h = img.size

    # Per-channel analysis
    rgb = img.convert("RGB")
    all_pixels = list(rgb.getdata())
    r_pix = [p[0] for p in all_pixels]
    g_pix = [p[1] for p in all_pixels]
    b_pix = [p[2] for p in all_pixels]

    r_chi2, r_sus = _chi_square_lsb(r_pix)
    g_chi2, g_sus = _chi_square_lsb(g_pix)
    b_chi2, b_sus = _chi_square_lsb(b_pix)

    r_ent = _lsb_entropy(r_pix)
    g_ent = _lsb_entropy(g_pix)
    b_ent = _lsb_entropy(b_pix)

    avg_sus = (r_sus + g_sus + b_sus) / 3.0
    avg_ent = round((r_ent + g_ent + b_ent) / 3.0, 4)

    # LSB visualization
    lsb_vis = _lsb_visualization(img)

    # Supplemental checks
    appended = _detect_appended_data(file_path)
    size_info = _file_size_check(file_path, img)
    exif_data = _exif_check(img, fmt)

    # --- Score aggregation ---
    lsb_score     = avg_sus * 50            # up to 50 pts (main signal)
    entropy_score  = 8 if avg_ent > 0.98 else 0  # LSB plane near-maximum entropy
    appended_score = 30 if appended.get("suspicious") else 0
    size_score     = 12 if size_info.get("suspicious") else 0
    exif_score     = 10 if exif_data["flags"] else 0

    total = min(100, int(lsb_score + entropy_score + appended_score + size_score + exif_score))

    if total >= 65:
        label   = "HIGH"
        verdict = "STRONG INDICATORS OF HIDDEN DATA — statistical signature consistent with LSB steganography or an appended payload."
    elif total >= 35:
        label   = "MEDIUM"
        verdict = "SUSPICIOUS — anomalies detected in LSB distribution or file metadata. Manual inspection recommended."
    else:
        label   = "LOW"
        verdict = "NO STRONG INDICATORS — image LSB statistics are consistent with a natural, unmodified photograph."

    return {
        "format":     fmt,
        "mode":       mode,
        "dimensions": f"{w}×{h}",
        "score":      total,
        "label":      label,
        "verdict":    verdict,
        "lsb_analysis": {
            "channel": {
                "red":   {"chi2": r_chi2, "suspicion": r_sus, "lsb_entropy": r_ent},
                "green": {"chi2": g_chi2, "suspicion": g_sus, "lsb_entropy": g_ent},
                "blue":  {"chi2": b_chi2, "suspicion": b_sus, "lsb_entropy": b_ent},
            },
            "avg_suspicion": round(avg_sus, 3),
            "avg_entropy":   avg_ent,
        },
        "appended_data":    appended,
        "file_size":        size_info,
        "exif":             exif_data,
        "lsb_visualization": lsb_vis,
    }


# ---------------------------------------------------------------------------
# Disk image (.dd) support — file carving + analysis
# ---------------------------------------------------------------------------

# Magic bytes (file signatures) for common image formats
_SIGNATURES = {
    "jpeg": (b"\xff\xd8\xff",               b"\xff\xd9"),
    "png":  (b"\x89PNG\r\n\x1a\n",          b"IEND\xaeB`\x82"),
    "bmp":  (b"BM",                          None),   # BMP size is in the header
    "gif":  (b"GIF87a",                      b"\x3b"),
    "gif89":(b"GIF89a",                      b"\x3b"),
}

_EXT_MAP = {"jpeg": ".jpg", "png": ".png", "bmp": ".bmp", "gif": ".gif", "gif89": ".gif"}


def carve_images_from_disk_image(dd_path: str, output_dir: str | None = None) -> list[str]:
    """
    Extract embedded image files from a raw disk image (.dd / .img / .raw).

    Uses magic-byte (file signature) carving — no filesystem parsing required.
    Supports JPEG, PNG, GIF. Works on any raw binary file.

    Uses mmap for memory-efficient access to large disk images (no full load into RAM).

    Args:
        dd_path:    Path to the .dd disk image.
        output_dir: Directory to write carved files into. Defaults to a temp dir.

    Returns:
        List of absolute paths to the carved image files.
    """
    import mmap
    import tempfile

    if output_dir is None:
        output_dir = tempfile.mkdtemp(prefix="coroner_carved_")
    os.makedirs(output_dir, exist_ok=True)

    carved: list[str] = []
    counters: dict[str, int] = {}

    file_size = os.path.getsize(dd_path)
    if file_size == 0:
        return carved

    with open(dd_path, "rb") as f:
        # mmap lets us search large files (32GB flash drives) without loading into RAM
        try:
            mm = mmap.mmap(f.fileno(), 0, access=mmap.ACCESS_READ)
        except Exception:
            # Fallback for very small files or OS edge cases
            mm = f.read()  # type: ignore[assignment]

        try:
            data: bytes | mmap.mmap = mm  # type: ignore[assignment]

            for fmt_name, (header, footer) in _SIGNATURES.items():
                ext = _EXT_MAP.get(fmt_name, ".bin")
                pos = 0
                count = counters.get(fmt_name, 0)

                while True:
                    idx = data.find(header, pos)
                    if idx == -1:
                        break

                    if footer is not None:
                        end = data.find(footer, idx + len(header))
                        if end == -1:
                            break
                        end += len(footer)
                    elif fmt_name == "bmp":
                        # BMP stores file size at bytes 2-6 (little-endian uint32)
                        try:
                            import struct
                            bmp_size = struct.unpack_from("<I", data, idx + 2)[0]
                            end = idx + bmp_size
                            if end > len(data):
                                pos = idx + 2
                                continue
                        except Exception:
                            pos = idx + 2
                            continue
                    else:
                        pos = idx + 2
                        continue

                    chunk = data[idx:end]
                    # Skip tiny fragments — real images are at least a few KB
                    if len(chunk) < 2048:
                        pos = idx + len(header)
                        continue

                    out_path = os.path.join(output_dir, f"carved_{fmt_name}_{count:04d}{ext}")
                    with open(out_path, "wb") as out:
                        out.write(chunk)
                    carved.append(out_path)
                    count += 1
                    pos = end

                counters[fmt_name] = count
        finally:
            if hasattr(mm, "close"):
                mm.close()

    return carved


def analyze_disk_image_for_steganography(dd_path: str, max_images: int = 20) -> dict:
    """
    Full pipeline for a raw disk image (.dd):
      1. Carve all JPEG/PNG/GIF files using magic-byte signatures.
      2. Run steganography analysis on each carved image.
      3. Return results ranked by suspicion score.

    Carved files are written to a temp directory and cleaned up after analysis.

    Args:
        dd_path:    Path to the .dd disk image file.
        max_images: Maximum number of carved images to analyze (default 20).

    Returns:
        Dict with carved_count, analyzed_count, risk summary, and per-image results.
    """
    import tempfile
    import shutil

    if not os.path.isfile(dd_path):
        return {"error": f"File not found: {dd_path}"}

    tmp_dir = tempfile.mkdtemp(prefix="coroner_steg_dd_")
    try:
        carved = carve_images_from_disk_image(dd_path, tmp_dir)

        if not carved:
            return {
                "dd_path":      dd_path,
                "carved_count": 0,
                "results":      [],
                "summary":      "No JPEG/PNG/GIF files carved from disk image. "
                                "The image may use a filesystem type not covered by "
                                "magic-byte carving, or contain no recognisable image files.",
            }

        results = []
        for img_path in carved[:max_images]:
            result = analyze_steganography(img_path)
            result["carved_filename"] = os.path.basename(img_path)
            results.append(result)

        # Rank highest suspicion first
        results.sort(key=lambda x: x.get("score", 0), reverse=True)

        high   = sum(1 for r in results if r.get("label") == "HIGH")
        medium = sum(1 for r in results if r.get("label") == "MEDIUM")

        return {
            "dd_path":        dd_path,
            "carved_count":   len(carved),
            "analyzed_count": len(results),
            "high_risk":      high,
            "medium_risk":    medium,
            "results":        results,
            "summary": (
                f"Carved {len(carved)} image(s) from disk image. "
                f"{high} HIGH and {medium} MEDIUM suspicion image(s) detected."
            ),
        }
    finally:
        shutil.rmtree(tmp_dir, ignore_errors=True)
