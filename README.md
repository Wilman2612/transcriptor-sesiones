# Municipal Session Transcription Tool

AI-assisted tool that turns long municipal council recordings into a transcript you can
**review and correct easily**, and export as an official **acta** (minutes) in Word. It's built
for a **non-technical reviewer** who only needs to fix the few things the AI was unsure about,
instead of typing hours of audio by hand.

> This repository contains no real audio and no real names — all sample data is fictional
> (see [Privacy](#privacy)).

---

## Easy install (Windows)

No programming knowledge required. You only need Windows 10/11 and an internet connection
(during install only). An NVIDIA graphics card makes it much faster but isn't required.

1. **Download the whole project.** On the GitHub page: green **Code → Download ZIP** button (or
   download the latest *release* ZIP if there is one).
2. **Unzip** it wherever you like (for example, in *Documents*).
3. **Double-click `INSTALAR.bat`.** Accept the Windows prompt (it asks for administrator
   permission). The installer does everything on its own: installs Python, ffmpeg and the
   libraries, downloads the AI model that fits your PC, and creates a desktop shortcut. The first
   time takes a few minutes.
4. **To use it:** double-click **"Transcriptor Municipal"** on the desktop (or `INICIAR.bat`
   inside the folder). It opens by itself in your browser.

If anything fails, the installer tells you what happened in plain language and how to continue.

> Your sessions are saved under **Documents → Transcriptor Municipal**, *outside* the program
> folder, so they survive if you re-download or re-extract the ZIP. The program folder itself can
> be deleted and reinstalled without losing your work.

## How to use it

1. **Upload** the session recording (and, if you have it, the phone's automatic transcript with
   the speaker labels).
2. **Wait** for the AI to transcribe (you'll see a progress bar).
3. **Review**: the text reads like a Word document. The words the AI was **unsure** about are
   highlighted — hover to see the timestamp and confidence, and fix them. You can:
   - move a slider to highlight more or fewer words by confidence,
   - name every speaker at once,
   - reprocess a stretch that came out wrong,
   - drop a **bookmark** to resume the review later.
4. **Export** the final acta to Word.

---

## For developers

The technical goal of this project is a clean **hexagonal architecture (ports & adapters)**. The
dependency rule is strict: it only ever points inward.

```
app/
  domain/          ← pure entities, no frameworks
  application/     ← use cases + ports (interfaces). Never imports infrastructure.
  infrastructure/  ← concrete adapters (Whisper, audio, persistence, jobs)
  interfaces/web/  ← FastAPI: JSON API at /api + serves the React SPA at /app
web/               ← React + TypeScript frontend, decoupled via REST + Storybook
```

The Whisper backend (local `faster-whisper` or the OpenAI API), the speaker aligner and the
(planned) suggestion engine are isolated behind interfaces so they can be swapped without
touching business logic. The frontend talks to the backend **only** through the REST contract,
and every UI state is materialized as a Storybook story against a fake adapter — so the UI can be
built and reviewed without a running backend.

**Stack:** Python 3.11+, FastAPI, SQLAlchemy 2.0 + SQLite, faster-whisper / OpenAI, a background
job worker in a single process (no Redis/Celery) · React 19, TypeScript, Vite, TipTap, Storybook.

### Development setup

Requires **ffmpeg** on the system.

```bash
# Backend
pip install -e .
python run.py            # migrates + serves on http://localhost:8000 (opens /app)

# Frontend (separate terminal) — only if you're touching the UI
cd web
npm install
npm run dev              # Vite dev server with hot reload
npm run storybook        # component gallery on :6006
npm run build            # regenerates the static build (web/dist)
```

> **Note:** the static React build (`web/dist`) is **committed to the repo** on purpose, so the
> end user doesn't need Node. If you change the UI, rebuild with `npm run build` and commit
> `web/dist`. FastAPI serves it at `/app`.

---

## Privacy

The tool processes **personal data** (voices and names in council sessions). The repo is built so
none of it leaks:

- Real audio and the phone's transcript live in `sample/` and `data/`, both **gitignored**.
- The real roster of council members lives **only in the local database**, never in code.
- All fixtures, stories and docs use a **fictional** roster.

## Status

Phases 0–5 are implemented (scaffolding → audio → transcription → speaker alignment → review →
export). **Phase 6 — automatic suggestions** (learning from the correction history) is designed
but not yet built.

## License

MIT — see [LICENSE](LICENSE).
