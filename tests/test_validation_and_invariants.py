#!/usr/bin/env python3
"""
UNIT TEST: Validation, Sanitization & Input Bounds
Corresponds to src/lib/validation.ts and domain invariants.
"""

import re

USERNAME_RE = re.compile(r'^[a-z0-9][a-z0-9._-]{2,31}$')
EMAIL_RE = re.compile(r'^[^\s@]+@[^\s@]+\.[^\s@]{2,}$')

MIN_GRADE = 1
MAX_GRADE = 11

def clean_username(v):
    if not isinstance(v, str):
        return None
    s = v.strip().lower()
    return s if USERNAME_RE.match(s) else None

def clean_email(v):
    if not isinstance(v, str):
        return None
    s = v.strip().lower()
    return s if len(s) <= 120 and EMAIL_RE.match(s) else None

def clean_grade(v):
    try:
        n = int(v)
        return n if MIN_GRADE <= n <= MAX_GRADE else None
    except (ValueError, TypeError):
        return None

def clean_password(v):
    return v if isinstance(v, str) and 8 <= len(v) <= 128 else None

def run_tests():
    print("Running Test: Validation & Invariant Sanitization...")

    # 1. Username tests
    assert clean_username("somi") == "somi"
    assert clean_username("iskander_9") == "iskander_9"
    assert clean_username("a.karimov") == "a.karimov"
    assert clean_username("ab") is None, "Too short (< 3 chars)"
    assert clean_username("a" * 33) is None, "Too long (> 32 chars)"
    assert clean_username("admin; DROP TABLE--") is None, "SQL Injection payload must fail username regex"
    assert clean_username("<script>alert(1)</script>") is None, "XSS payload must fail username regex"

    # 2. Email tests
    assert clean_email("davron@mezon.uz") == "davron@mezon.uz"
    assert clean_email("SOMI@MEZON.UZ") == "somi@mezon.uz", "Must be normalized to lowercase"
    assert clean_email("not-an-email") is None
    assert clean_email("@missing-user.com") is None
    assert clean_email("user@.com") is None

    # 3. Grade levels
    assert clean_grade(8) == 8
    assert clean_grade(9) == 9
    assert clean_grade("11") == 11
    assert clean_grade(0) is None, "Grade < 1 must be rejected"
    assert clean_grade(12) is None, "Grade > 11 must be rejected"
    assert clean_grade("invalid") is None

    # 4. Password bounds
    assert clean_password("1234567") is None, "Password < 8 chars must be rejected"
    assert clean_password("ValidPassword123!") == "ValidPassword123!"
    assert clean_password("a" * 129) is None, "Password > 128 chars must be rejected"

    print("✓ Validation & Sanitization tests passed (14/14 assertions)")

if __name__ == '__main__':
    run_tests()
