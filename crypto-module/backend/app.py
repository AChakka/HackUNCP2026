from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from services.solana import profile_wallet
from services.scoring import classify_wallet
from services.extract import extract_solana_wallets

app = FastAPI(title="Coroner — Crypto Forensics Module")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class TraceReq(BaseModel):
    wallet: str
    limit: int = 20


class ReportReq(BaseModel):
    wallet: str
    limit: int = 5


@app.post("/trace")
def trace(req: TraceReq):
    profile = profile_wallet(req.wallet, limit=req.limit)
    counterparties = profile.get("top_counterparties", [])

    edges = []
    for cp in counterparties:
        edges.append({
            "from": req.wallet,
            "to": cp["wallet"],
            "count": cp["count"]
        })

    return {
        "wallet": req.wallet,
        "nodes": [req.wallet] + [c["wallet"] for c in counterparties],
        "edges": edges,
        "tx_count": profile.get("tx_count"),
        "unique_counterparties": profile.get("unique_counterparties"),
    }


@app.post("/report")
def report(req: ReportReq):
    profile = profile_wallet(req.wallet, limit=req.limit)
    score, label, flags, wallet_type = classify_wallet(profile)

    top = profile.get("top_counterparties", [])[:5]
    top_str = (
        ", ".join([f"{t['wallet'][:6]}... ({t['count']} tx)" for t in top])
        if top else "none identified"
    )

    summary = (
        f"Wallet {req.wallet[:6]}... recorded {profile.get('tx_count', 0)} transactions "
        f"across {profile.get('unique_counterparties', 0)} unique counterparties in the sampled window. "
        f"Top counterparties: {top_str}. "
        f"Risk assessment: {label} (score {score}/100). "
        f"Behavioral classification: {wallet_type}. "
        f"Active flags: {', '.join(flags) if flags else 'none'}."
    )

    return {
        "wallet": req.wallet,
        "summary": summary,
        "risk": {
            "score": score,
            "label": label,
            "flags": flags,
            "wallet_type": wallet_type,
        },
        "profile": {
            "tx_count": profile.get("tx_count"),
            "unique_counterparties": profile.get("unique_counterparties"),
            "top_counterparties": profile.get("top_counterparties"),
        }
    }


@app.post("/scan-file")
async def scan_file(file: UploadFile = File(...)):
    raw = await file.read()
    text = raw.decode("utf-8", errors="ignore")

    wallets = extract_solana_wallets(text)

    if not wallets:
        return {"found": 0, "results": []}

    results = []
    for wallet in wallets[:10]:  # cap at 10 to avoid timeout
        try:
            profile = profile_wallet(wallet, limit=10)
            score, label, flags, wallet_type = classify_wallet(profile)
            results.append({
                "wallet": wallet,
                "risk": {"score": score, "label": label, "flags": flags, "wallet_type": wallet_type},
                "tx_count": profile.get("tx_count"),
                "unique_counterparties": profile.get("unique_counterparties"),
            })
        except Exception as e:
            results.append({"wallet": wallet, "error": str(e)})

    # sort by risk score descending
    results.sort(key=lambda x: x.get("risk", {}).get("score", 0), reverse=True)

    return {
        "found": len(wallets),
        "analyzed": len(results),
        "results": results,
    }
