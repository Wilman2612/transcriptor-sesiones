# Frontend — Municipal Session Transcription Tool

React + TypeScript + Vite frontend, decoupled from the FastAPI backend through the REST `/api`
contract. See the [root README](../README.md) for the full project.

## Scripts

```bash
npm install
npm run dev          # Vite dev server (proxies /api to the backend on :8000)
npm run build        # type-check + production build
npm run storybook    # component gallery on http://localhost:6006
npm run lint         # oxlint
```

## How it's structured

- `src/lib/data/` — the **DAL**: `IReviewRepository` / `ISessionsRepository` interfaces, with a
  `Real*` adapter (hits `/api`) and a `Fake*` adapter (in-memory, deterministic) for Storybook
  and tests.
- `src/components/` — presentational + container components. Each meaningful UI state has a
  Storybook story in `__stories__/` rendered against the fake adapter, so the UI is built and
  reviewed without a running backend.
- `src/editor/` — the TipTap rich-text editor: a custom word-metadata mark and a confidence
  "doubt" decoration driven by the threshold slider.
- `src/pages/` — routed screens (upload, progress, review, glossary, speakers).

All sample data is fictional — no real names. See the root README's Privacy section.
