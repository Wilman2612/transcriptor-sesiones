---
name: verifier-memory
description: "Semantic memory for the manual-verifier agent. SKILL.md (L1) = universal visual-verification principles, the state-machine coverage protocol, scenario planning, error-capture rules, the visual checklist, and the BLOCKED-hardware list. For this project's local setup (L2/L3) read verifier-memory/project.md and verifier-memory/local-setup.md."
---

# Verifier Memory — L1: Universal Verification Principles

> The `verification-report.md` output format lives in `feature-workflow`. This skill holds the *verification method* the agent applies.

## Principles (project-agnostic)

- **You are the user, not the test runner**: navigate as a real user would. The goal is to confirm the product works, not that the tests pass.
- **Named states are the test script**: each named state in the spec is a verification target. A state with no name has no test.
- **Screenshots are evidence**: every criterion needs at least one screenshot. A claim without one is unverified.
- **Tools exist — use them before saying "I can't"**: a browser is available; CLIs can be installed, tunnels created, seeds run, env vars read. If a condition seems unreachable, enumerate the tools that could create it before reporting BLOCKED.
- **Partial verification is still progress**: verify 7/12 and document the other 5 with a reason each. Never report nothing because not everything is verifiable.

---

## State-Machine Coverage Protocol (before opening the browser)

**Step 0 — think like a user first.** List: what can the user DO (every action), what can they SEE (every observable state), and what happens AFTER each action. Every action needs a scenario; an action with no scenario is an untested journey → a Gap.

Then build a **state matrix** from the named states in the spec: one row per state (and per sub-state), columns = state name / entry trigger / exit-or-next state.

**State continuation requirement**: a scenario that ends at an error or limit state is incomplete unless it also tests the *next* action from that state. E.g. "quota bubble appears" → also send another message while it's visible: second bubble? silent ignore? crash? "Loading state" → also verify the resolved outcome. Testing only the trigger moment and declaring PASS is an anti-pattern.

| Spec has… | Minimum scenario rows |
|---|---|
| N named states | N |
| M named sub-states | N + M |
| A state with visible user input | +1 continuation per available action |
| A loading/in-flight state | +1 for the resolved outcome |

---

## Scenario Planning

A scenario is sufficient when it has: a unique name derived from the AC/state, the actor's starting state, the exact actions (navigate/click/type/wait), the expected visual outcome, and at least one screenshot. Insufficient when it's "check that X works" with no starting state, no expected outcome, or no screenshot. Name scenarios `{NN}-{trigger}-{outcome}` in kebab-case. Don't name anything "happy path" — too vague. Don't skip error/empty scenarios as "edge cases" — they break most.

---

## Error Capture

Every error or anomaly is a **finding**; working around it doesn't eliminate it.

| Trigger | Minimum severity |
|---|---|
| Compilation/bundler overlay on any page | HIGH |
| Console `console.error` / unhandled rejection during the flow | MEDIUM |
| 4xx/5xx network request during the flow | MEDIUM |
| Page needs a reload to dismiss an error or continue | MEDIUM |
| Garbled text, wrong characters, raw i18n key on screen | HIGH |
| Expected element (cancel/refund/delete/manage) absent | MEDIUM |
| Dev error badge ("N Issues") visible in any screenshot | MEDIUM — must be opened and explained before any PASS |

If an `error`-fallback screenshot was saved, it must appear in an Issue; its scenario can't PASS without written justification. PASS integrity: outcome visible + no errors → PASS; outcome visible but errors worked around → DONE_WITH_WARNINGS; outcome not visible or critical error → FAIL; environment unstartable after genuine attempts → BLOCKED.

---

## Visual Checklist (per screen; mark N/A where it doesn't apply)

- **Layout**: target elements visible (not hidden by z-index/opacity/display); no overflow/clipping; adequate spacing; responsive holds at the viewport (no horizontal scroll).
- **Text & i18n**: no raw i18n keys; correct locale; no placeholder text ("Lorem", "TODO"); long strings wrap/truncate.
- **Interactivity**: buttons enabled when they should be; inputs accept text; links route correctly; action feedback present after submit/save/delete.
- **States**: empty (message, not blank page); loading (resolves); error (friendly message, not a stack trace); success (visible confirmation).
- **Accessibility (basic)**: visible focus ring on keyboard nav; images have alt text or are explicitly decorative.
- **Console**: no JS errors; no feature-breaking failed requests.

Anti-pattern: marking PASS because an element is in the DOM — check visual visibility, not DOM presence.

---

## Why Visual Testing Catches Unique Failures

Automated tests verify presence in the DOM; visual testing verifies that what's present is also visible, accessible, and correctly rendered. A component can render but be invisible (z-index/opacity/display); text present but truncated/overlapping; a button present but covered; layout broken at a viewport; i18n showing raw keys; a loading state that never resolves visually. Concluding a UI is correct because tests pass is the core anti-pattern.

## BLOCKED is for hardware only

`BLOCKED` is valid only for hardware-gated features: microphone recording, local file upload, push notifications, camera/video, OS clipboard. For those, write a manual test script instead of a screenshot. UI layout, navigation, data states, streaming, error messages are **never** BLOCKED — browser automation can always verify them.

-> This project's local servers, test accounts, seed data: read `verifier-memory/project.md` and `verifier-memory/local-setup.md`
-> The `verification-report.md` output format + screenshot organization: `feature-workflow` skill → Artifact Formats
