---
name: frontend-development
description: "Frontend architecture for building UI decoupled from the backend: DAL / Ports & Adapters, Functional Core / Imperative Shell, Fake adapters, Storybook per named state, and the dev:fake runtime. Load when building or testing any frontend component or page."
---

# Skill: frontend-development

The frontend is built as an **independent system** that runs and is tested without a live backend. This is what lets frontend and backend proceed in parallel, and what makes every UI state inspectable in isolation.

> This skill assumes a Next.js App Router + TypeScript frontend living under `web/`. Adapt the paths to your stack, but keep the layering rule intact: **components never call `fetch()`, ORM clients, or SDKs directly.**

---

## Section 0 — The test projects

A mature frontend ships with its own test surfaces, separate from the backend:

| Project | Scope | Command |
|---|---|---|
| Frontend unit (Vitest) | Functional Cores with FakeAdapter | `npm --prefix web run test` |
| Storybook (visual) | One Story per named component state | `npm --prefix web run storybook` |
| Storybook tests (headless) | Story smoke tests | `npm --prefix web run test:storybook` |
| dev:fake (runtime) | Whole app on deterministic fake data | `npm --prefix web run dev:fake` |

If any of these is missing when a feature needs it, that is a delivery gap — report it, don't improvise around it.

---

## Section 1 — The Dependency Rule (DAL / Ports & Adapters)

```
Server Component (page.tsx)
    ↓
DAL Interface / Port      ← TypeScript interface — never changes when the impl changes
    ↓
FakeAdapter (tests/dev)   |   RealAdapter (production)
```

The Server Component knows only the **interface**. Components and hooks **never** call `fetch()`, ORM bindings, or SDKs directly.

- `IXxxRepository` interface lives in `web/src/lib/data/` — **no** `import 'server-only'` (the FakeAdapter must import it in Storybook and Vitest).
- `FakeXxxAdapter` — covers all named states, exports `FAKE_RECORDS` for Stories — **no** `server-only`.
- `RealXxxAdapter` — `import 'server-only'` goes **here**, and only here.
- `getRepository()` in `web/src/lib/data/getRepository.ts` — the single place that picks the adapter.

```ts
// web/src/lib/data/getRepository.ts
export function getRepository(): IXxxRepository {
  if (process.env.USE_FAKE_ADAPTER === 'true') return new FakeXxxAdapter();
  return new RealXxxAdapter();
}
```

---

## Section 2 — Functional Core / Imperative Shell

The data-fetching logic ("Functional Core") goes in `web/src/lib/xxxData.ts`, **not** in `page.tsx`. If it lives in `page.tsx`, Vitest imports the whole module and `notFound()`, `redirect()`, `import 'server-only'` break the tests.

```ts
// ✅ web/src/lib/catalogData.ts — Functional Core (pure, no Next.js runtime imports)
export async function fetchCatalogData(repo: IXxxRepository) {
  const { items, total } = await repo.list();
  return { firstPage: items.slice(0, PAGE_SIZE), totalCount: total };
}

// ✅ web/src/app/catalog/page.tsx — Imperative Shell
import { getRepository } from '@/lib/data/getRepository';
import { fetchCatalogData } from '@/lib/catalogData';

export default async function CatalogPage() {
  const data = await fetchCatalogData(getRepository());
  return <CatalogClient {...data} />;
}

// ✅ web/src/lib/__tests__/catalogData.test.ts — direct injection, no env var
test('happy path', async () => {
  const { firstPage } = await fetchCatalogData(new FakeXxxAdapter('happy'));
  expect(firstPage.length).toBeGreaterThan(0);
});
```

Tests import the Functional Core from `lib/`, **never** from `app/`. Tests inject the Fake directly; they never call `getRepository()`.

---

## Section 3 — Named states (mandatory)

| State | What it shows |
|---|---|
| `loading` | Skeleton or spinner |
| `empty` | Empty-list message |
| `error` | Error message + retry affordance |
| `happy` | Normal data |

The FakeAdapter **must** support all four. Inspect each one in **Storybook** (one Story per state) — never with env vars, URL params, or special `/mockup` routes (those leak into the production bundle).

---

## Section 4 — Storybook

For any component with more than one named state:

1. If Storybook isn't installed: `cd web && npx storybook@latest init --yes`, add `"storybook": "storybook dev -p 6006"`.
2. Create `web/src/components/__stories__/{Component}.stories.tsx` — one Story per named state.
3. Stories use `FAKE_RECORDS` from the FakeAdapter — never real fetches, never hardcoded data.
4. Import the global CSS in `.storybook/preview.ts` — without it, Stories render unstyled and every visual check is invalid.

Story URL for clean screenshots (no Storybook chrome):
```
http://localhost:6006/iframe.html?id=<title-kebab>--<export-kebab>&viewMode=story
```

---

## Section 5 — dev:fake (deterministic whole-app runtime)

```json
"dev:fake": "cross-env USE_FAKE_ADAPTER=true next dev -p 8000"
```

`dev:fake` runs the full app on the FakeAdapter — deterministic data, no CDN, no live backend. Pages use `getRepository()`; the env var picks the Fake. The result count in the UI must match the FakeAdapter's record count exactly — if it doesn't, the real data source is leaking through and the run is invalid.

---

## Common Errors

| Error | Consequence | Fix |
|---|---|---|
| `fetch()` inside a component | Invisible coupling | Move it to the DAL adapter |
| `import 'server-only'` in the interface | FakeAdapter can't import it in Storybook/Vitest | Only in the RealAdapter |
| `import 'server-only'` in the FakeAdapter | Storybook and Node tests break | Only in real adapters |
| Functional Core private in `page.tsx` | Not importable in `lib/__tests__/` | Move to `lib/xxxData.ts` |
| Tests importing from `@/app/.../page` | `notFound()`/`server-only` break Vitest | Import the Core from `@/lib/...` |
| `USE_FAKE_ADAPTER` checked in every page | Change logic = change N files | `getRepository()` factory, one place |
| Env vars / `?prototype=1` / `/mockups` to see states | Pollutes production bundle | Storybook, one Story per state |
| Only the happy state covered | App breaks in production | Add `empty`, `error`, `loading` |
