"""
Use case: genera el documento final (txt y docx) de una sesión ya revisada.
"""
from pathlib import Path

from sqlalchemy.orm import Session as DbSession

from app.infrastructure.persistence.repositories import (
    SqlCorrectionRepository,
    SqlSegmentRepository,
    SqlSessionRepository,
)


def _ms_to_str(ms: int) -> str:
    total_s = ms // 1000
    h, rem = divmod(total_s, 3600)
    m, s = divmod(rem, 60)
    if h:
        return f"{h:02d}:{m:02d}:{s:02d}"
    return f"{m:02d}:{s:02d}"


def export_transcript(session_id: int, db: DbSession, output_dir: str) -> dict[str, str]:
    session_repo = SqlSessionRepository(db)
    segment_repo = SqlSegmentRepository(db)
    correction_repo = SqlCorrectionRepository(db)

    session = session_repo.get(session_id)
    segments = segment_repo.list_by_session(session_id)

    lines = []
    for seg in segments:
        correction = correction_repo.get_by_segment(seg.id)
        text = correction.final_text if correction else seg.original_text
        timestamp = _ms_to_str(seg.start_ms)
        lines.append(f"[{timestamp}] {seg.speaker}: {text}")

    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    safe_name = "".join(c if c.isalnum() or c in "- _" else "_" for c in session.name)

    # TXT
    txt_path = output_dir / f"{safe_name}.txt"
    txt_path.write_text("\n".join(lines), encoding="utf-8")

    # DOCX
    from docx import Document
    from docx.shared import Pt
    doc = Document()
    doc.add_heading(session.name, level=1)
    doc.add_paragraph(f"Fecha: {session.date.strftime('%d/%m/%Y')}")
    doc.add_paragraph("")
    for line in lines:
        p = doc.add_paragraph(line)
        p.style.font.size = Pt(11)

    docx_path = output_dir / f"{safe_name}.docx"
    doc.save(str(docx_path))

    return {"txt": str(txt_path), "docx": str(docx_path)}
