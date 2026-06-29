import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { listSessionSpeakers, type SpeakerRow } from "../lib/data/speakers";
import { listGlossary } from "../lib/data/glossary";
import { getRepository } from "../lib/data/getRepository";

const repo = getRepository();

export function SpeakersPage() {
  const { id } = useParams();
  const sessionId = Number(id);
  const [rows, setRows] = useState<SpeakerRow[]>([]);
  const [roster, setRoster] = useState<string[]>([]);
  const [saved, setSaved] = useState<Record<string, boolean>>({});

  useEffect(() => {
    listSessionSpeakers(sessionId).then(setRows).catch(() => setRows([]));
    listGlossary()
      .then((ts) => setRoster(ts.filter((t) => t.kind === "persona").map((t) => t.text)))
      .catch(() => setRoster([]));
  }, [sessionId]);

  const save = async (key: string, name: string) => {
    await repo.setSpeakerName(sessionId, key, name);
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, name } : r)));
    setSaved((s) => ({ ...s, [key]: true }));
    window.setTimeout(() => setSaved((s) => ({ ...s, [key]: false })), 1500);
  };

  return (
    <div className="desk">
      <datalist id="speaker-roster">
        {roster.map((r) => (
          <option key={r} value={r} />
        ))}
      </datalist>

      <div className="desk__head">
        <div>
          <p className="desk__eyebrow">Hablantes de la sesión</p>
          <h1 className="desk__title">¿Quién es cada hablante?</h1>
          <p className="desk__sub">
            Lee la muestra de lo que dice cada uno y asígnale su nombre o cargo. Se aplica a todas
            sus intervenciones y al acta final.
          </p>
        </div>
      </div>

      <div className="actions">
        <Link className="btn btn--primary" to={`/sessions/${sessionId}/review`}>
          ← Volver a la revisión
        </Link>
      </div>

      <div className="speakers">
        {rows.map((r) => (
          <div className="speaker-row" key={r.key}>
            <div className="speaker-row__id">
              <span className="seg__speaker-glyph" />
              {r.key}
            </div>
            <div className="speaker-row__body">
              <input
                className="field__input"
                list="speaker-roster"
                defaultValue={r.name}
                placeholder="Nombre o cargo (p. ej. Alcalde, Regidor Salas)"
                onBlur={(e) => save(r.key, e.target.value.trim())}
                onKeyDown={(e) => {
                  if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                }}
              />
              <p className="speaker-row__sample">“{r.sample}…”</p>
            </div>
            <div className="speaker-row__state">{saved[r.key] ? "✓ guardado" : ""}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
