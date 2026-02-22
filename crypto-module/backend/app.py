import time

from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from services.solana import profile_wallet, multihop_trace
from services.scoring import classify_wallet
from services.extract import extract_solana_wallets
from services.labels import lookup_label, batch_lookup
from services.tokens import get_token_holdings

app = FastAPI(title="Coroner — Crypto Forensics Module")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class TraceReq(BaseModel):
    wallet: str
    limit: int = 5


class ReportReq(BaseModel):
    wallet: str
    limit: int = 5


class TokenReq(BaseModel):
    wallet: str


class MultihopReq(BaseModel):
    wallet: str
    hops: int = 2
    limit: int = 2


class LabelReq(BaseModel):
    addresses: list[str]


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

    now = int(time.time())
    txc = profile.get("tx_count", 0)
    unique = profile.get("unique_counterparties", 0)
    newest_ts = profile.get("newest_timestamp")
    oldest_ts = profile.get("oldest_timestamp")
    time_spread = profile.get("time_spread_seconds")
    top = profile.get("top_counterparties", [])[:5]

    # Last seen
    if newest_ts:
        days_ago = (now - newest_ts) / 86400
        if days_ago < 1:
            last_seen = "last active within the past 24 hours"
        elif days_ago < 7:
            last_seen = f"last active {int(days_ago)} day(s) ago"
        else:
            last_seen = f"last active {int(days_ago)} days ago"
    else:
        last_seen = "activity timestamp unavailable"

    # Wallet age
    if oldest_ts:
        age_days = (now - oldest_ts) / 86400
        age_str = f"{int(age_days)} days" if age_days >= 1 else "less than 1 day"
        age_ctx = f"On-chain history in this sample spans {age_str}."
    else:
        age_ctx = ""

    # Activity density
    if time_spread and time_spread > 0 and txc > 1:
        rate = txc / max(time_spread / 3600, 0.01)
        if rate > 10:
            density = "extremely high frequency (>10 tx/hr)"
        elif rate > 1:
            density = f"~{rate:.1f} tx/hr"
        else:
            density = f"~{(txc / max(time_spread / 86400, 0.01)):.1f} tx/day"
        density_ctx = f"Transaction rate in sampled window: {density}."
    else:
        density_ctx = ""

    # Repeat vs scatter
    if top:
        max_count = top[0]["count"]
        if max_count >= 3:
            repeat_ctx = f"Top counterparty interacted {max_count}x — repeated contact suggests ongoing relationship."
        elif all(c["count"] == 1 for c in top):
            repeat_ctx = "All counterparties contacted exactly once — no repeated relationships in this sample."
        else:
            repeat_ctx = ""
    else:
        repeat_ctx = "No counterparty data available."

    # Clean verdict
    if not flags:
        verdict = "No suspicious indicators detected in this sample. Consistent with ordinary user behavior."
    elif label == "HIGH":
        verdict = "Multiple high-risk indicators present. This wallet warrants further manual review."
    elif label == "MEDIUM":
        verdict = "Elevated risk indicators detected. Treat as a person of interest pending further evidence."
    else:
        verdict = "Low-risk profile based on available data. No strong indicators of illicit activity."

    summary = (
        f"Sample of {txc} transaction(s) from wallet {req.wallet[:8]}... — {last_seen}. "
        f"Identified {unique} unique counterpart wallet(s) after filtering known infrastructure. "
        f"{age_ctx} {density_ctx} {repeat_ctx} {verdict}"
    ).strip()

    # Enrich counterparties with on-chain labels
    top_with_labels = []
    for cp in profile.get("top_counterparties", []):
        entry = {"wallet": cp["wallet"], "count": cp["count"]}
        lbl = lookup_label(cp["wallet"])
        if lbl:
            entry["label"]       = lbl["label"]
            entry["category"]    = lbl["category"]
            entry["label_color"] = lbl["color"]
        top_with_labels.append(entry)

    # Pump.fun flag — add to flags list if detected
    pumpfun = profile.get("pumpfun_activity", False)
    if pumpfun and "Pump.fun activity detected" not in flags:
        flags = list(flags) + ["Pump.fun memecoin activity detected in sampled transactions"]

    return {
        "wallet": req.wallet,
        "balance_sol": profile.get("balance_sol"),
        "summary": summary,
        "pumpfun_activity": pumpfun,
        "risk": {
            "score":       score,
            "label":       label,
            "flags":       flags,
            "wallet_type": wallet_type,
        },
        "profile": {
            "tx_count":            profile.get("tx_count"),
            "unique_counterparties": profile.get("unique_counterparties"),
            "top_counterparties":  top_with_labels,
            "recent_transactions": profile.get("recent_transactions", []),
            "oldest_timestamp":    profile.get("oldest_timestamp"),
            "newest_timestamp":    profile.get("newest_timestamp"),
        }
    }


@app.post("/tokens")
def tokens(req: TokenReq):
    return get_token_holdings(req.wallet)


@app.post("/multihop")
def multihop(req: MultihopReq):
    return multihop_trace(req.wallet, hops=min(req.hops, 2), limit=min(req.limit, 3))


@app.post("/labels")
def labels(req: LabelReq):
    return batch_lookup(req.addresses)


@app.post("/scan-file")
async def scan_file(file: UploadFile = File(...)):
    raw = await file.read()
    text = raw.decode("utf-8", errors="ignore")

    wallets = extract_solana_wallets(text)

    if not wallets:
        return {"found": 0, "results": []}

    results = []
    for wallet in wallets[:5]:  # cap at 5, 3 tx each to stay under rate limits
        try:
            profile = profile_wallet(wallet, limit=3)
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
