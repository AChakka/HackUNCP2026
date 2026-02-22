import time


def classify_wallet(profile: dict):
    score = 0
    flags = []

    txc = profile.get("tx_count", 0)
    unique = profile.get("unique_counterparties", 0)
    top = profile.get("top_counterparties", [])
    time_spread = profile.get("time_spread_seconds")
    oldest_ts = profile.get("oldest_timestamp")
    newest_ts = profile.get("newest_timestamp")
    now = int(time.time())

    # --- Volume (don't flag low counts as meaningful) ---
    if txc >= 40:
        score += 40
        flags.append("High transaction volume in sampled window")
    elif txc >= 15:
        score += 20
        flags.append("Moderate transaction volume")

    # --- High churn: only meaningful with a real sample size ---
    if txc >= 10 and unique / txc > 0.85:
        score += 20
        flags.append("High counterparty churn — many unique destinations relative to tx count")

    # --- Burst activity: many txs in a very short window ---
    if time_spread is not None and txc >= 10 and time_spread < 300:
        score += 25
        flags.append("Burst activity — high tx rate in short window")

    # --- Pass-through: every counterparty appears only once (needs real sample) ---
    if top and all(c["count"] == 1 for c in top) and txc >= 8:
        score += 15
        flags.append("Pass-through pattern — no repeated counterparties across sampled txs")

    # --- New wallet ---
    if oldest_ts and (now - oldest_ts) < 60 * 60 * 24 * 7:
        score += 10
        flags.append("New wallet — less than 7 days of on-chain history")

    # --- Dormant wallet ---
    if newest_ts and txc > 0 and (now - newest_ts) > 60 * 60 * 24 * 180:
        days = int((now - newest_ts) / 86400)
        flags.append(f"Dormant — last on-chain activity {days} days ago")

    # --- No real counterparties ---
    if unique == 0 and txc > 0:
        score += 5
        flags.append("No real wallet counterparties found — infrastructure-only activity")

    score = min(score, 100)

    label = "LOW"
    if score >= 70:
        label = "HIGH"
    elif score >= 35:
        label = "MEDIUM"

    # Behavioral type
    flags_str = " ".join(flags)
    if "Burst activity" in flags_str and "churn" in flags_str:
        wallet_type = "LIKELY MIXER / AUTOMATED"
    elif "Pass-through" in flags_str:
        wallet_type = "PASS-THROUGH / RELAY"
    elif "New wallet" in flags_str:
        wallet_type = "NEW / UNESTABLISHED"
    elif "Dormant" in flags_str:
        wallet_type = "DORMANT"
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
