// Mark invisible que cuelga la metadata de cada palabra (segmento, tiempos,
// confianza). El texto es editable normal; si editas una palabra, ProseMirror
// suele soltar su mark -> esa palabra pierde su tiempo (degrada a audio por
// frase), justo el comportamiento que queremos.
import { Mark, mergeAttributes } from "@tiptap/core";

function attr(name: string, dataName: string) {
  return {
    [name]: {
      default: null,
      parseHTML: (el: HTMLElement) => el.getAttribute(dataName),
      renderHTML: (a: Record<string, unknown>) =>
        a[name] != null ? { [dataName]: String(a[name]) } : {},
    },
  };
}

export const WordMeta = Mark.create({
  name: "wordmeta",
  inclusive: false, // escribir pegado a una palabra no extiende su mark

  addAttributes() {
    return {
      ...attr("seg", "data-seg"),
      ...attr("idx", "data-idx"),
      ...attr("start", "data-start"),
      ...attr("end", "data-end"),
      ...attr("conf", "data-conf"),
      eligible: { default: true, renderHTML: () => ({}), parseHTML: () => true },
      title: {
        default: null,
        renderHTML: (a) => (a.title ? { title: String(a.title) } : {}),
        parseHTML: (el) => el.getAttribute("title"),
      },
    };
  },

  parseHTML() {
    return [{ tag: "span[data-seg]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["span", mergeAttributes(HTMLAttributes, { class: "rw" }), 0];
  },
});
