#!/usr/bin/env python3
"""
UNIT TEST: Rate Limiter & IPv6 Subnetting
Verifies IPv6 /64 prefix normalization and sliding window mechanics.
"""

def source_network(raw_ip: str) -> str:
    ip = (raw_ip or '').strip().lower()
    if not ip or ip == 'unknown':
        return 'unknown'
    if ':' not in ip:
        # IPv4
        return ip
    # Clean brackets / ports e.g. [2001:db8::1]:8080
    clean = ip.lstrip('[').split(']')[0]
    parts = clean.split(':')
    if len(parts) >= 4:
        return f"{':'.join(parts[:4])}::/64"
    return f"{clean}::/64"

class MemoryRateLimiter:
    def __init__(self):
        self.buckets = {}

    def rate_limit(self, key: str, limit: int, window_ms: int, now_ms: int):
        hits = [t for t in self.buckets.get(key, []) if now_ms - t < window_ms]
        if len(hits) >= limit:
            retry_after = (window_ms - (now_ms - hits[0])) / 1000.0
            return False, retry_after
        hits.append(now_ms)
        self.buckets[key] = hits
        return True, 0

def run_tests():
    print("Running Test: Rate Limiting & IPv6 Subnetting...")

    # 1. IPv4 passthrough
    assert source_network("192.168.1.1") == "192.168.1.1"
    assert source_network("127.0.0.1") == "127.0.0.1"
    assert source_network("8.8.8.8") == "8.8.8.8"

    # 2. IPv6 /64 masking
    ip1 = "2001:0db8:85a3:0000:0000:8a2e:0370:7334"
    ip2 = "2001:0db8:85a3:0000:ffff:ffff:ffff:ffff" # Same /64 subnet
    ip3 = "2001:0db8:85a3:0001:0000:0000:0000:0001" # Different /64 subnet

    sub1 = source_network(ip1)
    sub2 = source_network(ip2)
    sub3 = source_network(ip3)

    assert sub1 == "2001:0db8:85a3:0000::/64", f"Expected /64 prefix, got {sub1}"
    assert sub1 == sub2, "IPs within same /64 subnet must map to identical key"
    assert sub1 != sub3, "IPs in different /64 subnets must map to distinct keys"

    # 3. Sliding window bucket enforcement
    limiter = MemoryRateLimiter()
    now = 1000000 # ms
    # 5 requests allowed in 60s
    for i in range(5):
        allowed, _ = limiter.rate_limit("test-key", 5, 60000, now + i * 100)
        assert allowed, f"Request {i+1} must be permitted"

    # 6th request must be blocked
    blocked, retry_after = limiter.rate_limit("test-key", 5, 60000, now + 500)
    assert not blocked, "6th request within window must be blocked"
    assert retry_after > 0, "Retry-After must be positive"

    # After window passes, request should be allowed again
    allowed_later, _ = limiter.rate_limit("test-key", 5, 60000, now + 65000)
    assert allowed_later, "Request after window expiration must succeed"

    print("✓ Rate Limiting & IPv6 Subnetting tests passed (6/6 assertions)")

if __name__ == '__main__':
    run_tests()
