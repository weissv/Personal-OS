# ADR-004: HMAC-SHA256 Session Management & Impersonation Safety

## Status
Accepted

## Context
Educational platforms require persistent authentication on mobile devices so adolescents are not repeatedly prompted for credentials. Furthermore, school administrators and mentors frequently need to inspect student views to resolve discrepancies without knowing student passwords.

## Decision
1. **HMAC-SHA256 Signed Tokens:** Token payload encodes `{ u: userId, a?: adminId, e: expiresAt }`. Tokens are signed with a server secret using `crypto.createHmac('sha256')` and compared with constant-time equality (`crypto.timingSafeEqual`).
2. **Dual Transport (Cookie + Bearer fallback):** Tokens are set as `HttpOnly`, `SameSite=Lax` cookies, and also returned in JSON so mobile PWA and Webview clients can send `Authorization: Bearer <token>` if cookie persistence is interrupted.
3. **Impersonation Protocol:** When an administrator switches to a student account:
   - The token sets `u = studentId` and `a = adminId`.
   - The `actor` context always retains the administrator's identity.
   - An immutable audit log entry `IMPERSONATE_START` is generated.
   - The administrator can return to Godmode at any time without re-authenticating.

## Consequences
Robust authentication across web and mobile webviews with zero privilege escalation risk.
