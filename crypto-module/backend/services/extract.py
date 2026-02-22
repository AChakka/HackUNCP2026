import re

SOL_WALLET_REGEX = r"\b[1-9A-HJ-NP-Za-km-z]{32,44}\b"

def extract_solana_wallets(text: str):
    wallets = re.findall(SOL_WALLET_REGEX, text or "")
    # dedupe
    out, seen = [], set()
    for w in wallets:
        if w not in seen:
            seen.add(w)
            out.append(w)
    return out