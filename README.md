# Municipal Session Transcription Tool

AI-assisted tool to turn long municipal council recordings into a reviewable, correctable
transcript — and finally into an official *acta* (minutes) document. Built around a
**non-technical reviewer** who needs to fix only what the AI got wrong, not retype hours of audio.

> Real audio and real council-member names are **never** committed (see [Privacy](#privacy)).
> Everything in this repo uses fictional sample data.

## The problem

A clerk at the Municipalidad Distrital de Subtanjalla (Peru) records 3–4 hour council
sessions on a phone and must produce a written *acta*. Manual transcription is slow and
tedious. Off-the-shelf auto-transcription is ~95% right — but the wrong 5% is exactly the
hard part: **proper names, surnames and legal terms**.

So the tool doesn't try to be perfect. It transcribes, **measures per-word confidence**, and
puts the reviewer's eye straight on the doubtful words — leaving the 95% it got right alone.

## What it does

- **Transcribes** with Whisper (local `faster-whisper` on GPU, or the OpenAI API) behind a
  single swappable port.
- **Anti-hallucination decoding** params + a *reprocess-in-isolation* action to recover the
  garbage stretches that crosstalk produces.
- **Per-word confidence highlighting** with a live threshold slider — the reviewer decides how
  picky to be.
- **Word-style rich editor** (TipTap): edit the text like a document; confidence/time metadata
  lives in hover, grouped by speaker turn.
- **Glossary biasing**: council names and error-prone terms are fed to Whisper as an
  `initial_prompt` (with a live token counter against the prompt limit).
- **Speaker naming** from the phone's diarization, with a speech sample per speaker.
- **Bookmark** to resume a long review where you left off.
- **Export** to a DOCX *acta* in the official format.

## Architecture

The point of this project is a clean **hexagonal architecture (ports & adapters)**. The
dependency rule is strict: it only ever points inward.

```
app/
  domain/          ← pure entities, no frameworks
  application/     ← use cases + ports (interfaces). Never imports infrastructure.
  infrastructure/  ← concrete adapters (Whisper, audio, persistence, jobs)
  interfaces/web/  ← FastAPI: JSON API (/api) + legacy HTMX/Jinja2
web/               ← React + TypeScript frontend, decoupled via REST + Storybook
```

Why it's built this way: the Whisper backend, the speaker aligner and the (planned)
suggestion engine are all pieces that will change. Isolating them behind interfaces means
they can be swapped without touching business logic. The React frontend talks to the backend
only through the REST contract, and every UI state is materialized as a Storybook story
against a fake adapter — so the UI can be built and reviewed without a running backend.

## Tech stack

**Backend**: Python 3.11+, FastAPI, SQLAlchemy 2.0 + SQLite, faster-whisper / OpenAI,
a background job worker (one process — no Redis/Celery).
**Frontend**: React 19, TypeScript, Vite, TipTap, Storybook.

## Getting started

Requires **ffmpeg** on the system. GPU transcription needs a CUDA-capable card (CPU works too,
slower).

```bash
# Backend
pip install -e .
python run.py            # migrates + serves on http://localhost:8000

# Frontend (separate terminal)
cd web
npm install
npm run dev              # Vite dev server
npm run storybook        # component gallery on :6006
```

On Windows, `INSTALAR.bat` / `INICIAR.bat` wrap install and launch for the non-technical user.

## Privacy

This is a tool that processes **personal data** (people's voices and names in public-but-sensitive
council sessions). The repo is built so none of that leaks:

- Real audio and the phone's transcript live in `sample/` and `data/` — both **gitignored**.
- The glossary roster (real council names) lives **only in the local database**, never in code.
- All fixtures, stories and docs use a **fictional** roster.

## Status

Phases 0–5 are implemented (scaffolding → audio → transcription → speaker alignment → review →
export). **Phase 6 — automatic suggestions** (learning corrections from history) is designed
for but not yet built.
