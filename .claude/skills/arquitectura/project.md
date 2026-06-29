# Architecture — Project Decisions

## Core pattern: Hexagonal (Ports and Adapters)

**Decision**: all business logic lives in `app/domain/` and `app/application/`. No concrete adapter (SQLAlchemy, faster-whisper, HTMX) crosses that boundary.

**Why**: the transcription backend can change (local ↔ OpenAI API), the Phase 6 suggestion engine will replace a stub, and the DB could migrate. The `TranscriberPort` interface lets us swap the backend without touching the use case. It is also the portfolio centerpiece: it demonstrates the hexagonal pattern clearly.

**Rule**: if a class in `application/` imports anything from `infrastructure/`, it is broken. Dependency flow only goes inward.

```
domain/         ← pure Python, no frameworks
application/    ← use cases + ports (abstract interfaces)
infrastructure/ ← concrete adapters (implement the ports)
interfaces/web/ ← FastAPI routes + Jinja2 templates
```

## Stack — why each piece

| Technology | Reason | What we did NOT use and why |
|---|---|---|
| **FastAPI** | async, typed, Pydantic built-in | Flask: no native async |
| **HTMX** | interactivity without an SPA, same person handles server | React/Vue: overkill for a local single-user tool |
| **SQLite + SQLAlchemy 2.0** | zero infrastructure, portable as a file | Postgres: unnecessary for one local user |
| **faster-whisper** | 4× faster than original whisper, same models | whisper original: slower with no advantage |
| **pydub** for chunking | silence detection without C dependencies | webrtcvad: requires compilation on Windows |
| **noisereduce + ffmpeg** | robust audio preprocessing | librosa: heavier, same result |
| **Background thread** | background jobs with no extra infrastructure | Celery/Redis: unnecessary for 1 user |
| **Alembic** | controlled migrations | `create_all` in prod: loses history |

## One process, one command

`python run.py` does everything: migrates the DB, starts the background worker, opens the browser, serves the app. No separate services, no `docker-compose`, no multiple terminals.

**Why**: the target user cannot manage multiple processes. The installer does everything once (`instalar.ps1`), then it is double-click.

## Transcription: local first, OpenAI as fallback

- Default: `faster-whisper` with `large-v3` on GPU (RTX 2060 Max-Q).
- Fallback: OpenAI Whisper API if `WHISPER_BACKEND=openai` + `OPENAI_API_KEY` are set.
- Both implement `TranscriberPort` — the use case does not know which one is running.
- Config in `.env`: `WHISPER_MODEL`, `WHISPER_DEVICE`, `WHISPER_BACKEND`.

## CUDA on Windows: PATH, not add_dll_directory

`os.add_dll_directory()` only affects Python's DLL loader. ctranslate2 uses Windows `LoadLibrary()` which reads `PATH`. The `_register_nvidia_dlls()` function in `app/main.py` adds pip's `nvidia/*/bin` dirs to the process `PATH` **before any ctranslate2 import**. This must run at module level, not inside a function.

**Never move** this call to a place that executes after ctranslate2 has been imported.

## Speakers: temporal alignment with the S24, no own diarization

The S24 exports a UTF-16 LE transcript with format `Hablante X  (MM:SS)\n text`. The parser (`s24_parser.py`) reads that file and the aligner (`speaker_aligner.py`) assigns to each Whisper segment the S24 speaker with the greatest temporal overlap.

We do not do diarization with pyannote or similar. If the S24 file is not provided, segments remain without a speaker label.

## Confidence and inaudibles

`avg_logprob` from faster-whisper is converted to [0,1]: `confidence = 1.0 + avg_logprob / 5.0`. If `no_speech_prob > 0.6`, it is penalized × 0.3. Below the `CONFIDENCE_THRESHOLD` (default 0.4), the text is marked as `[inaudible] {original text}` — the original text is preserved because the reviewer may need it.

## Chunking: silence window [min, max]

Audio is cut at the longest silence within the window `[chunk_min_seconds, chunk_max_seconds]` (default ~600–780s). If no silence is found, a hard cut is made at the limit. This avoids cutting mid-sentence and keeps chunks at a reasonable size for Whisper.

## Phase 6 — planned, not implemented

The `corrections` table has an `embedding` column (LargeBinary, nullable). The `SuggestionPort` is defined in `application/ports.py` with a stub adapter. When Phase 6 arrives: semantic search over correction history + cheap LLM to propose corrections. Do not anticipate this logic in code that does not need it yet.
