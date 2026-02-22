import os
import sys
from fastmcp import FastMCP

# Ensure Python can find the files your teammates are building in this folder
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

mcp = FastMCP("ForensicEngine")

# ==========================================
# TOOL 1: INTEGRITY (Currently being built)
# ==========================================
@mcp.tool()
def verify_file_integrity(path: str) -> str:
    """Calculates the SHA-256 hash of a file to check for tampering."""
    try:
        import hashing # Lazy import: only runs when Gemini calls the tool
        return hashing.calculate_sha256(path)
    except ImportError:
        return f"System Note: The 'hashing' module is currently under construction by the engineering team. Cannot hash {path} yet."
    except Exception as e:
        return f"Hashing error: {e}"

# ==========================================
# TOOL 2: TIMELINE ANALYSIS
# ==========================================
@mcp.tool()
def get_file_timeline(path: str) -> str:
    """Retrieves MAC (Modified, Accessed, Created) timestamps for a file."""
    try:
        import timestamps
        return timestamps.get_mac_times(path)
    except ImportError:
        return "System Note: The 'timestamps' module is not yet online."

# ==========================================
# TOOL 3: MALWARE STRINGS EXTRACTION
# ==========================================
@mcp.tool()
def extract_suspicious_strings(path: str) -> str:
    """Extracts human-readable text from compiled binaries to find IPs or URLs."""
    try:
        import strings_analysis
        return strings_analysis.extract_strings(path)
    except ImportError:
        return "System Note: The 'strings_analysis' module is not yet online."


if __name__ == "__main__":
    mcp.run()