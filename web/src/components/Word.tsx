import type { Word as WordT } from "../lib/types";

interface Props {
  word: WordT;
  onPick?: (word: WordT, rect: DOMRect) => void;
}

/** Una palabra del acta. Las dudosas son "chips" accionables; el resto, texto plano. */
export function Word({ word, onPick }: Props) {
  if (word.kind === "plain") {
    return <span className="w">{word.text}</span>;
  }
  if (word.kind === "sealed") {
    return (
      <span className="w w--sealed" data-idx={word.idx}>
        {word.text}
      </span>
    );
  }

  const cls = `w w--doubt${word.kind === "doubt-high" ? " w--high" : ""}`;
  const pick = (e: React.MouseEvent | React.KeyboardEvent) =>
    onPick?.(word, (e.currentTarget as HTMLElement).getBoundingClientRect());

  return (
    <span
      className={cls}
      data-idx={word.idx}
      tabIndex={0}
      role="button"
      aria-label={`Palabra dudosa: ${word.text}. Pulsa para revisar.`}
      onClick={pick}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          pick(e);
        }
      }}
    >
      {word.text}
    </span>
  );
}
