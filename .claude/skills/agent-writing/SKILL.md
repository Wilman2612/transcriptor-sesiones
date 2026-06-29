---
name: agent-writing
description: "Knowledge base for writing well-structured agents, skills, and memory files in the grimorio system. Load whenever creating or rewriting any agent .md, SKILL.md, project.md, or L3 file. Contains the four-level architecture, mandatory sections, extension-point philosophy, quality tests, audit lenses, and anti-patterns."
---

# Agent Writing — Knowledge Base

This is the meta-skill of grimorio: how the agents and skills in this repo are themselves built. It is what keeps the agents **portable** (usable by any project) while project-specific knowledge stays in memory files. Read it before authoring or editing any agent or skill.

---

## The Four-Level Architecture

Every piece of knowledge or behavior belongs to exactly one level. The levels are not a hierarchy of importance — they are a hierarchy of **portability** (can it travel to another project?) and **stability** (how often does it change?).

All L1/L2/L3 files for a skill live in the **same folder**: `.claude/skills/{skill-name}/`. L2 and L3 are additional files alongside SKILL.md — not a separate directory.

| Level | File | Ask yourself | Stability |
|---|---|---|---|
| **L0** | `.claude/agents/{agent}.md` | "What should the agent DO?" | Changes only when the agent's job changes |
| **L1** | `.claude/skills/{skill}/SKILL.md` | "What is always true about this domain, regardless of project?" | Changes only when the approach is redesigned |
| **L2** | `.claude/skills/{skill}/project.md` | "What did WE decide for THIS project?" | Changes when architectural decisions change |
| **L3** | `.claude/skills/{skill}/{topic}.md` | "What is true in the current codebase right now?" | Drifts — verify before acting on it |

Example: `.claude/skills/security-memory/` contains `SKILL.md` (L1) + `project.md` (L2) + `attack-surface.md` (L3). Three files, one folder.

> **This is what makes the public repo public.** L0 and L1 are non-specific and ship with full body. L2/L3 are where a project's private decisions and codebase facts live — they ship as empty templates. Adopting grimorio = filling in L2/L3, never editing L0/L1.

### How to decide where something goes

Ask these in order. Stop at the first "yes":

1. **Is it an instruction — a step, a rule, a decision to make?** → L0
2. **Would it be true in a completely different project using the same approach?** → L1
3. **Is it a decision that WE made, a system WE chose, a name WE use?** → L2
4. **Is it a concrete fact that could change as the code evolves?** → L3

Common failure: placement decided after writing. Content placed "temporarily" in the wrong level rarely gets moved.

---

## How Levels Reference Each Other

Levels connect through explicit pointers, not implicit convention.

**Agent → Skill (L0 → L1)**: the agent declares loaded skills in frontmatter and references them by name when delegating knowledge — it never copies criteria inline.

```markdown
3. Choose the approach. Consult `domain-discovery` skill → "## Selection Criteria".
```

**Skill → L2 (L1 → project.md)**: at the point where a project decision is needed, add a pointer:

```markdown
## Authentication Patterns
{universal criteria here}

-> This project's auth system: `.claude/skills/security-memory/project.md` → "Auth Architecture"
```

**Skill → L3 / L2 → L3**: when L1 or L2 describes an area with known operational traps, point to the L3 file (`-> Known traps: .claude/skills/developer-memory/traps.md`). L3 files are named by topic, not agent — multiple agents can reference the same one.

**What "loading a skill" means**: the agent gains access to SKILL.md AND all L2/L3 files under that skill folder. It reads the sub-files it needs. Reading only SKILL.md is fine when L2/L3 aren't relevant; ignoring L2/L3 when the task involves project-specific or operational facts is not.

---

## What Each Level Looks Like

### L0 — Behavior in the agent file

L0 contains steps, decisions, and rules — things the agent executes. **No facts, no lists of options, no technology names.**

```markdown
## Steps
1. Read all input files completely before writing anything.
2. If two files contradict each other → write both as a [ ] gap item. Never silently pick one.
3. Write the analysis file. NEVER present findings inline before the file exists.
```

Naming the auth system, billing provider, or any project concept inside the agent file is a violation — those belong in the loaded skills.

**Behavior vs knowledge (single contrast):**

- Correct (L0): `Apply selection criteria from {domain}-memory → "## Approach Selection".`
- Wrong (L1 leaked into L0): `Choose by checking performance, complexity, maintainability, team familiarity.`

If a sentence would remain true across many projects, it is knowledge (skill), not behavior (agent step).

### L1 — Universal Knowledge in SKILL.md

L1 contains criteria, patterns, and methodology useful in any project. **No decisions, no project names, no file names.** A good L1 section has criteria, examples, heuristics, and anti-patterns (see Ecosystem Assessment → Sufficient content).

