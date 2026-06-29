# UX Teardown — React + Storybook port, Revisión por palabra

Reviewed on real rendered Storybook output at `http://localhost:6006/iframe.html` (React + TypeScript + Storybook, decoupled from FastAPI).
Desktop 1280×1000 and mobile 375px. Screenshots under `e:/Proyect/transcriptor-sesiones/screenshots/react/`.
Cross-checked against the prior HTMX review (`docs/ux-review.md`) to confirm fixes were preserved and to avoid re-raising resolved issues.

**Sanity baseline: PASS.** Styles fully applied — Fraunces/Spectral serif display + Inter body (loaded via Google Fonts `@import`), bond-paper palette, structured segments, colored-pencil word chips, teal seal, real progress bar. Only console error is `favicon.ico` 404 (cosmetic). No unstyled-text failure.

**State coverage: COMPLETE.** All six named states from the brief exist as Stories: `happy`, `all-resolved`, `empty-no-doubts` (title Review/Workbench) and `doubt-focused`, `loading`, `error-state` (title Review/States). No missing-state blocker.

**Prior BLOCKERs/MAJORs — verified preserved in the React port (measured, not assumed):**
- Amber chip now solid: text `#8A5414` on wash `#FBF0DA` ≈ **5.0:1** (passes 4.5:1). Red chip text `#9B241C` on `#F8E0DC` ≈ **6.4:1**. The "dudosa" marker is unmistakable. ✓
- Chips read as tap targets (`cursor:pointer`, fw 500, hover lift, `tabindex=0`, focus-visible outline) + on-page instruction "Haz clic en las palabras subrayadas…" + severity legend. ✓
- `all-resolved` (teal seal, "Resolviste las 3 dudas", filled teal meter "3 de 3 resueltas", teal-sealed words) is now decisively distinct from `empty-no-doubts` (indigo mark, "La IA transcribió con alta confianza y no marcó ninguna palabra", **no** progress meter). ✓
- 375px popover stacks vertically: full-width input showing the whole word, then [Oír][Confirmar], hint last. No input collapse. ✓
- Progress meter is a real `role="progressbar"` (`aria-valuenow/min/max`, `aria-label="Dudas resueltas"`) that scales by proportion. ✓
- `loading` is visually unique: indigo determinate bar, "Procesando intervención 3 de 5", "56%". Distinct from both empty states. ✓
- `error` gives plain-language cause + a real way out ("Reintentar transcripción"), no stack trace. ✓

---

## 🟡 MAJOR — The doubt popover has no mouse/touch way out (only `Esc`)
**State:** `doubt-focused` · `ux-04-doubt-focused-desktop.png`, `ux-08-doubt-focused-375.png`
**Problem:** Once a doubtful word is opened, the popover exposes exactly two buttons — **Oír** and **Confirmar** — plus the input. The only way to *close without committing* is the keyboard: "Esc para cancelar". There is no visible Cancelar/× control. On a touch tablet there is no Esc key at all; on a laptop a non-technical clerk has no on-screen cue that Esc exists until she reads the small grey hint, and even then a mouse-only user has no button to click.
**Why it matters:** This is the core, repeated action of the whole product — she will open hundreds of doubts in a 3–4h session. The moment she opens one by mistake, or wants to look without deciding, she is in a modal-like state with no clickable exit (H3 user control & freedom — a dead-end in the hottest path). It also pressures her toward "Confirmar" (the only obvious button), risking accidental confirmation of a wrong word (H5 error prevention) — exactly the silent-mistake the redesign exists to prevent.
**Direction:** Add a visible, clickable dismiss — a "Cancelar" ghost button next to Confirmar (or an × in the popover corner) — and keep Esc as the shortcut. On touch widths, a tap on the backdrop should also close it. The exit must not depend on a keyboard.

## 🟠 MINOR — "Confirmar" is the only labeled decision; "corregir" is invisible until you type
**State:** `doubt-focused` · `ux-04-doubt-focused-desktop.png`
**Problem:** Brief pillar 6 is the explicit pair "**Confirmar vs corregir**" — two distinct outcomes that both clear the doubt. The popover surfaces only a single button labeled "Confirmar", while "corregir" is an implicit affordance (edit the pre-selected text in the input, then press the same button). Nothing tells the first-time user that editing the word is even an option, or that the button's meaning changes from "acepto tal cual" to "guardo mi corrección" depending on whether she typed.
**Why it matters:** For a non-technical clerk, "Confirmar" on a word she believes is wrong reads as "confirm it's correct" — the opposite of what she wants. She may skip fixing it, or not realize the input is editable (H6 recognition over recall; H2 match the real world). The two-decision model is the brief's clarity mechanism ("una meta clara de 'terminé'") and it is under-communicated here.
**Direction:** Make both outcomes legible: e.g. a primary "Guardar corrección" that appears/activates when the text differs, and a secondary "Confirmar (correcta)" for accept-as-is — or a tiny helper line "Edita la palabra o confírmala tal cual". The user shouldn't have to discover that the input is the "corregir" path.

