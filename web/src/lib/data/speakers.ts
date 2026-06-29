// Hablantes de una sesión con muestra de su intervención más larga.
export interface SpeakerRow {
  key: string;
  name: string;
  sample: string;
}

export async function listSessionSpeakers(sessionId: number): Promise<SpeakerRow[]> {
  const r = await fetch(`/api/sessions/${sessionId}/speakers`);
  if (!r.ok) throw new Error("No se pudieron cargar los hablantes");
  return r.json();
}
