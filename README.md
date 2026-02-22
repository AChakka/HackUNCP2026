# 🔬 CORONER — AI-Powered Digital Forensics Platform

> **Investigate. Analyze. Verdict.** CORONER is a full-stack digital forensics platform that deploys an autonomous AI agent (GPT-4o) to perform deep forensic investigation on any file — detecting malware, hidden data, anomalous timelines, and on-chain financial threats — delivering a structured, court-ready report in seconds.

Built for **HackUNCP 2026**.

---

## ✨ What It Does

CORONER combines three specialized investigation modules into a single, unified interface:

| Module | Description |
|---|---|
| 🧟 **Coroner** | Upload any file for AI-driven forensic analysis: entropy scoring, VirusTotal scan, steganography detection, MACB timestamp extraction, log parsing, and PDF report export |
| 🪙 **Crypto Forensics** | Trace Solana wallet transaction graphs, score wallets for mixer/scam behavior, and scan arbitrary files for embedded wallet addresses |
| 🎭 **Ransom Analyzer** | Dedicated ransomware artifact analysis module |

---

## ⚡ Quick Start

> **Prerequisites:** Python 3.12+, Node.js 18+, `uv` package manager

```bash
# 1. Clone & enter the project
git clone <your-repo-url>
cd HackUNCP2026

# 2. Install Python dependencies
uv sync

# 3. Set up environment (see Environment Configuration below)
cp .env.example .env   # then fill in your keys

# 4. Start the backend API
cd backend
uvicorn api:app --reload --port 8002

# 5. In a separate terminal — start the frontend
cd frontend
npm install
npm run dev
```

The app will be live at **http://localhost:5173**. The API docs are at **http://localhost:8002/docs**.

---

## 🛠 Detailed Setup

### Python Backend

