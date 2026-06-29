---
name: qa-memory
description: "Semantic memory for the QA agent. SKILL.md (L1) = universal testing principles, AAA structure, the four coverage quadrants, test-layer selection, weak-test anti-patterns, and streaming test patterns. For this project's test suite and framework (L2/L3) read qa-memory/project.md and qa-memory/test-suite.md."
---

# QA Memory — L1: Universal Testing Principles

> The `qa-report.md` output format lives in `feature-workflow`. This skill holds the *testing knowledge* the QA agent applies.

## Principles (project-agnostic)

- **Tests are the living spec**: each acceptance criterion, architectural constraint, and edge case needs a test that would FAIL if the behavior changed.
- **The pyramid holds**: many unit, fewer integration, minimal E2E. Don't write an integration test where a unit test works.
- **Isolate what you own**: unit tests mock everything external; integration tests use real infrastructure; never combine both in one test.
- **Tests must be deterministic**: a flaky test is a bug. If it passes sometimes, it is not a valid test.

---

## Arrange → Act → Assert

| Phase | Contains | Anti-pattern |
|---|---|---|
| Arrange | All inputs, mocks, preconditions | Setting up state inside Act — the cause becomes invisible |
| Act | Exactly one operation — the behavior under test | Multiple operations — failure is ambiguous |
| Assert | The exact observable outcome (return, side effect, state) | Asserting internals — breaks on refactor without behavior change |

**One behavior per test**: the name must complete "it should…". If it needs "and", split it. Each test runs independently — no order dependence; reset shared state in `beforeEach`.

---

## Coverage Planning (answer before writing tests)

1. Behaviors to validate (primary behavior per acceptance criterion).
2. Most likely failure modes per changed file (how could the change be subtly wrong?).
3. Edge cases not in the ACs (empty, zero, negative, concurrent).
4. Test layer per behavior (see selection below).
5. Regression risks from the changed files.
6. Untestable-criteria check: each AC is testable in some layer OR is a hardware feature for the manual-verifier. Otherwise flag it as a coverage gap with a suggested manual check or a PO reword.

## Test Layer Selection (stop at first match)

1. Needs a real browser + visible UI → **E2E** (only if the project has E2E setup).
2. Needs a real DB or external service → **Integration**.
3. Exercises business logic with no I/O → **Unit**.
4. Unsure → **Integration** (catches more real failures than unit alone).

## Four Coverage Quadrants (per behavior)

| Quadrant | Test |
|---|---|
| Happy path | Valid input → expected output |
| Boundary values | The exact edge (limit = 5: test 4, 5, 6) |
| Invalid input | Malformed/missing/out-of-range → typed error |
| Unauthorized access | No auth / wrong role / other user's resource → 401/403 |

---

## Weak-Test Anti-Patterns

| Anti-pattern | Why weak |
|---|---|
| `expect(fn).not.toThrow()` | Any return value passes — proves nothing |
| `expect(result).toBeDefined()` | Passes for `{}` or `[]` |
| `expect(spy).toHaveBeenCalled()` | Doesn't check arguments — a wrong call passes |
| Asserting only the happy path on branching code | The branch is untested |

For every test ask: *"If someone flipped a condition, removed a branch, returned the wrong value, or skipped a side effect — would my assertion catch it?"* If no, strengthen it. **Never weaken an assertion to make a test pass** — if the implementation is incomplete, the status is FAIL.

---

## Streaming / Async Test Patterns

When the change involves streaming or async delivery, cover: **protocol (unit)** — correct output for valid input; chunks split mid-token; empty chunks, malformed lines, EOF. **Server (integration)** — declared `Content-Type`; body matches the protocol for a known input; N fragments → N units. **Client (unit)** — each frame applied to state correctly; N fragments → N messages; error state on mid-stream interruption. **State transitions (unit)** — one test per named transition.

-> This project's test framework/assertion API and suite layout: read `qa-memory/project.md` and `qa-memory/test-suite.md`
-> The `qa-report.md` output format: `feature-workflow` skill → Artifact Formats
