import json
from datetime import datetime
from typing import Optional

from sqlalchemy.orm import Session as DbSession

from app.application.ports import (
    ChunkRepository,
    CorrectionRepository,
    JobRepository,
    SegmentRepository,
    SessionRepository,
)
from app.domain.entities import (
    AudioChunk,
    Correction,
    Job,
    JobStatus,
    JobType,
    Segment,
    SegmentStatus,
    Session,
    SessionStatus,
    Word,
)
from app.infrastructure.persistence.models import (
    ChunkModel,
    CorrectionModel,
    JobModel,
    SegmentModel,
    SessionModel,
)


def _to_session(m: SessionModel) -> Session:
    return Session(
        id=m.id,
        name=m.name,
        date=m.date,
        original_audio_path=m.original_audio_path,
        status=SessionStatus(m.status),
        created_at=m.created_at,
        s24_transcript_path=m.s24_transcript_path,
    )


def _to_chunk(m: ChunkModel) -> AudioChunk:
    return AudioChunk(id=m.id, session_id=m.session_id, idx=m.idx, path=m.path, start_ms=m.start_ms, end_ms=m.end_ms)


def _to_segment(m: SegmentModel) -> Segment:
    words = []
    if m.words_json:
        try:
            words = [
                Word(
                    text=w["text"],
                    confidence=w["confidence"],
                    start_ms=w["start_ms"],
                    end_ms=w["end_ms"],
                    resolved=w.get("resolved", False),
                )
                for w in json.loads(m.words_json)
            ]
        except (ValueError, KeyError, TypeError):
            words = []
    return Segment(
        id=m.id,
        session_id=m.session_id,
        chunk_id=m.chunk_id,
        start_ms=m.start_ms,
        end_ms=m.end_ms,
        speaker=m.speaker,
        original_text=m.original_text,
        confidence=m.confidence,
        status=SegmentStatus(m.status),
        words=words,
        override_text=m.override_text,
    )


def _to_correction(m: CorrectionModel) -> Correction:
    return Correction(id=m.id, segment_id=m.segment_id, suggested_text=m.suggested_text, final_text=m.final_text, corrected_at=m.corrected_at)


def _to_job(m: JobModel) -> Job:
    return Job(id=m.id, session_id=m.session_id, type=JobType(m.type), status=JobStatus(m.status), progress=m.progress, error=m.error, created_at=m.created_at)


class SqlSessionRepository(SessionRepository):
    def __init__(self, db: DbSession):
        self.db = db

    def create(self, name: str, date, audio_path: str, s24_path: Optional[str] = None) -> Session:
        m = SessionModel(name=name, date=date, original_audio_path=audio_path, s24_transcript_path=s24_path)
        self.db.add(m)
        self.db.commit()
        self.db.refresh(m)
        return _to_session(m)

    def get(self, session_id: int) -> Optional[Session]:
        m = self.db.get(SessionModel, session_id)
        return _to_session(m) if m else None

    def list(self) -> list[Session]:
        return [_to_session(m) for m in self.db.query(SessionModel).order_by(SessionModel.created_at.desc()).all()]

    def update_status(self, session_id: int, status: SessionStatus) -> None:
        m = self.db.get(SessionModel, session_id)
        if m:
            m.status = status.value
            self.db.commit()


class SqlChunkRepository(ChunkRepository):
    def __init__(self, db: DbSession):
        self.db = db

    def create(self, session_id: int, idx: int, path: str, start_ms: int, end_ms: int) -> AudioChunk:
        m = ChunkModel(session_id=session_id, idx=idx, path=path, start_ms=start_ms, end_ms=end_ms)
        self.db.add(m)
        self.db.commit()
        self.db.refresh(m)
        return _to_chunk(m)

    def list_by_session(self, session_id: int) -> list[AudioChunk]:
        return [_to_chunk(m) for m in self.db.query(ChunkModel).filter_by(session_id=session_id).order_by(ChunkModel.idx).all()]


class SqlSegmentRepository(SegmentRepository):
    def __init__(self, db: DbSession):
        self.db = db

    def bulk_create(self, segments: list[dict]) -> None:
        self.db.bulk_insert_mappings(SegmentModel, segments)
        self.db.commit()

    def list_by_session(self, session_id: int) -> list[Segment]:
        rows = self.db.query(SegmentModel).filter_by(session_id=session_id).order_by(SegmentModel.start_ms).all()
        return [_to_segment(m) for m in rows]

    def get(self, segment_id: int) -> Optional[Segment]:
        m = self.db.get(SegmentModel, segment_id)
        return _to_segment(m) if m else None

    def update_status(self, segment_id: int, status: SegmentStatus) -> None:
        m = self.db.get(SegmentModel, segment_id)
        if m:
            m.status = status.value
            self.db.commit()


class SqlCorrectionRepository(CorrectionRepository):
    def __init__(self, db: DbSession):
        self.db = db

    def upsert(self, segment_id: int, final_text: str, suggested_text: str = "") -> Correction:
        m = self.db.query(CorrectionModel).filter_by(segment_id=segment_id).first()
        if m:
            m.final_text = final_text
            m.suggested_text = suggested_text
            m.corrected_at = datetime.utcnow()
        else:
            m = CorrectionModel(segment_id=segment_id, final_text=final_text, suggested_text=suggested_text)
            self.db.add(m)
        self.db.commit()
        self.db.refresh(m)
        # update segment status
        seg = self.db.get(SegmentModel, segment_id)
        if seg:
            seg.status = "corrected"
            self.db.commit()
        return _to_correction(m)

    def get_by_segment(self, segment_id: int) -> Optional[Correction]:
        m = self.db.query(CorrectionModel).filter_by(segment_id=segment_id).first()
        return _to_correction(m) if m else None


class SqlJobRepository(JobRepository):
    def __init__(self, db: DbSession):
        self.db = db

    def create(self, session_id: int, job_type: JobType) -> Job:
        m = JobModel(session_id=session_id, type=job_type.value)
        self.db.add(m)
        self.db.commit()
        self.db.refresh(m)
        return _to_job(m)

    def get(self, job_id: int) -> Optional[Job]:
        m = self.db.get(JobModel, job_id)
        return _to_job(m) if m else None

    def update(self, job_id: int, status=None, progress: int = None, error: str = None) -> None:
        m = self.db.get(JobModel, job_id)
        if not m:
            return
        if status is not None:
            m.status = status.value if hasattr(status, "value") else status
        if progress is not None:
            m.progress = progress
        if error is not None:
            m.error = error
        self.db.commit()

    def get_active_for_session(self, session_id: int) -> Optional[Job]:
        m = (
            self.db.query(JobModel)
            .filter(JobModel.session_id == session_id, JobModel.status.in_(["queued", "running"]))
            .order_by(JobModel.created_at.desc())
            .first()
        )
        return _to_job(m) if m else None
