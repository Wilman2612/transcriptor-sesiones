// Agrupa las frases de Whisper en turnos de hablante: fusiona segmentos
// consecutivos del mismo hablante. La vista lee como un acta real, pero cada
// segmento conserva su identidad (para el seek intermedio y la edición).
import type { Segment } from "./types";

export interface Turn {
  key: string;
  speaker: string;
  start_ms: number;
  segments: Segment[];
}

export function groupIntoTurns(segments: Segment[]): Turn[] {
  const turns: Turn[] = [];
  for (const seg of segments) {
    const last = turns[turns.length - 1];
    if (last && last.speaker === seg.speaker) {
      last.segments.push(seg);
    } else {
      turns.push({
        key: `t${seg.id}`,
        speaker: seg.speaker,
        start_ms: seg.start_ms,
        segments: [seg],
      });
    }
  }
  return turns;
}
