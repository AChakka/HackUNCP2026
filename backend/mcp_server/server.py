import os
import sys
from fastmcp import FastMCP

# Ensure Python can find the files your teammates are building in this folder
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from tools import register_forensic_tools

mcp = FastMCP("ForensicEngine")

# Register tools
register_forensic_tools(mcp)


if __name__ == "__main__":
    mcp.run()