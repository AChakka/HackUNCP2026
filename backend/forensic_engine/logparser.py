"""
ForensIQ — Log Parser Tool
Path: backend/forensic_engine/log_parser.py

Standalone tool. Does not interact with any other tools.
Imported by mcp_server.py and registered as a callable tool for the Gemini agent.
Handles: auth.log, syslog, nginx/apache access logs, windows event logs
"""

import os
import re
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

# ── Regex patterns ─────────────────────────────────────────────────────────────

IP_PATTERN        = re.compile(r'\b(?:\d{1,3}\.){3}\d{1,3}\b')
EMAIL_PATTERN     = re.compile(r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}')
USER_PATTERN      = re.compile(r'(?:user|USER|User|username|Username|Account:)\s*[=:\s]+([a-zA-Z0-9_\-\.]+)')
TIMESTAMP_PATTERN = re.compile(
    r'(\d{4}-\d{2}-\d{2}[T\s]\d{2}:\d{2}:\d{2})'
    r'|(\w{3}\s+\d{1,2}\s+\d{2}:\d{2}:\d{2})'
    r'|(\d{2}/\w{3}/\d{4}:\d{2}:\d{2}:\d{2})'
)

FAILED_LOGIN_PATTERNS = [
    "failed password", "authentication failure", "invalid user",
    "failed login", "login failed", "invalid password", "bad password",
    "logon failure", "wrong password", "failure reason",
]

SUCCESS_LOGIN_PATTERNS = [
    "accepted password", "session opened", "logged in",
    "login successful", "authentication success", "logon success",
    "new session", "accepted publickey",
]

SUSPICIOUS_PATTERNS = [
    "exploit", "injection", "overflow", "attack", "malware", "virus",
    "backdoor", "rootkit", "brute", "scan", "probe", "payload",
    "suspicious", "anomaly", "unauthorized", "privilege", "escalat",
    "lateral", "mimikatz", "meterpreter", "cobalt", "shadow",
    "vssadmin", "bcdedit",
]


# ── Main tool function ─────────────────────────────────────────────────────────

async def parse_log(file_path: str, max_lines: int = 2000) -> dict:
    """
    Parse a log file and extract structured forensic information.
    Detects failed logins, successful logins, suspicious activity,
    IPs, usernames, and builds a timeline of notable events.
    """
    if not os.path.exists(file_path):
        return {"error": f"File not found: {file_path}"}

    path     = Path(file_path)
    log_type = _detect_log_type(path.name)

    ips               = {}
    users             = set()
    emails            = set()
    failed_logins     = []
    successful_logins = []
    suspicious_events = []
    timeline          = []
    error_count       = 0
    warning_count     = 0

    try:
        with open(file_path, "r", errors="replace") as f:
            lines = f.readlines()

        total_lines = len(lines)

        for i, line in enumerate(lines[:max_lines]):
            line = line.strip()
            if not line:
                continue

            line_lower = line.lower()

            for ip in IP_PATTERN.findall(line):
                ips[ip] = ips.get(ip, 0) + 1

            users.update(USER_PATTERN.findall(line))
            emails.update(EMAIL_PATTERN.findall(line))

            ts_match  = TIMESTAMP_PATTERN.search(line)
            timestamp = next((g for g in ts_match.groups() if g), None) if ts_match else None

            if "error"   in line_lower: error_count   += 1
            if "warning" in line_lower or "warn" in line_lower: warning_count += 1

            is_failed     = _matches(line_lower, FAILED_LOGIN_PATTERNS)
            is_success    = _matches(line_lower, SUCCESS_LOGIN_PATTERNS)
            is_suspicious = _matches(line_lower, SUSPICIOUS_PATTERNS)

            found_ips   = IP_PATTERN.findall(line)
            found_users = USER_PATTERN.findall(line)

            if is_failed:
                failed_logins.append({
                    "line": i + 1, "timestamp": timestamp,
                    "raw": line[:200], "ips": found_ips, "users": found_users,
                })
                if timestamp:
                    timeline.append({"timestamp": timestamp, "event": "FAILED_LOGIN", "detail": line[:150]})

            elif is_success:
                successful_logins.append({
                    "line": i + 1, "timestamp": timestamp,
                    "raw": line[:200], "ips": found_ips, "users": found_users,
                })
                if timestamp:
                    timeline.append({"timestamp": timestamp, "event": "SUCCESSFUL_LOGIN", "detail": line[:150]})

            elif is_suspicious and timestamp:
                suspicious_events.append({
                    "line": i + 1, "timestamp": timestamp,
                    "raw": line[:200], "ips": found_ips,
                })
                timeline.append({"timestamp": timestamp, "event": "SUSPICIOUS_ACTIVITY", "detail": line[:150]})

    except Exception as e:
        return {"error": str(e)}

    top_ips = dict(sorted(ips.items(), key=lambda x: x[1], reverse=True)[:10])

    result = {
        "filename":            path.name,
        "log_type":            log_type,
        "total_lines":         total_lines,
        "error_count":         error_count,
        "warning_count":       warning_count,
        "failed_login_count":  len(failed_logins),
        "failed_logins":       failed_logins[:50],
        "success_login_count": len(successful_logins),
        "successful_logins":   successful_logins[:50],
        "suspicious_count":    len(suspicious_events),
        "suspicious_events":   suspicious_events[:50],
        "unique_ips":          list(ips.keys())[:30],
        "top_ips":             top_ips,
        "unique_users":        list(users)[:20],
        "unique_emails":       list(emails)[:20],
        "timeline":            timeline[:100],
    }

    result["flags"] = _check_flags(result)
    return result


