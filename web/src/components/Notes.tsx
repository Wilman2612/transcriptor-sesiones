interface ExportProps {
  onExport?: () => void;
}

/** Sesión sin dudas: la IA salió limpia. Tono informativo, no "completaste".
 *  Glifo distinto (✦, no ✓) para no confundirse con "revisión completa". */
export function EmptyNote({ onExport }: ExportProps) {
  return (
    <div className="note" style={{ borderStyle: "solid", borderColor: "var(--accent-soft)" }}>
      <span className="note__mark" style={{ color: "var(--accent)" }}>
        ✦
      </span>
      <p className="note__title">Sin dudas que revisar</p>
      <p className="note__body">
        La IA transcribió con alta confianza y no marcó ninguna palabra. Puedes exportar el acta
        directamente; revísala si quieres asegurarte.
      </p>
      <button className="btn btn--primary" type="button" onClick={onExport}>
        Exportar acta (DOCX)
      </button>
    </div>
  );
}

/** Todas las dudas resueltas: celebra el trabajo hecho. */
export function ResolvedNote({ count, onExport }: ExportProps & { count: number }) {
  return (
    <div className="note note--sealed" style={{ marginBottom: "1.4rem" }}>
      <span className="note__mark">✓</span>
      <p className="note__title">Revisión completa</p>
      <p className="note__body">
        Resolviste las <strong>{count}</strong> dudas de esta sesión. Exporta el acta final cuando
        quieras.
      </p>
      <button className="btn btn--primary" type="button" onClick={onExport}>
        Exportar acta (DOCX)
      </button>
    </div>
  );
}

export function ErrorNote({ onRetry, onBack }: { onRetry?: () => void; onBack?: () => void }) {
  return (
    <div className="note note--error">
      <span className="note__mark">⚠</span>
      <p className="note__title">No se pudo terminar la transcripción</p>
      <p className="note__body">
        El audio se cargó bien, pero el proceso se interrumpió. Vuelve a intentarlo; si el problema
        sigue, avisa a soporte.
      </p>
      <div className="actions" style={{ justifyContent: "center" }}>
        <button className="btn btn--primary" type="button" onClick={onRetry}>
          Reintentar transcripción
        </button>
        {onBack && (
          <button className="btn btn--ghost" type="button" onClick={onBack}>
            Volver a sesiones
          </button>
        )}
      </div>
    </div>
  );
}

export function LoadingNote({ progress, detail }: { progress: number; detail?: string }) {
  return (
    <div className="loading">
      <p className="desk__eyebrow">Transcribiendo el audio</p>
      <h2 className="desk__title" style={{ fontSize: "1.4rem", marginBottom: "1rem" }}>
        Esto puede tardar unos minutos
      </h2>
      <div className="loading__bar">
        <div className="loading__fill" style={{ width: `${progress}%` }} />
      </div>
      <div className="loading__meta">
        <span>{detail ?? "Procesando…"}</span>
        <span>{progress}%</span>
      </div>
    </div>
  );
}
