from fastapi import FastAPI
from pydantic import BaseModel

from services.extract import extract_solana_wallets
from services.solana import profile_wallet
from services.scoring import score_wallet

app = FastAPI(title="Crypto Module")

class ExtractReq(BaseModel):
    text: str

class AnalyzeReq(BaseModel):
    wallet: str
    limit: int = 25

@app.get("/")
def root():
    return {"ok": True, "service": "crypto-module"}

@app.post("/extract")
def extract(req: ExtractReq):
    wallets = extract_solana_wallets(req.text)
    return {"wallets": wallets, "count": len(wallets)}

@app.post("/analyze")
def analyze(req: AnalyzeReq):
    profile = profile_wallet(req.wallet, limit=req.limit)
    score, flags, label = score_wallet(profile)

    return {
        "wallet": req.wallet,
        "profile": profile,
        "risk": {"score": score, "label": label, "flags": flags}
    }