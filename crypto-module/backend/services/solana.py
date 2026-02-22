import requests

SOLANA_RPC = "https://api.mainnet-beta.solana.com"


# Get recent transaction signatures
def get_signatures(wallet, limit=20):

    payload = {
        "jsonrpc": "2.0",
        "id": 1,
        "method": "getSignaturesForAddress",
        "params": [
            wallet,
            {
                "limit": limit
            }
        ]
    }

    response = requests.post(SOLANA_RPC, json=payload)

    data = response.json()

    if "result" not in data:
        return []

    return data["result"]


# Get full transaction info
def get_transaction(signature):

    payload = {
        "jsonrpc": "2.0",
        "id": 1,
        "method": "getTransaction",
        "params": [
            signature,
            "json"
        ]
    }

    response = requests.post(SOLANA_RPC, json=payload)

    return response.json().get("result")


# Build forensic profile
def profile_wallet(wallet, limit=10):

    signatures = get_signatures(wallet, limit)

    transactions = []

    for sig in signatures:

        tx = get_transaction(sig["signature"])

        if tx:
            transactions.append({

                "signature": sig["signature"],

                "timestamp": sig.get("blockTime")

            })

    profile = {

        "wallet": wallet,

        "tx_count": len(transactions),

        "recent_transactions": transactions

    }

    return profile