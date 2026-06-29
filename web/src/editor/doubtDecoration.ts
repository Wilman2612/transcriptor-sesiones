// Decoración dinámica: resalta las palabras dudosas (confianza < umbral) leyendo
// el mark wordmeta, SIN modificar el texto. El umbral se actualiza en vivo desde
// el slider (vía meta de transacción), así re-resalta sin perder lo editado.
import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";

export const doubtKey = new PluginKey<{ threshold: number; decos: DecorationSet }>("doubt");

function build(doc: import("@tiptap/pm/model").Node, threshold: number): DecorationSet {
  const decos: Decoration[] = [];
  doc.descendants((node, pos) => {
    if (!node.isText) return;
    const m = node.marks.find((mk) => mk.type.name === "wordmeta");
    if (!m || !m.attrs.eligible) return;
    const conf = Number(m.attrs.conf);
    if (Number.isNaN(conf) || conf >= threshold) return;
    const cls = conf < threshold * 0.65 ? "w--doubt w--high" : "w--doubt";
    decos.push(Decoration.inline(pos, pos + node.nodeSize, { class: cls }));
  });
  return DecorationSet.create(doc, decos);
}

export function DoubtDecoration(initialThreshold: number) {
  return Extension.create({
    name: "doubtDecoration",
    addProseMirrorPlugins() {
      return [
        new Plugin({
          key: doubtKey,
          state: {
            init: (_, state) => ({
              threshold: initialThreshold,
              decos: build(state.doc, initialThreshold),
            }),
            apply(tr, value, _old, newState) {
              const meta = tr.getMeta(doubtKey) as { threshold: number } | undefined;
              const threshold = meta ? meta.threshold : value.threshold;
              if (meta || tr.docChanged) {
                return { threshold, decos: build(newState.doc, threshold) };
              }
              return value;
            },
          },
          props: {
            decorations(state) {
              return doubtKey.getState(state)?.decos;
            },
          },
        }),
      ];
    },
  });
}
