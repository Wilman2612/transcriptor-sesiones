"""Contrato JSON entre el backend FastAPI y el frontend React.
Estos modelos son la fuente de verdad de los tipos que consume el front."""
from pydantic import BaseModel


class WordOut(BaseModel):
    text: str
    idx: int
    start_ms: int
    end_ms: int
    confidence: float   # 0-1 cruda; el cliente decide el umbral con el slider
    eligible: bool      # candidata a duda a algún umbral (no es palabra funcional)
    sealed: bool        # ya confirmada/corregida


class SegmentOut(BaseModel):
    id: int
    start_ms: int
    speaker: str
    words: list[WordOut]
    total_doubts: int
    doubts_left: int
    override_text: str | None = None  # reescritura libre; si está, sustituye a words


class SegmentTextIn(BaseModel):
    text: str


class ReviewOut(BaseModel):
    session_id: int
    name: str
    total_segments: int
    total_doubts: int
    doubts_left: int
    segments: list[SegmentOut]
    speakers: dict[str, str] = {}  # {"Hablante 1": "Alcalde", ...}
    bookmark_segment_id: int | None = None  # dónde se dejó la revisión


class SpeakerNameIn(BaseModel):
    key: str   # "Hablante 1"
    name: str  # "" = quitar el nombre


class BookmarkIn(BaseModel):
    segment_id: int | None = None  # None = quitar el marcador


class SessionOut(BaseModel):
    id: int
    name: str
    date: str
    status: str


class JobStatusOut(BaseModel):
    status: str
    progress: int
    done: bool
    error: str | None = None
    review_ready: bool = False


class WordCorrectionIn(BaseModel):
    idx: int
    text: str


class WordCorrectionOut(BaseModel):
    ok: bool
    session_doubts_left: int


class CreatedSessionOut(BaseModel):
    id: int


class GlossaryTermOut(BaseModel):
    id: int
    text: str
    kind: str  # persona | termino | patron
    source: str


class GlossaryTermIn(BaseModel):
    text: str
    kind: str = "persona"
