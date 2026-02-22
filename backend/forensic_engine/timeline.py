import os
import datetime
import csv

def _to_utc(ts: float) -> str:
    """
    Convert a POSIX timestamp to an ISO8601 UTC string.
    """
    return datetime.datetime.utcfromtimestamp(ts).isoformat() + "Z"


def get_file_timestamps(file_path: str) -> dict:
    """
    Extract MACB timestamps for a single file.
    Returns a dict with UTC-normalized timestamps.
    """
    stats = os.stat(file_path)

    return {
        "file": file_path,
        "modified": _to_utc(stats.st_mtime),
        "accessed": _to_utc(stats.st_atime),
        "created": _to_utc(stats.st_ctime),
        "birth": _to_utc(stats.st_ctime),  # fallback for systems without birth time
    }


def build_timeline(file_paths: list[str]) -> list[dict]:
    """
    Build a sorted timeline of events from multiple files.
    Each event is a dict with timestamp, event_type, and file.
    """
    events = []

    for path in file_paths:
        ts = get_file_timestamps(path)
        for event_type, timestamp in ts.items():
            if event_type == "file":
                continue
            events.append({
                "timestamp": timestamp,
                "event_type": event_type,
                "file": path
            })

    # Sort chronologically
    events.sort(key=lambda x: x["timestamp"])
    return events


def save_timeline_csv(events: list[dict], output_path: str) -> str:
    """
    Save timeline events to a CSV file.
    Returns the output path.
    """
    os.makedirs(os.path.dirname(output_path), exist_ok=True)

    with open(output_path, "w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=["timestamp", "event_type", "file"])
        writer.writeheader()
        writer.writerows(events)

    return output_path