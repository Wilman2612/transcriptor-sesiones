---
name: javascript
description: "Language-level JavaScript/TypeScript standards: structure limits, the 20-line function rule, naming, async, immutability, error handling, and SOLID. Load when writing, reviewing, or refactoring JS/TS. Tells you HOW to write the code (development-patterns tells you where it goes)."
---

# Skill: javascript

Apply when writing, reviewing, or refactoring JavaScript or TypeScript.

> **Related skill**: `development-patterns` covers architectural patterns specific to a Clean Architecture codebase. This skill covers **language-level** standards.

---

## Code Structure Limits

- **Functions**: max **20 lines** INSIDE the body (from after `{` to before `}`, counting blank lines and comments). Signature and braces are not counted.
- **Classes / Modules**: max **500 lines**.
- **Line length**: max **130 columns**.

### How to count function lines

Count every line inside the braces (blank lines and comments included). Do **not** count the signature, the function's own opening/closing brace, or decorators.

---

## Modern JS/TS

- `const` by default; `let` only when reassignment is genuinely needed; never `var`.
- Arrow functions for callbacks; destructuring; template literals; optional chaining `?.`; nullish coalescing `??` (not `||`, which coerces falsy values); spread/rest.
- Array methods (`map`/`filter`/`reduce`/`find`/`some`/`every`) over imperative loops.
- ES modules (`import`/`export`) — never CommonJS in new code.
- `Promise.all()` / `allSettled()` for concurrent async.
- Replace long `if-else` chains with object maps or strategy.

**TypeScript:** `strict` mode; `interface` for object shapes, `type` for unions/aliases; `readonly` on immutable fields; `as const` for literals; avoid `any` (use `unknown` + type guards); `satisfies` to validate shape without widening.

---

## Formatting

- Always braces for `if`/`else`/`for`/`while`, even single statements.
- Remove unused imports.
- Strict equality `===` / `!==` always (only exception: `== null` to check null+undefined together).
- Semicolons: pick one convention per project and never mix.

---

## Naming

| Element | Convention | Example |
|---|---|---|
| Classes, constructors | PascalCase | `CustomerService` |
| Functions, methods, variables | camelCase | `getOrderTotal` |
| Private fields (TS) | `_camelCase` | `_customerRepository` |
| Module-level constants | SCREAMING_SNAKE_CASE | `MAX_RETRY_COUNT` |
| Interfaces / types | PascalCase | `IOrderRepository`, `CustomerDto` |
| Files | kebab-case | `customer-service.ts` |

One major export per file; the file name must match the exported name.

---

## Async / await

- Always `async/await`; never chain `.then().catch()` when `await` is available.
- Use `Promise.all()` for independent concurrent operations, not sequential awaits.
- Propagate `AbortSignal` through I/O call chains where the project uses cancellation; pass it as the last parameter.

```js
// ✅ Concurrent
const [user, orders] = await Promise.all([
  getUser(userId, signal),
  getOrders(userId, signal),
]);
```

---

## Error Handling

- Don't catch `Error` generically without a reason — use specific types or codes.
- Don't swallow errors silently. Log and rethrow, or handle explicitly.
- **Don't use exceptions for business-logic flow control** — use a Result pattern for expected failures.
- Guard clauses at function start for fail-fast on invalid inputs.

---

## Immutability and Collections

Prefer functions that return new values over mutating parameters. Make mutations explicit at the call site.

```js
// ❌ Opaque — what changes?
updateTotalPrice(shopList);

// ✅ Explicit
shopList.totalPrice = getTotalPrice(shopList);

// ✅✅ Best — immutable update
const updatedList = { ...shopList, totalPrice: getTotalPrice(shopList) };
```

Return `readonly T[]` where callers shouldn't mutate. Use `Object.freeze()` for singleton config. Extract magic numbers/strings to named `const`.

---

## Anti-Patterns

- No mutable module-level state.
- No service-locator pattern — constructor injection only.
- Thin route handlers — no business logic in them.
- No exposed domain entities in API responses — use DTOs.
- No God classes/modules.
- No `setTimeout` for logic sequencing.
- No hardcoded configuration — env vars or a typed config module.

---

## Refactoring to Stay Under 20 Lines

**The 20-line limit is non-negotiable.** When a function exceeds it, refactor:

- **Extract by business responsibility** — name extracted functions after what they do in domain terms (`validateInputs`, `executeTransaction`), not control flow (`tryX`, `fallbackToY`).
- **Fail fast** — cheap preconditions before expensive I/O.
- **Pipeline/orchestrator** — main function delegates to named steps.

Rules: find the concept first then name it; each extraction has one clear responsibility; never split mechanically ("first 10 / last 10 lines"); prefer fewer cohesive functions over many tiny ones; never extract solely to reduce the count when there's no meaningful name; never leave commented-out code after refactoring.

The only acceptable exception: unavoidable complexity like a 15+ case mapping.

### If YOU wrote the code

Refactor it immediately. Do **not** generate a validation report saying "this needs refactoring" for code you just wrote — just fix it. (Reports are for reviewing *existing* code.)

---

## Testing Conventions

- **Naming**: `functionName_scenario_expectedResult`.
- **Structure**: Arrange-Act-Assert.
- **Isolation**: fresh data per test, no shared mutable state.
- Always `await`/`return` promises in async tests.
- Parameterized tests (`it.each`) over duplicated cases.
- Test behavior and outcomes, not implementation details.

---

## Design Principles

**SOLID** + **KISS / DRY / YAGNI**. Use design patterns when they solve a real problem, not preemptively.
