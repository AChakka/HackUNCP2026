import sys
import os
import json

# Add the parent directory so we can import from forensic_engine
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from backend.forensic_engine.entropy_calculation import analyze_pe_file

def get_entropy_analysis_tool(mcp):
    """
    Registers the entropy analysis tool with the FastMCP instance.
    """
    
    @mcp.tool()
    async def analyze_entropy(file_path: str) -> str:
        """
        Calculates the Shannon Entropy for sections of a Windows Portable Executable (PE) file.
        Use this tool to determine if a file is potentially compressed, packed, or encrypted.
        
        Args:
            file_path: The absolute path to the PE file to analyze.
            
        Returns:
            A JSON string containing the entropy scores and risk levels for each section of the PE file.
        """
        try:
            result = analyze_pe_file(file_path)
            return json.dumps(result, indent=2)
        except Exception as e:
            return json.dumps({"status": "error", "error": str(e)})

    return mcp
