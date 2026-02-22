import requests
import time
from requests.exceptions import HTTPError

SOLANA_RPC = "https://api.mainnet-beta.solana.com"
TX_CACHE = {}

def get_signatures(wallet, limit=20):
    payload = {
        "jsonrpc": "2.0",
        "id": 1,
        "method": "getSignaturesForAddress",
        "params": [wallet, {"limit": limit}]
    }
    r = requests.post(SOLANA_RPC, json=payload, timeout=20)
    r.raise_for_status()
    return r.json().get("result", [])


def get_transaction(signature, retries=3, backoff=0.7):

    # cache hit
    if signature in TX_CACHE:
        return TX_CACHE[signature]

    payload = {
        "jsonrpc": "2.0",
        "id": 1,
        "method": "getTransaction",
        "params": [signature, {"encoding": "jsonParsed", "maxSupportedTransactionVersion": 0}]
    }

    for attempt in range(retries):
        try:
            r = requests.post(SOLANA_RPC, json=payload, timeout=20)

            # rate limited
            if r.status_code == 429:
                time.sleep(backoff * (attempt + 1))
                continue

            r.raise_for_status()
            result = r.json().get("result")

            # store (even if None, so we don’t keep retrying a bad tx)
            TX_CACHE[signature] = result
            return result

        except HTTPError:
            time.sleep(backoff * (attempt + 1))
        except Exception:
            time.sleep(backoff * (attempt + 1))

    TX_CACHE[signature] = None
    return None


def _extract_accounts(tx_result):
    """
    Pull accounts involved in the tx from the message.accountKeys structure.
    Works for most parsed transactions.
    """
    if not tx_result:
        return []

    tx = tx_result.get("transaction", {})
    msg = tx.get("message", {})
    keys = msg.get("accountKeys", [])

    accounts = []
    for k in keys:
        # jsonParsed can return dicts or strings depending on node
        if isinstance(k, dict) and "pubkey" in k:
            accounts.append(k["pubkey"])
        elif isinstance(k, str):
            accounts.append(k)

    return accounts


def profile_wallet(wallet, limit=10):
    sigs = get_signatures(wallet, limit)

    recent_transactions = []
    counterparty_counts = {}

    for s in sigs:
        sig = s["signature"]
        txr = get_transaction(sig)

        accounts = _extract_accounts(txr)

        # count all accounts except the wallet itself
        for a in accounts:
            if a != wallet:
                counterparty_counts[a] = counterparty_counts.get(a, 0) + 1

        recent_transactions.append({
            "signature": sig,
            "timestamp": s.get("blockTime")
        })

    top = sorted(counterparty_counts.items(), key=lambda x: x[1], reverse=True)[:10]

    return {
        "wallet": wallet,
        "tx_count": len(recent_transactions),
        "recent_transactions": recent_transactions,
        "unique_counterparties": len(counterparty_counts),
        "top_counterparties": [{"wallet": w, "count": c} for w, c in top]
    }