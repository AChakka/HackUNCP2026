import subprocess
import os

RULES_DIR = "config/yara_rules"

def run_yara(file_path):
    """
    Runs YARA rules against a file and returns the raw output.
    """
    rules = [os.path.join(RULES_DIR, r) for r in os.listdir(RULES_DIR) if r.endswith(".yar")]

    results = {}

    for rule_file in rules:
        try:
            cmd = ["yara", rule_file, file_path]
            output = subprocess.run(cmd, capture_output=True, text=True)
            results[rule_file] = output.stdout.strip()
        except Exception as e:
            results[rule_file] = f"Error: {e}"

    return results