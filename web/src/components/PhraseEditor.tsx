import { useEffect, useRef, useState } from "react";

interface Props {
  initialText: string;
  onSave: (text: string) => void;
  onCancel: () => void;
  onPlay?: () => void;
}

/** Reescribe una frase entera como texto libre (para tramos donde Whisper
 *  alucinó y corregir palabra por palabra sería absurdo). */
export function PhraseEditor({ initialText, onSave, onCancel, onPlay }: Props) {
  const [text, setText] = useState(initialText);
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (el) {
      el.focus();
      el.select();
      el.style.height = `${el.scrollHeight}px`;
    }
  }, []);

  return (
    <span className="phrase-edit">
      <textarea
        ref={ref}
        className="phrase-edit__area"
        value={text}
        rows={2}
        onChange={(e) => {
          setText(e.target.value);
          e.target.style.height = "auto";
          e.target.style.height = `${e.target.scrollHeight}px`;
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            onSave(text);
          } else if (e.key === "Escape") {
            e.preventDefault();
            onCancel();
          }
        }}
      />
      <span className="phrase-edit__actions">
        {onPlay && (
          <button className="btn btn--ghost" type="button" onClick={onPlay}>
            ▸ Oír
          </button>
        )}
        <button className="btn btn--ghost" type="button" onClick={onCancel}>
          Cancelar
        </button>
        <button className="btn btn--primary" type="button" onClick={() => onSave(text)}>
          Guardar
        </button>
        <span className="phrase-edit__hint">Ctrl+Enter guarda · Esc cancela</span>
      </span>
    </span>
  );
}
