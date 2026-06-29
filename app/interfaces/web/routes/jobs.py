from fastapi import APIRouter, Depends, Request
from fastapi.responses import HTMLResponse, JSONResponse
from sqlalchemy.orm import Session as DbSession

from app.infrastructure.persistence.database import get_db
from app.infrastructure.persistence.repositories import SqlJobRepository, SqlSessionRepository
from app.interfaces.web.templates_config import templates

router = APIRouter()


@router.get("/sessions/{session_id}/progress", response_class=HTMLResponse)
def progress_page(session_id: int, request: Request, db: DbSession = Depends(get_db)):
    session_repo = SqlSessionRepository(db)
    session = session_repo.get(session_id)
    return templates.TemplateResponse(request, "progress.html", {"session": session})


@router.get("/sessions/{session_id}/job-status")
def job_status(session_id: int, db: DbSession = Depends(get_db)):
    job_repo = SqlJobRepository(db)
    job = job_repo.get_active_for_session(session_id)
    session_repo = SqlSessionRepository(db)
    session = session_repo.get(session_id)

    if not job:
        # No hay job activo — revisar si ya está listo
        return JSONResponse(
            {
                "status": session.status.value if session else "unknown",
                "progress": 100,
                "done": True,
                "redirect": f"/sessions/{session_id}/review" if session and session.status.value == "transcribed" else None,
            }
        )

    return JSONResponse(
        {
            "status": job.status.value,
            "progress": job.progress,
            "done": job.status.value in ("done", "failed"),
            "error": job.error,
            "redirect": f"/sessions/{session_id}/review" if job.status.value == "done" and session and session.status.value == "transcribed" else None,
        }
    )
