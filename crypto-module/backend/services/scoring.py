def score_wallet(profile: dict):
    score = 0
    flags = []

    txc = profile.get("tx_count_sampled", 0)

    if txc >= 40:
        score += 40
        flags.append("High transaction volume (sampled)")

    if txc >= 15:
        score += 25
        flags.append("Active wallet")

    score = min(score, 100)

    label = "LOW"
    if score >= 75:
        label = "HIGH"
    elif score >= 40:
        label = "MEDIUM"

    return score, flags, label