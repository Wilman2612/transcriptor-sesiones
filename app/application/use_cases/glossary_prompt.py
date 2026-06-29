"""Arma el initial_prompt de sesgo a partir del glosario global (DB)."""
from sqlalchemy.orm import Session as DbSession

from app.infrastructure.persistence.models import GlossaryTermModel
from app.infrastructure.transcription.biasing import build_initial_prompt


def glossary_initial_prompt(db: DbSession) -> str:
    rows = db.query(GlossaryTermModel).all()
    personas = [r.text for r in rows if r.kind == "persona"]
    terminos = [r.text for r in rows if r.kind == "termino"]
    if not personas and not terminos:
        return ""
    return build_initial_prompt(personas, terminos)
