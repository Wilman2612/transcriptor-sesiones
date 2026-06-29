import { useCallback, useEffect, useState } from "react";
import type { GlossaryKind, GlossaryTerm } from "../lib/types";
import {
  addGlossary,
  deleteGlossary,
  getGlossaryPrompt,
  listGlossary,
  type PromptInfo,
} from "../lib/data/glossary";

const KIND_LABEL: Record<GlossaryKind, string> = {
  persona: "Personas",
  termino: "Términos",
  patron: "Patrones",
};

export function GlossaryPage() {
  const [terms, setTerms] = useState<GlossaryTerm[]>([]);
  const [text, setText] = useState("");
  const [kind, setKind] = useState<GlossaryKind>("persona");
  const [busy, setBusy] = useState(false);
  const [prompt, setPrompt] = useState<PromptInfo | null>(null);

  const refreshPrompt = useCallback(() => {
    getGlossaryPrompt().then(setPrompt).catch(() => setPrompt(null));
  }, []);

  useEffect(() => {
    listGlossary().then(setTerms).catch(() => setTerms([]));
    refreshPrompt();
  }, [refreshPrompt]);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    const t = text.trim();
    if (!t) return;
    setBusy(true);
    try {
      const created = await addGlossary(t, kind);
      setTerms((prev) =>
        prev.some((x) => x.id === created.id) ? prev : [...prev, created],
      );
      setText("");
      refreshPrompt();
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: number) => {
    await deleteGlossary(id);
    setTerms((prev) => prev.filter((t) => t.id !== id));
    refreshPrompt();
  };

  const pct = prompt ? Math.min(100, Math.round((prompt.tokens / prompt.limit) * 100)) : 0;
  const tone = pct >= 90 ? "var(--doubt-high)" : pct >= 70 ? "var(--doubt-mid)" : "var(--sealed)";

  const byKind = (k: GlossaryKind) => terms.filter((t) => t.kind === k);

  return (
    <div className="desk">
      <div className="desk__head">
        <div>
          <p className="desk__eyebrow">Configuración</p>
          <h1 className="desk__title">Glosario del consejo</h1>
          <p className="desk__sub">
            Añade <strong>solo lo que la IA suele equivocar</strong>: nombres propios (del
            consejo, lugares) y jerga poco común. Las palabras corrientes ya las transcribe
            bien y no hace falta ponerlas.
          </p>
        </div>
      </div>

      <form className="form" onSubmit={add} style={{ maxWidth: 620, marginBottom: "2rem" }}>
        <div style={{ display: "flex", gap: ".6rem", alignItems: "flex-end", flexWrap: "wrap" }}>
          <label className="field" style={{ flex: 1, minWidth: 240 }}>
            <span className="field__label">Nuevo término</span>
            <input
              className="field__input"
              value={text}
              placeholder="Ej. Carla Medina Rojas"
              onChange={(e) => setText(e.target.value)}
            />
          </label>
          <label className="field">
            <span className="field__label">Tipo</span>
            <select
              className="field__input"
              value={kind}
              onChange={(e) => setKind(e.target.value as GlossaryKind)}
            >
              <option value="persona">Persona</option>
              <option value="termino">Término</option>
              <option value="patron">Patrón</option>
            </select>
          </label>
          <button className="btn btn--primary" type="submit" disabled={busy || !text.trim()}>
            Añadir
          </button>
        </div>
      </form>

      {prompt && (
        <div className="tokenbar" style={{ maxWidth: 620, marginBottom: "2rem" }}>
          <div className="tokenbar__head">
            <span>Prompt de IA (sesga la transcripción de sesiones nuevas)</span>
            <strong style={{ color: tone }}>
              {prompt.tokens} / {prompt.limit} tokens
            </strong>
          </div>
          <div className="tokenbar__track">
            <div className="tokenbar__fill" style={{ width: `${pct}%`, background: tone }} />
          </div>
          <p className="tokenbar__hint">
            {pct >= 90
              ? "Casi al límite: quita términos que la IA ya transcribe bien."
              : "Hay espacio. Recuerda: solo añade lo que la IA suele equivocar."}
          </p>
        </div>
      )}

      {terms.length === 0 ? (
        <div className="note" style={{ borderStyle: "solid", borderColor: "var(--accent-soft)" }}>
          <span className="note__mark" style={{ color: "var(--accent)" }}>
            ✦
          </span>
          <p className="note__title">El glosario está vacío</p>
          <p className="note__body">
            Empieza añadiendo los nombres del consejo (alcalde, secretaria, regidores) y los
            términos que más se repiten.
          </p>
        </div>
      ) : (
        (["persona", "termino", "patron"] as GlossaryKind[]).map((k) =>
          byKind(k).length === 0 ? null : (
            <section key={k} style={{ marginBottom: "1.6rem" }}>
              <p className="desk__eyebrow" style={{ marginBottom: ".6rem" }}>
                {KIND_LABEL[k]}
              </p>
              <ul className="glossary">
                {byKind(k).map((t) => (
                  <li key={t.id} className="glossary__item">
                    <span>{t.text}</span>
                    <button
                      className="glossary__del"
                      type="button"
                      title="Quitar"
                      onClick={() => remove(t.id)}
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ),
        )
      )}
    </div>
  );
}
