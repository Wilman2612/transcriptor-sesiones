import json

from fastapi import APIRouter, Depends, Form, Request
from fastapi.responses import HTMLResponse, JSONResponse
from sqlalchemy.orm import Session as DbSession

from app.config import settings
from app.infrastructure.persistence.database import get_db
from app.infrastructure.persistence.models import SegmentModel
from app.infrastructure.persistence.repositories import (
    SqlCorrectionRepository,
    SqlSegmentRepository,
    SqlSessionRepository,
)
from app.interfaces.web.templates_config import templates
from app.interfaces.web.word_view import classify_segment, is_doubt

router = APIRouter()


@router.get("/sessions/{session_id}/review", response_class=HTMLResponse)
def review_page(session_id: int, request: Request, db: DbSession = Depends(get_db)):
    session_repo = SqlSessionRepository(db)
    segment_repo = SqlSegmentRepository(db)

    session = session_repo.get(session_id)
    segments = segment_repo.list_by_session(session_id)

    views = [classify_segment(seg) for seg in segments]
    total_doubts = sum(v.total_doubts for v in views)
    doubts_left = sum(v.doubts_left for v in views)

    return templates.TemplateResponse(
        request,
        "review.html",
        {
            "session": session,
            "segments": views,
            "total_segments": len(views),
            "total_doubts": total_doubts,
            "doubts_left": doubts_left,
        },
    )


@router.post("/segments/{segment_id}/word")
def correct_word(
    segment_id: int,
    idx: int = Form(...),
    text: str = Form(...),
    db: DbSession = Depends(get_db),
):
    """Confirma o corrige una palabra dudosa: la marca resuelta, guarda el texto
    y regenera la corrección del segmento. Devuelve cuántas dudas quedan en la sesión."""
    m = db.get(SegmentModel, segment_id)
    if not m or not m.words_json:
        return JSONResponse({"ok": False, "error": "Segmento sin palabras"}, status_code=404)

    words = json.loads(m.words_json)
    if idx < 0 or idx >= len(words):
        return JSONResponse({"ok": False, "error": "Índice fuera de rango"}, status_code=400)

    words[idx]["text"] = text
    words[idx]["resolved"] = True
    m.words_json = json.dumps(words, ensure_ascii=False)

    # Regenerar el texto final del segmento a partir de las palabras
    final_text = " ".join(w["text"].strip() for w in words)
    SqlCorrectionRepository(db).upsert(segment_id=segment_id, final_text=final_text)

    # Recontar dudas pendientes en toda la sesión (mismo criterio que la vista)
    low = settings.word_confidence_low
    mid = settings.word_confidence_mid
    floor = settings.word_confidence_floor
    rows = db.query(SegmentModel).filter_by(session_id=m.session_id).all()
    session_doubts_left = 0
    for row in rows:
        if not row.words_json:
            continue
        for w in json.loads(row.words_json):
            if not w.get("resolved", False) and is_doubt(w["text"], w["confidence"], low, mid, floor):
                session_doubts_left += 1

    return JSONResponse({"ok": True, "session_doubts_left": session_doubts_left})
