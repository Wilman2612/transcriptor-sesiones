import type { Turn as TurnT } from "../lib/turns";
import type { Segment, Word as WordT } from "../lib/types";
import { msToStr } from "../lib/format";
import { Word } from "./Word";
import { PhraseEditor } from "./PhraseEditor";

interface Props {
  turn: TurnT;
  threshold: number;
  textSegId: number | null;
  busy?: boolean;
  onSeek?: (ms: number) => void;
  onPickWord?: (segmentId: number, word: WordT, rect: DOMRect) => void;
  onEditPhrase: (segmentId: number) => void;
  onSavePhrase: (segmentId: number, text: string) => void;
  onCancelPhrase: () => void;
  onReprocess?: () => void;
}

function phraseText(seg: Segment): string {
  return seg.override_text ?? seg.words.map((w) => w.text).join(" ");
}

/** Un turno de hablante: una etiqueta para todo el turno, y debajo cada frase
 *  como una línea separada (con su tiempo y editable como texto o por palabra). */
export function Turn({
  turn,
  threshold,
  textSegId,
  busy,
  onSeek,
  onPickWord,
  onEditPhrase,
  onSavePhrase,
  onCancelPhrase,
  onReprocess,
}: Props) {
  let hadDoubt = false;
  let left = 0;
  for (const seg of turn.segments) {
    if (seg.override_text != null) continue;
    for (const w of seg.words) {
      if (!w.eligible) continue;
      if (w.sealed || w.confidence < threshold) hadDoubt = true;
      if (!w.sealed && w.confidence < threshold) left += 1;
    }
  }
  const resolved = hadDoubt && left === 0;

  return (
    <article className={`turn${resolved ? " is-resolved" : ""}`}>
      <div className="turn__meta">
        <span className="turn__speaker">
          <span className="seg__speaker-glyph" />
          {turn.speaker}
        </span>
        {onReprocess && (
          <button
            className="turn__reprocess"
            type="button"
            disabled={busy}
            title="Re-transcribir este tramo en aislamiento (recupera alucinaciones)"
            onClick={onReprocess}
          >
            {busy ? "Procesando…" : "⟳ Re-procesar"}
          </button>
        )}
      </div>

      <div className="turn__phrases">
        {turn.segments.map((seg) => (
          <div className="phrase" data-seg-id={seg.id} key={seg.id}>
            <button
              className="phrase__time"
              type="button"
              title={`Reproducir desde ${msToStr(seg.start_ms)}`}
              onClick={() => onSeek?.(seg.start_ms)}
            >
              ▸ {msToStr(seg.start_ms)}
            </button>

            <div className="phrase__body">
              {seg.id === textSegId ? (
                <PhraseEditor
                  initialText={phraseText(seg)}
                  onSave={(text) => onSavePhrase(seg.id, text)}
                  onCancel={onCancelPhrase}
                  onPlay={() => onSeek?.(seg.start_ms)}
                />
              ) : seg.override_text != null ? (
                <span
                  className="phrase-rewritten"
                  role="button"
                  tabIndex={0}
                  title="Texto reescrito. Pulsa para editar de nuevo."
                  onClick={() => onEditPhrase(seg.id)}
                >
                  {seg.override_text}
                </span>
              ) : (
                <>
                  <button
                    className="phrase-edit-btn"
                    type="button"
                    title="Reescribir esta frase como texto"
                    onClick={() => onEditPhrase(seg.id)}
                  >
                    ✎
                  </button>{" "}
                  {seg.words.map((w, i) => (
                    <span key={w.idx} data-idx={w.idx}>
                      {i > 0 ? " " : ""}
                      <Word
                        word={w}
                        threshold={threshold}
                        onPick={(word, rect) => onPickWord?.(seg.id, word, rect)}
                      />
                    </span>
                  ))}
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </article>
  );
}
