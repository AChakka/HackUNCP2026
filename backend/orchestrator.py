import asyncio
import os
from dotenv import load_dotenv
from fastmcp import Client
from fastmcp.client.transports import PythonStdioTransport 
from google import genai
from google.genai import types

load_dotenv()

async def main():
    current_dir = os.path.dirname(os.path.abspath(__file__))
    server_path = os.path.join(current_dir, "mcp_server", "server.py")
    
    transport = PythonStdioTransport(server_path)
    
    async with Client(transport) as mcp_client:
        client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

        #put model you want
        model_id = "gemini-2.5-flash-lite"
        
        query = "Verify the integrity of 'backend/orchestrator.py' and describe its metadata."
        
        print(f"--- Sending request to {model_id} ---")
        try:
            response = await client.aio.models.generate_content(
                model=model_id,
                contents=query,
                config=types.GenerateContentConfig(
                    tools=[mcp_client.session]
                )
            )
            print(f"\n[GEMINI FORENSIC REPORT]\n{response.text}")
        except Exception as e:
            print(f"\n[EXECUTION ERROR]: {e}")

if __name__ == "__main__":
    asyncio.run(main())