
import hashlib
import os
import time
import requests

VT_BASE = "https://www.virustotal.com/api/v3"
VIRUSTOTAL_API_KEY = VIRUSTOTAL_API_KEY


# ── Main tool function ─────────────────────────────────────────────────────────

async def virustotal_scan(file_path: str) -> dict:
    """
    Scan a file against VirusTotal's 70+ antivirus engines.
    Accepts a file path, hashes it internally, and returns a structured verdict.
    Does not call or depend on any other ForensIQ tools.
    """
    if not VIRUSTOTAL_API_KEY:
        return {"error": "VIRUSTOTAL_API_KEY is not set. Add it to your .env file."}

    if not os.path.exists(file_path):
        return {"error": f"File not found: {file_path}"}

    headers = {"x-apikey": VIRUSTOTAL_API_KEY}

    # Step 1: Hash the file internally — no external tool needed
    sha256 = _hash_file(file_path)

    # Step 2: Check if VT already knows this hash (instant, no upload)
    resp = requests.get(f"{VT_BASE}/files/{sha256}", headers=headers, timeout=10)

    if resp.status_code == 200:
        return _parse_response(resp.json(), source="cache", sha256=sha256)

    # Step 3: VT doesn't know it — upload the file for a fresh scan
    file_size = os.path.getsize(file_path)

    if file_size > 32 * 1024 * 1024:
        # Files over 32MB need a special upload URL from VT
        url_resp = requests.get(f"{VT_BASE}/files/upload_url", headers=headers, timeout=10)
        if url_resp.status_code != 200:
            return {"error": "Failed to get large file upload URL from VirusTotal.", "sha256": sha256}
        upload_url = url_resp.json()["data"]
    else:
        upload_url = f"{VT_BASE}/files"

    with open(file_path, "rb") as f:
        upload_resp = requests.post(
            upload_url,
            headers=headers,
            files={"file": (os.path.basename(file_path), f)},
            timeout=60,
        )

    if upload_resp.status_code != 200:
        return {"error": f"Upload failed with status {upload_resp.status_code}.", "sha256": sha256}

    analysis_id = upload_resp.json()["data"]["id"]

    # Step 4: Poll until the scan completes (VT scans asynchronously)
    for _ in range(12):  # up to ~60 seconds
        time.sleep(5)
        poll_resp = requests.get(
            f"{VT_BASE}/analyses/{analysis_id}",
            headers=headers,
            timeout=10,
        )
        if poll_resp.status_code != 200:
            continue

        if poll_resp.json()["data"]["attributes"]["status"] == "completed":
            file_resp = requests.get(f"{VT_BASE}/files/{sha256}", headers=headers, timeout=10)
            if file_resp.status_code == 200:
                return _parse_response(file_resp.json(), source="fresh_scan", sha256=sha256)
            break

    return {
        "error": "Scan timed out. The file may still be processing on VirusTotal.",
        "sha256": sha256,
    }


# ── Private helpers ────────────────────────────────────────────────────────────

def _hash_file(file_path: str) -> str:
    """Compute SHA256 by streaming the file in chunks — safe for large disk images."""
    h = hashlib.sha256()
    with open(file_path, "rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()


def _parse_response(data: dict, source: str, sha256: str) -> dict:
    """Extract the useful fields from VirusTotal's verbose API response."""
    attrs = data["data"]["attributes"]
    stats = attrs.get("last_analysis_stats", {})
    malicious  = stats.get("malicious", 0)
    suspicious = stats.get("suspicious", 0)
    total      = sum(stats.values())

    if malicious > 0:
        verdict = "malicious"
    elif suspicious > 0:
        verdict = "suspicious"
    else:
        verdict = "clean"

    flagged_by = [
        {"engine": engine, "result": result["result"]}
        for engine, result in attrs.get("last_analysis_results", {}).items()
        if result.get("category") in ("malicious", "suspicious")
    ]

    return {
        "verdict":               verdict,
        "sha256":                sha256,
        "malicious_detections":  malicious,
        "suspicious_detections": suspicious,
        "total_engines":         total,
        "flagged_by":            flagged_by[:10],
        "file_type":             attrs.get("type_description", "unknown"),
        "file_name":             attrs.get("meaningful_name", ""),
        "tags":                  attrs.get("tags", []),
        "source":                source,
    }


# ── MCP tool declaration (imported by mcp_server.py) ──────────────────────────

DECLARATION = {
    "name": "virustotal_scan",
    "description": (
        "Scan a file against VirusTotal's 70+ antivirus engines. "
        "Provide a file path — hashing and uploading are handled automatically. "
        "Returns a verdict (clean / suspicious / malicious), detection count, "
        "and which engines flagged the file."
    ),
    "parameters": {
        "type": "object",
        "properties": {
            "file_path": {
                "type": "string",
                "description": "Absolute path to the file to scan."
            }
        },
        "required": ["file_path"]
    }
}