# forensic_engine/api_enrichment.py

from .hybrid_analysis import (
    submit_file,
    get_report,
    search_hash
)

def hybrid_analysis_submit(file_path):
    return submit_file(file_path)

def hybrid_analysis_report(job_id):
    return get_report(job_id)

def hybrid_analysis_hash_lookup(sha256):
    return search_hash(sha256)

from forensic_engine.timeline import (
    get_file_timestamps,
    build_timeline,
    save_timeline_csv
)

def file_timestamps_tool(file_path: str):
    return get_file_timestamps(file_path)

def build_timeline_tool(file_paths: list[str]):
    return build_timeline(file_paths)

def save_timeline_tool(events: list[dict], output_path: str):
    return save_timeline_csv(events, output_path)
