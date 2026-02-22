"""
Ransom Note Analyzer
====================
Loads two pre-trained scikit-learn models:
  1. Ransomware family classifier  (TF-IDF + LinearSVC + Calibrated)
  2. English dialect classifier    (TF-IDF + LinearSVC + Calibrated)

Also performs heuristic signal extraction (urgency, threats, payment
terms, IOCs) on the raw text.
"""

import re
import json
import joblib
from pathlib import Path

# Models live two levels above ransom-module/backend/services/
MODELS_DIR = Path(__file__).resolve().parents[3] / "models"

_family_model = None
_dialect_model = None
_dialect_meaning = None

DIALECT_FULL = {
    "us": "American English",
    "gb": "British English",
    "au": "Australian English",
    "ie": "Irish English",
    "in": "Indian English",
}

URGENCY_WORDS = [
    "immediately", "urgent", "deadline", "hours", "days",
    "expire", "warning", "attention", "critical", "asap",
    "hurry", "limited time", "act now", "do not wait",
]
PAYMENT_WORDS = [
    "bitcoin", "btc", "monero", "xmr", "ethereum", "eth",
    "payment", "pay", "wallet", "transfer", "ransom",
    "decrypt", "decryption", "key", "usd", "dollar", "crypto",
]
THREAT_WORDS = [
    "delete", "destroy", "publish", "leak", "expose",
    "forever", "permanently", "corrupt", "encrypt", "locked",
    "stolen", "breach", "dark web", "never recover",
]


def _ensure_loaded():
    global _family_model, _dialect_model, _dialect_meaning

    if _family_model is not None:
        return

    _family_model = joblib.load(MODELS_DIR / "group" / "ransom_family_model.joblib")
    _dialect_model = joblib.load(MODELS_DIR / "dialect" / "english_variety_model.joblib")

    meta_path = MODELS_DIR / "dialect" / "english_variety_model.meta.json"
    with open(meta_path) as f:
        _dialect_meaning = json.load(f).get("meaning", {})


def _extract_iocs(text: str) -> dict:
    iocs = {}

    btc = re.findall(r"\b[13][a-km-zA-HJ-NP-Z1-9]{25,34}\b", text)
    if btc:
        iocs["bitcoin_addresses"] = list(set(btc))

    onion = re.findall(r"\b[a-z2-7]{16,56}\.onion\b", text, re.IGNORECASE)
    if onion:
        iocs["onion_urls"] = list(set(onion))

    emails = re.findall(r"\b[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}\b", text)
    if emails:
        iocs["emails"] = list(set(emails))

    xmr = re.findall(r"\b4[0-9AB][1-9A-HJ-NP-Za-km-z]{93}\b", text)
    if xmr:
        iocs["monero_addresses"] = list(set(xmr))

    return iocs


def analyze_ransom_note(text: str) -> dict:
    _ensure_loaded()

    text = text.strip()
    if not text:
        return {"error": "No text provided"}

    # ── Family classification ──────────────────────────────────────────────
    family_classes = list(_family_model.classes_)
    family_probs   = _family_model.predict_proba([text])[0]
    family_scores  = {
        cls: round(float(p), 4)
        for cls, p in zip(family_classes, family_probs)
    }
    top_family     = max(family_scores, key=family_scores.get)

    # ── Dialect classification ─────────────────────────────────────────────
    dialect_classes = list(_dialect_model.classes_)
    dialect_probs   = _dialect_model.predict_proba([text])[0]
    dialect_scores  = {
        cls: round(float(p), 4)
        for cls, p in zip(dialect_classes, dialect_probs)
    }
    top_dialect     = max(dialect_scores, key=dialect_scores.get)
    dialect_label   = (_dialect_meaning or {}).get(top_dialect, top_dialect)

    # ── Heuristic signal extraction ────────────────────────────────────────
    text_lower = text.lower()
    words      = text_lower.split()

    urgency = [w for w in URGENCY_WORDS if w in text_lower]
    payment = [w for w in PAYMENT_WORDS if w in text_lower]
    threats = [w for w in THREAT_WORDS  if w in text_lower]

    urgency_score = min(100, len(urgency) * 12 + len(threats) * 15)

    iocs = _extract_iocs(text)

    # ── AI-powered extended analysis ──────────────────────────────────────
    ai = {}
    try:
        from services.ai_analysis import analyze_with_ai
        ai = analyze_with_ai(text)
    except Exception as e:
        ai = {"error": str(e)}

    return {
        "family": {
            "top":        top_family,
            "confidence": family_scores[top_family],
            "all_scores": dict(
                sorted(family_scores.items(), key=lambda x: -x[1])
            ),
        },
        "dialect": {
            "code":       top_dialect,
            "label":      DIALECT_FULL.get(top_dialect, dialect_label),
            "confidence": dialect_scores[top_dialect],
            "all_scores": dict(
                sorted(dialect_scores.items(), key=lambda x: -x[1])
            ),
        },
        "heuristics": {
            "word_count":       len(words),
            "char_count":       len(text),
            "urgency_keywords": urgency,
            "payment_keywords": payment,
            "threat_keywords":  threats,
            "urgency_score":    urgency_score,
            "iocs":             iocs,
        },
        "ai_analysis": ai,
    }
