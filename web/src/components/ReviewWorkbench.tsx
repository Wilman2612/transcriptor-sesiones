import { useEffect, useMemo, useRef, useState } from "react";
import type { IReviewRepository } from "../lib/data/IReviewRepository";
import type { ReviewData } from "../lib/types";
import { countDoubts } from "../lib/confidence";
import { listGlossary } from "../lib/data/glossary";
import { groupIntoTurns } from "../lib/turns";
import { TranscriptTable } from "./TranscriptTable";
import { Tally } from "./Tally";
import { EmptyNote, ResolvedNote } from "./Notes";

interface Props {
  initial: ReviewData;
  repo: IReviewRepository;
  audioUrl?: string;
  exportUrl?: string;
  defaultThreshold?: number;
}

/** Revisión: editor enriquecido (tabla Hablante|Texto) con umbral ajustable. */
export function ReviewWorkbench({ initial, repo, audioUrl, exportUrl, defaultThreshold = 0.8 }: Props) {
  const [review, setReview] = useState<ReviewData>(initial);
  const [threshold, setThreshold] = useState(defaultThreshold);
  const [reprocessing, setReprocessing] = useState<string | null>(null);
  const [roster, setRoster] = useState<string[]>([]);
  const audioRef = useRef<HTMLAudioElement>(null);
  const stopAt = useRef<number | null>(null);

  useEffect(() => {
    listGlossary()
      .then((ts) => setRoster(ts.filter((t) => t.kind === "persona").map((t) => t.text)))
      .catch(() => setRoster([]));
  }, []);

  const counts = useMemo(() => countDoubts(review, threshold), [review, threshold]);
  const turns = useMemo(() => groupIntoTurns(review.segments), [review.segments]);

  // Clic normal: mueve el audio en silencio (para no estorbar la edición).
  const seekTo = (ms: number) => {
    const a = audioRef.current;
    if (!a) return;
    stopAt.current = null;
    a.currentTime = ms / 1000;
  };
  // Alt+clic: reproduce ese tramo (oír la palabra).
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

  const saveSegment = async (segmentId: number, text: string) => {
    await repo.rewriteSegment(segmentId, text);
    setReview((prev) => ({
      ...prev,
      segments: prev.segments.map((s) =>
        s.id === segmentId ? { ...s, override_text: text || null } : s,
      ),
    }));
  };

  const reprocessTurn = async (key: string, segmentIds: number[]) => {
    setReprocessing(key);
    try {
      await repo.reprocess(segmentIds);
      const fresh = await repo.getReview(review.session_id);
      setReview(fresh);
    } finally {
      setReprocessing(null);
    }
  };

  const toggleBookmark = async (segmentId: number) => {
    const next = review.bookmark_segment_id === segmentId ? null : segmentId;
    setReview((prev) => ({ ...prev, bookmark_segment_id: next }));
    await repo.setBookmark(review.session_id, next);
  };

  const goToBookmark = () => {
    document
      .getElementById("bookmark-anchor")
      ?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const renameSpeaker = async (key: string, name: string) => {
    await repo.setSpeakerName(review.session_id, key, name);
    setReview((prev) => {
      const speakers = { ...prev.speakers };
      if (name.trim()) speakers[key] = name.trim();
      else delete speakers[key];
      return { ...prev, speakers };
    });
  };

  const exportDocx = () => exportUrl && window.open(exportUrl, "_blank");
  const hasDoubts = counts.total > 0;
  const allResolved = hasDoubts && counts.left === 0;

  return (
    <div className="desk">
      <datalist id="speaker-roster">
        {roster.map((r) => (
          <option key={r} value={r} />
        ))}
      </datalist>

      <div className="desk__head">
        <div>
          <p className="desk__eyebrow">Acta de sesión · revisión</p>
          <h1 className="desk__title">{review.name}</h1>
          <p className="desk__sub">
            {turns.length} intervenciones · Edita el texto como en un documento. Las palabras
            marcadas son las de baja confianza; pasa el cursor para ver tiempo y confianza, y
            haz <strong>Alt+clic</strong> en una palabra para oírla.
          </p>
        </div>
        <Tally doubtsLeft={counts.left} totalDoubts={counts.total} />
      </div>

      <div className="actions">
        <button className="btn" type="button" onClick={() => audioRef.current?.play()}>
          ▸ Reproducir
        </button>
        {review.bookmark_segment_id != null && (
          <button className="btn btn--bookmark" type="button" onClick={goToBookmark}>
            🔖 Continuar donde lo dejé
          </button>
        )}
        {exportUrl && (
          <a className="btn" href={exportUrl}>
            Exportar DOCX
          </a>
        )}
        <a className="btn" href={`/app/sessions/${review.session_id}/speakers`}>
          Hablantes
        </a>
        <a className="btn btn--ghost" href="/app/">
          ← Sesiones
        </a>
      </div>

      <div className="threshold">
        <label htmlFor="thr" className="threshold__label">
          Resaltar palabras con confianza menor a:{" "}
          <strong>{Math.round(threshold * 100)}%</strong>
        </label>
        <input
          id="thr"
          className="threshold__slider"
          type="range"
          min={0.3}
          max={0.98}
          step={0.01}
          value={threshold}
          onChange={(e) => setThreshold(Number(e.target.value))}
        />
        <span className="threshold__hint">
          {counts.left} marcadas · sube para revisar más, baja para ver solo las más dudosas
        </span>
      </div>

      {!hasDoubts && <EmptyNote onExport={exportDocx} />}
      {allResolved && <ResolvedNote count={counts.total} onExport={exportDocx} />}

      {audioUrl && (
        <audio ref={audioRef} className="player" controls preload="none" src={audioUrl} onTimeUpdate={onTimeUpdate} />
      )}

      <TranscriptTable
        turns={turns}
        threshold={threshold}
        speakers={review.speakers}
        reprocessing={reprocessing}
        bookmarkSegmentId={review.bookmark_segment_id ?? null}
        onSeek={seekTo}
        onHearWord={(start, end) => playRange(start, end)}
        onSaveSegment={saveSegment}
        onRename={renameSpeaker}
        onReprocess={reprocessTurn}
        onToggleBookmark={toggleBookmark}
      />
    </div>
  );
}
