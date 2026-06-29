import type { Turn as TurnT } from "../lib/turns";
import type { Segment, Word as WordT } from "../lib/types";
import { msToStr } from "../lib/format";
import { Word } from "./Word";
import { PhraseEditor } from "./PhraseEditor";
import { SpeakerLabel } from "./SpeakerLabel";

interface Props {
  turn: TurnT;
  threshold: number;
  textSegId: number | null;
  busy?: boolean;
  speakerName?: string;
  onSeek?: (ms: number) => void;
  onPickWord?: (segmentId: number, word: WordT, rect: DOMRect) => void;
  onEditPhrase: (segmentId: number) => void;
  onSavePhrase: (segmentId: number, text: string) => void;
  onCancelPhrase: () => void;
  onReprocess?: () => void;
  onRename?: (key: string, name: string) => void;
}

function phraseText(seg: Segment): string {
  return seg.override_text ?? seg.words.map((w) => w.text).join(" ");
}

/** Un turno de hablante como un párrafo fluido (estilo Word/acta). La metadata
 *  (tiempo de cada frase, ✎ para reescribir, confianza por palabra) aparece al
 *  pasar el cursor, sin estorbar la lectura. */
export function Turn({
  turn,
  threshold,
  textSegId,
  busy,
  speakerName,
  onSeek,
  onPickWord,
  onEditPhrase,
  onSavePhrase,
  onCancelPhrase,
  onReprocess,
  onRename,
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
      <div className="turn__para">
        <span className="turn__lead">
          {onRename ? (
            <SpeakerLabel speakerKey={turn.speaker} name={speakerName ?? turn.speaker} onRename={onRename} />
          ) : (
            speakerName ?? turn.speaker
          )}
          {": "}
        </span>

        {turn.segments.map((seg) => {
          if (seg.id === textSegId) {
            return (
              <PhraseEditor
                key={seg.id}
                initialText={phraseText(seg)}
                onSave={(text) => onSavePhrase(seg.id, text)}
                onCancel={onCancelPhrase}
                onPlay={() => onSeek?.(seg.start_ms)}
              />
            );
          }
          if (seg.override_text != null) {
            return (
              <span
                key={seg.id}
                className="phrase phrase--rewritten"
                role="button"
                tabIndex={0}
                title="Texto reescrito. Pulsa para editar de nuevo."
                onClick={() => onEditPhrase(seg.id)}
              >
                {seg.override_text}{" "}
              </span>
            );
          }
          return (
            <span key={seg.id} className="phrase" data-seg-id={seg.id}>
              <span className="phrase__ctrl" contentEditable={false}>
                <button
                  className="phrase__time"
                  type="button"
                  title={`Reproducir desde ${msToStr(seg.start_ms)}`}
                  onClick={() => onSeek?.(seg.start_ms)}
                >
                  ▸ {msToStr(seg.start_ms)}
                </button>
                <button
                  className="phrase__edit"
                  type="button"
                  title="Reescribir esta frase como texto"
                  onClick={() => onEditPhrase(seg.id)}
                >
                  ✎
                </button>
              </span>
              {seg.words.map((w, i) => (
                <span key={w.idx}>
                  {i > 0 ? " " : ""}
                  <Word
                    word={w}
                    threshold={threshold}
                    onPick={(word, rect) => onPickWord?.(seg.id, word, rect)}
                  />
                </span>
              ))}{" "}
            </span>
          );
        })}

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
    </article>
  );
}
