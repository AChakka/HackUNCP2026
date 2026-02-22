def score_wallet(profile: dict):
    score = 0
    flags = []

    txc = profile.get("tx_count", 0)

    if txc >= 40:
        score += 60
        flags.append("High transaction volume (recent sample)")

    elif txc >= 15:
        score += 35
        flags.append("Moderate transaction volume (recent sample)")

    elif txc >= 5:
        score += 15
        flags.append("Some recent activity")

    # clamp
    score = min(score, 100)

    label = "LOW"
    if score >= 75:
        label = "HIGH"
    elif score >= 40:
        label = "MEDIUM"

    return score, flags, label