## 🟠 MINOR — `empty-no-doubts` and `all-resolved` still share the same checkmark glyph
**State:** `empty-no-doubts` vs `all-resolved` · `ux-03-empty-desktop.png`, `ux-02-all-resolved-desktop.png`
**Problem:** The prior near-identical-screens BLOCKER is largely fixed (different headline, body, meter presence, count color). But both still lead with the **same ✓ checkmark mark**, differing only in tint (indigo vs teal). At a glance — especially for a user who doesn't parse color semantics — the two "done" screens still open with an identical "tick = success" gesture, and the only at-a-glance disambiguator is the presence/absence of the progress bar below.
**Why it matters:** The two states mean opposite things about her effort (she finished real work vs there was never any work). A ✓ on `empty-no-doubts` can read as "you completed the review" when in fact no human looked — the residual risk the prior review flagged. The fix is good but leans entirely on color + secondary copy, the weakest channels for this user (H1 status, H4 differentiation).
**Direction:** Give `empty-no-doubts` a distinct, non-checkmark mark (e.g. a "clean/sin marcas" or document-with-sparkle glyph) so the two completion screens don't share the celebratory tick. Reserve the ✓ seal for "you resolved N dudas".

## 🟠 MINOR — No "Cancelar/Volver" escape inside the `error` state if retry keeps failing
**State:** `error-state` · `ux-06-error-desktop.png`, `ux-10-error-375.png`
**Problem:** The error card offers exactly one action: "Reintentar transcripción". The copy points to "avisa a soporte" but there's no link/button to leave (back to sessions list) when retry loops. The other states all carry an "← Sesiones" affordance; the error state drops it, so a user stuck on a repeatedly-failing audio has only one button that keeps not working.
**Why it matters:** H3/H9 — a recovery screen should let the user both retry *and* abandon gracefully. A non-technical clerk who hits retry twice with no result has no visible off-ramp on this screen.
**Direction:** Add a secondary ghost action ("← Volver a sesiones") beside "Reintentar", and consider surfacing the soporte contact as a clickable link rather than prose.

## 🔵 NIT — Doubtful word chips are `<span tabindex=0>` with no `role`/`aria-label`
**State:** `happy` · `ux-01-happy-desktop.png`
**Problem:** The interactive words are focusable spans (`tabindex=0`, `cursor:pointer`) but carry no `role="button"` and no aria description of state (dudosa/muy dudosa, or "editar"). A screen reader announces them as plain text; assistive-tech users get no signal they're actionable or which severity tier they belong to.
**Why it matters:** Low impact for *this* sighted desktop clerk, but it's a cheap correctness gap and the chips already do all the visual work of a button. (Accessibility / H4 standards.)
**Direction:** Give each chip `role="button"` and an `aria-label` like "Karla — palabra dudosa, abrir para revisar". Keep it text-selectable if copy matters.

## 🔵 NIT — Speaker labels remain generic IDs ("Hablante 1/2")
**State:** all transcript states · `ux-01-happy-desktop.png`
**Problem:** Carried over from the HTMX review and accepted there as placeholder. Speakers show as diarization IDs, not names, in what will become a municipal acta.
**Why it matters:** Minor; renaming is a separate feature. Noted only so it isn't lost. (H2.)
**Direction:** Out of scope here — track as its own feature (rename + propagate).

---

## Status: FAIL
One MAJOR (the core doubt popover has no mouse/touch exit — a dead-end in the most-repeated action, pressuring accidental "Confirmar") fails the bar. Everything else is minor/nit. Notably, **all three prior BLOCKERs and both prior MAJORs were correctly preserved through the React port** (measured contrast, distinct states, real progressbar, stacked mobile popover) — the regression risk from the HTMX→React migration did not materialize. Fixing the popover exit (and ideally the corregir/confirmar labeling) clears this to DONE_WITH_WARNINGS.
