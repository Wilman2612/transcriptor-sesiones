// Espejo del contrato JSON del backend (app/interfaces/web/api_schemas.py)

export type WordKind = "plain" | "doubt-mid" | "doubt-high" | "sealed";

export interface Word {
  text: string;
  kind: WordKind;
  idx: number;
  start_ms: number;
  end_ms: number;
}

export interface Segment {
  id: number;
  start_ms: number;
  speaker: string;
  words: Word[];
  total_doubts: number;
  doubts_left: number;
}

export interface ReviewData {
  session_id: number;
  name: string;
  total_segments: number;
  total_doubts: number;
  doubts_left: number;
  segments: Segment[];
}

export interface SessionSummary {
  id: number;
  name: string;
  date: string;
  status: string;
}

export interface WordCorrectionResult {
  ok: boolean;
  session_doubts_left: number;
}
