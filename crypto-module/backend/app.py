from fastapi import FastAPI
from pydantic import BaseModel

from services.solana import profile_wallet
from services.scoring import score_wallet
from services.extract import extract_solana_wallets

app = FastAPI(title="Crypto Module")

class TraceReq(BaseModel):
    wallet: str
    limit: int = 20

@app.post("/trace")
def trace(req: TraceReq):
    profile = profile_wallet(req.wallet, limit=req.limit)
    edges = []
    for cp in profile.get("top_counterparties", []):
        edges.append({
            "from": req.wallet,
            "to": cp["wallet"],
            "count": cp["count"]
        })

    return {
        "wallet": req.wallet,
        "nodes": [req.wallet] + [c["wallet"] for c in profile.get("top_counterparties", [])],
        "edges": edges
    }