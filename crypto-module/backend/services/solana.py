import requests
import time
from concurrent.futures import ThreadPoolExecutor, as_completed

SOLANA_RPC = "https://api.mainnet-beta.solana.com"
TX_CACHE = {}

KNOWN_PROGRAMS = {
    "11111111111111111111111111111111",
    "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
    "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL",
    "ComputeBudget111111111111111111111111111111",
    "Vote111111111111111111111111111111111111111h",
    "SysvarRent111111111111111111111111111111111",
    "SysvarC1ock11111111111111111111111111111111",
    "SysvarRecentB1ockHashes11111111111111111111",
    "BPFLoaderUpgradeab1e11111111111111111111111",
    "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s",
    "whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc",
    "9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin",
    "JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4",
}


def _looks_like_program(addr: str) -> bool:
    return addr in KNOWN_PROGRAMS


def get_balance(wallet):
    """Return current SOL balance as a float (converts from lamports)."""
    payload = {
        "jsonrpc": "2.0",
        "id": 1,
        "method": "getBalance",
        "params": [wallet],
    }
    try:
        r = requests.post(SOLANA_RPC, json=payload, timeout=5)
        r.raise_for_status()
        lamports = r.json().get("result", {}).get("value", 0)
        return round(lamports / 1_000_000_000, 4)
    except Exception:
        return None


def get_signatures(wallet, limit=5):
    payload = {
        "jsonrpc": "2.0",
        "id": 1,
        "method": "getSignaturesForAddress",
        "params": [wallet, {"limit": limit}]
    }
    r = requests.post(SOLANA_RPC, json=payload, timeout=10)
    r.raise_for_status()
    return r.json().get("result", [])


def get_transaction(signature, retries=2, backoff=0.5):
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
            r = requests.post(SOLANA_RPC, json=payload, timeout=8)

            if r.status_code == 429:
                time.sleep(backoff * (attempt + 1))
                continue

            r.raise_for_status()
            result = r.json().get("result")
            TX_CACHE[signature] = result
            return result

        except Exception:
            time.sleep(backoff * (attempt + 1))

    TX_CACHE[signature] = None
    return None


def _fetch_all_transactions(signatures):
    """Fetch all transactions in parallel."""
    results = {}
    with ThreadPoolExecutor(max_workers=3) as pool:
        future_to_sig = {pool.submit(get_transaction, sig): sig for sig in signatures}
        for future in as_completed(future_to_sig):
            sig = future_to_sig[future]
            try:
                results[sig] = future.result()
            except Exception:
                results[sig] = None
    return results


def _extract_accounts(tx_result):
    if not tx_result:
        return []

    tx = tx_result.get("transaction", {})
    msg = tx.get("message", {})
    keys = msg.get("accountKeys", [])

    accounts = []
    for k in keys:
        if isinstance(k, dict) and "pubkey" in k:
            accounts.append(k["pubkey"])
        elif isinstance(k, str):
            accounts.append(k)

    return accounts


def profile_wallet(wallet, limit=5):
    balance_sol = get_balance(wallet)
    sigs = get_signatures(wallet, limit)
    if not sigs:
        return {
            "wallet": wallet,
            "balance_sol": balance_sol,
            "tx_count": 0,
            "recent_transactions": [],
            "unique_counterparties": 0,
            "top_counterparties": [],
            "time_spread_seconds": None,
            "oldest_timestamp": None,
            "newest_timestamp": None,
        }

    sig_list = [s["signature"] for s in sigs]
    timestamps = [s.get("blockTime") for s in sigs if s.get("blockTime")]

    # fetch all txs in parallel
    tx_map = _fetch_all_transactions(sig_list)

    counterparty_counts = {}
    recent_transactions = []

    for s in sigs:
        sig = s["signature"]
        txr = tx_map.get(sig)
        accounts = _extract_accounts(txr)

        for a in accounts:
            if a != wallet and not _looks_like_program(a):
                counterparty_counts[a] = counterparty_counts.get(a, 0) + 1

        recent_transactions.append({
            "signature": sig,
            "timestamp": s.get("blockTime")
        })

    top = sorted(counterparty_counts.items(), key=lambda x: x[1], reverse=True)[:10]

    time_spread = None
    if len(timestamps) >= 2:
        time_spread = max(timestamps) - min(timestamps)

    return {
        "wallet": wallet,
        "balance_sol": balance_sol,
        "tx_count": len(recent_transactions),
        "recent_transactions": recent_transactions,
        "unique_counterparties": len(counterparty_counts),
        "top_counterparties": [{"wallet": w, "count": c} for w, c in top],
        "time_spread_seconds": time_spread,
        "oldest_timestamp": min(timestamps) if timestamps else None,
        "newest_timestamp": max(timestamps) if timestamps else None,
    }
