import { Fragment } from "react";
import type { Turn as TurnT } from "../lib/turns";
import type { Segment, Word as WordT } from "../lib/types";
import { msToStr } from "../lib/format";
import { Word } from "./Word";
import { PhraseEditor } from "./PhraseEditor";

interface Props {
  turn: TurnT;
  threshold: number;
  textSegId: number | null;
  onSeek?: (ms: number) => void;
  onPickWord?: (segmentId: number, word: WordT, rect: DOMRect) => void;
  onEditPhrase: (segmentId: number) => void;
  onSavePhrase: (segmentId: number, text: string) => void;
  onCancelPhrase: () => void;
}

function phraseText(seg: Segment): string {
  return seg.override_text ?? seg.words.map((w) => w.text).join(" ");
}

/** Un turno de hablante: texto fluido, marcas de tiempo intermedias, y cada
 *  frase editable como texto libre (✎) además de palabra por palabra. */
export function Turn({
  turn,
  threshold,
  textSegId,
  onSeek,
  onPickWord,
  onEditPhrase,
  onSavePhrase,
  onCancelPhrase,
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
    <article className={`seg${resolved ? " is-resolved" : ""}`}>
      <div className="seg__meta">
        <button className="seg__time" type="button" onClick={() => onSeek?.(turn.start_ms)}>
          ▸ {msToStr(turn.start_ms)}
        </button>
        <span className="seg__speaker">
          <span className="seg__speaker-glyph" />
          {turn.speaker}
        </span>
      </div>
      <p className="seg__text">
        {turn.segments.map((seg, si) => (
          <Fragment key={seg.id}>
            {si > 0 && (
              <button
                className="phrase-time"
                type="button"
                title={`Saltar a ${msToStr(seg.start_ms)}`}
                onClick={() => onSeek?.(seg.start_ms)}
              >
                ⏱{msToStr(seg.start_ms)}
              </button>
            )}{" "}
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
                </button>
                {seg.words.map((w) => (
                  <span key={w.idx} data-seg-id={seg.id}>
                    {" "}
                    <Word
                      word={w}
                      threshold={threshold}
                      onPick={(word, rect) => onPickWord?.(seg.id, word, rect)}
                    />
                  </span>
                ))}
              </>
            )}
          </Fragment>
        ))}
      </p>
    </article>
  );
}
