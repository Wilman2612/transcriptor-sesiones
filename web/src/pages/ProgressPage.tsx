import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getSessionsRepository } from "../lib/data/getRepository";
import type { JobStatus } from "../lib/types";
import { ErrorNote, LoadingNote } from "../components/Notes";

const repo = getSessionsRepository();

const STAGE: Record<string, string> = {
  queued: "En cola…",
  running: "Procesando el audio…",
  pending: "Preparando…",
  processing: "Procesando el audio…",
};

export function ProgressPage() {
  const { id } = useParams();
  const sessionId = Number(id);
  const nav = useNavigate();
  const [job, setJob] = useState<JobStatus | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    const tick = async () => {
      try {
        const s = await repo.status(sessionId);
        if (!alive) return;
        setJob(s);
        if (s.review_ready) {
          nav(`/sessions/${sessionId}/review`);
        } else if (s.status === "failed" || s.status === "error") {
          setFailed(true);
        }
      } catch {
        /* reintenta en el próximo tick */
      }
    };
    void tick();
    const t = window.setInterval(tick, 2500);
    return () => {
      alive = false;
      window.clearInterval(t);
    };
  }, [sessionId, nav]);

  if (failed || job?.error)
    return <ErrorNote onRetry={() => window.location.reload()} onBack={() => nav("/")} />;

  return (
    <div className="desk">
      <LoadingNote progress={job?.progress ?? 0} detail={STAGE[job?.status ?? "queued"] ?? "Transcribiendo…"} />
    </div>
  );
}
