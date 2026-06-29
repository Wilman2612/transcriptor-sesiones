import { useRef, useState } from "react";
import type { IReviewRepository } from "../lib/data/IReviewRepository";
import type { ReviewData, Word as WordT } from "../lib/types";
import { Segment } from "./Segment";
import { Tally } from "./Tally";
import { DoubtPopover } from "./DoubtPopover";
import { EmptyNote, ResolvedNote } from "./Notes";

interface Props {
  initial: ReviewData;
  repo: IReviewRepository;
  audioUrl?: string;
  exportUrl?: string;
}

interface Editing {
  segmentId: number;
  word: WordT;
  rect: DOMRect;
}

/** Escritorio de corrección: el contenedor con la interacción de revisión. */
export function ReviewWorkbench({ initial, repo, audioUrl, exportUrl }: Props) {
  const [review, setReview] = useState<ReviewData>(initial);
  const [editing, setEditing] = useState<Editing | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const stopAt = useRef<number | null>(null);

  const playRange = (startMs: number, endMs: number | null) => {
    const a = audioRef.current;
    if (!a) return;
    a.currentTime = startMs / 1000;
    stopAt.current = endMs != null ? endMs / 1000 : null;
    void a.play();
  };

  const onTimeUpdate = () => {
    const a = audioRef.current;
    if (a && stopAt.current != null && a.currentTime >= stopAt.current) {
      a.pause();
      stopAt.current = null;
    }
  };

  const commit = async (text: string) => {
    if (!editing) return;
    const { segmentId, word } = editing;
    const res = await repo.correctWord(segmentId, word.idx, text);
    setReview((prev) => {
      const segments = prev.segments.map((s) => {
        if (s.id !== segmentId) return s;
        const words = s.words.map((w) =>
          w.idx === word.idx ? { ...w, text, kind: "sealed" as const } : w,
        );
        return { ...s, words, doubts_left: Math.max(0, s.doubts_left - 1) };
      });
      return { ...prev, segments, doubts_left: res.session_doubts_left };
    });
    setEditing(null);
  };

  const goNextDoubt = () => {
    const nodes = Array.from(document.querySelectorAll<HTMLElement>(".w--doubt"));
    if (!nodes.length) return;
    const threshold = window.scrollY + 120;
    const next =
      nodes.find((n) => window.scrollY + n.getBoundingClientRect().top > threshold) ?? nodes[0];
    next.scrollIntoView({ behavior: "smooth", block: "center" });
    window.setTimeout(() => {
      const segEl = next.closest<HTMLElement>("[data-seg-id]");
      const segmentId = Number(segEl?.dataset.segId);
      const idx = Number(next.dataset.idx);
      const seg = review.segments.find((s) => s.id === segmentId);
      const word = seg?.words.find((w) => w.idx === idx);
      if (word) setEditing({ segmentId, word, rect: next.getBoundingClientRect() });
    }, 300);
  };

  const exportDocx = () => exportUrl && window.open(exportUrl, "_blank");
  const hasDoubts = review.total_doubts > 0;
  const allResolved = hasDoubts && review.doubts_left === 0;

  return (
    <div className="desk">
      <div className="desk__head">
        <div>
          <p className="desk__eyebrow">Acta de sesión · revisión</p>
          <h1 className="desk__title">{review.name}</h1>
          <p className="desk__sub">
            {review.total_segments} intervenciones ·{" "}
            {hasDoubts ? (
              <>
                La transcripción está lista. <strong>Haz clic en las palabras subrayadas</strong>{" "}
                para revisarlas y corregirlas.
              </>
            ) : (
              "La transcripción salió con alta confianza en todo el audio."
            )}
          </p>
        </div>
        <Tally doubtsLeft={review.doubts_left} totalDoubts={review.total_doubts} />
      </div>

      <div className="actions">
        <button className="btn" type="button" onClick={() => audioRef.current?.play()}>
          ▸ Reproducir
        </button>
        {exportUrl && (
          <a className="btn" href={exportUrl}>
            Exportar DOCX
          </a>
        )}
        <a className="btn btn--ghost" href="/">
          ← Sesiones
        </a>
        {hasDoubts && review.doubts_left > 0 && (
          <button className="btn btn--next" type="button" onClick={goNextDoubt}>
            Siguiente duda ↓
          </button>
        )}
      </div>

      {!hasDoubts && <EmptyNote onExport={exportDocx} />}
      {allResolved && <ResolvedNote count={review.total_doubts} onExport={exportDocx} />}

      {audioUrl && (
        <audio
          ref={audioRef}
          className="player"
          controls
          preload="none"
          src={audioUrl}
          onTimeUpdate={onTimeUpdate}
        />
      )}

      <div className="acta">
        {review.segments.map((s) => (
          <Segment
            key={s.id}
            segment={s}
            onSeek={(ms) => playRange(ms, null)}
            onPickWord={(segmentId, word, rect) => setEditing({ segmentId, word, rect })}
          />
        ))}
      </div>

      {editing && (
        <DoubtPopover
          initialText={editing.word.text}
          rect={editing.rect}
          onHear={() => playRange(editing.word.start_ms, editing.word.end_ms)}
          onCommit={commit}
          onCancel={() => setEditing(null)}
        />
      )}
    </div>
  );
}
