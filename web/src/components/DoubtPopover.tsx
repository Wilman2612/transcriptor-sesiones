import { useEffect, useRef, useState } from "react";

interface Props {
  initialText: string;
  rect: DOMRect;
  onHear: () => void;
  onCommit: (text: string) => void;
  onCancel: () => void;
}

/** Decisión sobre una palabra dudosa: corregir el texto, oírla o confirmarla. */
export function DoubtPopover({ initialText, rect, onHear, onCommit, onCancel }: Props) {
  const [text, setText] = useState(initialText);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  const commit = () => onCommit(text.trim() || initialText);

  return (
    <>
      {/* Backdrop: tocar fuera cierra (salida para mouse/táctil, no solo Esc). */}
      <div
        className="pop-backdrop"
        onClick={onCancel}
        style={{ position: "fixed", inset: 0, zIndex: 29 }}
        aria-hidden="true"
      />
      <div
        className="pop"
        style={{
          position: "fixed",
          top: rect.bottom + 6,
          // Clamp para que no se salga por el borde derecho de la pantalla.
          left: Math.max(8, Math.min(rect.left, window.innerWidth - 340)),
          zIndex: 30,
        }}
        role="dialog"
        aria-label="Corregir palabra"
      >
        <span className="pop__label">Corrige la palabra o confírmala:</span>
        <input
          ref={inputRef}
          className="w-edit"
          value={text}
          size={Math.max(initialText.length, 4)}
          aria-label="Corrige la palabra"
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              commit();
            } else if (e.key === "Escape") {
              e.preventDefault();
              onCancel();
            }
          }}
        />
        <span className="pop__actions">
          <button className="btn btn--ghost" type="button" onClick={onHear}>
            🔊 Oír
          </button>
          <button className="btn btn--ghost" type="button" onClick={onCancel}>
            Cancelar
          </button>
          <button className="btn btn--primary" type="button" onClick={commit}>
            Confirmar
          </button>
        </span>
        <span className="pop__hint">Enter para confirmar · Esc o “Cancelar” para descartar</span>
      </div>
    </>
  );
}
