from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session as DbSession

from app.infrastructure.persistence.database import get_db
from app.infrastructure.persistence.repositories import SqlSessionRepository

router = APIRouter()


@router.get("/audio/{session_id}")
def serve_audio(session_id: int, db: DbSession = Depends(get_db)):
    repo = SqlSessionRepository(db)
    session = repo.get(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Sesión no encontrada")

    path = Path(session.original_audio_path)
    if not path.exists():
        raise HTTPException(status_code=404, detail="Archivo de audio no encontrado")

    suffix = path.suffix.lower()
    media_types = {
        ".m4a": "audio/mp4",
        ".mp3": "audio/mpeg",
        ".wav": "audio/wav",
        ".ogg": "audio/ogg",
        ".mp4": "audio/mp4",
    }
    media_type = media_types.get(suffix, "audio/mpeg")
    return FileResponse(str(path), media_type=media_type)
