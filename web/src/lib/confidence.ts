// Clasificación de palabras en el cliente, en función del umbral del slider.
// Permite re-resaltar en vivo sin volver a llamar al backend.
import type { ReviewData, Word, WordKind } from "./types";

/** Una palabra resaltada se parte en dos niveles: el tercio inferior es "muy
 *  dudosa" (rojo); el resto, "dudosa" (ámbar). */
export function wordKind(word: Word, threshold: number): WordKind {
  if (word.sealed) return "sealed";
  if (word.eligible && word.confidence < threshold) {
    return word.confidence < threshold * 0.65 ? "doubt-high" : "doubt-mid";
  }
  return "plain";
}

export function isHighlighted(word: Word, threshold: number): boolean {
  return !word.sealed && word.eligible && word.confidence < threshold;
}

/** Cuenta dudas pendientes y resueltas para el umbral actual. */
export function countDoubts(review: ReviewData, threshold: number) {
  let left = 0;
  let resolved = 0;
  for (const s of review.segments) {
    for (const w of s.words) {
      if (!w.eligible) continue;
      if (w.sealed) resolved += 1;
      else if (w.confidence < threshold) left += 1;
    }
  }
  return { left, resolved, total: left + resolved };
}
