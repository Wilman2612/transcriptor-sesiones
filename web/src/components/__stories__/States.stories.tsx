import type { Meta, StoryObj } from "@storybook/react-vite";
import { ErrorNote, LoadingNote } from "../Notes";

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
