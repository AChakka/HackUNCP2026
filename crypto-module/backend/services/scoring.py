import time


def classify_wallet(profile: dict):
    score = 0
    flags = []

    txc = profile.get("tx_count", 0)
    unique = profile.get("unique_counterparties", 0)
    top = profile.get("top_counterparties", [])
    time_spread = profile.get("time_spread_seconds")
    oldest_ts = profile.get("oldest_timestamp")

    # --- Volume ---
    if txc >= 40:
        score += 40
        flags.append("High transaction volume")
    elif txc >= 15:
        score += 20
        flags.append("Moderate transaction volume")
    elif txc >= 5:
        score += 8
        flags.append("Some recent activity")

    # --- High churn: many unique counterparties relative to tx count ---
    if txc > 0 and unique / txc > 0.85:
        score += 20
        flags.append("High counterparty churn (potential mixer or scammer)")

    # --- Burst activity: many txs in a very short window ---
    if time_spread is not None and txc >= 10 and time_spread < 300:
        score += 25
        flags.append("Burst activity — high tx rate in short window")

    # --- Pass-through: every counterparty appears only once ---
    if top and all(c["count"] == 1 for c in top) and txc >= 5:
        score += 15
        flags.append("Pass-through pattern — no repeated counterparties")

    # --- New wallet: only recent history ---
    now = int(time.time())
    if oldest_ts and (now - oldest_ts) < 60 * 60 * 24 * 7:  # less than 7 days old
        score += 10
        flags.append("New wallet — less than 7 days of on-chain history")

    # --- Low info: no real counterparties after program filter ---
    if unique == 0 and txc > 0:
        score += 5
        flags.append("No real wallet counterparties found (infra-only activity)")

    score = min(score, 100)

    label = "LOW"
    if score >= 70:
        label = "HIGH"
    elif score >= 35:
        label = "MEDIUM"

    # Behavioral type
    if "Burst activity" in " ".join(flags) and "churn" in " ".join(flags):
        wallet_type = "LIKELY MIXER / AUTOMATED"
    elif "Pass-through" in " ".join(flags):
        wallet_type = "PASS-THROUGH / RELAY"
    elif "New wallet" in " ".join(flags):
        wallet_type = "NEW / UNESTABLISHED"
    elif txc == 0:
        wallet_type = "DORMANT"
    elif label == "HIGH":
        wallet_type = "HIGH ACTIVITY — REVIEW REQUIRED"
    else:
        wallet_type = "NORMAL USER"

    return score, label, flags, wallet_type


# kept for backwards compat
def score_wallet(profile: dict):
    score, label, flags, _ = classify_wallet(profile)
    return score, flags, label
