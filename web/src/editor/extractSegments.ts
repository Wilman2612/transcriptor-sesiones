// Lee el documento editado y reconstruye el texto por segmento (agrupando por
// el mark 'seg'). El texto tecleado sin mark se adjunta al segmento en curso.
// Devuelve, por cada segmento original, su texto actual.
import type { Editor } from "@tiptap/react";

export function extractSegmentTexts(editor: Editor): Map<number, string> {
  const out = new Map<number, string>();
  let current: number | null = null;

  editor.state.doc.descendants((node) => {
    if (!node.isText) return;
    const m = node.marks.find((mk) => mk.type.name === "wordmeta");
    const seg = m ? Number(m.attrs.seg) : current;
    if (seg == null) return;
    current = seg;
    out.set(seg, (out.get(seg) ?? "") + node.text);
  });

  for (const [k, v] of out) out.set(k, v.replace(/\s+/g, " ").trim());
  return out;
}
