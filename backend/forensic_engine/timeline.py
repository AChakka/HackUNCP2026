"""
ForensIQ — MAC Timeline Tool
Path: backend/forensic_engine/mac_timeline.py

Handles both regular files and raw disk images (.dd, .img, .raw).
For disk images, uses pytsk3 to walk the filesystem and extract
timestamps from inside the image.
"""

import os
import datetime
import csv
from pathlib import Path

# Disk image extensions that need pytsk3 parsing
DISK_IMAGE_EXTENSIONS = {".dd", ".img", ".raw", ".e01", ".vmdk"}


# ── Helpers ────────────────────────────────────────────────────────────────────

def _to_utc(ts: float) -> str:
    """Convert a POSIX timestamp to an ISO8601 UTC string."""
    try:
        return datetime.datetime.utcfromtimestamp(ts).isoformat() + "Z"
    except (OSError, OverflowError, ValueError):
        return None


def _is_disk_image(file_path: str) -> bool:
    """Check if the file is a raw disk image based on its extension."""
    return Path(file_path).suffix.lower() in DISK_IMAGE_EXTENSIONS


# ── Regular file timestamp extraction ─────────────────────────────────────────

def get_file_timestamps(file_path: str) -> dict:
    """
    Extract MACB timestamps for a single file.
    Returns a dict with UTC-normalized timestamps.
    """
    stats = os.stat(file_path)

    return {
        "file":     file_path,
        "modified": _to_utc(stats.st_mtime),
        "accessed": _to_utc(stats.st_atime),
        "created":  _to_utc(stats.st_ctime),
        "birth":    _to_utc(stats.st_ctime),  # fallback for systems without birth time
    }


def build_timeline(file_paths: list[str]) -> list[dict]:
    """
    Build a sorted timeline of events from multiple regular files.
    Each event is a dict with timestamp, event_type, and file.
    """
    events = []

    for path in file_paths:
        ts = get_file_timestamps(path)
        for event_type, timestamp in ts.items():
            if event_type == "file" or timestamp is None:
                continue
            events.append({
                "timestamp":  timestamp,
                "event_type": event_type,
                "file":       path,
                "source":     "host_os"
            })

    events.sort(key=lambda x: x["timestamp"])
    return events


# ── Disk image timeline extraction (pytsk3) ────────────────────────────────────

def build_timeline_from_image(image_path: str, max_files: int = 500) -> list[dict]:
    """
    Walk the filesystem inside a raw disk image and extract MAC timestamps
    for every file found. Requires pytsk3.

    Works on .dd, .img, .raw disk images with FAT, NTFS, or ext filesystems.
    """
    try:
        import pytsk3
    except ImportError:
        return [{"error": "pytsk3 not installed. Run: pip install pytsk3"}]

    events = []

    try:
        img = pytsk3.Img_Info(image_path)
    except Exception as e:
        return [{"error": f"Could not open disk image: {str(e)}"}]

    # Try to detect and open the filesystem
    # Offset 0 works for unpartitioned images; try partition table for others
    fs = None
    try:
        fs = pytsk3.FS_Info(img)
    except Exception:
        # Try common partition offsets (512 byte sectors)
        for offset in [63, 2048, 128]:
            try:
                fs = pytsk3.FS_Info(img, offset=offset * 512)
                break
            except Exception:
                continue

    if fs is None:
        return [{"error": "Could not find a readable filesystem in the disk image."}]

    # Walk the filesystem recursively
    _walk_directory(fs, fs.open_dir("/"), "/", events, max_files)

    events.sort(key=lambda x: x["timestamp"])
    return events


def _walk_directory(fs, directory, path: str, events: list, max_files: int):
    """Recursively walk a directory in a pytsk3 filesystem."""
    if len(events) >= max_files * 4:  # 4 timestamps per file
        return

    for entry in directory:
        try:
            name_info = entry.info.name
            meta_info = entry.info.meta

            if name_info is None or meta_info is None:
                continue

            fname = name_info.name.decode("utf-8", errors="replace")

            # Skip . and .. and system entries
            if fname in (".", "..") or fname.startswith("$"):
                continue

            full_path = f"{path}{fname}"

            # Extract MAC timestamps
            if meta_info.mtime:
                ts = _to_utc(meta_info.mtime)
                if ts:
                    events.append({
                        "timestamp":  ts,
                        "event_type": "modified",
                        "file":       full_path,
                        "source":     "disk_image"
                    })

            if meta_info.atime:
                ts = _to_utc(meta_info.atime)
                if ts:
                    events.append({
                        "timestamp":  ts,
                        "event_type": "accessed",
                        "file":       full_path,
                        "source":     "disk_image"
                    })

            if meta_info.crtime:
                ts = _to_utc(meta_info.crtime)
                if ts:
                    events.append({
                        "timestamp":  ts,
                        "event_type": "created",
                        "file":       full_path,
                        "source":     "disk_image"
                    })

            # Recurse into directories
            if meta_info.type == pytsk3.TSK_FS_META_TYPE_DIR:
                try:
                    sub_dir = fs.open_dir(path=full_path)
                    _walk_directory(fs, sub_dir, full_path + "/", events, max_files)
                except Exception:
                    pass

        except Exception:
            continue


# ── Main entry point (called by MCP server) ────────────────────────────────────

async def generate_mac_timeline(file_path: str) -> dict:
    """
    Generate a MAC timeline from either a regular file or a disk image.
    Automatically detects which mode to use based on file extension.
    """
    if not os.path.exists(file_path):
        return {"error": f"File not found: {file_path}"}

    is_image = _is_disk_image(file_path)

    if is_image:
        print(f"  Detected disk image — using pytsk3 to walk filesystem...")
        events = build_timeline_from_image(file_path)
    else:
        events = build_timeline([file_path])

    # Separate errors from real events
    errors = [e for e in events if "error" in e]
    real_events = [e for e in events if "error" not in e]

    return {
        "file":        file_path,
        "mode":        "disk_image" if is_image else "single_file",
        "event_count": len(real_events),
        "events":      real_events[:200],  # cap at 200 for the agent
        "errors":      errors if errors else None,
    }


# ── CSV export ─────────────────────────────────────────────────────────────────

def save_timeline_csv(events: list[dict], output_path: str) -> str:
    """
    Save timeline events to a CSV file.
    Returns the output path.
    """
    os.makedirs(os.path.dirname(output_path), exist_ok=True)

    with open(output_path, "w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=["timestamp", "event_type", "file", "source"])
        writer.writeheader()
        writer.writerows(events)

    return output_path


# ── MCP declaration ────────────────────────────────────────────────────────────

DECLARATION = {
    "name": "generate_mac_timeline",
    "description": (
        "Generate a MAC (Modified/Accessed/Created) timeline from a file or disk image. "
        "For disk images (.dd, .img, .raw), walks the filesystem and extracts timestamps "
        "for every file inside the image. For regular files, reads OS-level timestamps. "
        "Returns a chronologically sorted list of filesystem events."
    ),
    "parameters": {
        "type": "object",
        "properties": {
            "file_path": {
                "type": "string",
                "description": "Absolute path to the file or disk image."
            }
        },
        "required": ["file_path"]
    }
}