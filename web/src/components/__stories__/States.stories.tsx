import type { Meta, StoryObj } from "@storybook/react-vite";
import { DoubtPopover } from "../DoubtPopover";
import { ErrorNote, LoadingNote } from "../Notes";
import { Segment } from "../Segment";
import { HAPPY_SEGMENTS } from "../../lib/data/fakeReview";

const frame = (Story: React.ComponentType) => (
  <div style={{ maxWidth: 1180, margin: "0 auto", padding: "1.5rem" }}>
    <Story />
  </div>
);

const meta: Meta = {
  title: "Review/States",
  parameters: { layout: "fullscreen" },
  decorators: [frame],
};
export default meta;
type Story = StoryObj;

/** Decidiendo sobre una palabra: input + oír + confirmar, anclado a la palabra. */
export const DoubtFocused: Story = {
  render: () => (
    <div className="desk" style={{ position: "relative", minHeight: 220 }}>
      <Segment segment={HAPPY_SEGMENTS[2]} />
      <DoubtPopover
        initialText="Medina"
        rect={{ bottom: 150, left: 360, top: 130 } as DOMRect}
        onHear={() => {}}
        onCommit={() => {}}
        onCancel={() => {}}
      />
    </div>
  ),
};

/** Transcribiendo: progreso real, sin spinner indefinido. */
export const Loading: Story = {
  render: () => (
    <div className="desk">
      <LoadingNote progress={56} detail="Procesando intervención 3 de 5" />
    </div>
  ),
};

/** Falló la transcripción: causa en lenguaje claro + reintento, sin stack trace. */
export const ErrorState: Story = {
  render: () => (
    <div className="desk">
      <ErrorNote onRetry={() => {}} />
    </div>
  ),
};
