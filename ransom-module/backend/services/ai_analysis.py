"""
OpenAI-powered ransom note analysis.
Returns structured categories that complement the sklearn models.
"""

import os
import json
from openai import OpenAI

_client = None


def _get_client():
    global _client
    if _client is None:
        _client = OpenAI(api_key=os.environ["OPENAI_API_KEY"])
    return _client


SYSTEM_PROMPT = """You are a cybersecurity forensics analyst specializing in ransomware attribution.
Analyze the provided ransom note and return ONLY a valid JSON object with exactly these fields:

{
  "threat_actor_profile": "one sentence describing likely actor type/group characteristics",
  "sophistication": one of ["Script Kiddie", "Low", "Medium", "High", "Nation-State"],
  "psychological_tactics": ["tactic1", "tactic2", ...],
  "attack_vector_hints": "what the note implies about initial access method, or null",
  "negotiation_likelihood": one of ["Very Likely", "Likely", "Unlikely", "Non-Negotiable"],
  "target_profile": one of ["Individual", "SMB", "Enterprise", "Critical Infrastructure", "Unknown"],
  "payment_deadline_hours": integer or null,
  "known_group_resemblance": "closest known ransomware group or 'Unknown'",
  "confidence_note": "brief reason for the above attribution"
}

Be concise. Return only the JSON, no markdown, no explanation."""


def analyze_with_ai(text: str) -> dict:
    try:
        client = _get_client()
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user",   "content": f"RANSOM NOTE:\n\n{text}"},
            ],
            temperature=0.2,
            max_tokens=400,
        )
        raw = response.choices[0].message.content.strip()
        # Strip markdown code fences if present
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        return json.loads(raw)
    except Exception as e:
        return {"error": str(e)}
