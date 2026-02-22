import sys
import math
import json
from collections import Counter
import pefile

def calculate_entropy(data: bytes) -> float:
    """
    Calculate the Shannon Entropy of a small byte array (used for PE sections).
    """
    if not data:
        return 0.0
    
    entropy = 0.0
    length = len(data)
    byte_counts = Counter(data)
    
    for count in byte_counts.values():
        p_x = count / length
        entropy += - p_x * math.log2(p_x)
        
    return entropy

def calculate_file_entropy_chunked(file_path: str, chunk_size: int = 65536) -> float:
    """
    Calculates overall file entropy by reading in memory-safe chunks.
    This prevents Out-Of-Memory (OOM) errors on massive files like memory dumps or ISOs.
    """
    byte_counts = Counter()
    total_length = 0
    
    with open(file_path, 'rb') as f:
        # Read the file chunk by chunk (64KB default)
        for chunk in iter(lambda: f.read(chunk_size), b""):
            byte_counts.update(chunk)
            total_length += len(chunk)
            
    if total_length == 0:
        return 0.0
        
    entropy = 0.0
    for count in byte_counts.values():
        p_x = count / total_length
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
    Calculate overall file entropy and parse PE sections if applicable.
    Scalable and works on ANY file type.
    """
    result = {
        "file": file_path,
        "status": "success",
        "file_type": "unknown",
        "overall_entropy": 0.0,
        "overall_risk": "",
        "sections": [],
        "error": None
    }
    
    try:
        # 1. CALCULATE OVERALL ENTROPY SAFELY (Scalable to any file size)
        overall_ent = calculate_file_entropy_chunked(file_path)
        result["overall_entropy"] = round(overall_ent, 4)
        result["overall_risk"] = get_risk_level(overall_ent)
        
        # 2. ATTEMPT PE PARSING FOR SECTION DETAILS
        try:
            # Let pefile handle reading the file path directly to manage its own memory
            pe = pefile.PE(file_path)
            result["file_type"] = "pe_executable"
            
            for section in pe.sections:
                section_name = section.Name.decode('utf-8', errors='ignore').rstrip('\x00')
                section_data = section.get_data()
                
                ent = calculate_entropy(section_data) if section_data else 0.0
                    
                result["sections"].append({
                    "name": section_name,
                    "entropy": round(ent, 4),
                    "risk_level": get_risk_level(ent)
                })
                
        except pefile.PEFormatError:
            # 3. GRACEFUL FALLBACK FOR NON-EXECUTABLES
            result["file_type"] = "generic_file"
            result["error"] = "Not a valid PE file (no sections to analyze), but overall entropy was calculated."
            
    except FileNotFoundError:
        result["status"] = "error"
        result["error"] = f"File '{file_path}' was not found. Please check the path."
    except PermissionError:
        result["status"] = "error"
        result["error"] = f"Permission denied. Cannot access '{file_path}'."
    except Exception as e:
        result["status"] = "error"
        result["error"] = f"An unexpected error occurred during analysis: {str(e)}"

    return result

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python entropy_analysis.py <path_to_pe_file>")
        sys.exit(1)
        
    target_file = sys.argv[1]
    analysis_result = analyze_pe_file(target_file)
    print(json.dumps(analysis_result, indent=2))