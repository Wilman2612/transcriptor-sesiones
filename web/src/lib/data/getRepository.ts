// Único lugar que decide Fake vs Real. En Storybook se inyecta el Fake
// directamente por props, así que aquí solo vive el adapter real de la app.
import type { IReviewRepository } from "./IReviewRepository";
import { RealReviewAdapter } from "./realReview";

export function getRepository(): IReviewRepository {
  return new RealReviewAdapter();
}
