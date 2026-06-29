"""
Use case: confirmar/corregir una palabra dudosa de un segmento.

Marca la palabra como resuelta, guarda el texto, regenera la corrección del
segmento y devuelve cuántas dudas quedan pendientes en toda la sesión.

Compartido por la interfaz HTML (HTMX) y la API JSON (React) para no duplicar
la regla de negocio.
"""
import json

from sqlalchemy.orm import Session as DbSession

from app.config import settings
from app.infrastructure.persistence.models import SegmentModel
from app.infrastructure.persistence.repositories import SqlCorrectionRepository
from app.interfaces.web.word_view import is_doubt


class SegmentNotFound(Exception):
    pass


class WordIndexOutOfRange(Exception):
    pass


def apply_word_correction(db: DbSession, segment_id: int, idx: int, text: str) -> int:
    """Aplica la corrección y retorna las dudas pendientes en la sesión.
    Lanza SegmentNotFound / WordIndexOutOfRange en casos inválidos."""
    m = db.get(SegmentModel, segment_id)
    if not m or not m.words_json:
        raise SegmentNotFound()

    words = json.loads(m.words_json)
    if idx < 0 or idx >= len(words):
        raise WordIndexOutOfRange()

    words[idx]["text"] = text
    words[idx]["resolved"] = True
    m.words_json = json.dumps(words, ensure_ascii=False)

    # Regenerar el texto final del segmento a partir de las palabras
    final_text = " ".join(w["text"].strip() for w in words)
    SqlCorrectionRepository(db).upsert(segment_id=segment_id, final_text=final_text)

    return count_session_doubts_left(db, m.session_id)


def count_session_doubts_left(db: DbSession, session_id: int) -> int:
    low = settings.word_confidence_low
    mid = settings.word_confidence_mid
    floor = settings.word_confidence_floor
    rows = db.query(SegmentModel).filter_by(session_id=session_id).all()
    left = 0
    for row in rows:
        if not row.words_json or row.override_text:
            continue  # frase reescrita o re-procesada: ya no cuenta como duda
        for w in json.loads(row.words_json):
            if not w.get("resolved", False) and is_doubt(w["text"], w["confidence"], low, mid, floor):
                left += 1
    return left
