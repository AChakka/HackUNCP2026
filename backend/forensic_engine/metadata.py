import os
import subprocess
import json
import hashlib
from pathlib import Path
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()


# ── Main tool function ─────────────────────────────────────────────────────────

async def extract_metadata(file_path: str) -> dict:
    """
    Extract metadata from a file.
    Layers three sources: OS stat, python-magic for MIME type, exiftool for deep metadata.
    Does not call or depend on any other ForensIQ tools.
    """
    if not os.path.exists(file_path):
        return {"error": f"File not found: {file_path}"}

    path = Path(file_path)
    stat = path.stat()

    # ── Layer 1: Basic OS metadata (always available) ─────────────────────────
    result = {
        "filename":        path.name,
        "extension":       path.suffix.lower(),
        "file_path":       str(path.resolve()),
        "size_bytes":      stat.st_size,
        "size_human":      _human_size(stat.st_size),
        "created":         datetime.fromtimestamp(stat.st_ctime).isoformat(),
        "modified":        datetime.fromtimestamp(stat.st_mtime).isoformat(),
        "accessed":        datetime.fromtimestamp(stat.st_atime).isoformat(),
        "is_hidden":       path.name.startswith("."),
        "is_readonly":     not os.access(file_path, os.W_OK),
    }

    # ── Layer 2: MIME type via python-magic ───────────────────────────────────
    try:
        import magic
        result["mime_type"]         = magic.Magic(mime=True).from_file(file_path)
        result["file_description"]  = magic.Magic().from_file(file_path)
    except ImportError:
        result["mime_type"]         = _guess_mime(path.suffix.lower())
        result["file_description"]  = "python-magic not installed, install with: pip install python-magic-bin"

    # ── Layer 3: Deep metadata via exiftool (if installed) ────────────────────
    try:
        proc = subprocess.run(
            ["exiftool", "-json", "-stay_open", "False", file_path],
            capture_output=True,
            text=True,
            timeout=15
        )
        if proc.returncode == 0 and proc.stdout.strip():
            exif_raw = json.loads(proc.stdout)
            if exif_raw:
                exif = exif_raw[0]
                # Pull out the most forensically useful exiftool fields
                useful_fields = [
                    "Author", "Creator", "Producer", "Company",
                    "LastModifiedBy", "CreatorTool", "Software",
                    "GPSLatitude", "GPSLongitude", "GPSAltitude",
                    "DateTimeOriginal", "CreateDate", "ModifyDate",
                    "ImageWidth", "ImageHeight", "ColorSpace",
                    "Duration", "AudioChannels", "VideoFrameRate",
                    "MIMEType", "FileType", "FileTypeExtension",
                    "Title", "Subject", "Description", "Keywords",
                    "Copyright", "Language",
                ]
                result["exif"] = {
                    k: exif[k] for k in useful_fields if k in exif
                }

                # Flag GPS data — presence of location is forensically significant
                if "GPSLatitude" in exif and "GPSLongitude" in exif:
                    result["has_gps"] = True
                    result["gps"] = {
                        "latitude":  exif.get("GPSLatitude"),
                        "longitude": exif.get("GPSLongitude"),
                        "altitude":  exif.get("GPSAltitude"),
                    }

                # Flag author/creator info
                if any(k in exif for k in ("Author", "Creator", "LastModifiedBy", "Company")):
                    result["author_info"] = {
                        "author":           exif.get("Author"),
                        "creator":          exif.get("Creator"),
                        "last_modified_by": exif.get("LastModifiedBy"),
                        "company":          exif.get("Company"),
                        "software":         exif.get("Software") or exif.get("CreatorTool"),
                    }

    except FileNotFoundError:
        result["exif_note"] = "exiftool not installed. Install from https://exiftool.org for deeper metadata."
    except subprocess.TimeoutExpired:
        result["exif_note"] = "exiftool timed out."
    except Exception as e:
        result["exif_note"] = f"exiftool error: {str(e)}"

    # ── Forensic flags ────────────────────────────────────────────────────────
    result["flags"] = _check_flags(result, path)

    return result


# ── Private helpers ────────────────────────────────────────────────────────────

def _human_size(n: int) -> str:
    """Convert bytes to human readable size."""
    for unit in ("B", "KB", "MB", "GB", "TB"):
        if n < 1024:
            return f"{n:.1f} {unit}"
        n /= 1024
    return f"{n:.1f} PB"


def _guess_mime(ext: str) -> str:
    """Fallback MIME type guess from extension when python-magic isn't available."""
    mime_map = {
        ".pdf":  "application/pdf",
        ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        ".zip":  "application/zip",
        ".exe":  "application/x-msdownload",
        ".dll":  "application/x-msdownload",
        ".jpg":  "image/jpeg",
        ".jpeg": "image/jpeg",
        ".png":  "image/png",
        ".log":  "text/plain",
        ".txt":  "text/plain",
        ".py":   "text/x-python",
        ".dd":   "application/octet-stream",
        ".img":  "application/octet-stream",
    }
    return mime_map.get(ext, "application/octet-stream")


def _check_flags(result: dict, path: Path) -> list[str]:
    """
    Check for forensically interesting conditions and return a list of flags.
    These are things an investigator would want to know immediately.
    """
    flags = []

    # Extension vs MIME type mismatch — common in malware
    mime = result.get("mime_type", "")
    ext  = result.get("extension", "")

    mismatch_map = {
        ".exe": "application/x-msdownload",
        ".pdf": "application/pdf",
        ".zip": "application/zip",
        ".png": "image/png",
        ".jpg": "image/jpeg",
    }

    if ext in mismatch_map and mismatch_map[ext] not in mime:
        flags.append(f"EXTENSION_MISMATCH: file has {ext} extension but MIME type is {mime}")

    # Hidden file
    if result.get("is_hidden"):
        flags.append("HIDDEN_FILE: filename starts with a dot")

    # GPS coordinates present — file has location data
    if result.get("has_gps"):
        flags.append("GPS_DATA_PRESENT: file contains embedded GPS coordinates")

    # Author metadata present — could identify the creator
    if result.get("author_info"):
        info = result["author_info"]
        parts = [v for v in info.values() if v]
        if parts:
            flags.append(f"AUTHOR_METADATA: {', '.join(str(p) for p in parts)}")

    # Zero byte file
    if result.get("size_bytes", 0) == 0:
        flags.append("EMPTY_FILE: file has zero bytes")

    # Very large file
    if result.get("size_bytes", 0) > 1 * 1024 * 1024 * 1024:
        flags.append("LARGE_FILE: file is over 1GB")

    return flags


# ── MCP tool declaration (imported by mcp_server.py) ──────────────────────────

DECLARATION = {
    "name": "extract_metadata",
    "description": (
        "Extract metadata from any file including timestamps, MIME type, "
        "file size, author info, GPS coordinates, and software used to create it. "
        "Also flags forensically interesting conditions like extension mismatches "
        "and hidden files. Works on any file type."
    ),
    "parameters": {
        "type": "object",
        "properties": {
            "file_path": {
                "type": "string",
                "description": "Absolute path to the file to extract metadata from."
            }
        },
        "required": ["file_path"]
    }
}