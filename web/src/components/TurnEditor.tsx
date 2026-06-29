import { useEffect, useRef } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import Document from "@tiptap/extension-document";
import Paragraph from "@tiptap/extension-paragraph";
import Text from "@tiptap/extension-text";
import History from "@tiptap/extension-history";
import type { Editor } from "@tiptap/react";
import type { Turn } from "../lib/turns";
import type { Segment } from "../lib/types";
import { WordMeta } from "../editor/wordMeta";
import { DoubtDecoration, doubtKey } from "../editor/doubtDecoration";
import { buildTurnDoc } from "../editor/buildTurnDoc";
import { extractSegmentTexts } from "../editor/extractSegments";

interface Props {
  turn: Turn;
  threshold: number;
  onSeek: (ms: number) => void;
  onHearWord: (startMs: number, endMs: number) => void;
  onSaveSegment: (segmentId: number, text: string) => void;
}

function originalText(seg: Segment): string {
  const t = seg.override_text ?? seg.words.map((w) => w.text).join(" ");
  return t.replace(/\s+/g, " ").trim();
}

/** El texto de un turno como editor enriquecido: se escribe normal, las
 *  palabras llevan metadata oculta, y al editar se guarda por segmento. */
export function TurnEditor({ turn, threshold, onSeek, onHearWord, onSaveSegment }: Props) {
  const onSeekRef = useRef(onSeek);
  onSeekRef.current = onSeek;
  const onHearRef = useRef(onHearWord);
  onHearRef.current = onHearWord;

  const editor = useEditor({
    extensions: [Document, Paragraph, Text, History, WordMeta, DoubtDecoration(threshold)],
    content: buildTurnDoc(turn),
    onBlur: ({ editor }) => save(editor),
  });

  function save(ed: Editor) {
    const texts = extractSegmentTexts(ed);
    for (const seg of turn.segments) {
      const cur = texts.get(seg.id) ?? "";
      if (cur !== originalText(seg)) onSaveSegment(seg.id, cur);
    }
  }

  // Re-resaltar dudas en vivo cuando cambia el umbral (sin tocar el texto).
  useEffect(() => {
    if (!editor) return;
    editor.view.dispatch(editor.state.tr.setMeta(doubtKey, { threshold }));
  }, [threshold, editor]);

  const onClick = (e: React.MouseEvent) => {
    const el = (e.target as HTMLElement).closest<HTMLElement>("[data-start]");
    if (!el) return;
    const start = Number(el.dataset.start);
    // Alt+clic: oír la palabra. Clic normal: solo reposiciona el audio (silencioso),
    // para no interrumpir la edición.
    if (e.altKey && el.dataset.end) onHearRef.current(start, Number(el.dataset.end));
    else onSeekRef.current(start);
  };

  return <EditorContent editor={editor} className="rw-cell" onClick={onClick} />;
}
