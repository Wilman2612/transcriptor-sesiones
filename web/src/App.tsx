import { useEffect, useState } from "react";
import { getRepository } from "./lib/data/getRepository";
import type { ReviewData } from "./lib/types";
import { ReviewWorkbench } from "./components/ReviewWorkbench";
import { ErrorNote, LoadingNote } from "./components/Notes";

const repo = getRepository();

function currentSessionId(): number {
  const s = new URLSearchParams(window.location.search).get("s");
  return s ? Number(s) : 1;
}

export default function App() {
  const [review, setReview] = useState<ReviewData | null>(null);
  const [error, setError] = useState(false);
  const sessionId = currentSessionId();

  useEffect(() => {
    let alive = true;
    repo
      .getReview(sessionId)
      .then((d) => alive && setReview(d))
      .catch(() => alive && setError(true));
    return () => {
      alive = false;
    };
  }, [sessionId]);

  return (
    <main style={{ maxWidth: 1180, margin: "0 auto", padding: "1.5rem" }}>
      {error ? (
        <ErrorNote onRetry={() => window.location.reload()} />
      ) : !review ? (
        <LoadingNote progress={100} detail="Cargando la revisión…" />
      ) : (
        <ReviewWorkbench
          initial={review}
          repo={repo}
          audioUrl={`/audio/${sessionId}`}
          exportUrl={`/sessions/${sessionId}/export/docx`}
        />
      )}
    </main>
  );
}
