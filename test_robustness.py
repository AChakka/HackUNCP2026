import os
import json
import asyncio
from backend.forensic_engine.logparser import parse_log
from backend.forensic_engine.entropy_calculation import analyze_pe_file
from backend.forensic_engine.steganography import analyze_steganography
from backend.forensic_engine.metadata import extract_metadata

def create_test_files():
    # 1. Empty file
    open("test_empty.txt", "w").close()
    
    # 2. 1GB massive file (Sparse file so it takes no actual disk space)
    with open("test_massive.log", "wb") as f:
        f.truncate(1024 * 1024 * 1024) # 1GB
        
    # 3. Corrupted PE file
    with open("test_corrupt.exe", "wb") as f:
        f.write(b"MZ" + b"\x00" * 1000 + b"random_garbage")

    # 4. Binary file passed to log parser
    with open("test_binary.log", "wb") as f:
        f.write(b"\x00\x01\x02\x03\x04\x05\x06")
        
    # 5. Massive Image file > 50MB
    with open("test_massive.jpg", "wb") as f:
        f.truncate(60 * 1024 * 1024)

def run_tests():
    print("--- 1. Testing Log Parser with massive 1GB file ---")
    res = parse_log("test_massive.log", max_lines=10)
    print(res)
    
    print("\n--- 2. Testing Log Parser with binary data ---")
    res = parse_log("test_binary.log")
    print(res)
    
    print("\n--- 3. Testing Entropy with Corrupted PE ---")
    res = analyze_pe_file("test_corrupt.exe")
    print(res)
    
    print("\n--- 4. Testing Steganography with 60MB file ---")
    res = analyze_steganography("test_massive.jpg")
    print(res)
    
    print("\n--- 5. Testing Metadata with Empty file ---")
    res = asyncio.run(extract_metadata("test_empty.txt"))
    print(res)
    
    print("\n--- 6. Testing Invalid File Paths ---")
    res = analyze_steganography("does_not_exist.jpg")
    res2 = asyncio.run(extract_metadata("does_not_exist.txt"))
    res3 = parse_log("does_not_exist.log")
    print("- Stego:", res)
    print("- Metadata:", res2)
    print("- Log:", res3)

if __name__ == "__main__":
    create_test_files()
    try:
        run_tests()
    finally:
        # Cleanup
        for f in ["test_empty.txt", "test_massive.log", "test_corrupt.exe", "test_binary.log", "test_massive.jpg"]:
            if os.path.exists(f):
                os.remove(f)
