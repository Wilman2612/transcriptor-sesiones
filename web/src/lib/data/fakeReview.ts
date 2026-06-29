// FakeReviewAdapter: datos deterministas para Storybook y tests, sin backend.
// Cada estado nombrado se materializa aquí (happy/empty/all-resolved).
// Basado en transcripción real (large-v3): las dudas son nombres propios y
// términos legales ("Karla", "Medina", "Ad[-hoc]").
import type { IReviewRepository } from "./IReviewRepository";
import type { ReviewData, Segment, Word, WordKind } from "../types";

type WordSpec = [text: string, kind: WordKind];

function seg(id: number, startMs: number, speaker: string, specs: WordSpec[]): Segment {
  const words: Word[] = specs.map(([text, kind], i) => ({
    text,
    kind,
    idx: i,
    start_ms: startMs + i * 400,
    end_ms: startMs + i * 400 + 350,
  }));
  const total = specs.filter(([, k]) => k !== "plain").length;
  const left = specs.filter(([, k]) => k === "doubt-mid" || k === "doubt-high").length;
  return { id, start_ms: startMs, speaker, words, total_doubts: total, doubts_left: left };
}

const p = (...texts: string[]): WordSpec[] => texts.map((t) => [t, "plain"]);

export const HAPPY_SEGMENTS: Segment[] = [
  seg(1, 0, "Hablante 1", [
    ...p("Por", "lo", "cual,", "voy", "a", "dar", "pase", "a", "la", "licenciada"),
    ["Karla", "doubt-mid"],
  ]),
  seg(2, 9000, "Hablante 2", p("Buenas", "tardes,", "señor", "alcalde,", "miembros", "del", "consejo.")),
  seg(3, 59000, "Hablante 2", [
    ...p("Se", "me", "designa", "excepcionalmente", "a", "mi", "persona,", "Carla"),
    ["Medina", "doubt-high"],
    ...p("Rojas,", "como", "Secretaria"),
    ["Ad", "doubt-high"],
    ...p("hoc", "de", "la", "presente", "sesión."),
  ]),
];

export const RESOLVED_SEGMENTS: Segment[] = [
  seg(1, 0, "Hablante 1", [
    ...p("Por", "lo", "cual,", "voy", "a", "dar", "pase", "a", "la", "licenciada"),
    ["Carla", "sealed"],
  ]),
  seg(3, 59000, "Hablante 2", [
    ...p("Se", "me", "designa", "excepcionalmente", "a", "mi", "persona,", "Carla"),
    ["Medina", "sealed"],
    ...p("Rojas,", "como", "Secretaria"),
    ["Ad", "sealed"],
    ...p("hoc", "de", "la", "presente", "sesión."),
  ]),
];

export const CLEAN_SEGMENTS: Segment[] = [
  seg(1, 0, "Hablante 1", p("Se", "abre", "la", "sesión", "ordinaria", "del", "consejo.")),
  seg(2, 5000, "Hablante 2", p("Damos", "lectura", "al", "acta", "de", "la", "sesión", "anterior.")),
];

function totals(segments: Segment[]) {
  return {
    total_doubts: segments.reduce((a, s) => a + s.total_doubts, 0),
    doubts_left: segments.reduce((a, s) => a + s.doubts_left, 0),
  };
}

export function reviewFixture(name: "happy" | "empty" | "resolved"): ReviewData {
  const segments =
    name === "empty" ? CLEAN_SEGMENTS : name === "resolved" ? RESOLVED_SEGMENTS : HAPPY_SEGMENTS;
  return {
    session_id: 1,
    name: "Sesión ordinaria · 26 junio",
    total_segments: segments.length,
    ...totals(segments),
    segments,
  };
}

/** Adapter falso: opera sobre una copia mutable en memoria. */
export class FakeReviewAdapter implements IReviewRepository {
  private data: ReviewData;

  constructor(fixture: "happy" | "empty" | "resolved" = "happy") {
    this.data = structuredClone(reviewFixture(fixture));
  }

  async getReview(): Promise<ReviewData> {
    return structuredClone(this.data);
  }

  async correctWord(segmentId: number, idx: number, text: string) {
    const s = this.data.segments.find((x) => x.id === segmentId);
    if (s && s.words[idx]) {
      s.words[idx] = { ...s.words[idx], text, kind: "sealed" };
      s.doubts_left = Math.max(0, s.doubts_left - 1);
      this.data.doubts_left = Math.max(0, this.data.doubts_left - 1);
    }
    return { ok: true, session_doubts_left: this.data.doubts_left };
  }
}
