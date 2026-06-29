import { useEffect, useMemo, useRef, useState } from "react";
import type { IReviewRepository } from "../lib/data/IReviewRepository";
import type { ReviewData, Word as WordT } from "../lib/types";
import { countDoubts } from "../lib/confidence";
import { listGlossary } from "../lib/data/glossary";
import { groupIntoTurns } from "../lib/turns";
import { Turn } from "./Turn";
import { Tally } from "./Tally";
import { DoubtPopover } from "./DoubtPopover";
import { EmptyNote, ResolvedNote } from "./Notes";

interface Props {
  initial: ReviewData;
  repo: IReviewRepository;
  audioUrl?: string;
  exportUrl?: string;
  defaultThreshold?: number;
}

interface Editing {
  segmentId: number;
  word: WordT;
  rect: DOMRect;
}

/** Escritorio de corrección: revisión con umbral ajustable y edición libre. */
export function ReviewWorkbench({ initial, repo, audioUrl, exportUrl, defaultThreshold = 0.8 }: Props) {
  const [review, setReview] = useState<ReviewData>(initial);
  const [threshold, setThreshold] = useState(defaultThreshold);
  const [editing, setEditing] = useState<Editing | null>(null);
  const [textSeg, setTextSeg] = useState<number | null>(null);
  const [reprocessing, setReprocessing] = useState<string | null>(null);
  const [roster, setRoster] = useState<string[]>([]);

  useEffect(() => {
    listGlossary()
      .then((ts) => setRoster(ts.filter((t) => t.kind === "persona").map((t) => t.text)))
      .catch(() => setRoster([]));
  }, []);
  const audioRef = useRef<HTMLAudioElement>(null);
  const stopAt = useRef<number | null>(null);

  const counts = useMemo(() => countDoubts(review, threshold), [review, threshold]);
  const turns = useMemo(() => groupIntoTurns(review.segments), [review.segments]);

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
          w.idx === word.idx ? { ...w, text, sealed: true } : w,
        );
        return { ...s, words };
      });
      return { ...prev, segments, doubts_left: res.session_doubts_left };
    });
    setEditing(null);
  };

  const goNextDoubt = () => {
    const nodes = Array.from(document.querySelectorAll<HTMLElement>(".w--doubt"));
    if (!nodes.length) return;
    const y = window.scrollY + 120;
    const next = nodes.find((n) => window.scrollY + n.getBoundingClientRect().top > y) ?? nodes[0];
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

  const savePhrase = async (segmentId: number, text: string) => {
    const res = await repo.rewriteSegment(segmentId, text);
    const clean = text.trim() || null;
    setReview((prev) => ({
      ...prev,
      doubts_left: res.session_doubts_left,
      segments: prev.segments.map((s) =>
        s.id === segmentId ? { ...s, override_text: clean } : s,
      ),
    }));
    setTextSeg(null);
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
            {turns.length} intervenciones · Haz clic en <strong>cualquier palabra</strong> para
            editarla; las marcadas son las de baja confianza.
          </p>
        </div>
        <Tally doubtsLeft={counts.left} totalDoubts={counts.total} />
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
        <a className="btn" href={`/app/sessions/${review.session_id}/speakers`}>
          Hablantes
        </a>
        <a className="btn btn--ghost" href="/app/">
          ← Sesiones
        </a>
        {counts.left > 0 && (
          <button className="btn btn--next" type="button" onClick={goNextDoubt}>
            Siguiente duda ↓
          </button>
        )}
      </div>

      {/* Slider: mueve el nivel de confianza por debajo del cual se resalta. */}
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

      <div className="acta">
        {turns.map((t) => (
          <Turn
            key={t.key}
            turn={t}
            threshold={threshold}
            textSegId={textSeg}
            busy={reprocessing === t.key}
            speakerName={review.speakers[t.speaker] ?? t.speaker}
            onRename={renameSpeaker}
            onSeek={(ms) => playRange(ms, null)}
            onPickWord={(segmentId, word, rect) => setEditing({ segmentId, word, rect })}
            onEditPhrase={(segId) => setTextSeg(segId)}
            onSavePhrase={savePhrase}
            onCancelPhrase={() => setTextSeg(null)}
            onReprocess={() => reprocessTurn(t.key, t.segments.map((s) => s.id))}
          />
        ))}
      </div>

      {editing && (
        <DoubtPopover
          initialText={editing.word.text}
          confidence={editing.word.confidence}
          rect={editing.rect}
          onHear={() => playRange(editing.word.start_ms, editing.word.end_ms)}
          onCommit={commit}
          onCancel={() => setEditing(null)}
        />
      )}
    </div>
  );
}
