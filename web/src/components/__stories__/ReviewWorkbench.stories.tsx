import type { Meta, StoryObj } from "@storybook/react-vite";
import { ReviewWorkbench } from "../ReviewWorkbench";
import { FakeReviewAdapter, reviewFixture } from "../../lib/data/fakeReview";

const meta = {
  title: "Review/Workbench",
  component: ReviewWorkbench,
  parameters: { layout: "fullscreen" },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 1180, margin: "0 auto", padding: "1.5rem" }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof ReviewWorkbench>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Intervenciones con dudas sin resolver (ámbar/rojo). Clic en una palabra → editar. */
export const Happy: Story = {
  args: {
    initial: reviewFixture("happy"),
    repo: new FakeReviewAdapter("happy"),
  },
};

/** Todas las dudas selladas: celebra el trabajo + barra al 100%. */
export const AllResolved: Story = {
  args: {
    initial: { ...reviewFixture("resolved"), doubts_left: 0 },
    repo: new FakeReviewAdapter("resolved"),
  },
};

/** La IA salió limpia: nada que revisar (tono informativo, sin barra). */
export const EmptyNoDoubts: Story = {
  args: {
    initial: reviewFixture("empty"),
    repo: new FakeReviewAdapter("empty"),
  },
};

/** Re-procesando un tramo: el botón pasa a "Procesando…" y aparece el indicador
 *  indeterminado (re-transcribir un tramo no emite progreso %). El adapter tarda
 *  a propósito para que el estado sea visible. Pasa el cursor por una fila y pulsa
 *  "⟳ Re-procesar". */
class SlowReviewAdapter extends FakeReviewAdapter {
  async reprocess(ids: number[]) {
    await new Promise((r) => setTimeout(r, 4000));
    return super.reprocess(ids);
  }
}

export const Reprocessing: Story = {
  args: {
    initial: reviewFixture("happy"),
    repo: new SlowReviewAdapter("happy"),
  },
};

/** Revisión retomable: una intervención lleva el marcador "Aquí lo dejé" (barra
 *  lateral) y arriba aparece "Continuar donde lo dejé" para saltar a ella. */
export const Bookmarked: Story = {
  args: {
    initial: { ...reviewFixture("happy"), bookmark_segment_id: 2 },
    repo: new FakeReviewAdapter("happy"),
  },
};