The project uses [`uv`](https://github.com/astral-sh/uv) for blazing-fast dependency management.

```bash
# Install uv (if not already installed)
curl -LsSf https://astral.sh/uv/install.sh | sh

# Install all dependencies from pyproject.toml
uv sync
```

**Core Python dependencies:**

| Package | Purpose |
|---|---|
| `fastapi` + `uvicorn` | REST API server |
| `openai >= 1.64.0` | GPT-4o agentic tool-call loop |
| `google-genai >= 1.64.0` | Gemini model integration |
| `fastmcp >= 3.0.1` | Model Context Protocol server (forensic tools) |
| `python-dotenv` | Secret management |
| `pillow` | Image processing for steganography analysis |
| `reportlab` | PDF report generation |
| `pefile` | PE (Windows executable) parsing |
| `requests` | VirusTotal & Hybrid Analysis API calls |

### Frontend (React + Vite)

```bash
cd frontend
npm install
```

**Frontend dependencies:**

| Package | Purpose |
|---|---|
| `react 19` | UI framework |
| `react-router-dom 7` | Client-side routing between modules |
| `vite 7` | Lightning-fast dev server & bundler |

### Crypto Module

```bash
cd crypto-module/backend
pip install fastapi uvicorn requests python-multipart
uvicorn app:app --reload --port 8000
```

### Ransom Module

```bash
cd ransom-module/backend
pip install -r requirements.txt
uvicorn app:app --reload --port 8001
```

---

## 🔑 Environment Configuration

Create a `.env` file in the **project root** (next to `main.py`):

```env
# Required — Core AI engine
OPENAI_API_KEY=sk-...

# Optional — Enriches file reputation lookups
VIRUSTOTAL_API_KEY=...
HYBRID_ANALYSIS_API_KEY=...
```

> **Never commit `.env` to git.** It is already in `.gitignore`.

---

## 🚀 Usage

### Web Interface

Navigate to `http://localhost:5173` and choose your module from the top navigation:

1. **Coroner** → Upload any file (PE, PDF, image, log) → AI runs a full forensic suite → view structured report + download PDF
2. **Crypto** → Enter a Solana wallet address or upload a file → get a transaction graph + risk score
3. **Ransom** → Submit ransomware artifacts for behavioral analysis

### CLI Forensic Client (Advanced)

The `forensic_client.py` script runs a fully agentic forensic session via MCP directly in the terminal:

```bash
# Place evidence files in the /data directory
cp your_suspicious_file.exe data/

# Run the agentic forensic loop
uv run python forensic_client.py
```

The CLI will:
1. Auto-scan everything in `/data/` through all forensic phases
2. Print a **DFIR Master Executive Report** with MITRE ATT&CK mappings
3. Drop into an **interactive Q&A mode** — ask follow-up questions like a real analyst
4. Export a full **PDF report** of the investigation session

---

## 🧠 Architecture

```
HackUNCP2026/
├── backend/
│   ├── api.py                   # FastAPI: /start-investigation, /chat, /download-pdf
│   ├── mcp_server/
│   │   ├── server.py            # FastMCP server entrypoint
│   │   └── tools.py             # MCP tool definitions (called by AI agent)
│   └── forensic_engine/
│       ├── entropy_calculation.py   # PE section Shannon entropy
│       ├── virustotal.py            # VirusTotal API integration
│       ├── hybrid_analysis.py       # Hybrid Analysis / Falcon Sandbox
│       ├── steganography.py         # Statistical LSB stego detection
│       ├── logparser.py             # Auth log anomaly parsing
│       ├── metadata.py              # EXIF, MIME, GPS, document metadata
│       ├── timeline.py              # MACB timestamp + incident timeline
│       ├── reporting.py             # PDF generation via ReportLab
│       └── yara_rules/              # YARA signature files
├── crypto-module/
│   └── backend/
│       ├── app.py                   # /trace, /report, /scan-file endpoints
│       └── services/
│           ├── solana.py            # Solana RPC + wallet profiling
│           ├── scoring.py           # Risk scoring (0–100) + classification
│           └── extract.py           # Regex Solana address extractor
├── ransom-module/
│   └── backend/
│       └── app.py                   # Ransomware analysis API
├── frontend/
│   └── src/
│       ├── App.jsx                  # Router + navigation shell
│       └── pages/
│           ├── CoronerPage.jsx      # File upload + AI report viewer
│           ├── CryptoPage.jsx       # Wallet graph + risk dashboard
│           └── RansomPage.jsx       # Ransomware analysis UI
├── forensic_client.py           # Terminal-based MCP forensic agent
├── data/                        # Evidence drop directory (gitignored)
├── models/                      # AI model configs
└── pyproject.toml               # Python project manifest (uv)
```

**Agent Flow:**
```
Upload → FastAPI → GPT-4o (tool-call loop) → MCP Tools → Results → Report
```
The AI autonomously decides which tools to run, in which order, across up to 10 reasoning rounds.

---

## ⚠️ Gotchas & Tips

### `OPENAI_API_KEY` is required on startup
Both `forensic_client.py` and `backend/api.py` will raise `ValueError` or `AuthenticationError` immediately if the key is missing or invalid. Double-check your `.env` is in the **project root**, not inside `/backend/`.

### Rate Limits (429 Errors)
The CLI client has a built-in **retry loop** (3 attempts, 60-second cooldown) for OpenAI 429 rate limit errors. If you hit these frequently, use a paid-tier API key or switch to `gpt-4o-mini` in `forensic_client.py` (line 35, `model=` parameter).

### VirusTotal Free Tier is Slow
The free VirusTotal API has a 4 requests/minute cap. Large batches of files in the CLI may be throttled. The API backend gracefully handles timeouts and logs `Tool Failure` before pivoting.

### PDF Export Requires `reportlab`
The PDF download endpoint (`/api/download-pdf/{session_id}`) requires `reportlab`. It's installed by `uv sync` from `pyproject.toml`, but if you install manually make sure to run `pip install reportlab`.

### Crypto Module Runs Independently
The crypto module (`crypto-module/backend`) and ransom module (`ransom-module/backend`) are **separate FastAPI services** with their own ports and `requirements.txt`. The frontend proxies to them — all three services must be running for full functionality.

### Steganography Analysis is CPU-Intensive
The LSB steganography detector in `steganography.py` performs full pixel-plane statistical analysis. For large images (>10MB), expect latency of a few seconds. This is normal.

### MCP Server Must Be Running for CLI Mode
`forensic_client.py` spawns `backend/mcp_server/server.py` as a subprocess automatically. Do **not** manually kill this process while the CLI is active or tool calls will fail silently.

---

## 📄 License

Built at **HackUNCP 2026**. All rights reserved.
