---
name: development-patterns
description: "Architectural patterns for a Clean Architecture TypeScript codebase: the mandatory patterns, the forbidden anti-patterns, structural hard limits, and pattern-composition heuristics. Load when writing, reviewing, or refactoring code. Tells you WHERE code goes and HOW to wire the layers."
---

# Skill: development-patterns

Apply these rules on every code write, review, or refactor.

> **Related skill**: `javascript` covers language-level standards (naming, async, formatting, SOLID). This skill covers **architectural patterns**: `javascript` tells you *how to write the code*, this skill tells you *where to put it and how to wire the layers*.
>
> These patterns assume a Clean Architecture layout (`domain → application → infrastructure → presentation`). The names of your auth provider, ORM, and DI container are placeholders — keep the *boundaries*, swap the *tools*.

---

## Mandatory Patterns — Cheat Sheet

| # | Pattern | When | Hard Rule |
|---|---------|------|-----------|
| 1 | **Repository** | Any persistence access | Zero ORM imports in `application/` or `domain/` |
| 2 | **Adapter (Port + Impl)** | Any external SDK/service | Zero raw SDK imports in `application/` or `domain/` |
| 3 | **Dependency Rule** | Always | `domain/` only imports from `domain/` |
| 4 | **Domain Events** | Any command that mutates state | Mutating command handlers publish an event |
| 5 | **CQRS** | Any business operation | Commands mutate + emit; Queries are read-only |
| 6 | **Handler / Use Case** | Any API route or job | Route ≤ 80 lines; delegates to a handler |
| 7 | **Strategy** | ≥2 behavioral variants | No long if-else / switch chains |
| 8 | **Factory / Builder** | Complex object creation | Aggregates use static factory methods |
| 9 | **Result / Error Object** | Expected business failures | Never `throw` for business errors — use `Result<T, E>` |
| 10 | **Mapper** | Persistence model ↔ domain entity | In `infrastructure/.../mappers/` |
| 11 | **Dependency Injection** | Any class with external deps | Constructor injection; wired in the composition root |
| 12 | **Policy Object** | Rules that change independently | Extract to a standalone policy class |
| 13 | **Template Method / Pipeline** | Fixed stages, variable impls | Don't inline stages in one function |
| 14 | **Route Guard** | Every authenticated route | Wrap via the shared guard — never manual `getCurrentUser()` in route files |

---

## Structural Hard Limits

- File: max **500 lines**
- Function body: max **20 lines** (inside `{}`, excluding signature and braces)
- Route handler: max **80 lines**
- Module function count: max **20**
- **Zero** direct ORM imports outside the persistence layer
- **Zero** direct SDK imports outside `infrastructure/`

---

## Anti-Patterns — Never Do

- **Magic strings for error discrimination** — `if (err.message === "Already premium")`. Use typed errors with a `code`.
- **Magic strings for domain constants** — `?? "FREE"` scattered around. Extract a named domain constant.
- **Fat route handler** with orchestration or business logic.
- **Patch over patch** — a workaround on top of a structural problem instead of fixing the layer.
- **Cross-layer shortcut** — calling the ORM from a route, calling a repository from a domain entity.
- **God module** — one file with many responsibilities.
- **Boolean/flag explosion** — multiple boolean params controlling branches.
- **Impure free function** — a standalone function that does I/O, reads `process.env`, or calls an external service. Free functions must be pure; the moment one crosses I/O, env, or a dependency, it becomes a class method with injected dependencies.

---

## Free Function vs Class Method — Decision Rule

A free function is valid **only** when all three hold: (1) no I/O, (2) doesn't read `process.env` in its body, (3) calls no external service or singleton. If any fails, the logic belongs in a class method with constructor-injected dependencies.

```typescript
// ❌ Looks like a helper — actually untestable
async function notifyUser(userId: string) {
  const db = new DatabaseClient();                        // hidden I/O
  const user = await db.users.findById(userId);
  await fetch(process.env.NOTIFY_URL + "/push", { ... }); // env read at call time
}

// ✅ Same logic — dependencies explicit, injectable, mockable
class UserNotificationService {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly pushClient: IPushClient,
  ) {}
  async notify(userId: string): Promise<void> {
    const user = await this.userRepository.findById(userId);
    await this.pushClient.send({ recipientId: user.id });
  }
}
```

