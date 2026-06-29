# UX Teardown — Galería de estados, Revisión por palabra

Reviewed on real rendered output at `http://127.0.0.1:8001/dev/gallery` (FastAPI/HTMX/Jinja2).
Desktop 1440×1000 and mobile 375×1200. Screenshots under `e:/Proyect/transcriptor-sesiones/screenshots/`.

**Sanity baseline: PASS.** Styles are applied (serif display headings, custom palette, structured cards, cream panels). Only console error is a missing `favicon.ico` (404) — cosmetic, not a blocker. Note: body text uses `system-ui` fallback stack, not a loaded custom font; headings use a serif. Acceptable but the body falls back to whatever the OS ships.

---

## 🔴 BLOCKER — The amber "dudosa" underline is invisible work-to-do signal
**State:** `happy` · `screenshots/ux-01-happy.png`, `ux-07-happy-375.png`
**Problem:** The amber doubtful word ("Karla") is rendered as a **2px** bottom underline in `rgb(199,127,26)` under **22.4px** text, with the word's own text color left at the normal body navy `rgb(31,36,48)`. Measured contrast of the amber underline against the white segment card is ≈**3.0:1** — below the 3:1 floor for non-text UI and far below 4.5:1 for anything carrying meaning. The word itself is visually identical to surrounding text except for a hairline beneath it. At 100% zoom on the cream/white card the amber line nearly disappears; at 375px (`ux-07`) it is essentially gone.
**Why it matters:** The entire product thesis is "the eye goes directly to the ~5% doubtful words so she never rescans the 95%." If the amber marker doesn't pop, that thesis fails for every "dudosa" (the majority class). A non-technical clerk will skim right past "Karla" and miss the correction — the exact failure the redesign exists to prevent. (H1 visibility of system status, contrast.)
**Direction:** Make "dudosa" unmistakable: tint the word's text color amber AND add a stronger underline/soft fill, raising contrast to ≥4.5:1. Treat the marker as a call-to-action, not as typographic emphasis. Test at 100% zoom on the real white card, not in a design tool on grey.

## 🔴 BLOCKER — A doubtful word does not read as clickable/fixable, only as emphasis
**State:** `happy`, `doubt-focused` · `ux-01-happy.png`
**Problem:** The doubtful words carry `cursor: pointer` (good, the affordance technically exists) but have **zero visual cues** that they are interactive: no color shift, no hover style visible in static render, no icon, no button chrome — just a thin colored underline that, to a lay reader, is indistinguishable from spell-check squiggle or italic emphasis. There is no on-page instruction that says "haz clic en las palabras marcadas para corregirlas." The only hint of interaction lives inside the popover ("Enter para confirmar"), which she can't see until she's already clicked.
**Why it matters:** This user has never used a "proofreader pencil" UI. If a marked word looks like emphasis, she won't know she's supposed to (or can) act on it. She may read "Karla", assume it's just highlighted, and move on — leaving every doubt unresolved while the tally still says "3 dudas por revisar," with no bridge between the two. (H6 recognition over recall, affordance.)
**Direction:** Give marked words a real "tap target" look (subtle pill/chip background, hover lift, maybe a tiny pencil glyph) and add one plain-language line near the tally: "Haz clic en las palabras subrayadas para revisarlas." Make the affordance teach itself.

## 🔴 BLOCKER — `all-resolved` and `empty-no-doubts` are visually near-identical
**State:** `all-resolved` vs `empty-no-doubts` · `ux-03-all-resolved.png`, `ux-04-empty.png`
**Problem:** Both states render the same teal checkmark, the same big green **"0"**, the same dashed card, and the same primary **"Exportar acta (DOCX)"** button. The only differences are the headline ("Revisión completa" vs "Sin dudas que revisar"), one line of subtext, and the rail label ("todas las dudas resueltas" vs "sin dudas que revisar"). At a glance they are the same screen.
**Why it matters:** These mean opposite things about her effort. "all-resolved" = *I did the work, every doubt is sealed.* "empty-no-doubts" = *there was never anything to do.* Collapsing them removes the sense of accomplishment the brief explicitly wants ("da una meta clara de 'terminé'") and, worse, could make her think she finished reviewing when in fact the AI just never flagged anything — she may export without realizing no human ever looked. (H1 status, H4 consistency vs differentiation.)
**Direction:** Differentiate decisively. `all-resolved` should celebrate completed work (e.g. "N dudas resueltas", a filled progress rail, a "done" tone). `empty-no-doubts` should state plainly that the AI returned clean and no review was needed — different icon/tone, no "completaste" language. The export CTA can stay in both but the framing must not be interchangeable.

## 🟡 MAJOR — Edit input collapses to unusable width at 375px
**State:** `doubt-focused` (mobile) · `ux-08-doubt-375.png`
**Problem:** In the decision popover at 375px, the row keeps input + 🔊 + "Confirmar" + a 4-line wrapped hint all on one horizontal line. The text input is crushed to ~50px wide, showing only a clipped glyph ("(") — the word being edited ("Medina") is not even visible inside its own input. The "Enter para confirmar · Esc para cancelar" hint eats the horizontal space and wraps to four lines.
**Why it matters:** Correcting the word is THE core action. On a small screen she literally cannot see or comfortably edit the text she's fixing. Even if the clerk is usually on desktop, a squeezed laptop window will hit this. (H5 error prevention, H7 efficiency, responsive.)
**Direction:** Stack the popover controls vertically on narrow widths: full-width input on its own row, then [🔊 oír] [Confirmar] beneath, and demote the keyboard hint to small helper text below (or hide on touch). The input must always show the full current word.

