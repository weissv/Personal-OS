#!/usr/bin/env python3
"""
MEZON SPRINT OS - MASTER TEST SUITE RUNNER
Executes all domain, cryptographic, RBAC, temporal, Poka-Yoke, Jidoka, UI/UX contracts, media, and design drift tests.
"""

import sys
import subprocess
import os

TEST_FILES = [
    ('Auth & HMAC-SHA256 Session Security', 'tests/test_auth_and_session.py'),
    ('Session Revocation & Lifecycle Management', 'tests/test_session_revocation.py'),
    ('Rate Limiter & IPv6 Subnetting (/64)', 'tests/test_rate_limit_and_ipv6.py'),
    ('Validation, Sanitization & Input Bounds', 'tests/test_validation_and_invariants.py'),
    ('Poka-Yoke Slot Lifecycle State Machine', 'tests/test_poka_yoke_state_machine.py'),
    ('Temporal Sprint & Tashkent Time Quantum', 'tests/test_temporal_sprint.py'),
    ('Selective Trust RBAC Matrix (Invariants I2 & I4)', 'tests/test_rbac_matrix.py'),
    ('Cryptographic Schema Ledger & Jidoka Tamper Halt', 'tests/test_migrations_frozen.py'),
    ('Frontend UI/UX Contracts & Routing Matrix', 'tests/test_frontend_contracts.py'),
    ('Media Serving, Lightbox & Traversal Defense', 'tests/test_media_serving.py'),
    ('Design Drift & Token Ratchet Audit', 'scripts/check_design_drift.py'),
]

print("======================================================================")
print("             MEZON SPRINT OS: COMPREHENSIVE TEST SUITE                ")
print("======================================================================")

passed = 0
failed = 0

for name, script_path in TEST_FILES:
    full_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), script_path)
    print(f"\n[SUITE] {name} ({script_path})")
    print("-" * 65)
    
    result = subprocess.run([sys.executable, full_path], capture_output=True, text=True)
    if result.returncode == 0:
        passed += 1
        print(result.stdout.strip())
        print(f"PASS: {name} ✓")
    else:
        failed += 1
        print(result.stdout)
        print(result.stderr)
        print(f"FAIL: {name} ✗")

print("\n" + "=" * 65)
print(f"FINAL TEST SUMMARY: {passed} PASSED | {failed} FAILED | TOTAL: {len(TEST_FILES)}")
print("=" * 65)

if failed == 0:
    print("\n>>> ALL SYSTEM INVARIANTS, JIDOKA, POKA-YOKE, UI CONTRACTS & MEDIA VERIFIED. STATUS: HEALTHY <<<\n")
    sys.exit(0)
else:
    print("\n>>> REGRESSION DETECTED. CHECK FAILURES ABOVE. <<<\n")
    sys.exit(1)
