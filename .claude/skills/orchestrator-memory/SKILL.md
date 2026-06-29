---
name: orchestrator-memory
description: "Semantic memory for the feature-orchestrator. SKILL.md (L1) = universal orchestration principles, micro-operation classification, and doubt (blocker vs deferred) classification. For this project's routing specifics (L2/L3) read orchestrator-memory/project.md."
---

# Orchestrator Memory — L1: Universal Orchestration Principles

> The routing tables, status codes, and REWORK protocol live in `feature-workflow`. This skill holds the *judgment principles* the orchestrator applies.

## Principles (project-agnostic)

- **Classify before routing**: a misclassified request (feature vs bug vs refactor) wastes every downstream agent's context. Spend the first step on classification — everything depends on it.
- **Routing decisions are durable commitments**: the pipeline you choose carries through to SHIP or ESCALATE. Changing mid-flight forces re-running agents whose output was already consumed.
- **REWORK is bounded by design**: if two attempts don't resolve a failure, it is a specification problem, not an implementation one. Escalate with the exact question — never a third attempt.
- **Fail-fast on artifact-format violations**: reject an artifact that doesn't meet its format contract before it travels downstream and corrupts every subsequent agent's context.
- **Escalation is a valid product, not a failure**: when the system can't resolve within its bounds, a specific question to the user is the correct, complete output.
- **The orchestrator does not write code or specs**: its only outputs are routing decisions and the orchestrator-log. Any "I'll also fix this" impulse is out of scope.

---

## Micro-Operations (no pipeline needed)

Four changes small and mechanical enough to skip the pipeline: (1) rename a symbol (mechanical, no logic change), (2) change a literal value (the new value is given), (3) add/remove a single import (explicit target, no behavior change), (4) fix a typo.

**Not micro-operations**: a rename with ambiguous scope (judgment needed); a string change touching business-logic values (side effects); an import that enables/disables a feature (behavioral); a "typo" in a symbol used across modules (scope analysis needed).

Heuristic: if completing the change requires understanding the surrounding context to decide HOW (not just WHAT), it is not a micro-operation. Anti-pattern: calling something a micro-op to dodge the pipeline — the cost of unnecessary planning is one step; the cost of an untracked change is lost auditability.

---

## Doubt Classification: Blocker vs Deferred

- **Blocker** — changes WHAT gets built: implementation can't proceed without the answer; resolving it later would force re-implementation. → ESCALATE.
- **Deferred** — changes HOW, but a safe default exists and can change later without redesign. → proceed with the default.

**Circular test**: if you can't tell blocker from deferred without knowing the answer, it's a blocker. Uncertainty about the classification is itself a blocker signal. Anti-pattern: classifying as "deferred" to keep moving — a deferred doubt that was really a blocker forces full re-implementation later. When in doubt, block.

-> This project's routing specifics and accumulated patterns: read `orchestrator-memory/project.md`
-> Routing tables, status codes, REWORK protocol: `feature-workflow` skill
