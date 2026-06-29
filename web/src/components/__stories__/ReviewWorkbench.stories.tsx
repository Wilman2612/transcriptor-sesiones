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
