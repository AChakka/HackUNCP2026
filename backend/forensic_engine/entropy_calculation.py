import sys
import math
import json
from collections import Counter
import pefile

def calculate_entropy(data: bytes) -> float:
    """
    Calculate the Shannon Entropy of a byte array.
    Returns a float between 0.0 and 8.0.
    """
    if not data:
        return 0.0
    
    entropy = 0.0
    length = len(data)
    
    # Count frequency of each byte
    byte_counts = Counter(data)
    
    for count in byte_counts.values():
        p_x = count / length
        entropy += - p_x * math.log2(p_x)
        
    return entropy

def get_risk_level(entropy: float) -> str:
    """
    Determine the risk level based on the entropy score.
    """
    if entropy < 6.0:
        return "Low (Likely plain text or standard code)"
    elif 6.0 <= entropy <= 7.2:
        return "Medium (Potentially compressed or packed)"
    else:
        return "High (High risk of encryption/malware)"

def analyze_pe_file(file_path: str) -> dict:
    """
    Parse a PE file and calculate entropy for each section.
    Returns a dictionary of the analysis results.
    """
    result = {
        "file": file_path,
        "status": "success",
        "sections": [],
        "error": None
    }
    
    try:
        with open(file_path, "rb") as bf:
            header = bf.read(2)
            if header != b"MZ":
                result["status"] = "skipped"
                result["error"] = f"'{file_path}' is not a valid PE file (missing MZ header). Skipping entropy calculation."
                return result

        # pefile.PE will read the file in binary mode
        try:
            pe = pefile.PE(file_path)
        except pefile.PEFormatError as e:
            result["status"] = "error"
            result["error"] = f"'{file_path}' is not a valid PE (Portable Executable) file. ({e})"
            return result
            
        for section in pe.sections:
            # Decode section name and remove null bytes
            section_name = section.Name.decode('utf-8', errors='ignore').rstrip('\x00')
            # Extract the raw bytes of the section
            section_data = section.get_data()
            
            if not section_data:
                entropy = 0.0
            else:
                entropy = calculate_entropy(section_data)
                
            risk = get_risk_level(entropy)
            result["sections"].append({
                "name": section_name,
                "entropy": round(entropy, 4),
                "risk_level": risk
            })
            
    except FileNotFoundError:
        result["status"] = "error"
        result["error"] = f"File '{file_path}' was not found. Please check the path and try again."
    except PermissionError:
        result["status"] = "error"
        result["error"] = f"Permission denied. Cannot access '{file_path}'. Check your file permissions."
    except Exception as e:
        result["status"] = "error"
        result["error"] = f"An unexpected error occurred during analysis: {e}"

    return result

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python entropy_analysis.py <path_to_pe_file>")
        sys.exit(1)
        
    target_file = sys.argv[1]
    analysis_result = analyze_pe_file(target_file)
    print(json.dumps(analysis_result, indent=2))
