import asyncio
import os
import json
import traceback
import html
from datetime import datetime
from openai import AsyncOpenAI, RateLimitError
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client
from dotenv import load_dotenv

try:
    from reportlab.lib.pagesizes import letter
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    REPORTLAB_AVAILABLE = True
except ImportError:
    REPORTLAB_AVAILABLE = False
    print("\n[!] 'reportlab' module not found. PDF export will be disabled.")

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


class ForensicSession:
    """
    A stateful class that manages a forensic investigation AI session.
    It encapsulates the initial deep scan and subsequent interactive Q&A state,
    and provides a decoupled method for PDF generation.
    """
    def __init__(self, data_dir):
        self.data_dir = data_dir
        self.initial_report = ""
        self.messages = []
        self.chat_history = []  # Stores tuples of (role, content) for the PDF
        self.max_iterations = 30  # For AI tool loops

    async def run_initial_analysis(self, session, openai_tools):
        """
        Executes the initial forensic scan against the data_dir.
        Saves the results directly to self.initial_report and updates self.messages context.
        """
        if not os.path.exists(self.data_dir):
            error_msg = f"[!] Target data directory does not exist: {self.data_dir}"
            print(error_msg)
            return error_msg
            
        target_files = []
        for file_name in os.listdir(self.data_dir):
            if file_name.startswith('.'):
                continue
            if file_name.endswith('.csv'):  
                continue
                
            target_paths = os.path.join(self.data_dir, file_name)
            if os.path.isfile(target_paths):
                target_files.append(target_paths)
        
        if not target_files:
            error_msg = f"[!] No files found in the data directory: {self.data_dir}."
            print(error_msg)
            return error_msg

        file_list_str = "\n".join([f"- {path}" for path in target_files])
        
        prompt = (
            f"You are an elite Digital Forensics and Incident Response (DFIR) Agent. "
            f"Your task is to perform a comprehensive, multi-stage forensic analysis on this batch of evidence:\n{file_list_str}\n\n"

            "You are connected to an MCP server. You MUST follow this SOP for EACH file. "
            "CRITICAL: If a tool fails or repeats, log the 'Tool Failure' and pivot immediately. No retries.\n\n"

            "### PHASE 1: Triaging & Artifact Extraction\n"
            "1. CALL 'extract_file_metadata' for MAC timestamps, MIME, and extension mismatches.\n"
            "2. CALL 'parse_log_file' for text logs (search for brute force/lateral movement).\n"
            "3. CALL 'analyze_stego' for images (search for hidden C2 configs or payloads).\n\n"

            "### PHASE 2: Static Analysis & Reputation\n"
            "4. CALL 'analyze_entropy' to detect packing/obfuscation.\n"
            "5. CALL 'lookup_file_hash' to query Hybrid Analysis history.\n"
            "6. CALL 'scan_with_virustotal' for global AV reputation.\n\n"

            "### PHASE 3: Dynamic Execution\n"
            "7. CALL 'submit_to_sandbox' for behavioral detonation.\n"
            "8. CALL 'get_sandbox_report' using the Job ID. (If processing, log status and move on).\n\n"

            "### PHASE 4: Correlation & Incident Synthesis\n"
            "9. After individual processing, CALL 'build_incident_timeline' using ALL file paths.\n"
            "10. ANALYZE RELATIONSHIPS: Compare findings across all files. Identify if File A dropped File B, "
            "or if multiple files share a Command & Control (C2) IP or suspicious timestamp window.\n"
            "11. CALL 'export_timeline_csv' for the evidence locker.\n\n"

            "### FINAL OUTPUT: DFIR MASTER EXECUTIVE REPORT\n"
            "Once tools are exhausted, generate an extensive report with these sections:\n"
            "1. EXECUTIVE SUMMARY: A high-level narrative of the 'Infection Lifecycle'. How did the attack start and evolve?\n"
            "2. FINDINGS MATRIX: A table including File Name, Verdict (Malicious/Suspicious/Benign), Malware Family, and Confidence Score (1-10).\n"
            "3. CROSS-FILE CORRELATION: Detail how these files interact (e.g., 'The log in File A confirms the execution of the PE in File B').\n"
            "4. ATTACK KILL CHAIN: Map all artifacts to relevant MITRE ATT&CK techniques.\n"
            "5. REMEDIATION: Specific steps to neutralize this specific threat cluster.\n"
            "6. SYNTHESIZED TIMELINE: A chronological master sequence of the entire incident."
        )
        
        self.messages.append({"role": "user", "content": prompt})
        
        print(f"[*] Sending investigation request to OpenAI. Please wait...")
        response = await send_message_with_retry(self.messages, openai_tools)
        
        iteration_count = 0
        while iteration_count < self.max_iterations:
            iteration_count += 1
            response_message = response.choices[0].message
            
            self.messages.append(response_message)

            if response_message.tool_calls:
                for call in response_message.tool_calls:
                    print(f"[*] OpenAI is deciding to call tool: {call.function.name}")
                    try:
                        args_dict = json.loads(call.function.arguments)
                        mcp_result = await session.call_tool(call.function.name, args_dict)
                        result_text = "\n".join([c.text for c in mcp_result.content])
                        print(f"[-] Data received from '{call.function.name}'.")
                    except Exception as e:
                        print(f"[!] Tool '{call.function.name}' failed to execute: {e}")
                        result_text = f"Error executing tool: {str(e)}"
                    
                    self.messages.append({
                        "role": "tool",
                        "tool_call_id": call.id,
                        "content": result_text
                    })
                
                print(f"[*] Handing tool data back to OpenAI for analysis... (Loop {iteration_count}/{self.max_iterations})\n")
                response = await send_message_with_retry(self.messages, openai_tools)
                
            else:
                self.initial_report = response_message.content
                print("\n" + "="*70)
                print("OPENAI FORENSIC ANALYSIS REPORT")
                print("="*70)
                print(self.initial_report)
                return self.initial_report
        
        if iteration_count >= self.max_iterations:
            print("\n[!] CIRCUIT BREAKER TRIPPED: Maximum iterations reached.")
            
    async def process_chat_message(self, session, openai_tools, user_input):
        """
        Processes a single follow-up question using the established context state.
        Returns the agent's response string.
        """
        self.messages.append({"role": "user", "content": user_input})
        self.chat_history.append(("user", user_input))
        
        try:
            qa_response = await send_message_with_retry(self.messages, openai_tools)
        except Exception as e:
            error_msg = f"Error reasoning: {e}"
            print(f"[!] {error_msg}")
            return error_msg
        
        qa_iteration = 0
        final_answer = ""
        while qa_iteration < self.max_iterations:
            qa_iteration += 1
            qa_msg = qa_response.choices[0].message
            self.messages.append(qa_msg)
            
            if qa_msg.tool_calls:
                for call in qa_msg.tool_calls:
                    print(f"[*] Agent executing tool for Q&A: {call.function.name}")
                    try:
                        args_dict = json.loads(call.function.arguments)
                        mcp_result = await session.call_tool(call.function.name, args_dict)
                        result_text = "\n".join([c.text for c in mcp_result.content])
                    except Exception as e:
                        print(f"[!] Tool '{call.function.name}' failed: {e}")
                        result_text = f"Error executing tool: {str(e)}"
                    
                    self.messages.append({
                        "role": "tool",
                        "tool_call_id": call.id,
                        "content": result_text
                    })
                
                print(f"[*] Analyzing tool results...")
                try:
                    qa_response = await send_message_with_retry(self.messages, openai_tools)
                except Exception as e:
                    print(f"[!] Error reasoning: {e}")
                    break
            else:
                final_answer = qa_msg.content
                self.chat_history.append(("agent", final_answer))
                break
                
        if qa_iteration >= self.max_iterations:
            print("\n[!] Loop maxed out during Q&A.")
            
        return final_answer
        
    def trigger_pdf_export(self, filename=None):
        """
        Decoupled method to export the session state (initial report + chat history) to a PDF.
        Designed to be called programmatically (e.g., via a frontend button).
        """
        if not REPORTLAB_AVAILABLE:
            print("\n[!] PDF export failed: 'reportlab' is not installed. Run 'pip install reportlab' to enable.")
            return None
            
        if not filename:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"forensic_report_{timestamp}.pdf"
            
        try:
            doc = SimpleDocTemplate(filename, pagesize=letter)
            styles = getSampleStyleSheet()
            chat_style = ParagraphStyle(
                'ChatStyle',
                parent=styles['Normal'],
                fontName='Helvetica',
                fontSize=10,
                spaceAfter=6
            )
            
            story = []
            
            if self.initial_report:
                story.append(Paragraph("Forensic Analysis Report", styles['Heading1']))
                for line in self.initial_report.split('\n'):
                    if line.strip():
                        escaped_line = html.escape(line.strip())
                        story.append(Paragraph(escaped_line, styles['Normal']))
                story.append(Spacer(1, 12))
            
            if self.chat_history:
                story.append(Paragraph("Interactive Q&A Session", styles['Heading1']))
                for role, text in self.chat_history:
                    prefix = "User: " if role == "user" else "Agent: "
                    escaped_text = html.escape(text).replace('\n', '<br/>')
                    story.append(Paragraph(f"<b>{prefix}</b> {escaped_text}", chat_style))
                    story.append(Spacer(1, 6))
                    
            doc.build(story)
            print(f"\n[*] Successfully exported PDF to: {filename}")
            return filename
        except Exception as e:
            print(f"\n[!] Failed to export PDF: {e}")
            return None

    async def interactive_chat_loop(self, session, openai_tools):
        """
        Terminal-based interactive loop.
        Note: Removed the 'export pdf' text command to ensure decoupled architecture.
        """
        print("\n" + "="*70)
        print("ENTERING INTERACTIVE Q&A MODE")
        print("Type 'exit' or 'quit' to end the session.")
        print("="*70)
        
        while True:
            try:
                user_input = await asyncio.to_thread(input, "\nForensicQ&A> ")
                user_input = user_input.strip()
            except Exception:
                print("\n[*] Exiting forensic session.")
                break
                
            if not user_input:
                continue
                
            if user_input.lower() in ['exit', 'quit']:
                print("\n[*] Exiting forensic session.")
                break
                
            print(f"[*] Thinking...")
            answer = await self.process_chat_message(session, openai_tools, user_input)
            print(f"\nAgent: {answer}")


async def main_orchestrator():
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
            
            # Instantiate our stateful session
            forensic_session = ForensicSession(data_dir=data_dir)
            
            # Phase 1: Run the initial deep analysis
            await forensic_session.run_initial_analysis(session, openai_tools)
            
            # Phase 2: Enter the interactive terminal loop
            await forensic_session.interactive_chat_loop(session, openai_tools)
            
            # Phase 3: Decoupled programmatic PDF generation test 
            # (In production, the UI button would trigger this)
            print("\n" + "="*70)
            print("SIMULATING UI 'GENERATE PDF' BUTTON CLICK...")
            print("="*70)
            forensic_session.trigger_pdf_export()


if __name__ == "__main__":
    try:
        asyncio.run(main_orchestrator())
    except ExceptionGroup as eg:
        print("\n[!] TaskGroup Error (Investigation Interrupted):")
        for e in eg.exceptions:
            traceback.print_exception(type(e), e, e.__traceback__)
    except Exception as e:
        print(f"\n[!] Unexpected Error: {e}")
        traceback.print_exc()