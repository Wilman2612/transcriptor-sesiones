from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Optional


class SessionStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    TRANSCRIBED = "transcribed"
    REVIEWING = "reviewing"
    DONE = "done"
    ERROR = "error"


class SegmentStatus(str, Enum):
    PENDING = "pending"
    CORRECTED = "corrected"


class JobStatus(str, Enum):
    QUEUED = "queued"
    RUNNING = "running"
    DONE = "done"
    FAILED = "failed"


class JobType(str, Enum):
    INGEST = "ingest"
    TRANSCRIBE = "transcribe"


@dataclass
class Session:
    id: int
    name: str
    date: datetime
    original_audio_path: str
    status: SessionStatus = SessionStatus.PENDING
    created_at: datetime = field(default_factory=datetime.utcnow)
    s24_transcript_path: Optional[str] = None


@dataclass
class AudioChunk:
    id: int
    session_id: int
    idx: int
    path: str
    start_ms: int
    end_ms: int


@dataclass
class Word:
    text: str
    confidence: float
    start_ms: int
    end_ms: int
    resolved: bool = False  # la usuaria ya confirmó/corrigió esta palabra dudosa


@dataclass
class Segment:
    id: int
    session_id: int
    chunk_id: Optional[int]
    start_ms: int
    end_ms: int
    speaker: str
    original_text: str
    confidence: float
    status: SegmentStatus = SegmentStatus.PENDING
    words: list[Word] = field(default_factory=list)


@dataclass
class Correction:
    id: int
    segment_id: int
    suggested_text: str
    final_text: str
    corrected_at: datetime = field(default_factory=datetime.utcnow)


@dataclass
class Job:
    id: int
    session_id: int
    type: JobType
    status: JobStatus = JobStatus.QUEUED
    progress: int = 0
    error: Optional[str] = None
    created_at: datetime = field(default_factory=datetime.utcnow)