### L2 — Project Decisions in project.md

What THIS team decided and why. Provider names, tier names, topology. **No file names, no commands, no env var names** (those are L3).

```markdown
## Billing
We use {provider} for billing. Webhooks are signature-verified but otherwise unauthenticated.
Tiers: FREE, PRO, PREMIUM. ADMIN is assigned manually.
```

### L3 — Operational Facts in {topic}.md

Concrete, verifiable, consequential facts. **Verify in code before acting — these can be stale.** Specific file names, exact env var names, exact function names, traps, commands.

**L2 vs L3 rule of thumb**: if you can name it without knowing today's codebase state, it's L2. If you need to look at the current code to verify it's still true, it's L3. A flat list with no behavioral consequence ("`src/components/` has 23 files") has no value at any level.

---

## One Agent, Multiple Skills

An agent should load multiple skills when it needs knowledge from different domains — that is correct design, not bloat.

| Situation | Do this |
|---|---|
| The agent needs knowledge from a new domain | Add a skill to the existing agent |
| The work requires a completely different role/perspective | Create a new agent |
| The existing agent's job would double in scope | Create a new agent |
| The agent needs project-specific context | Add L2 to an existing skill |

The 1:1 fallacy — "each agent needs exactly one skill" — is wrong. Skills are knowledge modules; an agent assembles what it needs.

---

## Quality Standards for Agents

**Portability** — a sentence in an agent file passes if a team on a completely different project could use it without rewriting it. (Exception: grimorio framework vocabulary — `po-brief.md`, `SHIP`, `REWORK`, `grimorio.architect` — travels with the framework.)

**Completeness** — a well-written agent makes the user never need to repeat an instruction. Completeness applies to the agent and all its loaded skills together: "consult the `foo` skill for criteria" while `foo` has no such section is incomplete.

**Coherence** — every claim is consistent with every other. No section contradicts another; no concept appears twice, even under different names. Especially important after iterative edits — LLMs add content without scanning for existing coverage.

---

## Audit Lenses

When reviewing an existing agent or skill, apply these in addition to the three Quality Standards. They catch problems that accumulate from incremental patching.

> For the full nine-lens audit with finding formats and an audit-report template (general to any prompt), use the **`prompt-writing-quality`** skill. The table below is the quick reference for the agent-specific lenses while writing.

| Lens | What to check |
|---|---|
| **Language** | All instruction text is in English. Examples may show other languages; the surrounding instruction must be English. |
| **Example hygiene** | Examples use invented placeholders, never real codebase artifacts — no actual file paths, class names, env var names, or routes from the project. |
| **Section ordering** | Prerequisites appear before the steps that use them. A first-time reader never needs to jump ahead. |
| **Bloat** | Each section adds clarity, not just length. Flag obvious examples, caveats that restate other rules, mergeable sections. |
| **Encoding** | Scan for mojibake (`â€"`, `â†'`, `â€¦`); replace with the correct UTF-8 equivalent (`—`, `→`, `…`) or remove if decorative and unrepairable. |
| **Portability** | No project-specific tech/architecture/paths in L0/L1. Would a team on a different codebase need to rewrite this line? If yes → move to a memory skill's project.md. |

---

## Ecosystem Assessment

Used while building or rewriting an agent. Three audits apply.

### Knowledge audit

For each concept the agent needs: Is it in a skill, not inline? Is the content **sufficient**? Is it at the right level? Is it consolidated (not duplicated with diverging wording)? Are domain terms used consistently across files? Does every output-template section have a skill section backing it?

**Template coverage test** — for each section in the agent's output template: *"If I gave only the column headers and placeholder text to ten agents, would they put the same type of content in each row?"* If not, the section requires skill coverage. The trap is sections that feel obvious but require classification (deciding *what counts as an item* is a classification decision).

**Sufficient content** — a reader can act on the section without guessing. The test: if you removed the section and asked the agent to make the same decision, would it produce the same result every time? Structural presence is not sufficient — a table with headers but no selection logic does not answer *under what conditions do I choose X over Y?*

A well-written skill section has four elements, each closing a failure mode:

| Element | What it is | Failure mode it closes |
|---|---|---|
| **Criteria** | "Use X when Y. Do NOT use X when Z." | Without it, the model defaults to whatever it has seen most |
| **Examples** | One concrete correct instance (+ ideally one non-obvious non-applying case). Format/syntax sections require a working, copy-pasteable example. | Without it, the model interprets the rule with least resistance |
| **Heuristics** | "When in doubt between X and Y, ask yourself Z" | Without it, the model freezes or guesses on ambiguous cases |
| **Anti-patterns with cause** | "Do NOT do X — if you do, Y happens" | Without the cause, the rule is not internalized |

