// Convierte un turno en el documento de TipTap: un párrafo con una palabra por
// nodo de texto, cada una con su mark de metadata. Las frases reescritas
// (override) van como texto libre con solo {seg, start} (audio por frase).
import { msToStr } from "../lib/format";
import type { Turn } from "../lib/turns";

interface MarkAttrs {
  seg: number;
  start: number;
  idx?: number;
  end?: number;
  conf?: number;
  eligible?: boolean;
  title: string;
}

function textNode(text: string, attrs: MarkAttrs) {
  return { type: "text", text, marks: [{ type: "wordmeta", attrs }] };
}

export function buildTurnDoc(turn: Turn) {
  const content: ReturnType<typeof textNode>[] = [];
  for (const seg of turn.segments) {
    if (seg.override_text != null) {
      content.push(
        textNode(seg.override_text.trim() + " ", {
          seg: seg.id,
          start: seg.start_ms,
          title: `Frase reescrita · ${msToStr(seg.start_ms)}`,
        }),
      );
      continue;
    }
    for (const w of seg.words) {
      const pct = Math.round(w.confidence * 100);
      content.push(
        textNode(w.text + " ", {
          seg: seg.id,
          idx: w.idx,
          start: w.start_ms,
          end: w.end_ms,
          conf: w.confidence,
          eligible: w.eligible,
          title: `Confianza ${pct}% · ${msToStr(w.start_ms)}`,
        }),
      );
    }
  }
  const paragraph =
    content.length > 0 ? { type: "paragraph", content } : { type: "paragraph" };
  return { type: "doc", content: [paragraph] };
}
