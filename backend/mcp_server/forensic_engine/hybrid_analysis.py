import requests

API_KEY = "ktklwgl726162a435nppsjq2ebea723ejwivtw9ra9fe71eam06jknkv795cf439"
BASE = "https://www.hybrid-analysis.com/api/v2"

HEADERS = {
    "api-key": API_KEY,
    "user-agent": "Falcon Sandbox",
    "accept": "application/json"
}

def submit_file(file_path):
    with open(file_path, "rb") as f:
        files = {"file": (file_path, f)}
        res = requests.post(f"{BASE}/submit/file", headers=HEADERS, files=files)
        return res.json()

def get_report(job_id):
    res = requests.get(f"{BASE}/report/{job_id}", headers=HEADERS)
    return res.json()

def search_hash(sha256):
    res = requests.get(f"{BASE}/search/hash", headers=HEADERS, params={"hash": sha256})
    return res.json()