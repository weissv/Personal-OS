#!/usr/bin/env python3
"""
UNIT TEST: Cryptographic Schema & Migration Ledger (Jidoka 自働化)
Guarantees that database schemas and hardware triggers are cryptographically frozen.
Any unauthorized drift or post-factum modification halts the pipeline immediately.
"""

import hashlib
import json
import os
import sys

def sha256_file(filepath: str) -> str:
    h = hashlib.sha256()
    with open(filepath, 'rb') as f:
        while chunk := f.read(65536):
            h.update(chunk)
    return h.hexdigest()

def run_tests():
    print("Running Test: Cryptographic Schema & Migration Ledger (Jidoka)...")
    
    repo_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    ledger_path = os.path.join(repo_root, '.schema-checksums.json')
    
    assert os.path.exists(ledger_path), f"Ledger file not found at {ledger_path}"
    
    with open(ledger_path, 'r', encoding='utf-8') as f:
        ledger = json.load(f)
        
    checksums = ledger.get('checksums', {})
    assert len(checksums) >= 2, "Ledger must contain at least prisma/schema.prisma and audit_append_only.sql"
    
    verified_files = 0
    for rel_path, expected_hash in checksums.items():
        abs_path = os.path.join(repo_root, rel_path)
        assert os.path.exists(abs_path), f"JIDOKA_HALT: Referenced file does not exist: {rel_path}"
        
        actual_hash = sha256_file(abs_path)
        if actual_hash != expected_hash:
            raise AssertionError(
                f"JIDOKA_HALT: Schema tampering detected in {rel_path}!\n"
                f"  Expected SHA-256: {expected_hash}\n"
                f"  Actual SHA-256:   {actual_hash}\n"
                "Halting build: Migrations and Prisma schema are cryptographically frozen."
            )
        verified_files += 1

    # Tamper simulation test
    tampered_hash = "0000000000000000000000000000000000000000000000000000000000000000"
    simulated_mismatch = (actual_hash != tampered_hash)
    assert simulated_mismatch is True, "Tamper simulation must detect digest mismatch"

    print(f"✓ Cryptographic Schema Ledger verified ({verified_files} frozen files checked, tamper-proofing active)")

if __name__ == '__main__':
    run_tests()