A free function that hides I/O cannot be unit-tested without real infrastructure. `process.env` read at module load is captured once — tests that change it afterward see the stale value. Inject the value, or read it inside the method.

---

## Typed Domain Errors

```typescript
export type BillingErrorCode = "ALREADY_PREMIUM" | "CUSTOMER_NOT_FOUND" | "PROVIDER_ERROR";

export class BillingError extends Error {
  constructor(public readonly code: BillingErrorCode, message: string) {
    super(message);
    this.name = "BillingError";
  }
}

// Route discriminates by code, never by message string
if (result.isFailure()) {
  const err = result.error;
  if (err instanceof BillingError && err.code === "ALREADY_PREMIUM") {
    return json({ error: "ALREADY_PREMIUM" }, { status: 400 });
  }
  return json({ error: "BILLING_ERROR" }, { status: 500 });
}
```

---

## Pattern Composition — Heuristics

Patterns rarely live alone. Recognize when several must be applied together.

| Situation | Patterns that compose | Why |
|---|---|---|
| **Authenticated write** | Route Guard → Command Handler → Repository → Domain Events → Result | Full write path: auth, orchestration, persistence, notification, error handling |
| **Read-only query** | Route Guard → Query Handler → Repository → DTO Mapper | No events, no mutation |
| **External API integration** | Port + Adapter + Typed Error + Result | Isolation from SDK; domain errors per external failure |
| **Webhook ingestion** | Signature Validation → Idempotency → Command Handler → Repository → Events | Webhook has its own auth; idempotency prevents double-processing |
| **Multi-variant processing** | Strategy + Concrete Strategies + Factory + Handler | New variant = new class, zero modification to existing code |
| **Domain entity creation** | Factory Method + Value Objects + Domain Events | `Entity.create(props)` validates invariants, returns Result |

### Recognition Signals (missing composition)

| Signal | Missing pattern(s) |
|--------|-------------------|
| Route handler > 80 lines | Command/Query Handler not extracted |
| ORM import in application layer | Repository not created |
| `if (err.message === "...")` | Typed domain error not defined |
| `new ExternalSDK()` in a handler | Port + Adapter not extracted |
| Repeated `if (!user) return 401` in routes | Route Guard not used |
| Same branching logic in 2+ places | Strategy not extracted |
| `?? "FREE"` scattered | Domain constant not defined |
| Constructor with 5+ params | Builder or Parameter Object needed |

---

## Before Touching Any File — Context Scan (Mandatory)

1. **Who calls this?** If called from 3+ places, there's a pattern to abstract, not patch.
2. **Why does it exist?** If it replicates what the framework/filesystem already provides, delete it instead of fixing it.
3. **What already exists nearby?** Check for interfaces, repositories, services, helpers in the same domain before creating new ones.

### Framework Convention Rule

**Do not manually maintain what the framework or filesystem already defines.** If the directory structure *is* the data (e.g. file-based routing), auto-discover it; don't replicate it as a static array.

---

## Reduction Rule — Rewrites Must Reduce Lines

Every refactor must produce fewer lines than the original, or explain specifically why it can't. More lines after a refactor usually means: compensation code for an unfixed design problem, defensiveness for impossible cases, or duplication of logic that should have been reused.

Before submitting a change that adds lines, confirm: is this solving a new problem? Is there an existing abstraction I could have called? If the function grew, did I remove the old body or just wrap it? Can the error handling I added actually trigger?

---

## Definition of Done for Any Code Change

1. No magic strings for error discrimination — typed error codes.
2. No business logic in route handlers — delegated to handlers.
3. No ORM / SDK imports outside `infrastructure/`.
4. All authenticated routes use the shared Route Guard.
5. Test mocks model real behavior — never weaken an assertion to pass.
6. TypeScript 0 errors on changed files.
7. Typecheck exits 0.
8. Tests green.
9. Line count equal or lower than before, or the increase is explicitly justified.
