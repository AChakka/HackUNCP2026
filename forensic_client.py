import asyncio
import os
import json
import traceback
from openai import AsyncOpenAI, RateLimitError
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client
from dotenv import load_dotenv

# 1. Setup Environment
load_dotenv()
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

if not OPENAI_API_KEY:
    raise ValueError("Missing OPENAI_API_KEY in .env file.")

# Initialize the Async OpenAI Client
client = AsyncOpenAI(api_key=OPENAI_API_KEY)

async def send_message_with_retry(messages, tools, model="gpt-4o-mini", max_retries=3, delay=60):
    """Wraps the OpenAI API call with a retry loop to gracefully handle 429 Quota errors."""
    for attempt in range(max_retries):
        try:
            return await client.chat.completions.create(
                model=model,
                messages=messages,
                tools=tools if tools else None,
                temperature=0.0  # Keeps the agent focused and deterministic
            )
        except RateLimitError as e:
            if attempt == max_retries - 1:
                print("\n[!] Maximum retries reached. Investigation aborting.")
                raise e
            print(f"\n[!] Rate Limit (429) hit! Pausing for {delay} seconds... (Attempt {attempt + 1} of {max_retries})")
            await asyncio.sleep(delay)

async def run_forensic_investigation():
    root_dir = os.path.dirname(os.path.abspath(__file__))
    server_script = os.path.join(root_dir, "backend", "mcp_server", "server.py")
    backend_path = os.path.join(root_dir, "backend")

    server_params = StdioServerParameters(
        command="python",
        args=[server_script],
        env={
            **os.environ, 
            "PYTHONPATH": f"{backend_path}:{os.environ.get('PYTHONPATH', '')}"
        }
    )

    print(f"[*] Starting MCP Client and connecting to server...")
    
    async with stdio_client(server_params) as (read, write):
        async with ClientSession(read, write) as session:
            await session.initialize()

            # Retrieve tool schemas from the server and format for OpenAI
            tools_result = await session.list_tools()
            openai_tools = []
            
            for tool in tools_result.tools:
                openai_tools.append({
                    "type": "function",
                    "function": {
                        "name": tool.name,
                        "description": tool.description,
                        "parameters": tool.inputSchema or {"type": "object", "properties": {}}
                    }
                })

            data_dir = os.path.join(root_dir, "data")
            if not os.path.exists(data_dir):
                print(f"[!] Target data directory does not exist: {data_dir}")
                return
                
            # Get all actual files inside the data directory, excluding hidden files or timelines
            target_files = []
            for file_name in os.listdir(data_dir):
                if file_name.startswith('.'):
                    continue
                if file_name.endswith('.csv'):  
                    # Don't try to analyze our own generated timelines
                    continue
                    
                target_paths = os.path.join(data_dir, file_name)
                if os.path.isfile(target_paths):
                    target_files.append(target_paths)
            
            if not target_files:
                print(f"[!] No files found in the data directory: {data_dir}. Please add files to investigate.")
                return

            file_list_str = "\n".join([f"- {path}" for path in target_files])
            
            # 3. The Strict DFIR Standard Operating Procedure (SOP)
            # ADDED: Loop over the entire provided batch of files.
            prompt = (
                f"You are an elite Digital Forensics and Incident Response (DFIR) Agent. "
                f"Your task is to perform a comprehensive, multi-stage forensic analysis on the following batch of files:\n{file_list_str}\n\n"
                
                "You are connected to an MCP server with access to specialized tools. "
                "You MUST follow this exact Standard Operating Procedure (SOP) FOR EACH FILE sequentially. Do not skip steps, and do not ask me for permission to proceed.\n\n"
                
                "CRITICAL RULE: If a tool fails, returns an error, or gives you the exact same output twice, DO NOT retry it. "
                "Note the failure in your timeline and immediately proceed to the next step for that file.\n\n"
                
                "### PHASE 1: Triaging & Artifact Extraction\n"
                "1. CALL 'extract_file_metadata' to pull robust intelligence: MAC timestamps, MIME types, EXIF, and extension mismatches.\n"
                "2. CALL 'parse_log_file' if the file is a text log to hunt for brute force or suspicious events.\n"
                "3. CALL 'analyze_stego' if the file is an image (.jpg, .png) to check for embedded payloads.\n\n"
                
                "### PHASE 2: Static Analysis & Reputation Triage\n"
                "4. CALL 'analyze_entropy' to check if the file is a packed executable (PE).\n"
                "5. CALL 'lookup_file_hash' to see if Hybrid Analysis already has a report on this file.\n"
                "6. CALL 'scan_with_virustotal' to check its reputation across AV engines.\n\n"
                
                "### PHASE 3: Dynamic Execution (Sandbox)\n"
                "7. CALL 'submit_to_sandbox' to upload the file for behavioral analysis.\n"
                "8. Using the Job ID from the previous step, CALL 'get_sandbox_report' to retrieve the execution results. "
                "(Note: If the report says it is still processing, wait a moment and try again if your tool loop allows, or note it in the final report).\n\n"
                
                "### PHASE 4: Incident Context & Reporting\n"
                "9. Once all individual files have been processed, CALL 'build_incident_timeline' using the list of ALL target file paths to build a master timeline.\n"
                "10. CALL 'export_timeline_csv' to save the compiled timeline data for the evidence locker.\n\n"
                
                "Once you have successfully executed all available tools for all files and gathered the overall evidence, generate a highly detailed final 'DFIR Master Executive Report'. "
                "Include definitive verdicts per file (Malicious, Suspicious, or Benign), a holistic view of the attack simulation based on the combination of behaviors, and the synthesized timeline of events."
            )
            
            messages = [{"role": "user", "content": prompt}]
            
            print(f"[*] Sending investigation request to OpenAI. Please wait...")
            
            response = await send_message_with_retry(messages, openai_tools)
            
            # ==========================================
            # 4. THE SCALABLE AGENT LOOP (Now with Circuit Breaker!)
            # ==========================================
            max_iterations = 30 # Increased because we are analyzing multiple files.
            iteration_count = 0
            
            while iteration_count < max_iterations:
                iteration_count += 1
                response_message = response.choices[0].message
                
                # Append the model's message BEFORE appending tool results
                messages.append(response_message)

                # Check if the model responded with a request to call a tool
                if response_message.tool_calls:
                    for call in response_message.tool_calls:
                        print(f"[*] OpenAI is deciding to call tool: {call.function.name}")
                        try:
                            args_dict = json.loads(call.function.arguments)
                            
                            # Execute the specific tool on the MCP server
                            mcp_result = await session.call_tool(call.function.name, args_dict)
                            
                            # Extract the text output from the tool
                            result_text = "\n".join([c.text for c in mcp_result.content])
                            print(f"[-] Data received from '{call.function.name}'.")
                            
                        except Exception as e:
                            print(f"[!] Tool '{call.function.name}' failed to execute: {e}")
                            result_text = f"Error executing tool: {str(e)}"
                        
                        # Package the result to hand back to OpenAI
                        messages.append({
                            "role": "tool",
                            "tool_call_id": call.id,
                            "content": result_text
                        })
                    
                    print(f"[*] Handing tool data back to OpenAI for analysis... (Loop {iteration_count}/{max_iterations})\n")
                    response = await send_message_with_retry(messages, openai_tools)
                    
                else:
                    # If there are no function calls, the LLM has finished analyzing
                    print("\n" + "="*70)
                    print("OPENAI FORENSIC ANALYSIS REPORT")
                    print("="*70)
                    print(response_message.content)
                    break
            
            if iteration_count >= max_iterations:
                print("\n[!] CIRCUIT BREAKER TRIPPED: Maximum iterations reached. The agent was forced to stop to prevent an infinite loop.")
                print("[!] NOTE: Because you are analyzing an entire directory of files, you may need to increase the loop max_iterations limit on line 161 (currently 30).")

if __name__ == "__main__":
    try:
        asyncio.run(run_forensic_investigation())
    except ExceptionGroup as eg:
        print("\n[!] TaskGroup Error (Investigation Interrupted):")
        for e in eg.exceptions:
            traceback.print_exception(type(e), e, e.__traceback__)
    except Exception as e:
        print(f"\n[!] Unexpected Error: {e}")
        traceback.print_exc()