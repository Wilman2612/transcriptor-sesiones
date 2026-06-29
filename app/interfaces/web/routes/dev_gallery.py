"""
Galería de estados (homólogo de Storybook): renderiza cada estado nombrado de la
UI de revisión contra datos fixture, sin tocar la base de datos ni la transcripción.
Sirve para revisión visual aislada (manual y por el crítico de UX).
"""
from fastapi import APIRouter, Request
from fastapi.responses import HTMLResponse

from app.interfaces.web import fixtures
from app.interfaces.web.templates_config import templates

router = APIRouter()


@router.get("/dev/gallery", response_class=HTMLResponse)
def gallery(request: Request):
    happy = fixtures.happy_segments()
    resolved = fixtures.resolved_segments()
    clean = fixtures.clean_segments()
    happy_total, happy_left = fixtures.happy_counts()

    return templates.TemplateResponse(
        request,
        "gallery.html",
        {
            "happy": happy,
            "happy_total": happy_total,
            "happy_left": happy_left,
            "resolved": resolved,
            "resolved_total": sum(s.total_doubts for s in resolved),
            "clean": clean,
        },
    )
