---
name: prompt-writing-quality
description: "General prompt craft: how to write and audit any prompt, agent, or skill. Quality checklist, standard skeleton, anti-overfitting rule, nine audit lenses with finding formats, an audit report template, and advanced writing techniques. Load when writing or reviewing a prompt/agent/skill, or when a model is ignoring instructions, responding robotically, or overfitting."
---

# Prompt Writing Quality

Apply this every time you write or edit a prompt, agent, or skill.

> **Relationship to `agent-writing`**: that skill is grimorio-specific — the four-level architecture and how to structure *agents and skills*. This skill is the general craft of writing and auditing *any* prompt. Use both together: structure from `agent-writing`, craft and audit from here.

## Quality Checklist

1. **Objective clarity** — one primary objective; a clear success condition.
2. **Input boundaries** — explicitly mark allowed input sections; distinguish primary input from supporting context.
3. **Instruction quality** — prefer explicit positive instructions; ordered steps when sequence matters; no contradictory rules.
4. **Output contract** — define the exact format, language/tone, and length/constraints.
5. **Grounding & safety** — instruct the model to avoid unsupported claims; add a fallback for missing context.
6. **Examples** — 1–3 good examples for tricky tasks; one bad-output anti-example when useful.
7. **Token efficiency** — remove duplicate rules; keep context concise and relevant.
8. **Review gate** — verify the prompt can be executed by a model with no extra assumptions and no hidden dependency on previous chat state.

## Standard Prompt Skeleton

```md
# Identity
You are ...

# Objective
...

# Inputs
<input>
{{input}}
</input>

# Rules
- ...

# Output Contract
- ...

# Self-check
- ...
```

---

## Anti-Overfitting Rule

**If the user gave an example in the conversation, do NOT include anything remotely similar in the improved output.** Create a completely different example that demonstrates you understood the generalization, not the specific case. Reusing the user's example — even paraphrased — signals pattern matching, not understanding. A different domain, different surface, same underlying principle: that is understanding.

Applies to examples illustrating a rule, anti-examples showing bad output, and any scenario used to ground an instruction. Test yourself: if the user's example was about procrastination and work, your example should involve neither — pick something structurally equivalent in an unrelated domain.

---

## Audit Lenses

When reviewing an existing prompt, agent, or skill, apply all nine lenses. For each, list ALL findings or write "None". Report each with its tag and a concrete quote or section reference.

### L1 — Language compliance
All instruction text in English. Examples may show another language; the surrounding instruction must be English. Heuristic: scan for non-ASCII in instruction text (not in examples). Anti-pattern: flagging a non-English word that appears only inside an example output.
Finding format: `[L1] Line ~{N}: "{quote}" — non-English instruction. Rewrite: "{suggested}."`

### L2 — Context leaking
Examples use invented placeholders, never real artifacts from the current codebase. Invented (OK): `{service-name}`, `UserRepository`, `POST /api/items`. Forbidden: actual file paths, class names, env var names, route paths, or table names from the project. Heuristic: if removing the term would require knowing the project's codebase, it's a real artifact. Anti-pattern: flagging generic terms like `user` or `email`.
Finding format: `[L2] Section "{heading}": example contains real project artifact "{name}" — replace with placeholder.`

### L3 — Internal contradictions
Two sections give conflicting instructions for the same scenario. Heuristic: pick any decision the agent must make; find every place that instructs it; if two disagree → contradiction. Anti-pattern: flagging a general rule + a specific exception as a contradiction (that is qualification).
Finding format: `[L3] Contradiction: "{section A}" says {claim}, "{section B}" says {different claim}. Resolution: {which wins and why}.`

### L4 — Duplication and checklist sprawl
Two sections cover the same domain; multiple checklists that should be one; rules repeated near-verbatim. Heuristic: removal test — mentally remove one section; if behavior is unchanged, it's redundant. Anti-pattern: flagging a summary + its detail section (a summary that points to detail is navigation).
Finding format: `[L4] Duplicate: "{quote from A}" is already covered in "{B}". Consolidate at {location}.`

### L5 — Output contract ambiguity
It must be 100% clear what artifact is produced, its fields, and its status value — a downstream consumer must know the format without opening another file. Heuristic: imagine being the consumer; list every field you'd need to parse it; any field not described → finding. Anti-pattern: flagging a pointer to a canonical template (pointers are acceptable if findable).
Finding format: `[L5] Output contract gap: {what is missing or ambiguous}.`

