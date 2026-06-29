"""
Use case: re-procesar un tramo (segunda pasada). Re-transcribe el audio de unos
segmentos en aislamiento —reseteando el contexto que causó la alucinación— y
redistribuye las palabras nuevas a esos segmentos por tiempo.
"""
from pathlib import Path

from sqlalchemy.orm import Session as DbSession

from app.application.use_cases.correct_word import count_session_doubts_left
from app.config import settings
from app.infrastructure.persistence.models import SegmentModel, SessionModel
from app.infrastructure.transcription.factory import get_transcriber


class CannotReprocess(Exception):
    pass


def _session_audio(session: SessionModel) -> str:
    """Prefiere el WAV limpio (16 kHz, lo que quiere Whisper); cae al original."""
    clean = Path(settings.uploads_dir) / f"{session.id}_clean.wav"
    if clean.exists():
        return str(clean)
    return session.original_audio_path


def reprocess_segments(db: DbSession, segment_ids: list[int]) -> int:
    segs = (
        db.query(SegmentModel)
        .filter(SegmentModel.id.in_(segment_ids))
        .order_by(SegmentModel.start_ms)
        .all()
    )
    if not segs:
        raise CannotReprocess("Sin segmentos")

    session = db.get(SessionModel, segs[0].session_id)
    transcriber = get_transcriber()
    if not hasattr(transcriber, "transcribe_region"):
        raise CannotReprocess("El backend actual no soporta re-procesar tramos")

    start_ms = min(s.start_ms for s in segs)
    end_ms = max(s.end_ms for s in segs)
    words = transcriber.transcribe_region(_session_audio(session), start_ms, end_ms)

    # Redistribuir cada palabra al segmento cuyo rango contiene su punto medio
    # (o al más cercano si cae en un hueco).
    buckets: dict[int, list] = {s.id: [] for s in segs}
    for w in words:
        mid = (w.start_ms + w.end_ms) / 2
        target = None
        for s in segs:
            if s.start_ms <= mid <= s.end_ms:
                target = s
                break
        if target is None:
            target = min(segs, key=lambda s: abs((s.start_ms + s.end_ms) / 2 - mid))
        buckets[target.id].append(w)

    for s in segs:
        ws = buckets[s.id]
        if ws:
            # El resultado del re-proceso se guarda como override (texto libre);
            # el original (words_json / original_text, con sus confianzas) queda
            # INTACTO para poder comparar corregido vs original más adelante.
            s.override_text = " ".join(w.text.strip() for w in ws)
            s.status = "corrected"
    db.commit()

    return count_session_doubts_left(db, session.id)
