---
name: proposito
description: Purpose, real user, and goals of the Municipal Transcription Tool. Load this before making any UX, feature, or priority decision.
---

# Purpose — Municipal Session Transcription Tool

## The real problem

The Municipality of Subtanjalla records council sessions of 3–4 hours using a Samsung Galaxy S24. The S24 produces an automatic transcription with timestamps and speaker labels, but quality is low: misrecognized words, cut phrases, incorrect legal and municipal terminology. Manual correction is slow and tedious.

## User

**A single non-technical person** on Windows. Does not know what a terminal, virtualenv, or Python is. Will not read a README. Must be able to install and use the tool independently.

Success criteria from their perspective:
- Double-click and it works.
- Upload audio, wait, review, export. Nothing else.
- If something goes wrong, the error message tells them what to do — not a stack trace.

## What we are trying to achieve

1. **Reduce correction time, not eliminate it.** The tool will not be perfect — Whisper `large-v3` can fail on proper names, legal jargon, or overlapping voices. The goal is that most of the text is already correct, and what isn't is marked and easy to find.

2. **Reuse the work the S24 already did.** The S24 transcript file has speakers identified. We do not reinvent diarization — we temporally align S24 segments with Whisper segments.

3. **Learn from the correction history** (Phase 6, future). Every correction is stored. Eventually, when the same mistranscribed term appears again, the system can suggest the fix. This requires embeddings + semantic search — it is planned in the data schema but not yet implemented.

4. **Be a portfolio piece.** Architecture quality, code clarity, and technical decisions matter beyond functionality. This should be something worth showing.

## What this tool is NOT

- Not a SaaS. Runs locally on the user's machine.
- Not a multi-user system. One user, one machine, one installation.
- Not a replacement for human review. Review is part of the flow, not a bug.
- Not an advanced diarization system. Pyannote and similar are out of scope for now.

## Phases

| Phase | Status | Description |
|-------|--------|-------------|
| 0–5 | ✅ Done | Scaffolding, audio preprocessing, transcription, S24 speaker alignment, HTMX review UI, TXT/DOCX export |
| 6 | 🔜 Pending | Suggestion engine: embeddings + cheap LLM over correction history |

-> Technical decisions that implement this purpose: `.claude/skills/arquitectura/project.md`
