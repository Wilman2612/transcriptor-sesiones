---
name: ux-memory
description: "Semantic memory for the adversarial UX critic. SKILL.md (L1) = universal UX principles and the Nielsen heuristics evaluation framework, used to tear down rendered UI. For this project's design system and conventions (L2/L3) read ux-memory/project.md and ux-memory/design-context.md."
---

# UX Memory — L1: Universal UX Principles

> In grimorio the `ux` agent is an **adversarial critic**: it does not author specs — it tears down the UI already rendered in Storybook. This skill gives it the evaluation framework. The `ux-review.md` output format lives in `feature-workflow`.

## Principles (project-agnostic)

- **Named states are test targets**: every screen state must have a name. An unnamed state cannot be evaluated — if the brief named `loading/empty/error/happy`, each must exist as a Story.
- **State completeness over happy path**: `empty` must look distinct from `loading`; `error` must offer a way out; the happy state must be real (not skeleton-forever). The error/empty states are where design breaks most.
- **No decorative complexity**: no modal where a page works, no wizard where one form works. Every element on screen must earn its place.
- **Consistency over novelty**: new screens match the existing visual and interaction patterns. A pattern absent from the codebase AND violating platform convention is a failure, not a feature.
- **Reuse over reinvention**: before flagging a component as new, assume an equivalent already exists. Inventing a new visual pattern when one exists is a finding.

---

## Nielsen Heuristics — the evaluation framework

Apply as reasoning tools, not a checkbox list. A design that satisfies one heuristic but violates another is still a bad design.

| # | Heuristic | What to attack |
|---|---|---|
| H1 | Visibility of System Status | Does every async operation show feedback (loading, progress, confirmation)? |
| H2 | Match System to Real World | Labels in the user's language? No jargon, no raw internal IDs? |
| H3 | User Control and Freedom | Can the user undo/cancel/go back from every screen? No dead ends? |
| H4 | Consistency and Standards | Do new screens match existing patterns and platform conventions? |
| H5 | Error Prevention | Are destructive actions behind a confirmation? Inputs validated before submit? |
| H6 | Recognition over Recall | Is context visible on screen, or must the user remember it from a prior screen? |
| H7 | Flexibility and Efficiency | Works for both first-time and experienced users? |
| H8 | Aesthetic and Minimalist Design | Is every element necessary? Does noise compete with primary content? |
| H9 | Help Users Recover from Errors | Plain-language messages with a suggested action — no raw error codes? |
| H10 | Help and Documentation | Self-explanatory UI, or inline help where it isn't? |

**Priority**: H1, H3, H4, H5, H9 are almost always relevant. H7, H10 are lowest unless the feature is complex.

**Interaction-state rule** (from H4 + H6 + H8): feedback for any state (loading, recording, streaming, error) must appear at the **same spatial level** as the element that owns it. Adding a status element elsewhere to describe the state of an element here fails multiple heuristics at once.

**Anti-patterns**: running heuristics as a rubber-stamp checklist (each is a genuine question); letting a failing heuristic survive because another passes (all 10 must pass or be N/A with a reason).

---

## Component Inventory Lens (for the critic)

When reviewing new UI, check whether new visual patterns were invented where existing ones existed. Two components are the same unless they differ in **layout behavior**, not just styling — a styling variant is not a new component. If more than half of the new UI looks net-new, the codebase probably wasn't searched. Flag invented duplicates as findings.

-> This project's design system (component names, tokens, patterns): read `ux-memory/project.md` and `ux-memory/design-context.md`
-> The `ux-review.md` output format: `feature-workflow` skill → Artifact Formats
