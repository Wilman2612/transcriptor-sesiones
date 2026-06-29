import type { Turn } from "../lib/turns";
import { SpeakerLabel } from "./SpeakerLabel";
import { TurnEditor } from "./TurnEditor";

interface Props {
  turns: Turn[];
  threshold: number;
  speakers: Record<string, string>;
  reprocessing: string | null;
  onSeek: (ms: number) => void;
  onSaveSegment: (segmentId: number, text: string) => void;
  onRename: (key: string, name: string) => void;
  onReprocess: (key: string, segmentIds: number[]) => void;
}

/** Tabla Hablante | Texto. El texto es un editor enriquecido por turno; el
 *  hablante se renombra por clave (coherente en todos sus turnos). */
export function TranscriptTable({
  turns,
  threshold,
  speakers,
  reprocessing,
  onSeek,
  onSaveSegment,
  onRename,
  onReprocess,
}: Props) {
  return (
    <div className="rw-table">
      {turns.map((t) => (
        <div className="rw-row" key={t.key}>
          <div className="rw-speaker">
            <SpeakerLabel
              speakerKey={t.speaker}
              name={speakers[t.speaker] ?? t.speaker}
              onRename={onRename}
            />
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
          <TurnEditor turn={t} threshold={threshold} onSeek={onSeek} onSaveSegment={onSaveSegment} />
        </div>
      ))}
    </div>
  );
}
