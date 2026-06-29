from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Optional

from app.domain.entities import AudioChunk, Correction, Job, Segment, Session


# ── Transcription ──────────────────────────────────────────────────────────────

@dataclass
class TranscribedWord:
    text: str
    confidence: float  # 0-1 (probability de la palabra)
    start_ms: int
    end_ms: int


@dataclass
class TranscribedSegment:
    start_ms: int
    end_ms: int
    text: str
    confidence: float  # 0-1 normalizado (promedio del segmento)
    words: list[TranscribedWord] = field(default_factory=list)


class TranscriberPort(ABC):
    @abstractmethod
    def transcribe(self, audio_path: str, chunk_offset_ms: int = 0) -> list[TranscribedSegment]:
        """Transcribe un archivo de audio y devuelve segmentos con confianza."""


# ── Audio processing ───────────────────────────────────────────────────────────

class AudioProcessorPort(ABC):
    @abstractmethod
    def preprocess(self, input_path: str, output_path: str) -> str:
        """Limpia el audio: mono 16kHz, normaliza volumen, reduce ruido."""


class ChunkerPort(ABC):
    @abstractmethod
    def chunk(self, audio_path: str, output_dir: str, max_seconds: int) -> list[dict]:
        """Corta en silencio; retorna lista de {path, start_ms, end_ms}."""


# ── Speaker diarization ────────────────────────────────────────────────────────

@dataclass
class S24Segment:
    speaker: str
    start_ms: int
    end_ms: int
    text: str


class SpeakerAlignerPort(ABC):
    @abstractmethod
    def parse_s24(self, transcript_path: str) -> list[S24Segment]:
        """Parsea el archivo de exportación del Samsung S24."""

    @abstractmethod
    def align(
        self,
        whisper_segments: list[TranscribedSegment],
        s24_segments: list[S24Segment],
    ) -> list[dict]:
        """Asigna hablante a cada segmento de Whisper por solapamiento temporal."""


# ── Suggestions (stub para Fase 6) ────────────────────────────────────────────

class SuggestionPort(ABC):
    @abstractmethod
    def suggest(self, text: str, session_id: int) -> Optional[str]:
        """Retorna una corrección sugerida basada en el historial, o None."""


# ── Repositories ───────────────────────────────────────────────────────────────

class SessionRepository(ABC):
    @abstractmethod
    def create(self, name: str, date, audio_path: str, s24_path: Optional[str]) -> Session: ...
    @abstractmethod
    def get(self, session_id: int) -> Optional[Session]: ...
    @abstractmethod
    def list(self) -> list[Session]: ...
    @abstractmethod
    def update_status(self, session_id: int, status) -> None: ...


class ChunkRepository(ABC):
    @abstractmethod
    def create(self, session_id: int, idx: int, path: str, start_ms: int, end_ms: int) -> AudioChunk: ...
    @abstractmethod
    def list_by_session(self, session_id: int) -> list[AudioChunk]: ...


class SegmentRepository(ABC):
    @abstractmethod
    def bulk_create(self, segments: list[dict]) -> None: ...
    @abstractmethod
    def list_by_session(self, session_id: int) -> list[Segment]: ...
    @abstractmethod
    def get(self, segment_id: int) -> Optional[Segment]: ...
    @abstractmethod
    def update_status(self, segment_id: int, status) -> None: ...


class CorrectionRepository(ABC):
    @abstractmethod
    def upsert(self, segment_id: int, final_text: str, suggested_text: str = "") -> Correction: ...
    @abstractmethod
    def get_by_segment(self, segment_id: int) -> Optional[Correction]: ...


class JobRepository(ABC):
    @abstractmethod
    def create(self, session_id: int, job_type) -> Job: ...
    @abstractmethod
    def get(self, job_id: int) -> Optional[Job]: ...
    @abstractmethod
    def update(self, job_id: int, status=None, progress: int = None, error: str = None) -> None: ...
    @abstractmethod
    def get_active_for_session(self, session_id: int) -> Optional[Job]: ...
