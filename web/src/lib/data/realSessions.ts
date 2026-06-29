import type { ISessionsRepository, NewSession } from "./ISessionsRepository";
import type { JobStatus, SessionSummary } from "../types";

export class RealSessionsAdapter implements ISessionsRepository {
  private baseUrl: string;

  constructor(baseUrl = "") {
    this.baseUrl = baseUrl;
  }

  async list(): Promise<SessionSummary[]> {
    const r = await fetch(`${this.baseUrl}/api/sessions`);
    if (!r.ok) throw new Error(`No se pudieron cargar las sesiones (${r.status})`);
    return r.json();
  }

  async create(s: NewSession): Promise<number> {
    const fd = new FormData();
    fd.append("name", s.name);
    fd.append("session_date", s.date);
    fd.append("audio_file", s.audio);
    if (s.s24) fd.append("s24_file", s.s24);
    const r = await fetch(`${this.baseUrl}/api/sessions`, { method: "POST", body: fd });
    if (!r.ok) throw new Error(`No se pudo crear la sesión (${r.status})`);
    const data = await r.json();
    return data.id;
  }

  async status(sessionId: number): Promise<JobStatus> {
    const r = await fetch(`${this.baseUrl}/api/sessions/${sessionId}/status`);
    if (!r.ok) throw new Error(`No se pudo consultar el estado (${r.status})`);
    return r.json();
  }
}
