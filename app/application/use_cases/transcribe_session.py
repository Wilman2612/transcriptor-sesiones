"""
Use case: transcribe todos los chunks de una sesión, alinea hablantes y guarda segmentos.
"""
import json

from sqlalchemy.orm import Session as DbSession

from app.domain.entities import JobStatus, SessionStatus
from app.infrastructure.diarization.speaker_aligner import S24SpeakerAligner
from app.infrastructure.persistence.repositories import (
    SqlChunkRepository,
    SqlJobRepository,
    SqlSegmentRepository,
    SqlSessionRepository,
)
from app.infrastructure.transcription.factory import get_transcriber


def transcribe_session(job_id: int, db: DbSession) -> None:
    job_repo = SqlJobRepository(db)
    session_repo = SqlSessionRepository(db)
    chunk_repo = SqlChunkRepository(db)
    segment_repo = SqlSegmentRepository(db)

    job_repo.update(job_id, status=JobStatus.RUNNING, progress=5)
    job = job_repo.get(job_id)
    session = session_repo.get(job.session_id)

    try:
        chunks = chunk_repo.list_by_session(session.id)
        transcriber = get_transcriber()
        aligner = S24SpeakerAligner()

        s24_segments = []
        if session.s24_transcript_path:
            s24_segments = aligner.parse_s24(session.s24_transcript_path)

        all_whisper = []
        for i, chunk in enumerate(chunks):
            progress = 5 + int((i / len(chunks)) * 85)
            job_repo.update(job_id, progress=progress)

            segs = transcriber.transcribe(chunk.path, chunk_offset_ms=chunk.start_ms)
            all_whisper.extend(segs)

        # Alinear hablantes
        aligned = aligner.align(all_whisper, s24_segments) if s24_segments else [
            {
                "start_ms": s.start_ms,
                "end_ms": s.end_ms,
                "text": s.text,
                "confidence": s.confidence,
                "speaker": "Desconocido",
                "words": s.words,
            }
            for s in all_whisper
        ]

        # El texto se guarda limpio; el resaltado de dudas se hace por palabra
        # a partir de words_json en la UI (ver review.py / review.html).
        rows = []
        for a in aligned:
            words = a.get("words", [])
            words_json = json.dumps(
                [
                    {
                        "text": w.text,
                        "confidence": round(w.confidence, 4),
                        "start_ms": w.start_ms,
                        "end_ms": w.end_ms,
                    }
                    for w in words
                ],
                ensure_ascii=False,
            ) if words else None

            rows.append(
                {
                    "session_id": session.id,
                    "chunk_id": None,
                    "start_ms": a["start_ms"],
                    "end_ms": a["end_ms"],
                    "speaker": a["speaker"],
                    "original_text": a["text"],
                    "confidence": a["confidence"],
                    "status": "pending",
                    "words_json": words_json,
                }
            )

        segment_repo.bulk_create(rows)
        session_repo.update_status(session.id, SessionStatus.TRANSCRIBED)
        job_repo.update(job_id, status=JobStatus.DONE, progress=100)

    except Exception as e:
        job_repo.update(job_id, status=JobStatus.FAILED, error=str(e))
        session_repo.update_status(job.session_id, SessionStatus.ERROR)
        raise