### L6 — Section ordering
The document reads linearly: prerequisites before the steps that use them. Heuristic: for each section, ask "what must I have read before this makes sense?" — if it's later in the file → ordering problem. Anti-pattern: flagging a global rules section that appears after the steps (global rules govern all steps uniformly).
Finding format: `[L6] Ordering: "{name}" appears before its prerequisite "{prereq}". Reorder.`

### L7 — Bloat and dead weight
Sections that add length without clarity; obvious examples; caveats that restate other rules; impossible anti-patterns. Heuristic: "if a competent agent never read this section, would its output change?" If no → bloat. Anti-pattern: flagging a section as bloat purely on length.
Finding format: `[L7] Bloat: "{name}" ({N} lines) can be cut. Reason: {why}.`

### L8 — Portability
Agent/skill files must work for any project using this framework. Violations: technology names, specific architecture names, project-specific routes, file paths, or table names in L0/L1. Heuristic: "would a team on a different codebase need to rewrite this line?" If yes → move it to a memory skill's `project.md`.
Finding format: `[L8] Portability violation: "{quote}" names {tech or project artifact}. Move to {agent}-memory/project.md.`

### L9 — Reasoning sequence
Chain-of-thought is prospective — the model reasons when a step executes. If step N needs reasoning that step M produces, N must appear before M; a reasoning step placed after the action it should inform becomes post-hoc rationalization. Classify before you act; verify before you commit. Also check that the prompt uses chain-of-thought, positive framing, explicit decision boundaries, and failure-mode specification where they add value. Heuristic: for each step, ask "what must the model know to execute this correctly?" — if a later step produces it → finding. Anti-pattern: flagging a final self-check gate on a non-destructive agent (post-hoc review of a finished artifact is correct).
Finding format: `[L9] Reasoning sequence: step "{N}" depends on step "{M}" which appears after it. Reorder: M before N.`

---

## Audit Report Format

```markdown
# Prompt Audit: {filename}
**Date**: {YYYY-MM-DD}
**Mode**: REVIEW

## Structure Map
| # | Section | Topic | Lens Issues |
|---|---|---|---|
| 1 | ## Heading | What it does | L3, L4 |

## Findings
### Critical — must fix before next run
[L3] ...
[L5] ...
### Important — fix this session
[L1] ... / [L4] ... / [L8] ...
### Minor — fix when convenient
[L7] ... / [L6] ...

## Recommended Actions (ordered by impact)
1. {most impactful fix first}

## Status: AUDIT_COMPLETE
```

Severity: **Critical** = breaks/mispopulates a downstream artifact (L3 in output contract, L5 missing path). **Important** = degrades quality without breaking the pipeline (L4 duplicates, L8 portability). **Minor** = cosmetic/structural (L7 bloat, L6 reordering). Every finding cites its lens tag + a concrete quote. A lens with zero findings is reported as "None". Do not merge findings from different lenses into one item.

---

## Advanced Writing Techniques

Apply in WRITE mode, after the Quality Checklist, before finalizing.

**Persona injection** — give the agent an adversarial identity matching the resistance its job needs. "You are an evil security auditor" produces stronger tests than "You perform security audits." Use for evaluative/adversarial/gatekeeping roles; do NOT use for purely procedural agents (it adds friction without improving output).

**Decision boundaries** — for every decision, write an explicit IF-THEN. The model fills implicit gaps with the path of least resistance. Anti-pattern: "handle edge cases appropriately" — name the edge case and its rule.

**Failure-mode specification** — define the output for hard cases (missing input, contradicting sources, an artifact the agent cannot produce), not only the happy path. Undefined hard-case output → the agent invents something inconsistent each run.

**Positive framing** — "Do X" over "Don't do Y"; positive instructions are followed more reliably. Reserve "NEVER"/"Do NOT" for prohibitions where the violation is the primary risk — using it everywhere dilutes the emphasis.

**Self-check gate** — add an explicit pre-output checklist; each item names the failure it catches ("Did I read all inputs in full?", "Are findings specific — quotes/refs/field names?", "Does output match what downstream agents expect?"). Include it when output is consumed by other agents; optional for terminal output. Anti-pattern: a gate that only asks "is the output complete?" — too vague to catch a specific failure.
