"""
API JSON (/api) que consume el frontend React. Desacopla la UI del backend:
reusa los mismos casos de uso y repositorios que la interfaz HTML.
"""
import json
import re
import shutil
from datetime import datetime
from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from pydantic import BaseModel
from sqlalchemy.orm import Session as DbSession

from app.application.use_cases.correct_word import (
    SegmentNotFound,
    WordIndexOutOfRange,
    apply_word_correction,
    count_session_doubts_left,
)
from app.config import settings
from app.domain.entities import JobType
from app.infrastructure.jobs.worker import enqueue
from app.infrastructure.persistence.database import get_db
from app.infrastructure.persistence.models import GlossaryTermModel, SegmentModel, SessionModel
from app.infrastructure.persistence.repositories import (
    SqlJobRepository,
    SqlSegmentRepository,
    SqlSessionRepository,
)
from app.interfaces.web.api_schemas import (
    BookmarkIn,
    CreatedSessionOut,
    GlossaryTermIn,
    GlossaryTermOut,
    JobStatusOut,
    ReviewOut,
    SegmentOut,
    SegmentTextIn,
    SessionOut,
    SpeakerNameIn,
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


@router.delete("/sessions/{session_id}", status_code=204)
def delete_session(session_id: int, db: DbSession = Depends(get_db)):
    """Elimina una sesión y todo lo suyo: filas (cascada a chunks/segmentos/jobs)
    y archivos en disco (audio, transcripción S24, chunks, exports)."""
    m = db.get(SessionModel, session_id)
    if not m:
        raise HTTPException(404, "Sesión no encontrada")

    for f in (m.original_audio_path, m.s24_transcript_path):
        if f:
            try:
                Path(f).unlink(missing_ok=True)
            except OSError:
                pass
    for d in (Path(settings.chunks_dir) / str(session_id),
              Path(settings.exports_dir) / str(session_id)):
        shutil.rmtree(d, ignore_errors=True)

    db.delete(m)  # cascade borra chunks, segmentos, correcciones y jobs
    db.commit()


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

    m = db.get(SessionModel, session_id)
    speakers = json.loads(m.speaker_names_json) if m and m.speaker_names_json else {}

    return ReviewOut(
        session_id=session.id,
        name=session.name,
        total_segments=len(views),
        total_doubts=sum(v.total_doubts for v in views),
        doubts_left=sum(v.doubts_left for v in views),
        speakers=speakers,
        bookmark_segment_id=m.bookmark_segment_id if m else None,
        segments=[
            SegmentOut(
                id=v.id, start_ms=v.start_ms, speaker=v.speaker,
                total_doubts=v.total_doubts, doubts_left=v.doubts_left,
                override_text=v.override_text,
                words=[
                    {"text": w.text, "idx": w.idx, "start_ms": w.start_ms, "end_ms": w.end_ms,
                     "confidence": w.confidence, "eligible": w.eligible, "sealed": w.sealed}
                    for w in v.rwords
                ],
            )
            for v in views
        ],
    )


@router.post("/sessions/{session_id}/speaker", status_code=204)
def set_speaker_name(session_id: int, body: SpeakerNameIn, db: DbSession = Depends(get_db)):
    """Asigna un nombre/cargo real a un hablante (Hablante N). Vacío = quitarlo."""
    m = db.get(SessionModel, session_id)
    if not m:
        raise HTTPException(404, "Sesión no encontrada")
    names = json.loads(m.speaker_names_json) if m.speaker_names_json else {}
    name = body.name.strip()
    if name:
        names[body.key] = name
    else:
        names.pop(body.key, None)
    m.speaker_names_json = json.dumps(names, ensure_ascii=False) if names else None
    db.commit()


@router.post("/sessions/{session_id}/bookmark", status_code=204)
def set_bookmark(session_id: int, body: BookmarkIn, db: DbSession = Depends(get_db)):
    """Guarda (o quita, con segment_id=None) el punto donde se dejó la revisión."""
    m = db.get(SessionModel, session_id)
    if not m:
        raise HTTPException(404, "Sesión no encontrada")
    m.bookmark_segment_id = body.segment_id
    db.commit()


@router.post("/segments/{segment_id}/word", response_model=WordCorrectionOut)
def correct_word(segment_id: int, body: WordCorrectionIn, db: DbSession = Depends(get_db)):
    try:
        left = apply_word_correction(db, segment_id, body.idx, body.text)
    except SegmentNotFound:
        raise HTTPException(404, "Segmento sin palabras")
    except WordIndexOutOfRange:
        raise HTTPException(400, "Índice fuera de rango")
    return WordCorrectionOut(ok=True, session_doubts_left=left)


class ReprocessIn(BaseModel):
    segment_ids: list[int]


@router.post("/reprocess", response_model=WordCorrectionOut)
def reprocess(body: ReprocessIn, db: DbSession = Depends(get_db)):
    """Segunda pasada sobre un tramo: re-transcribe en aislamiento y reemplaza."""
    from app.application.use_cases.reprocess import CannotReprocess, reprocess_segments

    try:
        left = reprocess_segments(db, body.segment_ids)
    except CannotReprocess as e:
        raise HTTPException(400, str(e))
    return WordCorrectionOut(ok=True, session_doubts_left=left)


@router.post("/segments/{segment_id}/text", response_model=WordCorrectionOut)
def rewrite_segment(segment_id: int, body: SegmentTextIn, db: DbSession = Depends(get_db)):
    """Reescribe una frase entera como texto libre (tramos donde Whisper alucinó).
    Vacío = quitar la reescritura y volver a las palabras."""
    m = db.get(SegmentModel, segment_id)
    if not m:
        raise HTTPException(404, "Segmento no encontrado")
    text = body.text.strip()
    m.override_text = text or None
    m.status = "corrected" if text else "pending"
    db.commit()
    left = count_session_doubts_left(db, m.session_id)
    return WordCorrectionOut(ok=True, session_doubts_left=left)


# ── Glosario (global) ──────────────────────────────────────────────────────────

@router.get("/glossary", response_model=list[GlossaryTermOut])
def list_glossary(db: DbSession = Depends(get_db)):
    rows = db.query(GlossaryTermModel).order_by(GlossaryTermModel.kind, GlossaryTermModel.text).all()
    return [
        GlossaryTermOut(id=r.id, text=r.text, kind=r.kind, source=r.source) for r in rows
    ]


@router.post("/glossary", response_model=GlossaryTermOut, status_code=201)
def add_glossary(body: GlossaryTermIn, db: DbSession = Depends(get_db)):
    text = body.text.strip()
    if not text:
        raise HTTPException(400, "Texto vacío")
    kind = body.kind if body.kind in ("persona", "termino", "patron") else "persona"
    existing = db.query(GlossaryTermModel).filter_by(text=text, kind=kind).first()
    if existing:
        return GlossaryTermOut(id=existing.id, text=existing.text, kind=existing.kind, source=existing.source)
    m = GlossaryTermModel(text=text, kind=kind, source="manual")
    db.add(m)
    db.commit()
    db.refresh(m)
    return GlossaryTermOut(id=m.id, text=m.text, kind=m.kind, source=m.source)


@router.delete("/glossary/{term_id}", status_code=204)
def delete_glossary(term_id: int, db: DbSession = Depends(get_db)):
    m = db.get(GlossaryTermModel, term_id)
    if m:
        db.delete(m)
        db.commit()


@router.get("/glossary/prompt")
def glossary_prompt(db: DbSession = Depends(get_db)):
    """Prompt de sesgo que se le pasaría a Whisper + tokens estimados vs límite."""
    from app.application.use_cases.glossary_prompt import glossary_initial_prompt
    from app.infrastructure.transcription.biasing import PROMPT_TOKEN_LIMIT, estimate_tokens

    prompt = glossary_initial_prompt(db)
    return {"prompt": prompt, "tokens": estimate_tokens(prompt), "limit": PROMPT_TOKEN_LIMIT}


@router.get("/sessions/{session_id}/speakers")
def session_speakers(session_id: int, db: DbSession = Depends(get_db)):
    """Cada hablante de la sesión con su nombre asignado y una muestra (su
    intervención más larga) para poder identificarlo de un vistazo."""
    m = db.get(SessionModel, session_id)
    if not m:
        raise HTTPException(404, "Sesión no encontrada")
    names = json.loads(m.speaker_names_json) if m.speaker_names_json else {}

    segments = db.query(SegmentModel).filter_by(session_id=session_id).all()
    longest: dict[str, str] = {}
    order: list[str] = []
    for s in segments:
        if s.speaker not in longest:
            order.append(s.speaker)
        text = (s.override_text or s.original_text or "").strip()
        if len(text) > len(longest.get(s.speaker, "")):
            longest[s.speaker] = text

    def sort_key(k: str):
        mt = re.search(r"(\d+)", k)
        return int(mt.group(1)) if mt else 999
    order.sort(key=sort_key)

    return [
        {"key": k, "name": names.get(k, ""), "sample": longest.get(k, "")[:240]}
        for k in order
    ]