# ── Private helpers ────────────────────────────────────────────────────────────

def _matches(line: str, patterns: list) -> bool:
    return any(p in line for p in patterns)


def _detect_log_type(filename: str) -> str:
    name = filename.lower()
    if "auth"     in name: return "auth_log"
    if "access"   in name: return "web_access_log"
    if "nginx"    in name: return "nginx_log"
    if "apache"   in name: return "apache_log"
    if "error"    in name: return "error_log"
    if "syslog"   in name: return "syslog"
    if "security" in name: return "security_log"
    if "event"    in name: return "event_log"
    if "system"   in name: return "system_log"
    return "unknown"


def _check_flags(result: dict) -> list:
    flags   = []
    failed  = result["failed_login_count"]
    success = result["success_login_count"]
    top_ips = result["top_ips"]

    if failed >= 5:
        flags.append(f"BRUTE_FORCE: {failed} failed login attempts detected")

    if failed >= 5 and success >= 1:
        flags.append(f"POSSIBLE_COMPROMISE: {failed} failed logins followed by {success} successful login(s)")

    for ip, count in top_ips.items():
        if count >= 10:
            flags.append(f"HIGH_FREQUENCY_IP: {ip} appeared {count} times")

    if result["suspicious_count"] > 0:
        flags.append(f"SUSPICIOUS_ACTIVITY: {result['suspicious_count']} suspicious events detected")

    total = result["total_lines"]
    if total > 0 and result["error_count"] / total > 0.3:
        flags.append(f"HIGH_ERROR_RATE: {result['error_count']} errors out of {total} lines ({int(result['error_count']/total*100)}%)")

    return flags


# ── MCP tool declaration ───────────────────────────────────────────────────────

DECLARATION = {
    "name": "parse_log",
    "description": (
        "Parse a log file to extract failed logins, successful logins, "
        "suspicious events, IP addresses, usernames, emails, and a timeline "
        "of activity. Automatically flags brute force attempts, compromises, "
        "and high frequency IPs. Works on auth.log, syslog, nginx/apache "
        "access logs, and Windows event logs."
    ),
    "parameters": {
        "type": "object",
        "properties": {
            "file_path": {
                "type": "string",
                "description": "Absolute path to the log file to parse."
            },
            "max_lines": {
                "type": "integer",
                "description": "Maximum lines to parse. Defaults to 2000."
            }
        },
        "required": ["file_path"]
    }
}