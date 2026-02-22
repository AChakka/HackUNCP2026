"""
Ransom Note Profiler — FastAPI backend
Runs on port 8001

Endpoints:
  POST /analyze   { "text": "..." }  →  full profile dict
  GET  /health    →  { "status": "ok" }
"""

import sys
import os
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

sys.path.insert(0, os.path.dirname(__file__))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from services.analyzer import analyze_ransom_note

app = FastAPI(title="CORONER — Ransom Note Profiler", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class NoteRequest(BaseModel):
    text: str


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/analyze")
def analyze(req: NoteRequest):
    return analyze_ransom_note(req.text)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="0.0.0.0", port=8001, reload=True)
