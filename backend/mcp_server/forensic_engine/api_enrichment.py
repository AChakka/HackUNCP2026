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