Simple facts need only criteria; complex judgments need all four. **The conciseness trap**: skills get written too briefly because brevity feels professional — but an agent has no fallback for vague guidance and fills gaps with prior training, producing inconsistent runs. Two sentences rarely define a judgment-requiring concept. Apply the 10-inputs test.

### Detecting semantic duplication

Two sections are duplicate when they answer the same question, even with different headings and wording. Tests: **Removal** (remove one — would output be identical?), **Question** (state what question each answers — equivalent?), **Layer** (is one a definition and the other a checklist restating it?). Canonical-location rule: one place holds the full content, the other is a pointer (`-> See {section}`).

### Behavior audit

Does the agent have selection criteria for its domain? Is every decision an explicit IF-THEN? Are hard cases covered (missing input, conflicts, empty results)? Is the output contract complete *and* minimal (no reusable domain templates embedded in L0 that belong in skills)? Are exit/escalation conditions defined?

---

## Anti-Patterns

| Anti-pattern | Example | Why it's bad |
|---|---|---|
| Knowledge in L0 | "Use {provider} for billing." inside an agent file | Can't be adopted by another project without editing |
| Behavior in L1 | "Step 1: read the notes files." inside SKILL.md | L1 becomes a second agent — the agent file is no longer the full story |
| Project decisions in L1 | "We use tiers FREE/PRO/PREMIUM." in SKILL.md | Leaks project-private info when L1 is shared |
| File names in L2 | "`src/lib/auth.ts` handles auth." in project.md | Stale when files move — operational data belongs in L3 |
| Flat lists in L3 | "`src/components/` has 23 files." | No behavioral consequence = no value |
| Template for another agent's output | Agent A holds the template for Agent B's artifact | Each agent owns its own output template |
| One skill per agent assumed | Agent loads only one skill "because that's how it's done" | Skills are modules — load as many as needed |
| Same concept in two files | Two skills define a term with slightly different wording | Pick one canonical location; point the other to it |

### Transparency principle

The agent file is the single source of truth for what the agent does. A reader should understand the agent's complete behavior from that file alone. Skills add *knowledge* — criteria, patterns, vocabulary — never *steps*. Test: after reading only the agent file, can you fully predict what it will do? If you'd need to open a skill to find a missing step, behavior has leaked into L1.

### The extension-point philosophy

L1/L2/L3 are **modification points** — they exist so the agent (L0) never needs to change when the project changes. L1 holds the universal criterion; L2 extends it with a project decision; L3 extends with operational facts. A maintainer customizing an agent for their project will **rarely edit the agent file** — they add to L2/L3. If you find yourself editing L0 to customize, ask: is this knowledge that's missing from L2/L3?

---

## What a Well-Written Agent Contains

Every agent file must have these sections, in this order.

### 1. Frontmatter
```yaml
---
name: grimorio.{role}
description: "{role} — what it does, when invoked, what modes if any. One sentence."
---
```
In Claude Code, subagents are invoked via the Task tool; there is no `agents:` whitelist or `tools: agent` field (those are Copilot-specific). Keep frontmatter minimal: `name` + `description`. The orchestrator passes all context in the invocation prompt — subagents do not inherit conversation history, so every invocation must include mode, slug, artifact paths, and the specific instruction.

### 2. Identity paragraph
Who the agent IS — role, not task. 2–4 sentences. State what it does NOT do. Don't name the project/tech/framework (those live in loaded skills). **Persona injection**: give adversarial/gatekeeping agents a tension-creating identity ("You are an evil-genius security auditor" yields stronger tests than "You perform security audits"). Skip for purely procedural agents.

### 3. Core rules (if any)
Non-negotiable constraints that override everything. 1–4 max. Bold the trigger. More than 4 → some belong in Rules.

### 4. Steps / Protocol
The behavior. Numbered for sequence; `if X → do Y` for conditionals; one decision per step. **Decision boundaries**: every decision gets an explicit IF-THEN — the model fills implicit gaps with the path of least resistance. **Failure-mode specification**: define the output for hard cases (missing input, contradictions), not just the happy path.

### 5. Output section
The binding output contract: exact file name and path, format (inline or via skill pointer), disk-before-chat rule if applicable ("Write first, report only the path"), and which sections to omit when empty.

### 6. Self-check gate (when output is consumed by other agents)
An explicit list run before producing output: "Did I read all inputs in full? Are findings specific (quotes, refs, field names)? Does output match what downstream agents expect?" Each check names the failure it catches. Optional for terminal-output agents.

### 7. Rules section
Edge cases, forbidden behaviors, escalation triggers. **Positive framing**: "Do X" over "Don't do Y"; reserve NEVER for prohibitions where the violation is the primary risk.

---

-> For this project's agent-authoring constraints (description char limit, file size limit, platform specifics): read `.claude/skills/agent-writing/project.md`
