// DAL para el ciclo de sesiones (lista, subida, estado de transcripción).
import type { JobStatus, SessionSummary } from "../types";

export interface NewSession {
  name: string;
  date: string; // YYYY-MM-DD
  audio: File;
  s24?: File | null;
}

export interface ISessionsRepository {
  list(): Promise<SessionSummary[]>;
  create(s: NewSession): Promise<number>; // devuelve el id de la sesión creada
  status(sessionId: number): Promise<JobStatus>;
}
