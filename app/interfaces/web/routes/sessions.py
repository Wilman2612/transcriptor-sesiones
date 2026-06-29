import shutil
from datetime import datetime
from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, Request, UploadFile
from fastapi.responses import HTMLResponse, RedirectResponse
from sqlalchemy.orm import Session as DbSession

from app.config import settings
from app.domain.entities import JobType
from app.infrastructure.jobs.worker import enqueue
from app.infrastructure.persistence.database import get_db
from app.infrastructure.persistence.repositories import SqlJobRepository, SqlSessionRepository
from app.interfaces.web.templates_config import templates

router = APIRouter()


@router.get("/", response_class=HTMLResponse)
def index(request: Request, db: DbSession = Depends(get_db)):
    repo = SqlSessionRepository(db)
    sessions = repo.list()
    return templates.TemplateResponse(request, "index.html", {"sessions": sessions})


@router.get("/upload", response_class=HTMLResponse)
def upload_form(request: Request):
    return templates.TemplateResponse(request, "upload.html")


@router.post("/upload")
async def upload_session(
    request: Request,
    name: str = Form(...),
    session_date: str = Form(...),
    audio_file: UploadFile = File(...),
    s24_file: UploadFile = File(None),
    db: DbSession = Depends(get_db),
):
    uploads = Path(settings.uploads_dir)
    uploads.mkdir(parents=True, exist_ok=True)

    session_repo = SqlSessionRepository(db)
    job_repo = SqlJobRepository(db)

    # Guardar audio
    suffix = Path(audio_file.filename).suffix
    tmp_audio = uploads / f"tmp_{datetime.utcnow().timestamp()}{suffix}"
    with tmp_audio.open("wb") as f:
        shutil.copyfileobj(audio_file.file, f)

    # Guardar transcripción S24 si se subió
    s24_path = None
    if s24_file and s24_file.filename:
        s24_suffix = Path(s24_file.filename).suffix
        tmp_s24 = uploads / f"tmp_s24_{datetime.utcnow().timestamp()}{s24_suffix}"
        with tmp_s24.open("wb") as f:
            shutil.copyfileobj(s24_file.file, f)
        s24_path = str(tmp_s24)

    date = datetime.strptime(session_date, "%Y-%m-%d")
    session = session_repo.create(name=name, date=date, audio_path=str(tmp_audio), s24_path=s24_path)

    # Renombrar archivos con el ID real
    final_audio = uploads / f"{session.id}{suffix}"
    tmp_audio.rename(final_audio)
    session_repo.update_status(session.id, session.status)
    # Actualizar ruta en DB
    from app.infrastructure.persistence.models import SessionModel
    m = db.get(SessionModel, session.id)
    m.original_audio_path = str(final_audio)
    if s24_path:
        s24_final = uploads / f"{session.id}_s24{s24_suffix}"
        Path(s24_path).rename(s24_final)
        m.s24_transcript_path = str(s24_final)
    db.commit()

    # Crear y encolar job de ingestión
    job = job_repo.create(session.id, JobType.INGEST)
    enqueue(job.id)

    return RedirectResponse(f"/sessions/{session.id}/progress", status_code=303)
