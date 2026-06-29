from pathlib import Path

from fastapi import APIRouter, Depends
from fastapi.responses import FileResponse, JSONResponse
from sqlalchemy.orm import Session as DbSession

from app.application.use_cases.export_transcript import export_transcript
from app.infrastructure.persistence.database import get_db

router = APIRouter()


@router.get("/sessions/{session_id}/export/{fmt}")
def export(session_id: int, fmt: str, db: DbSession = Depends(get_db)):
    if fmt not in ("txt", "docx"):
        return JSONResponse({"error": "Formato no soportado"}, status_code=400)

    output_dir = f"data/exports/{session_id}"
    paths = export_transcript(session_id, db, output_dir)

    file_path = paths[fmt]
    media_type = "text/plain" if fmt == "txt" else "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    return FileResponse(file_path, media_type=media_type, filename=Path(file_path).name)
