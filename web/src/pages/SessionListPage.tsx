import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getSessionsRepository } from "../lib/data/getRepository";
import type { SessionSummary } from "../lib/types";
import { LoadingNote } from "../components/Notes";

const repo = getSessionsRepository();

const STATUS_LABEL: Record<string, string> = {
  pending: "En cola",
  processing: "Procesando",
  transcribed: "Lista para revisar",
  reviewing: "En revisión",
  done: "Terminada",
  error: "Con error",
};

export function SessionListPage() {
  const [sessions, setSessions] = useState<SessionSummary[] | null>(null);
  const [deleting, setDeleting] = useState<number | null>(null);

  useEffect(() => {
    repo.list().then(setSessions).catch(() => setSessions([]));
  }, []);

  const handleDelete = async (e: React.MouseEvent, s: SessionSummary) => {
    e.preventDefault(); // no navegar: el botón está dentro del enlace de la tarjeta
    e.stopPropagation();
    if (!window.confirm(`¿Eliminar "${s.name}"? Se borra la grabación y la transcripción. No se puede deshacer.`)) return;
    setDeleting(s.id);
    try {
      await repo.remove(s.id);
      setSessions((prev) => (prev ?? []).filter((x) => x.id !== s.id));
    } catch {
      window.alert("No se pudo eliminar la sesión. Inténtalo de nuevo.");
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="desk">
      <div className="desk__head">
        <div>
          <p className="desk__eyebrow">Transcriptor municipal</p>
          <h1 className="desk__title">Sesiones de consejo</h1>
          <p className="desk__sub">Sube una grabación y revisa su transcripción.</p>
        </div>
      </div>

      <div className="actions">
        <Link className="btn btn--primary" to="/upload">
          + Nueva sesión
        </Link>
      </div>

      {!sessions ? (
        <LoadingNote progress={100} detail="Cargando sesiones…" />
      ) : sessions.length === 0 ? (
        <div className="note" style={{ borderStyle: "solid", borderColor: "var(--accent-soft)" }}>
          <span className="note__mark" style={{ color: "var(--accent)" }}>
            ◷
          </span>
          <p className="note__title">Aún no hay sesiones</p>
          <p className="note__body">Empieza subiendo la grabación de una sesión de consejo.</p>
          <Link className="btn btn--primary" to="/upload">
            Subir grabación
          </Link>
        </div>
      ) : (
        <div className="acta">
          {sessions.map((s) => {
            const ready = s.status === "transcribed" || s.status === "reviewing" || s.status === "done";
            const to = ready ? `/sessions/${s.id}/review` : `/sessions/${s.id}/progress`;
            return (
              <Link key={s.id} to={to} className="seg" style={{ textDecoration: "none", color: "inherit" }}>
                <div className="seg__meta">
                  <span className="seg__time">{s.date}</span>
                </div>
                <p className="seg__text" style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: ".75rem" }}>
                  <span>{s.name}</span>
                  <span style={{ display: "flex", alignItems: "center", gap: ".75rem" }}>
                    <span className={`badge-${s.status}`} style={{ fontSize: ".8rem", fontFamily: "Inter, sans-serif" }}>
                      {STATUS_LABEL[s.status] ?? s.status}
                    </span>
                    <button
                      type="button"
                      className="session__del"
                      title="Eliminar esta sesión"
                      disabled={deleting === s.id}
                      onClick={(e) => handleDelete(e, s)}
                    >
                      {deleting === s.id ? "…" : "Eliminar"}
                    </button>
                  </span>
                </p>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
