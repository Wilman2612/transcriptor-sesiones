// RealReviewAdapter: implementa el contrato pegando a la API JSON de FastAPI.
import type { IReviewRepository } from "./IReviewRepository";
import type { ReviewData, WordCorrectionResult } from "../types";

export class RealReviewAdapter implements IReviewRepository {
  private baseUrl: string;

  constructor(baseUrl = "") {
    this.baseUrl = baseUrl;
  }

  async getReview(sessionId: number): Promise<ReviewData> {
    const r = await fetch(`${this.baseUrl}/api/sessions/${sessionId}/review`);
    if (!r.ok) throw new Error(`No se pudo cargar la revisión (${r.status})`);
    return r.json();
  }

  async correctWord(segmentId: number, idx: number, text: string): Promise<WordCorrectionResult> {
    const r = await fetch(`${this.baseUrl}/api/segments/${segmentId}/word`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idx, text }),
    });
    if (!r.ok) throw new Error(`No se pudo guardar la corrección (${r.status})`);
    return r.json();
  }

  async rewriteSegment(segmentId: number, text: string): Promise<WordCorrectionResult> {
    const r = await fetch(`${this.baseUrl}/api/segments/${segmentId}/text`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    if (!r.ok) throw new Error(`No se pudo guardar el texto (${r.status})`);
    return r.json();
  }

  async reprocess(segmentIds: number[]): Promise<WordCorrectionResult> {
    const r = await fetch(`${this.baseUrl}/api/reprocess`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ segment_ids: segmentIds }),
    });
    if (!r.ok) throw new Error(`No se pudo re-procesar (${r.status})`);
    return r.json();
  }

  async setSpeakerName(sessionId: number, key: string, name: string): Promise<void> {
    await fetch(`${this.baseUrl}/api/sessions/${sessionId}/speaker`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, name }),
    });
  }
}
