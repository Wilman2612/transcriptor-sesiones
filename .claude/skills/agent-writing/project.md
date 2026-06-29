# Agent Writing — L2: This Project's Authoring Constraints

> **Template (L2).** Fill in your project's agent-authoring constraints. The values below are the
> defaults grimorio was authored with — adjust to your platform.

## Platform

- Target platform: **Claude Code** (subagents via the Task tool; skills under `.claude/skills/`).
- Agents live in `.claude/agents/{name}.md`; skills in `.claude/skills/{skill}/SKILL.md` (+ L2/L3 files).

## Limits

- **Description field**: keep ≤ ~250 characters. It is shown in the subagent picker and used for routing — one dense sentence.
- **Agent file size**: keep lean. If an agent file grows past ~12 KB, knowledge has likely leaked from skills into L0 — move it back out.
- **Frontmatter fields**: `name` and `description` only. Do not add Copilot-era fields (`tools: agent`, `agents:`, `model: inherit`) — they are not part of the Claude Code subagent format.

## Naming

- Agent names are prefixed `grimorio.` (e.g. `grimorio.architect`). Memory skills are `{role}-memory`.

-> Universal authoring methodology: `.claude/skills/agent-writing/SKILL.md`
