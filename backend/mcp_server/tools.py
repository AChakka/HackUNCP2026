import sys
import os
import json
from typing import List, Dict

# Ensure the backend directory is in the path for clean imports
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
if parent_dir not in sys.path:
    sys.path.append(parent_dir)

# Imports from the forensic engine modules
from forensic_engine.entropy_calculation import analyze_pe_file
from forensic_engine.api_enrichment import (
    hybrid_analysis_submit,
    hybrid_analysis_report,
    hybrid_analysis_hash_lookup,
    file_timestamps_tool,
    build_timeline_tool,
    save_timeline_tool
)
from forensic_engine.virustotal import virustotal_scan

def register_forensic_tools(mcp):
    """
    Registers the full suite of forensic analysis tools with the FastMCP instance.
    """
    
    # --- STATIC ANALYSIS ---
    @mcp.tool()
    async def analyze_entropy(file_path: str) -> str:
        """
        Calculates Shannon Entropy for PE file sections. 
        High entropy (>7.0) often indicates packed or encrypted malware.
        """
        try:
            result = analyze_pe_file(file_path)
            return json.dumps(result, indent=2)
        except Exception as e:
            return json.dumps({"status": "error", "error": f"Entropy analysis failed: {str(e)}"})

    # --- MULTI-ENGINE SCANNING (VirusTotal) ---
    @mcp.tool()
    async def scan_with_virustotal(file_path: str) -> str:
        """
        Scans a file against 70+ AV engines via VirusTotal. 
        Handles hashing, cache-checking, and file uploading automatically.
        """
        try:
            # Note: virustotal_scan is async, so we MUST await it
            result = await virustotal_scan(file_path)
            return json.dumps(result, indent=2)
        except Exception as e:
            return json.dumps({"status": "error", "error": f"VirusTotal scan failed: {str(e)}"})

    # --- REPUTATION & SANDBOXING (Hybrid Analysis) ---
    @mcp.tool()
    async def lookup_file_hash(sha256: str) -> str:
        """
        Checks Hybrid Analysis (Falcon Sandbox) for existing reports based on SHA256.
        Use this first to see if a file is already known as malicious.
        """
        try:
            result = hybrid_analysis_hash_lookup(sha256)
            return json.dumps(result, indent=2)
        except Exception as e:
            return json.dumps({"status": "error", "error": f"Hash lookup failed: {str(e)}"})

    @mcp.tool()
    async def submit_to_sandbox(file_path: str) -> str:
        """
        Uploads a file to Hybrid Analysis for live sandbox execution.
        Returns a Job ID needed to retrieve the report later.
        """
        try:
            result = hybrid_analysis_submit(file_path)
            return json.dumps(result, indent=2)
        except Exception as e:
            return json.dumps({"status": "error", "error": f"Submission failed: {str(e)}"})

    @mcp.tool()
    async def get_sandbox_report(job_id: str) -> str:
        """
        Retrieves the behavioral analysis report from a sandbox run using its Job ID.
        """
        try:
            result = hybrid_analysis_report(job_id)
            return json.dumps(result, indent=2)
        except Exception as e:
            return json.dumps({"status": "error", "error": f"Report retrieval failed: {str(e)}"})

    # --- TIMELINE & METADATA ---
    @mcp.tool()
    async def get_file_timestamps(file_path: str) -> str:
        """
        Extracts MACB (Modified, Accessed, Created, Birth) timestamps from a file.
        Essential for detecting timestomping and file creation windows.
        """
        try:
            result = file_timestamps_tool(file_path)
            return json.dumps(result, indent=2)
        except Exception as e:
            return json.dumps({"status": "error", "error": f"Metadata extraction failed: {str(e)}"})

    @mcp.tool()
    async def build_incident_timeline(file_paths: List[str]) -> str:
        """
        Takes a list of absolute file paths and returns a sorted chronological timeline 
        of all file-system events related to those files.
        """
        try:
            result = build_timeline_tool(file_paths)
            return json.dumps(result, indent=2)
        except Exception as e:
            return json.dumps({"status": "error", "error": f"Timeline build failed: {str(e)}"})

    @mcp.tool()
    async def export_timeline_csv(events_json: str, output_path: str) -> str:
        """
        Saves a generated timeline into a CSV file for reporting.
        Args:
            events_json: The raw JSON output from build_incident_timeline.
            output_path: Absolute path where the .csv file should be saved.
        """
        try:
            events = json.loads(events_json)
            path = save_timeline_tool(events, output_path)
            return f"Successfully exported timeline to {path}"
        except Exception as e:
            return json.dumps({"status": "error", "error": f"CSV export failed: {str(e)}"})

    return mcp