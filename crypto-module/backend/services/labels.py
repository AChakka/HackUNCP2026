"""
Known on-chain entity labels for Solana forensics.
Covers exchanges, exploiters, bridges, DEX protocols, and pump.fun.
"""

LABELS = {
    # ── DEX / DeFi Protocols ──────────────────────────────────────────
    "JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4": {"label": "Jupiter v6",        "category": "protocol"},
    "whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc":  {"label": "Orca Whirlpool",     "category": "protocol"},
    "675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8": {"label": "Raydium AMM v4",     "category": "protocol"},
    "9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin": {"label": "Serum DEX v3",       "category": "protocol"},
    "M2mx93ekt1fmXSVkTrUL9xVFHkmME8HTUi5Cyc5aF7K":  {"label": "Magic Eden v2",      "category": "protocol"},
    "srmqPvymJeFKQ4zGQed1GFppgkRHL9kaELCbyksJtPX":  {"label": "OpenBook DEX",       "category": "protocol"},
    "MarBmsSgKXdrN1egZf5sqe1TMai9K1rChYNDJgjq7aD":  {"label": "Marinade Finance",   "category": "protocol"},
    "mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So":  {"label": "mSOL Token",         "category": "protocol"},
    "So11111111111111111111111111111111111111112":    {"label": "Wrapped SOL",        "category": "protocol"},
    "DjVE6JNiYqPL2QXyCUUh8rNjHrbz9hXHNYt99MQ59qw1": {"label": "Orca v1 Pool",       "category": "protocol"},
    "EhhTKczWKXBC7cMBEaLkKd4NbVv8DgFB9JdnDYrjp7kZ": {"label": "Jito Staking Pool",  "category": "protocol"},
    "Jito4APyf642JPzcbhAbFNQTkRGCRDBrFKq6GsL6675":  {"label": "Jito Tip Router",    "category": "protocol"},
    "DRiP2Pn2K6fuMLKQmt5rZWyHiUZ6WK3GChEySUpHSS4":  {"label": "Drip Protocol",      "category": "protocol"},
    "SWiMDJYFUGj6cPrQ6QYYYWZtvXQdRChSVAygDZDsCHC":  {"label": "Swim Protocol",      "category": "protocol"},
    "CAMMCzo5YL8w4VFF8KVHrK22GGUsp5VTaW7grrKgrWqK": {"label": "Raydium CLMM",       "category": "protocol"},
    "LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo":  {"label": "Meteora DLMM",       "category": "protocol"},

    # ── System Programs ───────────────────────────────────────────────
    "11111111111111111111111111111111":               {"label": "System Program",     "category": "protocol"},
    "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA":  {"label": "SPL Token Program",  "category": "protocol"},
    "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL": {"label": "ATA Program",        "category": "protocol"},
    "ComputeBudget111111111111111111111111111111":    {"label": "Compute Budget",     "category": "protocol"},
    "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s":  {"label": "Metaplex Meta",      "category": "protocol"},
    "BPFLoaderUpgradeab1e11111111111111111111111":   {"label": "BPF Loader",         "category": "protocol"},

    # ── Pump.fun ──────────────────────────────────────────────────────
    "6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P":  {"label": "Pump.fun",           "category": "pumpfun"},
    "TSLvdd1pWpHVjahSpsvCXUbgwsL3JAcvokwaKt1eokM":  {"label": "Pump.fun Fee Acct",  "category": "pumpfun"},

    # ── Bridges ───────────────────────────────────────────────────────
    "wormDTUJ6AWPNvk59vGQbDvGJmqbDTdgWgAqcLBCgUb":  {"label": "Wormhole Bridge",    "category": "bridge"},
    "3u8hJUVTA4jH1wYAyUur7FFZVQ8H635K3tSHHF4ssjQ5": {"label": "Allbridge Core",     "category": "bridge"},
    "EqtbVJNFJTqFPMvVB3UEpBBTfPn4YE3e6GxGMnqrqGnZ": {"label": "deBridge",           "category": "bridge"},
    "rFqFJ9g7TGBD8Ed7TPDnvGKZ5pWLPDyxLcvcH2eRCtt":  {"label": "Mayan Finance",      "category": "bridge"},

    # ── Centralized Exchanges ─────────────────────────────────────────
    "FpCMFDFGYotvufJ7dVFj6dFHJ6UNhGkwez4L5SNhFCeL": {"label": "Binance Hot Wallet", "category": "exchange"},
    "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM": {"label": "Binance Deposit",    "category": "exchange"},
    "H8sMJSCQxfKiFTCfDR3DUMLPwcRbM61LGFJ8N4dK3WjS": {"label": "Kraken",             "category": "exchange"},
    "2ojv9BAiHUrvsm9gxDe7fJSzbNZSJcxZvf8dqmWGHG8S": {"label": "OKX Deposit",        "category": "exchange"},
    "GJRs4FwHtemZ5ZE9x3FNvJ8TMwitKTh21yxdRPqn7npE": {"label": "Coinbase",           "category": "exchange"},
    "AobVSwjFTkByBrFNnvhpZSHSYPdDMFkGRkEQP8dCArdZ": {"label": "Bybit",              "category": "exchange"},
    "5tzFkiKscXHK5ZXCGbGuNgB7toZNgeTjJ5ecnpjHtHRv": {"label": "Kraken 2",           "category": "exchange"},
    "GugU1tP7doLeTw9hQP51xRJyS8Da1fWxuiy2rVrnMD58": {"label": "Gate.io",            "category": "exchange"},
    "GJRs4FwHtemZ5ZE9x3FNvJ8TMwitKTh21yxdRPqn7npE": {"label": "Coinbase Prime",     "category": "exchange"},
    "HTCKSnsgcKnCQqXa7M5gUHiPHNSANnH4EWJA4xV22pxR": {"label": "FTX (Defunct)",      "category": "exchange"},

    # ── Known Exploiters / Hackers ────────────────────────────────────
    "CakcnaRDHka2gXyfxNwZEKhUZW4pMEvkTOEBMZMpwHkH": {"label": "Mango Exploiter",    "category": "exploiter"},
    "vines1vzrYbzLMRdu58ou5XTby4qAqVRLmqo36NKPTg":  {"label": "Wormhole Hack",      "category": "exploiter"},
    "EWjFENjQJeEKFMeA7EHK31gZXMdBGNBbJKBMWANKmxPG": {"label": "Slope Hack",         "category": "exploiter"},
    "HQSRGVYxJCHFDwUooBMc16E1e3T6jcFf6YXsTKzjTmW":  {"label": "Cashio Exploiter",   "category": "exploiter"},
    "9vAhrXxNhU4TvL2pBdDHrPaMSYu4HsxjTpobU4Sv3NCk": {"label": "Flagged Scammer",    "category": "exploiter"},
    "3fTR8GGL2mniGyHtd3Qy2KDVhZ9LHbW59rCc7A3RtMWo": {"label": "Crema Exploiter",    "category": "exploiter"},
}

PUMPFUN_PROGRAM = "6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P"

CATEGORY_COLOR = {
    "exchange":  "#2563eb",
    "exploiter": "#c0392b",
    "bridge":    "#7c3aed",
    "mixer":     "#dc2626",
    "protocol":  "#16a34a",
    "pumpfun":   "#ea580c",
}


def lookup_label(address: str) -> dict | None:
    entry = LABELS.get(address)
    if not entry:
        return None
    return {
        "label":    entry["label"],
        "category": entry["category"],
        "color":    CATEGORY_COLOR.get(entry["category"], "#555"),
    }


def batch_lookup(addresses: list[str]) -> dict:
    """Return a dict of address -> label info for all known addresses."""
    return {addr: lookup_label(addr) for addr in addresses if lookup_label(addr)}
