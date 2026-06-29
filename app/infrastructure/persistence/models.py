from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, Integer, LargeBinary, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.infrastructure.persistence.database import Base


class SessionModel(Base):
    __tablename__ = "sessions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(255))
    date: Mapped[datetime] = mapped_column(DateTime)
    original_audio_path: Mapped[str] = mapped_column(String(512))
    s24_transcript_path: Mapped[str | None] = mapped_column(String(512), nullable=True)
    status: Mapped[str] = mapped_column(String(32), default="pending")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    # JSON: {"Hablante 1": "Alcalde", "Hablante 2": "Secretaria general", ...}
    speaker_names_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    # Segmento donde el revisor dejó la revisión (para retomar). NULL = sin marcador.
    bookmark_segment_id: Mapped[int | None] = mapped_column(Integer, nullable=True)

    chunks: Mapped[list["ChunkModel"]] = relationship(back_populates="session", cascade="all, delete-orphan")
    segments: Mapped[list["SegmentModel"]] = relationship(back_populates="session", cascade="all, delete-orphan")
    jobs: Mapped[list["JobModel"]] = relationship(back_populates="session", cascade="all, delete-orphan")


class ChunkModel(Base):
    __tablename__ = "audio_chunks"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    session_id: Mapped[int] = mapped_column(ForeignKey("sessions.id"))
    idx: Mapped[int] = mapped_column(Integer)
    path: Mapped[str] = mapped_column(String(512))
    start_ms: Mapped[int] = mapped_column(Integer)
    end_ms: Mapped[int] = mapped_column(Integer)

    session: Mapped["SessionModel"] = relationship(back_populates="chunks")
    segments: Mapped[list["SegmentModel"]] = relationship(back_populates="chunk")


class SegmentModel(Base):
    __tablename__ = "segments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    session_id: Mapped[int] = mapped_column(ForeignKey("sessions.id"))
    chunk_id: Mapped[int | None] = mapped_column(ForeignKey("audio_chunks.id"), nullable=True)
    start_ms: Mapped[int] = mapped_column(Integer)
    end_ms: Mapped[int] = mapped_column(Integer)
    speaker: Mapped[str] = mapped_column(String(64), default="")
    original_text: Mapped[str] = mapped_column(Text)
    confidence: Mapped[float] = mapped_column(Float)
    status: Mapped[str] = mapped_column(String(32), default="pending")
    # JSON: [{"text": str, "confidence": float, "start_ms": int, "end_ms": int}, ...]
    words_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    # Reescritura libre de la frase (tramos donde Whisper alucinó): si está
    # presente, sustituye a las palabras para mostrar y exportar.
    override_text: Mapped[str | None] = mapped_column(Text, nullable=True)

    session: Mapped["SessionModel"] = relationship(back_populates="segments")
    chunk: Mapped["ChunkModel | None"] = relationship(back_populates="segments")
    correction: Mapped["CorrectionModel | None"] = relationship(back_populates="segment", uselist=False, cascade="all, delete-orphan")


class CorrectionModel(Base):
    __tablename__ = "corrections"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    segment_id: Mapped[int] = mapped_column(ForeignKey("segments.id"), unique=True)
    suggested_text: Mapped[str] = mapped_column(Text, default="")
    final_text: Mapped[str] = mapped_column(Text)
    corrected_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    embedding: Mapped[bytes | None] = mapped_column(LargeBinary, nullable=True)

    segment: Mapped["SegmentModel"] = relationship(back_populates="correction")


class GlossaryTermModel(Base):
    """Glosario global del consejo/municipalidad: nombres, términos legales,
    patrones. Sesga a Whisper, sugiere correcciones y nutre los hablantes."""
    __tablename__ = "glossary_terms"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    text: Mapped[str] = mapped_column(String(255))
    kind: Mapped[str] = mapped_column(String(16), default="persona")  # persona | termino | patron
    source: Mapped[str] = mapped_column(String(16), default="manual")  # manual | historial
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class JobModel(Base):
    __tablename__ = "jobs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    session_id: Mapped[int] = mapped_column(ForeignKey("sessions.id"))
    type: Mapped[str] = mapped_column(String(32))
    status: Mapped[str] = mapped_column(String(32), default="queued")
    progress: Mapped[int] = mapped_column(Integer, default=0)
    error: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    session: Mapped["SessionModel"] = relationship(back_populates="jobs")
