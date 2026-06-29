# Security Memory — L2: This Project's Security Decisions

> **Template (L2).** No file names/env vars here (those are L3 in `attack-surface.md`).

## Auth Architecture
- [Auth provider. Where authorization is enforced (guard/middleware layer).]
- [Tiers/roles and where the tier check runs.]

## Trust Boundaries
- [What's public vs authenticated. Webhooks and how they're verified.]

## Data Sensitivity
- [What counts as PII/sensitive. Encryption at rest? What must never be logged/serialized.]

-> Universal security principles + OWASP checklist: `.claude/skills/security-memory/SKILL.md`
-> Concrete entry points, raw-query locations, audit command: create `.claude/skills/security-memory/attack-surface.md` (L3)
