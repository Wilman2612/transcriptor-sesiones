import { useEffect, useRef } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { GlossaryPage } from "../../pages/GlossaryPage";
import { SpeakersPage } from "../../pages/SpeakersPage";

// Las páginas de configuración hacen su propio fetch al montar. Para historiarlas
// sin backend, parcheamos window.fetch con respuestas deterministas por endpoint.
// Se parchea en el render (antes de que monten los hijos, cuyos efectos corren
// primero) y se restaura al desmontar.
type Handler = (url: string) => unknown;

function withFetch(handler: Handler) {
  return function FetchDecorator(Story: React.ComponentType) {
    const original = useRef<typeof window.fetch | null>(null);
    if (!original.current) {
      original.current = window.fetch;
      window.fetch = (async (input: RequestInfo | URL) => {
        const url = typeof input === "string" ? input : input.toString();
        const body = handler(url) ?? {};
        return new Response(JSON.stringify(body), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }) as typeof window.fetch;
    }
    useEffect(
      () => () => {
        if (original.current) window.fetch = original.current;
      },
      [],
    );
    return <Story />;
  };
}

const frame = (Story: React.ComponentType) => (
  <div style={{ maxWidth: 1180, margin: "0 auto", padding: "1.5rem" }}>
    <Story />
  </div>
);

const GLOSSARY = [
  { id: 1, text: "Carla Medina Rojas", kind: "persona", source: "manual" },
  { id: 2, text: "Rosa Pérez Quispe", kind: "persona", source: "manual" },
  { id: 3, text: "Julio Ramos Díaz", kind: "persona", source: "manual" },
  { id: 4, text: "Ad hoc", kind: "termino", source: "manual" },
  { id: 5, text: "dictamen", kind: "termino", source: "manual" },
];

const meta: Meta = {
  title: "Config",
  parameters: { layout: "fullscreen" },
  decorators: [frame],
};
export default meta;
type Story = StoryObj;

/** Glosario con términos y prompt con margen: el contador va en verde. */
export const GlossaryHasRoom: Story = {
  decorators: [
    withFetch((url) => {
      if (url.endsWith("/glossary/prompt"))
        return { prompt: "Sesión de concejo…", tokens: 129, limit: 224 };
      if (url.endsWith("/glossary")) return GLOSSARY;
      return {};
    }),
  ],
  render: () => <GlossaryPage />,
};

/** Glosario casi al límite del prompt: el contador avisa en rojo. */
export const GlossaryNearLimit: Story = {
  decorators: [
    withFetch((url) => {
      if (url.endsWith("/glossary/prompt"))
        return { prompt: "Sesión de concejo…", tokens: 212, limit: 224 };
      if (url.endsWith("/glossary")) return GLOSSARY;
      return {};
    }),
  ],
  render: () => <GlossaryPage />,
};

/** Glosario vacío: invitación a empezar por los nombres del consejo. */
export const GlossaryEmpty: Story = {
  decorators: [
    withFetch((url) => {
      if (url.endsWith("/glossary/prompt")) return { prompt: "", tokens: 0, limit: 224 };
      if (url.endsWith("/glossary")) return [];
      return {};
    }),
  ],
  render: () => <GlossaryPage />,
};

/** Identificar hablantes: cada uno con una muestra de su intervención más larga. */
export const Speakers: Story = {
  decorators: [
    withFetch((url) => {
      if (url.includes("/speakers"))
        return [
          {
            key: "Hablante 1",
            name: "Alcalde",
            sample:
              "Se abre la sesión ordinaria del concejo municipal. Damos lectura a la agenda del día",
          },
          {
            key: "Hablante 2",
            name: "",
            sample:
              "Se me designa excepcionalmente a mi persona, Carla Medina Rojas, como Secretaria Ad hoc de la presente sesión",
          },
          {
            key: "Hablante 3",
            name: "",
            sample:
              "Buenas tardes, señor alcalde, miembros del concejo. Quisiera observar el dictamen presentado",
          },
        ];
      if (url.endsWith("/glossary"))
        return GLOSSARY.filter((g) => g.kind === "persona");
      return {};
    }),
    (Story: React.ComponentType) => (
      <MemoryRouter initialEntries={["/sessions/1/speakers"]}>
        <Routes>
          <Route path="/sessions/:id/speakers" element={<Story />} />
        </Routes>
      </MemoryRouter>
    ),
  ],
  render: () => <SpeakersPage />,
};
