import type { Word as WordT } from "../lib/types";
import { wordKind } from "../lib/confidence";

interface Props {
  word: WordT;
  threshold: number;
  onPick?: (word: WordT, rect: DOMRect) => void;
}

/** Una palabra del acta. TODAS son editables al hacer clic; las dudosas
 *  (según el umbral del slider) llevan chip de color y muestran su confianza. */
export function Word({ word, threshold, onPick }: Props) {
  const kind = wordKind(word, threshold);
  const pct = Math.round(word.confidence * 100);
  const pick = (e: React.MouseEvent | React.KeyboardEvent) =>
    onPick?.(word, (e.currentTarget as HTMLElement).getBoundingClientRect());
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      pick(e);
    }
  };

  if (kind === "sealed") {
    return (
      <span className="w w--sealed w--editable" data-idx={word.idx} tabIndex={0} role="button"
            onClick={pick} onKeyDown={onKey} aria-label={`${word.text} (corregida). Pulsa para editar.`}>
        {word.text}
      </span>
    );
  }

  if (kind === "plain") {
    // Editable, pero sin chip: afordancia sutil al pasar el cursor.
    return (
      <span className="w w--editable" data-idx={word.idx} tabIndex={0} role="button"
            onClick={pick} onKeyDown={onKey} aria-label={`${word.text}. Pulsa para editar.`}>
        {word.text}
      </span>
    );
  }

  const cls = `w w--doubt w--editable${kind === "doubt-high" ? " w--high" : ""}`;
  return (
    <span
      className={cls}
      data-idx={word.idx}
      tabIndex={0}
      role="button"
      title={`Confianza: ${pct}%`}
      aria-label={`Palabra dudosa: ${word.text}, confianza ${pct} por ciento. Pulsa para revisar.`}
      onClick={pick}
      onKeyDown={onKey}
    >
      {word.text}
      <sup className="w__conf">{pct}</sup>
    </span>
  );
}
