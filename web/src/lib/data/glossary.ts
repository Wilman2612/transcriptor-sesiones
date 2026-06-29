// Acceso al glosario global (nombres, términos, patrones).
import type { GlossaryKind, GlossaryTerm } from "../types";

export async function listGlossary(): Promise<GlossaryTerm[]> {
  const r = await fetch("/api/glossary");
  if (!r.ok) throw new Error("No se pudo cargar el glosario");
  return r.json();
}

export async function addGlossary(text: string, kind: GlossaryKind): Promise<GlossaryTerm> {
  const r = await fetch("/api/glossary", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, kind }),
  });
  if (!r.ok) throw new Error("No se pudo añadir el término");
  return r.json();
}

export async function deleteGlossary(id: number): Promise<void> {
  await fetch(`/api/glossary/${id}`, { method: "DELETE" });
}

export interface PromptInfo {
  prompt: string;
  tokens: number;
  limit: number;
}

export async function getGlossaryPrompt(): Promise<PromptInfo> {
  const r = await fetch("/api/glossary/prompt");
  if (!r.ok) throw new Error("No se pudo calcular el prompt");
  return r.json();
}

