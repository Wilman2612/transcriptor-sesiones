---
name: security-memory
description: "Semantic memory for the security agent. SKILL.md (L1) = universal adversarial principles, the OWASP Top 10 audit checklist, auth-bypass vectors, finding-quality standards, and the code-fix vs arch-issue classification. For this project's attack surface (L2/L3) read security-memory/project.md and security-memory/attack-surface.md."
---

# Security Memory — L1: Universal Adversarial Principles

> The `security-report.md` output format lives in `feature-workflow`. This skill holds the *audit knowledge* the security agent applies.

## Principles (project-agnostic)

- **Assume the mistake was made**: don't audit to confirm safety — audit to find the failure. Default assumption: the code is wrong.
- **Prove it, don't describe it**: every finding needs a concrete payload or test. A description without proof is a hypothesis.
- **OWASP Top 10 is the minimum scope** of every audit.
- **Auth bypass is the highest priority**: any path allowing unauthenticated access to authenticated resources is critical, however unlikely it seems.
- **Audit scope is the current feature only**: note pre-existing vulns as "pre-existing", don't let them block the feature.

---

## Auth Bypass Testing — four vectors (test each endpoint individually)

| Vector | Input condition | Expected |
|---|---|---|
| No auth token | Request without any credential | 401 |
| Expired token | Syntactically valid but expired credential | 401 |
| Wrong user ID | Valid credential for A, but references B's resource ID | 403 |
| JWT payload manipulation | Signature valid, `sub`/`userId`/role claim tampered | 401 or 403 |

**Anti-pattern**: "I checked auth once so all endpoints are fine." Each endpoint has its own access-control config.

---

## OWASP Top 10 Audit Checklist

Apply to every changed file; finish each category before the next.

- **A01 Broken Access Control**: unauthenticated access to protected endpoints? user A → user B's data via ID? guards on all protected routes? privilege elevation?
- **A02 Cryptographic Failures**: secrets hardcoded? plaintext/weak-hash passwords? credentials in source (not `.env`)?
- **A03 Injection**: SQL via concatenation/raw-query misuse? NoSQL object injection? command injection? template injection?
- **A04 Insecure Design**: missing rate limiting? business-logic flaws? validation only on the frontend?
- **A05 Misconfiguration**: stack traces leaked? debug mode in prod? CORS allowing unauthorized origins?
- **A06 Vulnerable Components**: new packages with known CVEs? run the dependency audit.
- **A07 Auth Failures**: token reuse after logout? session fixation? login timing attacks? brute force (no rate limit)?
- **A08 Data Integrity**: JWT validated (signature/expiry/issuer)? tamperable serialized data?
- **A09 Logging Failures**: security events logged? sensitive values excluded from logs?
- **A10 SSRF**: user input controlling server-fetched URLs? internal services reachable? URL validation blocking `localhost`/`127.0.0.1`/`169.254.169.254`?

**Static signals** (each maps to a category): raw query with concatenated input → A03; unvalidated `req.body/params/query` → A03/A04; missing guard → A01; dynamic code execution with user input → A03; file ops with user-controlled paths → A01/A03; HTTP calls with user-controlled URLs → A10; secrets in source → A02; unsafe HTML rendering → A03(XSS); cookies missing `httpOnly`/`secure`/`sameSite` → A07; errors leaking internals → A05.

**Systemic finding rule**: if the same pattern appears across multiple files, write ONE finding referencing all of them — don't inflate severity with per-file duplicates.

---

## Attack Payload Format

Three elements: malicious input, invocation of the target, assertion it was blocked.

```typescript
const maliciousInput = "'; DROP TABLE users; --";
const response = await request.post("/api/{endpoint}").send({ field: maliciousInput });
expect(response.status).toBe(400); // NOT 500 — 500 means the payload reached internals
```

**500 is always a finding** — it means the payload was not rejected before reaching application internals. Expected blocked statuses: SQLi → 400/422; XSS → 400 or escaped 200; auth bypass → 401/403; SSRF → 400; path traversal → 400.

---

## Finding Quality & Severity

Every finding names: the exact endpoint/function, the exact input field, the exact code location, the exact consequence. "The endpoint doesn't validate input" is insufficient; "`POST /api/x` passes `body.content` to a raw query at `Repo:45` without parameterization; attacker can inject `…`" is sufficient.

| Severity | Exploitability | Action |
|---|---|---|
| CRITICAL | Exploitable now, browser + HTTP client only, no internal knowledge | Fix before ship — no exceptions |
| HIGH | Moderate effort; needs setup or internal knowledge or a valid session | Fix before ship |
| MEDIUM | Requires specific conditions | Ship with tracking |
| LOW | Defense-in-depth | Backlog |

**No false positives**: don't report CRITICAL you haven't proven with a payload. Uncertain → MEDIUM + explain.

---

## Code Fix vs Architectural Issue

Classify every finding. `[CODE FIX]` — a localized 1–5 line change (missing validation, wrong header, hardcoded key). `[ARCH ISSUE]` — root cause is a design decision (logic in the wrong layer, input flowing route→store with no validating service, no centralized guard). **Route arch issues to the architect first**, not the developer (who would write a local patch). If any finding is `[ARCH ISSUE]` → report status is `FAIL-ARCH`.

Heuristic: "Can a developer fix this in one file without redesigning how the system handles this concern across all routes?" If no → architectural.

-> This project's auth architecture and known entry points: read `security-memory/project.md` and `security-memory/attack-surface.md`
-> The `security-report.md` output format: `feature-workflow` skill → Artifact Formats
