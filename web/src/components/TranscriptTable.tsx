import type { Turn } from "../lib/turns";
import { SpeakerLabel } from "./SpeakerLabel";
import { TurnEditor } from "./TurnEditor";

interface Props {
  turns: Turn[];
  threshold: number;
  speakers: Record<string, string>;
  reprocessing: string | null;
  bookmarkSegmentId: number | null;
  onSeek: (ms: number) => void;
  onHearWord: (startMs: number, endMs: number) => void;
  onSaveSegment: (segmentId: number, text: string) => void;
  onRename: (key: string, name: string) => void;
  onReprocess: (key: string, segmentIds: number[]) => void;
  onToggleBookmark: (segmentId: number) => void;
}

/** Tabla Hablante | Texto. El texto es un editor enriquecido por turno; el
 *  hablante se renombra por clave (coherente en todos sus turnos). */
export function TranscriptTable({
  turns,
  threshold,
  speakers,
  reprocessing,
  bookmarkSegmentId,
  onSeek,
  onHearWord,
  onSaveSegment,
  onRename,
  onReprocess,
  onToggleBookmark,
}: Props) {
  return (
    <div className="rw-table">
      {turns.map((t) => {
        const marked = t.segments.some((s) => s.id === bookmarkSegmentId);
        return (
        <div
          className={`rw-row${marked ? " is-bookmarked" : ""}`}
          key={t.key}
          id={marked ? "bookmark-anchor" : undefined}
        >
          <div className="rw-speaker">
            <SpeakerLabel
              speakerKey={t.speaker}
              name={speakers[t.speaker] ?? t.speaker}
              onRename={onRename}
            />
            <div className="rw-speaker__tools">
              <button
                className={`turn__bookmark${marked ? " is-on" : ""}`}
                type="button"
                aria-pressed={marked}
                title={marked ? "Quitar el marcador" : "Marcar aquí para retomar después"}
                onClick={() => onToggleBookmark(t.segments[0].id)}
              >
                {marked ? "🔖 Aquí lo dejé" : "🔖 Marcar"}
              </button>
              <button
                className="turn__reprocess"
                type="button"
                disabled={reprocessing === t.key}
                title="Re-transcribir este tramo en aislamiento (recupera alucinaciones)"
                onClick={() => onReprocess(t.key, t.segments.map((s) => s.id))}
              >
                {reprocessing === t.key ? "Procesando…" : "⟳ Re-procesar"}
              </button>
            </div>
            {reprocessing === t.key && (
              <div
                className="reproc-bar"
                role="progressbar"
                aria-label="Re-transcribiendo el tramo"
                title="Re-transcribiendo… puede tardar unos segundos"
              >
                <div className="reproc-bar__fill" />
              </div>
            )}
          </div>
          <TurnEditor
            turn={t}
            threshold={threshold}
            onSeek={onSeek}
            onHearWord={onHearWord}
            onSaveSegment={onSaveSegment}
          />
        </div>
        );
      })}
    </div>
  );
}
