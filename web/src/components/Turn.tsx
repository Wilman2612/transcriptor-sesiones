import { Fragment } from "react";
import type { Turn as TurnT } from "../lib/turns";
import type { Word as WordT } from "../lib/types";
import { msToStr } from "../lib/format";
import { Word } from "./Word";

interface Props {
  turn: TurnT;
  threshold: number;
  onSeek?: (ms: number) => void;
  onPickWord?: (segmentId: number, word: WordT, rect: DOMRect) => void;
}

/** Un turno de hablante: una etiqueta + tiempo, el texto fluido, y marcas de
 *  tiempo intermedias donde Whisper cortó (para saltar a media intervención). */
export function Turn({ turn, threshold, onSeek, onPickWord }: Props) {
  let hadDoubt = false;
  let left = 0;
  for (const seg of turn.segments) {
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
            )}
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
          </Fragment>
        ))}
      </p>
    </article>
  );
}
