from fastapi import APIRouter, Depends, Form, Request
from fastapi.responses import HTMLResponse, JSONResponse
from sqlalchemy.orm import Session as DbSession

from app.application.use_cases.correct_word import (
    SegmentNotFound,
    WordIndexOutOfRange,
    apply_word_correction,
)
from app.infrastructure.persistence.database import get_db
from app.infrastructure.persistence.repositories import (
    SqlSegmentRepository,
    SqlSessionRepository,
)
from app.interfaces.web.templates_config import templates
from app.interfaces.web.word_view import classify_segment

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
    """Confirma o corrige una palabra dudosa (autosave HTMX)."""
    try:
        left = apply_word_correction(db, segment_id, idx, text)
    except SegmentNotFound:
        return JSONResponse({"ok": False, "error": "Segmento sin palabras"}, status_code=404)
    except WordIndexOutOfRange:
        return JSONResponse({"ok": False, "error": "Índice fuera de rango"}, status_code=400)
    return JSONResponse({"ok": True, "session_doubts_left": left})
