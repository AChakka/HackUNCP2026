# Coroner — Crypto Forensics Module

On-chain Solana wallet analysis engine. Traces transaction networks, scores wallets for suspicious behavior, and extracts wallet addresses from arbitrary files.

---

## Setup

```bash
cd backend
pip install fastapi uvicorn requests python-multipart
uvicorn app:app --reload
```

API runs at `http://localhost:8000`. Docs at `http://localhost:8000/docs`.

---

## Endpoints

### `POST /trace`
Returns a transaction graph (nodes + edges) for a wallet. Known Solana programs (System, SPL Token, Metaplex, Jupiter, etc.) are filtered out — only real wallet-to-wallet edges are returned.

```json
{
  "wallet": "WALLET_ADDRESS",
  "limit": 20
}
```

**Response**
```json
{
  "wallet": "...",
  "nodes": ["wallet_a", "wallet_b"],
  "edges": [{ "from": "wallet_a", "to": "wallet_b", "count": 3 }],
  "tx_count": 20,
  "unique_counterparties": 8
}
```

---

### `POST /report`
Returns a plain-English investigation summary and full risk breakdown.

```json
{
  "wallet": "WALLET_ADDRESS",
  "limit": 10
}
```

**Response**
```json
{
  "wallet": "...",
  "summary": "Wallet ABC123... recorded 14 transactions across 12 unique counterparties...",
  "risk": {
    "score": 65,
    "label": "MEDIUM",
    "flags": ["High counterparty churn (potential mixer or scammer)"],
    "wallet_type": "PASS-THROUGH / RELAY"
  },
  "profile": {
    "tx_count": 14,
    "unique_counterparties": 12,
    "top_counterparties": [...]
  }
}
```

---

### `POST /scan-file`
Upload any text file (log, dump, ransom note, CSV). Extracts all Solana wallet addresses, runs a report on each, and returns results sorted by risk score.

```
Content-Type: multipart/form-data
file: <your file>
```

**Response**
```json
{
  "found": 5,
  "analyzed": 5,
  "results": [
    {
      "wallet": "...",
      "risk": { "score": 80, "label": "HIGH", "flags": [...], "wallet_type": "LIKELY MIXER / AUTOMATED" },
      "tx_count": 38,
      "unique_counterparties": 35
    }
  ]
}
```

---

## Risk Scoring

Wallets are scored 0–100 and labeled `LOW`, `MEDIUM`, or `HIGH`.

| Signal | Points | Description |
|---|---|---|
| High volume (40+ tx) | +40 | High recent transaction count |
| Moderate volume (15+ tx) | +20 | Moderate recent activity |
| High churn | +20 | >85% of txs go to unique wallets — mixer/scam pattern |
| Burst activity | +25 | 10+ txs in under 5 minutes |
| Pass-through | +15 | Every counterparty appears exactly once |
| New wallet | +10 | Less than 7 days of on-chain history |

### Behavioral Classifications

| Type | Meaning |
|---|---|
| `LIKELY MIXER / AUTOMATED` | Burst + high churn detected |
| `PASS-THROUGH / RELAY` | Consistently routes funds with no repeat counterparties |
| `NEW / UNESTABLISHED` | Less than 7 days old |
| `DORMANT` | No transactions found |
| `HIGH ACTIVITY — REVIEW REQUIRED` | High score, no specific pattern |
| `NORMAL USER` | No significant flags |

---

## Program Filter

The following known Solana infrastructure addresses are excluded from all graph edges and counterparty counts:

- System Program
- SPL Token Program
- Associated Token Account Program
- Compute Budget Program
- Vote Program
- Sysvar accounts (Rent, Clock, RecentBlockhashes)
- BPF Loader
- Metaplex
- Orca Whirlpool
- Serum DEX
- Jupiter Aggregator

---

## File Structure

```
backend/
├── app.py                  # FastAPI routes (/trace, /report, /scan-file)
└── services/
    ├── solana.py           # Solana RPC, tx fetching, wallet profiling
    ├── scoring.py          # Risk scoring and behavioral classification
    └── extract.py          # Regex-based Solana address extraction from text
```
