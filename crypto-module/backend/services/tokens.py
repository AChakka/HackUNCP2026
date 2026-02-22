"""
SPL token holdings fetcher.
Uses getTokenAccountsByOwner to list all non-zero token balances.
"""

import requests
from services.labels import PUMPFUN_PROGRAM, lookup_label

SOLANA_RPC = "https://api.mainnet-beta.solana.com"
TOKEN_PROGRAM = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"


def get_token_holdings(wallet: str) -> dict:
    """Return all SPL token balances for the given wallet address."""
    payload = {
        "jsonrpc": "2.0",
        "id": 1,
        "method": "getTokenAccountsByOwner",
        "params": [
            wallet,
            {"programId": TOKEN_PROGRAM},
            {"encoding": "jsonParsed"},
        ],
    }
    try:
        r = requests.post(SOLANA_RPC, json=payload, timeout=12)
        r.raise_for_status()
        accounts = r.json().get("result", {}).get("value", [])

        tokens = []
        for acc in accounts:
            info = (
                acc.get("account", {})
                   .get("data", {})
                   .get("parsed", {})
                   .get("info", {})
            )
            mint = info.get("mint", "")
            amt_info = info.get("tokenAmount", {})
            ui_amount = amt_info.get("uiAmount")
            decimals = amt_info.get("decimals", 0)

            if ui_amount and float(ui_amount) > 0:
                entry = {
                    "mint":     mint,
                    "amount":   float(ui_amount),
                    "decimals": decimals,
                }
                # attach label if known
                lbl = lookup_label(mint)
                if lbl:
                    entry["label"]    = lbl["label"]
                    entry["category"] = lbl["category"]
                tokens.append(entry)

        # sort by amount descending
        tokens.sort(key=lambda t: t["amount"], reverse=True)

        return {
            "tokens": tokens,
            "count":  len(tokens),
        }

    except Exception as e:
        return {"tokens": [], "count": 0, "error": str(e)}
