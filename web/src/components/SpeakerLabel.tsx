import { useState } from "react";

interface Props {
  speakerKey: string; // "Hablante 1" (clave de diarización)
  name: string; // nombre mostrado (= clave si no se asignó)
  onRename: (key: string, name: string) => void;
}

/** Etiqueta de hablante: muestra el nombre real si se asignó, o "Hablante N"
 *  con un ✎. Al editar, sugiere el roster del glosario (datalist compartido). */
export function SpeakerLabel({ speakerKey, name, onRename }: Props) {
  const [editing, setEditing] = useState(false);
  const named = name !== speakerKey;

  if (editing) {
    return (
      <input
        className="speaker-edit__input"
        list="speaker-roster"
        defaultValue={named ? name : ""}
        placeholder={speakerKey}
        autoFocus
        onBlur={(e) => {
          onRename(speakerKey, e.target.value);
          setEditing(false);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
          else if (e.key === "Escape") setEditing(false);
        }}
      />
    );
  }

  return (
    <button
      className="turn__speaker-btn"
      type="button"
      title="Asignar nombre/cargo real"
      onClick={() => setEditing(true)}
    >
      {name}
      {!named && <span className="turn__speaker-hint"> ✎</span>}
    </button>
  );
}
