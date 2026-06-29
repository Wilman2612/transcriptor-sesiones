import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getRepository } from "../lib/data/getRepository";
import type { ReviewData } from "../lib/types";
import { ReviewWorkbench } from "../components/ReviewWorkbench";
import { ErrorNote, LoadingNote } from "../components/Notes";

const repo = getRepository();

export function ReviewPage() {
  const { id } = useParams();
  const nav = useNavigate();
  const sessionId = Number(id);
  const [review, setReview] = useState<ReviewData | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let alive = true;
    setReview(null);
    setError(false);
    repo
      .getReview(sessionId)
      .then((d) => alive && setReview(d))
      .catch(() => alive && setError(true));
    return () => {
      alive = false;
    };
  }, [sessionId]);

  if (error) return <ErrorNote onRetry={() => window.location.reload()} onBack={() => nav("/")} />;
  if (!review) return <LoadingNote progress={100} detail="Cargando la revisión…" />;
  return (
    <ReviewWorkbench
      initial={review}
      repo={repo}
      audioUrl={`/audio/${sessionId}`}
      exportUrl={`/sessions/${sessionId}/export/docx`}
    />
  );
}
