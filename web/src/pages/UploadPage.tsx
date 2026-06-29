import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { getSessionsRepository } from "../lib/data/getRepository";

const repo = getSessionsRepository();

export function UploadPage() {
  const nav = useNavigate();
  const [name, setName] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [audio, setAudio] = useState<File | null>(null);
  const [s24, setS24] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!audio) return;
    setBusy(true);
    setError(null);
    try {
      const id = await repo.create({ name, date, audio, s24 });
      nav(`/sessions/${id}/progress`);
    } catch {
      setError("No se pudo subir la grabación. Revisa el archivo e inténtalo de nuevo.");
      setBusy(false);
    }
  };

  return (
    <div className="desk">
      <div className="desk__head">
        <div>
          <p className="desk__eyebrow">Nueva sesión</p>
          <h1 className="desk__title">Subir grabación</h1>
          <p className="desk__sub">
            Sube el audio de la sesión. Si tienes el archivo de hablantes del teléfono, añádelo
            también.
          </p>
        </div>
      </div>

      <form className="form" onSubmit={submit} style={{ maxWidth: 560 }}>
        <label className="field">
          <span className="field__label">Nombre de la sesión</span>
          <input
            className="field__input"
            value={name}
            required
            placeholder="Sesión ordinaria de consejo"
            onChange={(e) => setName(e.target.value)}
          />
        </label>

        <label className="field">
          <span className="field__label">Fecha</span>
          <input
            className="field__input"
            type="date"
            value={date}
            required
            onChange={(e) => setDate(e.target.value)}
          />
        </label>

        <label className="field">
          <span className="field__label">Audio de la sesión</span>
          <input
            className="field__input"
            type="file"
            accept="audio/*,.m4a,.mp3,.wav"
            required
            onChange={(e) => setAudio(e.target.files?.[0] ?? null)}
          />
        </label>

        <label className="field">
          <span className="field__label">
            Hablantes del teléfono <span className="field__hint">(opcional)</span>
          </span>
          <input
            className="field__input"
            type="file"
            accept=".txt"
            onChange={(e) => setS24(e.target.files?.[0] ?? null)}
          />
        </label>

        {error && <p className="text-error">{error}</p>}

        <div className="actions">
          <button className="btn btn--primary" type="submit" disabled={busy || !audio}>
            {busy ? "Subiendo…" : "Subir y transcribir"}
          </button>
          <button className="btn btn--ghost" type="button" onClick={() => nav("/")}>
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}
