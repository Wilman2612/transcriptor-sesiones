"""
Use case: recibe un archivo de audio (y opcionalmente la transcripción del S24),
lo preprocesa, lo corta en chunks y crea los registros en la DB.
"""
import shutil
from datetime import datetime
from pathlib import Path

from sqlalchemy.orm import Session as DbSession

from app.application.ports import ChunkerPort, AudioProcessorPort
from app.config import settings
from app.domain.entities import JobStatus, JobType, SessionStatus
from app.infrastructure.audio.chunker import SilenceChunker
from app.infrastructure.audio.preprocessor import FfmpegNoisereduceProcessor
from app.infrastructure.jobs.worker import enqueue
from app.infrastructure.persistence.repositories import (
    SqlChunkRepository,
    SqlJobRepository,
    SqlSegmentRepository,
    SqlSessionRepository,
)


def ingest_audio(
    job_id: int,
    db: DbSession,
) -> None:
    job_repo = SqlJobRepository(db)
    session_repo = SqlSessionRepository(db)
    chunk_repo = SqlChunkRepository(db)

    job_repo.update(job_id, status=JobStatus.RUNNING, progress=5)

    job = job_repo.get(job_id)
    session = session_repo.get(job.session_id)

    try:
        uploads_dir = Path(settings.uploads_dir)
        chunks_dir = Path(settings.chunks_dir) / str(session.id)
        chunks_dir.mkdir(parents=True, exist_ok=True)

        # 1. Preprocesar
        job_repo.update(job_id, progress=15)
        processor = FfmpegNoisereduceProcessor()
        clean_path = str(uploads_dir / f"{session.id}_clean.wav")
        processor.preprocess(session.original_audio_path, clean_path)

        # 2. Cortar en chunks
        job_repo.update(job_id, progress=40)
        chunker = SilenceChunker()
        raw_chunks = chunker.chunk(clean_path, str(chunks_dir), settings.chunk_max_seconds)

        # 3. Guardar chunks en DB
        for idx, c in enumerate(raw_chunks):
            chunk_repo.create(
                session_id=session.id,
                idx=idx,
                path=c["path"],
                start_ms=c["start_ms"],
                end_ms=c["end_ms"],
            )

        session_repo.update_status(session.id, SessionStatus.PROCESSING)
        job_repo.update(job_id, status=JobStatus.DONE, progress=100)

        # Encolar job de transcripción automáticamente
        transcribe_job = SqlJobRepository(db).create(session.id, JobType.TRANSCRIBE)
        enqueue(transcribe_job.id)

    except Exception as e:
        job_repo.update(job_id, status=JobStatus.FAILED, error=str(e))
        session_repo.update_status(job.session_id, SessionStatus.ERROR)
        raise
