import type { Segment as SegmentT, Word as WordT } from "../lib/types";
import { msToStr } from "../lib/format";
import { Word } from "./Word";

interface Props {
  segment: SegmentT;
  onSeek?: (ms: number) => void;
  onPickWord?: (segmentId: number, word: WordT, rect: DOMRect) => void;
}

/** Una intervención del acta: tiempo + hablante + el texto con sus palabras. */
export function Segment({ segment, onSeek, onPickWord }: Props) {
  const resolved = segment.total_doubts > 0 && segment.doubts_left === 0;
  return (
    <article className={`seg${resolved ? " is-resolved" : ""}`} data-seg-id={segment.id}>
      <div className="seg__meta">
        <button className="seg__time" type="button" onClick={() => onSeek?.(segment.start_ms)}>
          ▸ {msToStr(segment.start_ms)}
        </button>
        <span className="seg__speaker">
          <span className="seg__speaker-glyph" />
          {segment.speaker}
        </span>
      </div>
      <p className="seg__text">
        {segment.words.map((w, i) => (
          <span key={w.idx}>
            {i > 0 ? " " : ""}
            <Word word={w} onPick={(word, rect) => onPickWord?.(segment.id, word, rect)} />
          </span>
        ))}
      </p>
    </article>
  );
}