## 🟡 MAJOR — The "tick rail" communicates no progress
**State:** `happy`, `all-resolved` · `ux-01-happy.png`, `ux-03-all-resolved.png`
**Problem:** Under the tally number sits a `.rail` of three identical static dashes, marked `aria-hidden="true"`. It does not change with progress — `happy` (3 pending) and `all-resolved` (0 pending) both show three undifferentiated dashes (amber-ish vs teal, but same count, no fill/empty state). It is pure decoration that looks like it should be a progress meter.
**Why it matters:** Pillar 5 of the brief is "progreso por dudas resueltas — el trabajo real… una meta clara de 'terminé'." The one element shaped like a progress indicator carries no information, so "how much work is left" is conveyed only by a single number changing from 3 to 0. A non-technical user gets no at-a-glance sense of "2 of 3 done." (H1 visibility of system status.)
**Direction:** Make the rail a real progress meter: one tick per doubt, filled as each is resolved (e.g. 3 ticks → 2 filled when one remains), or replace with a labeled "1 de 3 resueltas" bar. It must move as she works.

## 🟠 MINOR — Amber vs red are meaningful but the difference is under-communicated
**State:** `happy` · `ux-01-happy.png`
**Problem:** Amber `rgb(199,127,26)` ("dudosa") and red `rgb(180,50,42)` ("muy dudosa") are distinguishable side by side, and red clears 4.5:1 while amber does not (≈3.0:1). But nothing on screen explains what the two colors mean — no legend, no tooltip. The severity distinction is invisible to the user.
**Why it matters:** The color is doing semantic work (confidence tier) with no key. She'll see two underline colors and not know red = "this one is probably wrong, look harder." (H4 consistency & standards, H10 help.)
**Direction:** Add a tiny inline legend near the tally ("🟠 dudosa · 🔴 muy dudosa") and, separately, fix amber's contrast so the *less* urgent class isn't the *less* visible one.

## 🟠 MINOR — No "siguiente duda" / jump control surfaced
**State:** `happy` · `ux-01-happy.png`
**Problem:** Brief pillar 3 calls for a "siguiente duda" button/key that focuses and scrolls to the next doubtful word, with the live counter. The gallery's `happy` state shows the tally ("3 dudas por revisar") but no visible "ir a la siguiente" affordance.
**Why it matters:** In a 3–4h session with doubts scattered across many segments, hunting for the next faint underline by eye defeats the linear-processing goal. (H7 flexibility/efficiency.)
**Direction:** Surface a persistent "Siguiente duda →" control tied to the tally so she advances doubt-by-doubt without scanning.

## 🔵 NIT — Popover is spatially detached from the word it edits
**State:** `doubt-focused` · `ux-02-doubt-focused.png`, `ux-08-doubt-375.png`
**Problem:** The decision popover renders as a separate card *below* the segment, not anchored to the highlighted "Medina". Feedback for the action lives one spatial level away from the element that owns it.
**Why it matters:** Mild on desktop (the word is still highlighted), but the link between "the word I clicked" and "the box where I fix it" is weaker than an in-place inline editor would be, and degrades on mobile where they can scroll apart. (Same-level feedback principle.)
**Direction:** Anchor the editor inline/adjacent to the word (popover pointing at it, or in-place input replacing the word) so the relationship is unambiguous.

## 🔵 NIT — Speaker labels are generic IDs ("Hablante 1/2")
**State:** all transcript states · `ux-01-happy.png`
**Problem:** Speakers show as "Hablante 1", "Hablante 2" — diarization IDs, not names. The brief flags jargon/IDs as an H2 concern.
**Why it matters:** Low impact for the review task itself, but the clerk knows these are the alcalde, the secretaria, etc.; raw IDs are slightly cold/jargon-y in a municipal acta. (H2 match to real world.)
**Direction:** Allow optional renaming of a speaker once and propagating it, or at least confirm "Hablante N" is acceptable placeholder copy for the exported acta.

---

## Status: FAIL
Three BLOCKERs (invisible amber marker, words don't read as clickable, all-resolved ≈ empty are indistinguishable) plus two MAJORs (mobile edit input collapses, progress rail is decorative). The core proposition — eye goes straight to the doubtful words and she feels real progress toward "terminé" — is not reliably delivered in the current render.

---

## Resolution (post-review fixes applied)

All BLOCKERs and MAJORs addressed; re-verified on the real page (`/sessions/1/review`, 675 real doubts) and the gallery at desktop + 375px.

- 🔴 **Amber invisible** → doubtful words are now solid "chips": light wash fill + dark tinted bold text (amber `#8A5414`, red `#9B241C`, both ≥4.5:1) + solid underline. Unmistakable on the white card.
- 🔴 **Not clickable** → chip look reads as a tap target (hover lift); added on-page instruction "Haz clic en las palabras subrayadas para revisarlas" + a severity legend (dudosa / muy dudosa).
- 🔴 **all-resolved ≈ empty** → differentiated: `empty-no-doubts` uses an indigo mark + "la IA no marcó ninguna palabra" framing and no progress meter; `all-resolved` uses the teal seal + "Resolviste las N dudas" + a full progress bar.
- 🟡 **375px input collapse** → popover stacks vertically: full-width input (shows the whole word) + [🔊 Oír] [Confirmar] below + hint last.
- 🟡 **Decorative rail** → replaced with a real `role="progressbar"` meter ("N de M resueltas") that scales to hundreds of doubts and moves as each is resolved.
- 🟠 legend + 🟠 "Siguiente duda" control → both surfaced.
- 🔵 popover detachment → on the real page the popover anchors directly under the clicked word (the gallery shows a static illustration).
- 🔵 speaker IDs ("Hablante N") → left as accepted placeholder for now (renaming is a separate feature).

Live loop verified in-browser: clicking "Karla" → typing "Carla" → Enter sealed the word (teal), dropped the tally 675→674, and advanced the meter to 1/675.
