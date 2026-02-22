import requests

# Public Solana RPC (rate-limited but fine for demos)
SOLANA_RPC = "https://api.mainnet-beta.solana.com"

def get_signatures(wallet: str, limit: int = 25):
    payload = {
        "jsonrpc": "2.0",
        "id": 1,
        "method": "getSignaturesForAddress",
        "params": [wallet, {"limit": limit}]
    }
    r = requests.post(SOLANA_RPC, json=payload, timeout=20)
    r.raise_for_status()
    return r.json().get("result", [])

def profile_wallet(wallet: str, limit: int = 25):
    sigs = get_signatures(wallet, limit=limit)
    last_ts = None
    for s in sigs:
        bt = s.get("blockTime")
        if bt and (last_ts is None or bt > last_ts):
            last_ts = bt

    return {
        "wallet": wallet,
        "tx_count_sampled": len(sigs),
        "last_activity_unix": last_ts
    }