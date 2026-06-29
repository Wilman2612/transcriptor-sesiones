---
name: feature-workflow
description: "Shared communication protocol for the multi-agent pipeline. Defines the artifact directory, file formats, status codes, routing rules, and REWORK limits that ALL agents follow. Load whenever an agent reads or writes a pipeline artifact."
---

# Skill: feature-workflow

**Use when**: Any agent in the multi-agent pipeline reads or writes artifacts. This skill is the single source of truth for the communication protocol, file formats, status codes, and escalation rules ALL agents follow.

---

## Architecture Overview

This pipeline uses an **Orchestrator-Workers** pattern (per [Anthropic's "Building Effective Agents"](https://www.anthropic.com/engineering/building-effective-agents)):

- A **feature-orchestrator** agent receives the user's request, classifies it, and delegates to specialized worker agents.
- Each worker reads upstream artifacts, does its job, writes its own artifact, and exits.
- Workers are **stateless** — they receive context exclusively via files on disk and the orchestrator's prompt.
- Communication happens **only** via the artifact directory. No implicit context sharing.
- Workers **NEVER ask the user questions directly.** They are stateless — no one will answer. Unresolved decisions → write them as `BLOCKED` in the output artifact and exit. The orchestrator handles escalation. (The PO is the one exception: it may ask the user up front, before the pipeline fans out.)

### Agents in the Pipeline

| Agent | Role | Input Artifacts | Output Artifact |
|---|---|---|---|
| `feature-orchestrator` | Router + coordinator | User request | `orchestrator-log.md` |
| `po` | Product Owner | User request | `po-brief.md` |
| `architect` | Software Architect | `po-brief.md` + codebase | `arch-decision.md` |
| `ui-developer` | Frontend (DAL + Storybook) | `po-brief.md` + `arch-decision.md` | `ui-dev-note.md` + code + Stories |
| `js-developer` | Backend developer | `arch-decision.md` | `dev-notes.md` + code |
| `qa` | QA Engineer | `po-brief.md` + `dev-notes.md`/`ui-dev-note.md` + code | `qa-report.md` + tests |
| `ux` | Adversarial design critic | `po-brief.md` + rendered Storybook | `ux-review.md` |
| `security` | Adversarial security auditor | `arch-decision.md` + `dev-notes.md` + code | `security-report.md` + tests |
| `code-reviewer` | Adversarial code reviewer | the diff + all artifacts | `code-review.md` |
| `manual-verifier` | Visual acceptance tester | `po-brief.md` + Storybook + running app | `verification-report.md` |

### The adversarial cluster

`ux`, `security`, `code-reviewer`, and `manual-verifier` are **adversarial by design** — positioned *after* implementation, not before. Their job is to break, critique, and disprove, on real code and real rendered UI, not on specs. An agent never reviews its own output.

---

## Artifact Directory Structure

All artifacts live under:

```
tmp/features/{slug}/
  po-brief.md
  arch-decision.md
  ui-dev-note.md
  dev-notes.md
  qa-report.md
  ux-review.md
  security-report.md
  code-review.md
  verification-report.md
  orchestrator-log.md
  screenshots/
```

- `{slug}` = kebab-case feature name derived from the request (e.g. `add-dark-mode`, `fix-login-crash`).
- If the directory exists, the orchestrator appends a numeric suffix: `add-dark-mode-2`.
- Agents MUST use absolute paths when reading/writing artifacts.

---

## Routing Rules (Orchestrator)

The orchestrator classifies the request and picks a **starting point**. The pipeline is non-linear — the orchestrator reads each output and decides dynamically what comes next.

| Request Type | Starting Point | Default Flow |
|---|---|---|
| **Feature** | `po` | `po → architect → ui-developer ∥ js-developer → qa → ux + security + code-reviewer → manual-verifier` |
| **Bug** | `security` (triage, text-only) | `security → architect → js-developer (diagnose) → manual-verifier (confirm) → js-developer (fix) → qa → manual-verifier` |
| **Refactor** | `architect` | `architect → js-developer/ui-developer → qa → code-reviewer` |
| **UI work** | `po` | `po → architect → ui-developer → ux → manual-verifier` |
| **Security Review** | `security` solo | `security` |
| **Code Review** | `code-reviewer` solo | `code-reviewer` |
| **Test Gap** | `qa` solo | `qa` |
| **Small change** (rename/typo/literal) | `js-developer`/`ui-developer` direct | solo — no PO, no architect |

`ui-developer` (frontend, `web/**`) and `js-developer` (backend, `src/**`) work on disjoint scopes and can run in parallel once the architect has defined the contract between them.

### Bug Triage: Progressive Escalation

Steps 1-2 are **text-only** (no browser, no commands). Cheap. They short-circuit everything if they find something critical.

| Step | Agent | Task | Skip if |
|---|---|---|---|
| 1 | `security` | Does it threaten integrity / OWASP? | — always run |
| 2 | `architect` | Does it violate architecture? cross-service? DB schema? | security returned CRITICAL → escalate first |
| 3 | `js-developer`/`ui-developer` | Diagnose: easy or hard? what does it touch? | — always run |
| 3b | `architect` | Validate approach (only if step 3 says "hard" or "multi-layer") | dev says easy/contained |
| 4 | `manual-verifier` | Confirm the bug is real (diagnosis mode, no po-brief) | — always run |
| 5 | developer | Implement fix | — always run |
| 6 | `qa` | Regression check | — always run |
| 7 | `manual-verifier` | Confirm fix visually | — always run |

### Dynamic Routing Triggers

After any agent, the orchestrator may insert an unplanned agent:

| Condition | Insert |
|---|---|
| Fix touches cross-service boundary or DB schema | `architect` validates before developer implements |
| Security/QA finds a product-level tradeoff | `po` to define scope, or ESCALATE to user |
| Manual-verifier finds broken UX not in the PO brief | `po` to decide scope |
| Any agent BLOCKED on a tech or product decision | ESCALATE to user with the exact question |

---

## Status Codes

Each agent's report MUST end with a status line in this exact format:

```
## Status: {CODE}
```

| Code | Meaning | Orchestrator Action |
|---|---|---|
| `DONE` | Completed, no issues | Proceed to next agent |
| `DONE_WITH_WARNINGS` | Completed, non-blocking concerns | Proceed, log warnings (MEDIUM+ → treat as FAIL) |
| `BLOCKED` | Cannot proceed without human decision | ESCALATE to user |
| `FAIL` | Found actionable problems | Route to REWORK cycle |

The adversarial agents use verdict-style codes that map onto these: `security` → `CLEAR`/`FAIL`; `code-reviewer` → `APPROVED`/`REWORK`/`ESCALATE`; `ux` → `DONE`/`DONE_WITH_WARNINGS`/`FAIL`.

---

## REWORK Cycle

When `qa`, `ux`, `security`, `code-reviewer`, or `manual-verifier` report `FAIL`:

1. The orchestrator sends the failure report back to the right developer with instructions to fix.
2. After the fix, the failing agent re-runs its checks.
3. **Maximum 2 REWORK cycles per failing agent.** Counters are independent — QA's 2 cycles don't consume security's budget. After 2 failures on the same issue:
   - The orchestrator writes a summary of unresolved issues.
   - Status changes to `ESCALATE` — the user must intervene. Two failures on the same issue is a **specification** problem, not a third-attempt problem.

### REWORK Prompt Template

```
## REWORK Required — Cycle {N}/2

### Original Architect Decision
[path to arch-decision.md]

### Failure Report
[path to qa-report.md / security-report.md / ux-review.md / code-review.md / verification-report.md]

### Instructions
Fix ONLY the issues listed in the failure report. Do not refactor unrelated code.
After fixing, update dev-notes.md / ui-dev-note.md with what you changed and why.
```

---

## Artifact Formats

### po-brief.md

```markdown
# Feature Brief: {title}

## Problem Statement
{Why this is needed. Business context.}

## User Stories
- As a {actor}, I want {goal}, so that {benefit}.
  - **Given** {precondition}
  - **When** {action}
  - **Then** {expected result}

## Acceptance Criteria
- [ ] {Measurable, testable criterion}

## Out of Scope
- {What this explicitly does NOT cover}

## Named UI States (if any UI)
| State | What to show |
|---|---|
| loading | ... |
| empty | ... |
| error | ... |
| happy | ... |

## Blockers (Human Decision Required)
- {External dependency or business decision needed}

## Success Metrics
- {How to measure success}

## Status: DONE | BLOCKED
```

### arch-decision.md

```markdown
# Architecture Decision: {title}

## Summary
{One-paragraph technical approach}

## Files to Modify
| File | Action | Layer |
|---|---|---|
| `path/to/file.ts` | CREATE / MODIFY / DELETE | domain / application / infrastructure / presentation |

## Frontend ↔ Backend Contract
{The DAL/API interface the ui-developer and js-developer agree on. TypeScript interface. This is what lets them work in parallel.}

## Existing Abstractions to Reuse
- `{path}` — {what it does and why to reuse}

## New Abstractions (if any)
- `{path}` — {what it does and why existing code doesn't cover it}

## Patterns Applied
- {Pattern from development-patterns skill and why}

## Data Model Changes
{Migration if needed, or "None"}

## API Contract Changes
{New/modified endpoints, or "None"}

## Security Considerations
- {OWASP-relevant notes — the security agent's starting checklist}

## Trade-offs
| Option | Pros | Cons | Selected |
|---|---|---|---|
| A | ... | ... | ✓ / ✗ |

## Status: DONE | BLOCKED
```

### dev-notes.md (js-developer) / ui-dev-note.md (ui-developer)

```markdown
# Development Notes: {title}

## Changes Made
| File | Lines Changed | Description |
|---|---|---|
| `path` | +N / -N | {what changed} |

## Abstractions Reused
- {existing code integrated}

## Abstractions Created
- {new code created, with justification}

## Contracts (ui-developer: for js-developer / js-developer: for ui-developer)
- {DAL interfaces or API shapes the other side must satisfy}

## Named States Implemented (ui-developer)
- happy / empty / error / loading — which Stories cover each

## Test Scenarios for QA
- {per named state: what should be true — QA writes the tests, not you}

## Known Limitations
- {what QA should focus on}

## Status: DONE
```

### qa-report.md

```markdown
# QA Report: {title}

## Test Matrix
| AC | Test | Layer | Covered? |
|---|---|---|---|
| AC-1 | `path/test.ts::name` | unit | ✓ |

## Test Summary
| Layer | Written | Passed | Failed |
|---|---|---|---|
| Unit | N | N | N |
| Integration | N | N | N |
| E2E | N | N | N |

## Failures
### Failure 1: {test name}
- **File**: `path/to/test.ts`
- **Expected**: {expected}
- **Actual**: {actual}
- **Root Cause**: {analysis}
- **Suggested Fix**: {what the developer should do}

## Criteria Without Automatic Coverage
- {AC + why untestable + what manual-verifier should check instead}

## Regression Risk
- {areas that might break}

## Status: DONE | DONE_WITH_WARNINGS | FAIL
```

### ux-review.md

```markdown
# UX Review (Adversarial): {title}

## Stories Reviewed
| Story | State | Verdict |
|---|---|---|

## Findings
### Finding 1: {title}
- **Severity**: 🔴 BLOCKER / 🟡 MAJOR / 🟠 MINOR / 🔵 NIT
- **Story / screenshot**: {ref}
- **Problem**: {what's wrong with the design — hierarchy, spacing, contrast, state, consistency, affordance}
- **Why it matters to the user**: {concrete}
- **Suggested fix**: {direction, not code}

## Status: DONE | DONE_WITH_WARNINGS | FAIL
```

### security-report.md

```markdown
# Security Report: {title}

## Static Analysis
| Check | Result | Details |
|---|---|---|
| SQL/NoSQL Injection | PASS/FAIL | |
| XSS | PASS/FAIL | |
| Auth Bypass / Broken Access Control | PASS/FAIL | |
| Path Traversal | PASS/FAIL | |
| SSRF | PASS/FAIL | |
| Secrets in Code | PASS/FAIL | |
| Vulnerable Dependencies | PASS/FAIL | |

## Adversarial Tests
### Test 1: {attack name}
- **Target**: `{endpoint or function}`
- **Payload**: `{actual payload used}`
- **Expected**: {should be blocked/rejected}
- **Actual**: {what happened}
- **Severity**: CRITICAL / HIGH / MEDIUM / LOW

## Security Tests Created
- `path/to/security-test.ts` — {what it validates}

## Recommendations
- {actionable fixes, ordered by severity}

## Status: CLEAR | FAIL
```

### code-review.md

```markdown
# Code Review: {title}
**Verdict**: APPROVED | REWORK | ESCALATE

## Findings
### [FINDING-01] {title} — Severity: CRITICAL | HIGH | MEDIUM | LOW | INFO
- **File / Lines**: `path` L10-L25
- **Category**: test-weakened | workaround | dead-code | architectural-drift | missing-test | silenced-error | consistency
- **Problem**: {what's wrong}
- **Evidence**: {exact code quoted}
- **Required Fix**: {what must change for APPROVED}

## Tests Integrity Verdict
{Were any tests weakened or mocked to pass?}

## Status: APPROVED | REWORK | ESCALATE
```

### verification-report.md

```markdown
# Visual Verification Report: {title}

## Environment
- Storybook: http://localhost:6006 | App: http://localhost:8000
- Viewport(s): {sizes}

## Sanity Baseline
- Storybook CSS loaded: ✓/✗
- Fake data count matches adapter: ✓/✗

## Findings
| # | Severity | Title | Suggested fix | Screenshot |
|---|---|---|---|---|
| 1 | 🔴 CRITICAL | ... | ... | screenshots/01-x.png |

### Finding 1: {title}
- **Severity**: 🔴 CRITICAL / 🟡 HIGH / 🟠 MEDIUM / 🔵 LOW
- **Description**: {concrete — what you saw vs expected}
- **Evidence**: screenshots/{n}-{slug}.png
- **Fix**: {file + what to change}

## Status: DONE | DONE_WITH_WARNINGS | FAIL | BLOCKED
```

### orchestrator-log.md

```markdown
# Orchestrator Log: {title}

## Request Classification
- **Type**: Feature | Bug | Refactor | UI | Security Review | Code Review | Test Gap
- **Pipeline**: {agents in order}

## Execution Log
| Step | Agent | Status | Cycle | Notes |
|---|---|---|---|---|
| 1 | po | DONE | — | — |
| 2 | architect | DONE | — | — |
| 3 | ui-developer | DONE | — | — |
| 4 | qa | FAIL | 1/2 | 2 test failures |
| 5 | js-developer (REWORK) | DONE | 1/2 | fixed auth check |
| 6 | qa (re-run) | DONE | — | all green |

## Final Decision: SHIP | REWORK | ESCALATE
{Justification}
```

---

## Escalation Rules

The orchestrator MUST escalate to the user (stop execution) when:

1. **REWORK cycles exhausted** — 2 failures on the same issue.
2. **PO reports BLOCKED** — external dependency or business decision.
3. **Architect reports BLOCKED** — ambiguous requirement with significant trade-offs.
4. **Security reports CRITICAL** that cannot be auto-fixed.
5. **code-reviewer reports ESCALATE** — a fundamental design decision made wrong.
6. **Destructive DB operation** — DROP, ALTER COLUMN type change, migrate reset.

---

## Anti-Patterns

1. **Fat orchestrator**: never writes code, tests, or architecture decisions. It only routes and evaluates status codes.
2. **Cross-agent context bleeding**: agents assume nothing beyond what's in the artifact files. Every invocation is stateless.
3. **Infinite loops**: hard cap at 2 REWORK cycles per agent. No exceptions.
4. **Skipping agents**: don't skip unless the request type explicitly excludes them.
5. **Mixing concerns**: QA never fixes code. Security never writes feature code. Developers never write their own tests (QA does). Manual-verifier and ux never modify code. PO never makes architecture decisions.
6. **Self-review**: no agent reviews work it produced. The adversarial cluster reviews the developers' output, never its own.
