// Único lugar que decide qué adaptadores usa la app. En Storybook se inyectan
// los Fake directamente por props, así que aquí solo viven los reales.
import type { IReviewRepository } from "./IReviewRepository";
import type { ISessionsRepository } from "./ISessionsRepository";
import { RealReviewAdapter } from "./realReview";
import { RealSessionsAdapter } from "./realSessions";

export function getRepository(): IReviewRepository {
  return new RealReviewAdapter();
}

export function getSessionsRepository(): ISessionsRepository {
  return new RealSessionsAdapter();
}
