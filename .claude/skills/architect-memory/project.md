# Architect Memory — L2: This Project's Architectural Decisions

> **Template (L2).** Fill in what YOUR team decided. No file names, commands, or env var names here
> (those are L3 — create `architect-memory/{area}.md` for them). Delete the bracketed prompts as you go.

## Stack & Topology
- [Monorepo / single app? Which services exist and what each owns.]
- [Frontend framework, backend runtime, how they communicate.]

## Folder Map (the architect's map of where things live)
- [domain / application / infrastructure / presentation — where each lives in this repo.]
- [Where repositories, handlers, the composition root, and route guards live.]

## Persistence
- [ORM / database. Where migrations live. Dual-schema or single?]

## Auth
- [Auth provider. Where the tier/role check runs relative to auth.]

## Billing / Tiers (if any)
- [Provider. Tier names. How tier is synced.]

## Conventions WE chose
- [Naming conventions, error-handling style, any project-specific pattern not in development-patterns.]

-> Universal principles: `.claude/skills/architect-memory/SKILL.md`
-> Operational facts and traps: create `.claude/skills/architect-memory/{area}.md` (L3)
