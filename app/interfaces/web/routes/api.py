"""
API JSON (/api) que consume el frontend React. Desacopla la UI del backend:
reusa los mismos casos de uso y repositorios que la interfaz HTML.
"""
import shutil
from datetime import datetime
from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.orm import Session as DbSession

from app.application.use_cases.correct_word import (
    SegmentNotFound,
    WordIndexOutOfRange,
    apply_word_correction,
)
from app.config import settings
from app.domain.entities import JobType
from app.infrastructure.jobs.worker import enqueue
from app.infrastructure.persistence.database import get_db
from app.infrastructure.persistence.models import SessionModel
from app.infrastructure.persistence.repositories import (
    SqlJobRepository,
    SqlSegmentRepository,
    SqlSessionRepository,
)
from app.interfaces.web.api_schemas import (
    CreatedSessionOut,
    JobStatusOut,
    ReviewOut,
    SegmentOut,
    SessionOut,
    WordCorrectionIn,
    WordCorrectionOut,
)
from app.interfaces.web.word_view import classify_segment

router = APIRouter(prefix="/api")


@router.get("/sessions", response_model=list[SessionOut])
def list_sessions(db: DbSession = Depends(get_db)):
    sessions = SqlSessionRepository(db).list()
    return [
        SessionOut(id=s.id, name=s.name, date=s.date.strftime("%Y-%m-%d"), status=s.status.value)
        for s in sessions
    ]


@router.post("/sessions", response_model=CreatedSessionOut, status_code=201)
async def create_session(
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

    suffix = Path(audio_file.filename).suffix
    tmp_audio = uploads / f"tmp_{datetime.utcnow().timestamp()}{suffix}"
    with tmp_audio.open("wb") as f:
        shutil.copyfileobj(audio_file.file, f)

    s24_path = None
    if s24_file and s24_file.filename:
        s24_suffix = Path(s24_file.filename).suffix
        tmp_s24 = uploads / f"tmp_s24_{datetime.utcnow().timestamp()}{s24_suffix}"
        with tmp_s24.open("wb") as f:
            shutil.copyfileobj(s24_file.file, f)
        s24_path = str(tmp_s24)

    date = datetime.strptime(session_date, "%Y-%m-%d")
    session = session_repo.create(name=name, date=date, audio_path=str(tmp_audio), s24_path=s24_path)

    final_audio = uploads / f"{session.id}{suffix}"
    tmp_audio.rename(final_audio)
    m = db.get(SessionModel, session.id)
    m.original_audio_path = str(final_audio)
    if s24_path:
        s24_final = uploads / f"{session.id}_s24{s24_suffix}"
        Path(s24_path).rename(s24_final)
        m.s24_transcript_path = str(s24_final)
    db.commit()

    job = job_repo.create(session.id, JobType.INGEST)
    enqueue(job.id)
    return CreatedSessionOut(id=session.id)


@router.get("/sessions/{session_id}", response_model=SessionOut)
def get_session(session_id: int, db: DbSession = Depends(get_db)):
    s = SqlSessionRepository(db).get(session_id)
    if not s:
        raise HTTPException(404, "Sesión no encontrada")
    return SessionOut(id=s.id, name=s.name, date=s.date.strftime("%Y-%m-%d"), status=s.status.value)


@router.get("/sessions/{session_id}/status", response_model=JobStatusOut)
def session_status(session_id: int, db: DbSession = Depends(get_db)):
    job = SqlJobRepository(db).get_active_for_session(session_id)
    session = SqlSessionRepository(db).get(session_id)
    transcribed = bool(session and session.status.value == "transcribed")

    if not job:
        return JobStatusOut(
            status=session.status.value if session else "unknown",
            progress=100, done=True, review_ready=transcribed,
        )
    return JobStatusOut(
        status=job.status.value,
        progress=job.progress,
        done=job.status.value in ("done", "failed"),
        error=job.error,
        review_ready=job.status.value == "done" and transcribed,
    )


@router.get("/sessions/{session_id}/review", response_model=ReviewOut)
def review_data(session_id: int, db: DbSession = Depends(get_db)):
    session = SqlSessionRepository(db).get(session_id)
    if not session:
        raise HTTPException(404, "Sesión no encontrada")
    segments = SqlSegmentRepository(db).list_by_session(session_id)
    views = [classify_segment(seg) for seg in segments]

    return ReviewOut(
        session_id=session.id,
        name=session.name,
        total_segments=len(views),
        total_doubts=sum(v.total_doubts for v in views),
        doubts_left=sum(v.doubts_left for v in views),
        segments=[
            SegmentOut(
                id=v.id, start_ms=v.start_ms, speaker=v.speaker,
                total_doubts=v.total_doubts, doubts_left=v.doubts_left,
                words=[
                    {"text": w.text, "idx": w.idx, "start_ms": w.start_ms, "end_ms": w.end_ms,
                     "confidence": w.confidence, "eligible": w.eligible, "sealed": w.sealed}
                    for w in v.rwords
                ],
            )
            for v in views
        ],
    )


@router.post("/segments/{segment_id}/word", response_model=WordCorrectionOut)
def correct_word(segment_id: int, body: WordCorrectionIn, db: DbSession = Depends(get_db)):
    try:
        left = apply_word_correction(db, segment_id, body.idx, body.text)
    except SegmentNotFound:
        raise HTTPException(404, "Segmento sin palabras")
    except WordIndexOutOfRange:
        raise HTTPException(400, "Índice fuera de rango")
    return WordCorrectionOut(ok=True, session_doubts_left=left)
