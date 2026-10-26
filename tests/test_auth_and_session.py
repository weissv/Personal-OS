#!/usr/bin/env python3
"""
UNIT TEST: Auth & Session Management (HMAC-SHA256, Tampering, Expiration)
"""

import hmac
import hashlib
import base64
import json
import time

SECRET = "mezon-sprint-os-super-secret-jwt-key-2026"

def b64url_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).decode('utf-8').rstrip('=')

def b64url_decode(s: str) -> bytes:
    padding = 4 - (len(s) % 4)
    if padding != 4:
        s += '=' * padding
    return base64.urlsafe_b64decode(s.encode('utf-8'))

def sign(body: str, secret: str) -> str:
    return b64url_encode(hmac.new(secret.encode('utf-8'), body.encode('utf-8'), hashlib.sha256).digest())

def create_session_token(payload: dict, secret: str, ttl_seconds: int = 3600) -> str:
    full = dict(payload)
    full['e'] = int((time.time() + ttl_seconds) * 1000)
    body = b64url_encode(json.dumps(full).encode('utf-8'))
    return f"{body}.{sign(body, secret)}"

def verify_session_token(token: str, secret: str):
    if not token or '.' not in token:
        return None
    dot = token.index('.')
    body = token[:dot]
    sig = token[dot+1:]
    expected_sig = sign(body, secret)
    if not hmac.compare_digest(sig, expected_sig):
        return None
    try:
        payload = json.loads(b64url_decode(body).decode('utf-8'))
        if payload.get('e', 0) < int(time.time() * 1000):
            return None # Expired
        return payload
    except Exception:
        return None

def run_tests():
    print("Running Test: Auth & HMAC-SHA256 Session...")

    # 1. Valid token creation and verification
    token = create_session_token({'u': 'student-123'}, SECRET)
    payload = verify_session_token(token, SECRET)
    assert payload is not None, "Valid token must decode properly"
    assert payload['u'] == 'student-123', "Payload must match user id"

    # 2. Tampered body must be rejected
    parts = token.split('.')
    tampered_body = b64url_encode(json.dumps({'u': 'hacker-999', 'e': payload['e']}).encode('utf-8'))
    tampered_token = f"{tampered_body}.{parts[1]}"
    assert verify_session_token(tampered_token, SECRET) is None, "Tampered token must be rejected"

    # 3. Wrong secret must be rejected
    assert verify_session_token(token, "wrong-secret-key") is None, "Token signed with different secret must fail"

    # 4. Expired token must be rejected
    expired_token = create_session_token({'u': 'student-123'}, SECRET, ttl_seconds=-10)
    assert verify_session_token(expired_token, SECRET) is None, "Expired token must be rejected"

    # 5. Impersonation payload
    admin_token = create_session_token({'u': 'student-123', 'a': 'admin-godmode'}, SECRET)
    admin_payload = verify_session_token(admin_token, SECRET)
    assert admin_payload['u'] == 'student-123', "Target user is student"
    assert admin_payload['a'] == 'admin-godmode', "Actor is admin"

    print("✓ Auth & Session tests passed (5/5 assertions)")

if __name__ == '__main__':
    run_tests()
