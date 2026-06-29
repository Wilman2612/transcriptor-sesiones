// Frontera del contrato (DAL): el front depende de esta interfaz, no del fetch.
// Implementada por FakeReviewAdapter (Storybook/tests) y RealReviewAdapter (/api).
import type { ReviewData, WordCorrectionResult } from "../types";

export interface IReviewRepository {
  getReview(sessionId: number): Promise<ReviewData>;
  correctWord(segmentId: number, idx: number, text: string): Promise<WordCorrectionResult>;
  /** Reescribe una frase entera como texto libre (vacío = revertir a palabras). */
  rewriteSegment(segmentId: number, text: string): Promise<WordCorrectionResult>;
  /** Segunda pasada: re-transcribe un tramo en aislamiento y lo reemplaza. */
  reprocess(segmentIds: number[]): Promise<WordCorrectionResult>;
  /** Asigna un nombre/cargo real a un hablante (vacío = quitar). */
  setSpeakerName(sessionId: number, key: string, name: string): Promise<void>;
}
