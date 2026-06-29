// Frontera del contrato (DAL): el front depende de esta interfaz, no del fetch.
// Implementada por FakeReviewAdapter (Storybook/tests) y RealReviewAdapter (/api).
import type { ReviewData, WordCorrectionResult } from "../types";

export interface IReviewRepository {
  getReview(sessionId: number): Promise<ReviewData>;
  correctWord(segmentId: number, idx: number, text: string): Promise<WordCorrectionResult>;
  /** Reescribe una frase entera como texto libre (vacío = revertir a palabras). */
  rewriteSegment(segmentId: number, text: string): Promise<WordCorrectionResult>;
}
