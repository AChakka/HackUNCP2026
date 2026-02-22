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


if __name__ == "__main__":
    mcp.run()