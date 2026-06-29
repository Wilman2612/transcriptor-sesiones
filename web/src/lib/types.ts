// Espejo del contrato JSON del backend (app/interfaces/web/api_schemas.py)

export type WordKind = "plain" | "doubt-mid" | "doubt-high" | "sealed";

export interface Word {
  text: string;
  idx: number;
  start_ms: number;
  end_ms: number;
  confidence: number; // 0-1 cruda
  eligible: boolean; // candidata a duda a algún umbral
  sealed: boolean; // ya confirmada/corregida
}

export interface Segment {
  id: number;
  start_ms: number;
  speaker: string;
  words: Word[];
  total_doubts: number;
  doubts_left: number;
  override_text?: string | null; // reescritura libre; si está, sustituye a words
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

export interface JobStatus {
  status: string;
  progress: number;
  done: boolean;
  error: string | null;
  review_ready: boolean;
}
