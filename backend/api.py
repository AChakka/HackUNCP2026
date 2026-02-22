import os
import sys
import json
import uuid
import shutil
from datetime import datetime

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel
from dotenv import load_dotenv
from openai import AsyncOpenAI

load_dotenv()

# ── Path setup ────────────────────────────────────────────────────────────────
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from forensic_engine.entropy_calculation import analyze_pe_file
from forensic_engine.virustotal import virustotal_scan
from forensic_engine.api_enrichment import (
    hybrid_analysis_hash_lookup,
    file_timestamps_tool,
    build_timeline_tool,
)
from forensic_engine.metadata import extract_metadata
from forensic_engine.logparser import parse_log
from forensic_engine.steganography import analyze_steganography
from forensic_engine.reporting import generate_pdf

# ── App + CORS ────────────────────────────────────────────────────────────────
app = FastAPI(title="CORONER Forensic API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))

DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data")
PDF_DIR  = os.path.join(os.path.dirname(os.path.abspath(__file__)), "reports")
os.makedirs(DATA_DIR, exist_ok=True)
os.makedirs(PDF_DIR,  exist_ok=True)

# ── Session store ─────────────────────────────────────────────────────────────
SESSIONS: dict[str, dict] = {}

# ── Tool definitions (OpenAI function-calling format) ─────────────────────────
TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "analyze_entropy",
            "description": (
                "Calculates Shannon Entropy for PE file sections. "
                "Entropy > 7.0 strongly indicates packed or encrypted malware."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "file_path": {"type": "string", "description": "Absolute path to the file"},
                },
                "required": ["file_path"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "scan_with_virustotal",
            "description": "Scans a file against 70+ AV engines via VirusTotal. Returns detection ratio and per-engine verdicts.",
            "parameters": {
                "type": "object",
                "properties": {
                    "file_path": {"type": "string"},
                },
                "required": ["file_path"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "lookup_file_hash",
            "description": "Checks Hybrid Analysis / Falcon Sandbox for an existing report by SHA256 hash.",
            "parameters": {
                "type": "object",
                "properties": {
                    "sha256": {"type": "string", "description": "SHA256 hex digest of the file"},
                },
                "required": ["sha256"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_file_timestamps",
            "description": "Extracts MACB (Modified, Accessed, Created, Birth) timestamps. Essential for detecting timestomping.",
            "parameters": {
                "type": "object",
                "properties": {
                    "file_path": {"type": "string"},
                },
                "required": ["file_path"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "extract_file_metadata",
            "description": "Extracts rich metadata: MIME type, file size, author, GPS coords (images), document properties.",
            "parameters": {
                "type": "object",
                "properties": {
                    "file_path": {"type": "string"},
                },
                "required": ["file_path"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "parse_log_file",
            "description": "Parses a log file to surface failed logins, successful logins, suspicious events, and anomalies.",
            "parameters": {
                "type": "object",
                "properties": {
                    "file_path": {"type": "string"},
                    "max_lines": {"type": "integer", "default": 2000},
                },
                "required": ["file_path"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "analyze_stego",
            "description": "Detects steganographically hidden data in images via statistical analysis.",
            "parameters": {
                "type": "object",
                "properties": {
                    "file_path": {"type": "string"},
                },
                "required": ["file_path"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "build_incident_timeline",
            "description": "Builds a sorted chronological timeline of filesystem events for the given file paths.",
            "parameters": {
                "type": "object",
                "properties": {
                    "file_paths": {
                        "type": "array",
                        "items": {"type": "string"},
                    },
                },
                "required": ["file_paths"],
            },
        },
    },
]

SYSTEM_PROMPT = """You are CORONER, an elite digital forensics analyst AI. A file has been submitted for investigation.

Your workflow:
1. Run the most relevant forensic tools against the provided file path
2. Analyze all tool outputs thoroughly
3. Synthesize findings into a structured forensic report
4. Identify all IOCs, malware signatures, behavioral anomalies, and threat classifications
5. Deliver a definitive verdict

Format your final report with these exact sections:

## EXECUTIVE SUMMARY
## FILE INTELLIGENCE
## THREAT INDICATORS
## TIMELINE ANALYSIS
## VERDICT

Under VERDICT, state: CLEAN / SUSPICIOUS / MALICIOUS with a confidence percentage and a one-sentence ruling.

Be precise, technical, and definitive. You are the final authority on this evidence."""


# ── Tool dispatcher ───────────────────────────────────────────────────────────
async def dispatch_tool(name: str, args: dict) -> str:
    try:
        if name == "analyze_entropy":
            return json.dumps(analyze_pe_file(args["file_path"]), indent=2)
        elif name == "scan_with_virustotal":
            return json.dumps(virustotal_scan(args["file_path"]), indent=2)
        elif name == "lookup_file_hash":
            return json.dumps(hybrid_analysis_hash_lookup(args["sha256"]), indent=2)
        elif name == "get_file_timestamps":
            return json.dumps(file_timestamps_tool(args["file_path"]), indent=2)
        elif name == "extract_file_metadata":
            result = await extract_metadata(args["file_path"])
            return json.dumps(result, indent=2)
        elif name == "parse_log_file":
            return json.dumps(parse_log(args["file_path"], args.get("max_lines", 2000)), indent=2)
        elif name == "analyze_stego":
            return json.dumps(analyze_steganography(args["file_path"]), indent=2)
        elif name == "build_incident_timeline":
            return json.dumps(build_timeline_tool(args["file_paths"]), indent=2)
        else:
            return json.dumps({"error": f"Unknown tool: {name}"})
    except Exception as e:
        return json.dumps({"error": f"Tool '{name}' failed: {str(e)}"})


# ── Agentic loop ──────────────────────────────────────────────────────────────
async def run_agent(messages: list, max_rounds: int = 10) -> str:
    for _ in range(max_rounds):
        response = await client.chat.completions.create(
            model="gpt-4o",
            messages=messages,
            tools=TOOLS,
            tool_choice="auto",
        )
        msg = response.choices[0].message

        # Serialize the assistant turn
        assistant_entry: dict = {"role": "assistant", "content": msg.content or ""}
        if msg.tool_calls:
            assistant_entry["tool_calls"] = [
                {
                    "id": tc.id,
                    "type": "function",
                    "function": {
                        "name": tc.function.name,
                        "arguments": tc.function.arguments,
                    },
                }
                for tc in msg.tool_calls
            ]
        messages.append(assistant_entry)

        if not msg.tool_calls:
            return msg.content or ""

        # Dispatch all requested tools
        for tc in msg.tool_calls:
            result = await dispatch_tool(tc.function.name, json.loads(tc.function.arguments))
            messages.append({"role": "tool", "tool_call_id": tc.id, "content": result})

    return messages[-1].get("content", "Analysis complete.")


# ── Endpoints ─────────────────────────────────────────────────────────────────
@app.post("/api/start-investigation")
async def start_investigation(file: UploadFile = File(...)):
    session_id = str(uuid.uuid4())

    safe_name = file.filename.replace("/", "_").replace("\\", "_")
    file_path = os.path.join(DATA_DIR, f"{session_id}_{safe_name}")
    with open(file_path, "wb") as f:
        shutil.copyfileobj(file.file, f)

    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {
            "role": "user",
            "content": (
                f"Begin a full forensic investigation.\n"
                f"File path: {file_path}\n"
                f"Original file name: {file.filename}\n\n"
                "Run all appropriate tools and produce your complete structured report."
            ),
        },
    ]

    report_text = await run_agent(messages)

    SESSIONS[session_id] = {
        "file_path": file_path,
        "file_name": file.filename,
        "messages": messages,
        "report": report_text,
        "pdf_path": None,
        "created": datetime.utcnow().isoformat(),
    }

    return {
        "session_id": session_id,
        "report": report_text,
        "file_name": file.filename,
    }


class ChatRequest(BaseModel):
    session_id: str
    message: str


@app.post("/api/chat")
async def chat(req: ChatRequest):
    session = SESSIONS.get(req.session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    session["messages"].append({"role": "user", "content": req.message})
    reply = await run_agent(session["messages"])
    return {"reply": reply}


@app.get("/api/download-pdf/{session_id}")
async def download_pdf(session_id: str):
    session = SESSIONS.get(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    if not session["pdf_path"]:
        pdf_path = os.path.join(PDF_DIR, f"report_{session_id}.pdf")
        generate_pdf(
            report_text=session["report"],
            file_name=session["file_name"],
            output_path=pdf_path,
        )
        session["pdf_path"] = pdf_path

    return FileResponse(
        session["pdf_path"],
        media_type="application/pdf",
        filename=f"coroner_report_{session['file_name']}.pdf",
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8002)
