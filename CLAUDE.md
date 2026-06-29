# Municipal Session Transcription Tool

## Mandatory skills — load before any task

Before touching code, UX, or making any design decision, load:

- **`proposito`** — who uses this, what problem it solves, what success looks like. Governs UX and feature priority decisions.
- **`arquitectura`** — hexagonal pattern, stack, non-negotiable decisions. Governs all code decisions.

```
Skill("proposito")
Skill("arquitectura")
```

## Quick commands

```bash
# Start the app
python run.py

# Install dependencies (first time)
pip install -e .

# Run migrations
alembic upgrade head

# Clear test data
rm data/transcriptor.db data/uploads/* data/chunks/*
```

## Key structure

```
app/domain/          ← pure entities, no frameworks
app/application/     ← use cases + ports (interfaces)
app/infrastructure/  ← concrete adapters
app/interfaces/web/  ← FastAPI routes + Jinja2 + HTMX
```

## Non-negotiable rules

- `application/` never imports from `infrastructure/`. Dependency flow only goes inward.
- `_register_nvidia_dlls()` must run in `app/main.py` at module level, before any ctranslate2 import.
- One process. Do not add external services (Redis, Celery, Postgres) without discussion.
- Phase 6 (suggestions) is planned but not implemented. Do not anticipate that logic.
