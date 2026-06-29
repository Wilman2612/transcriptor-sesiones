import os
import sys
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI


def _register_nvidia_dlls() -> None:
    """Agrega DLLs de NVIDIA (instalados via pip) al PATH para que ctranslate2 las encuentre.
    LoadLibrary() de Windows lee PATH, no os.add_dll_directory."""
    if sys.platform != "win32":
        return
    venv = Path(sys.executable).parent.parent
    nvidia_root = venv / "Lib" / "site-packages" / "nvidia"
    if not nvidia_root.exists():
        return
    extra_paths = [str(bin_dir) for bin_dir in nvidia_root.glob("*/bin") if bin_dir.is_dir()]
    if extra_paths:
        os.environ["PATH"] = ";".join(extra_paths) + ";" + os.environ.get("PATH", "")
        # También usar add_dll_directory para el cargador de Python (doble cobertura)
        for p in extra_paths:
            try:
                os.add_dll_directory(p)
            except Exception:
                pass


_register_nvidia_dlls()
from fastapi.staticfiles import StaticFiles

from app.application.use_cases.ingest_audio import ingest_audio
from app.application.use_cases.transcribe_session import transcribe_session
from app.infrastructure.jobs.worker import register_handler, start_worker
from app.infrastructure.persistence.database import SessionLocal, engine
from app.infrastructure.persistence.models import Base
from app.infrastructure.persistence.repositories import SqlJobRepository, SqlSessionRepository


def _ensure_columns():
    """Añade columnas nuevas a una DB existente (create_all no altera tablas)."""
    from sqlalchemy import text
    with engine.begin() as conn:
        cols = {r[1] for r in conn.exec_driver_sql("PRAGMA table_info(segments)")}
        if "override_text" not in cols:
            conn.exec_driver_sql("ALTER TABLE segments ADD COLUMN override_text TEXT")
        scols = {r[1] for r in conn.exec_driver_sql("PRAGMA table_info(sessions)")}
        if "speaker_names_json" not in scols:
            conn.exec_driver_sql("ALTER TABLE sessions ADD COLUMN speaker_names_json TEXT")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Crear tablas si no existen
    Base.metadata.create_all(bind=engine)
    _ensure_columns()

    # Registrar handlers del worker
    register_handler("ingest", ingest_audio)
    register_handler("transcribe", transcribe_session)

    # Arrancar worker de fondo
    start_worker(SessionLocal, SqlJobRepository, SqlSessionRepository)

    yield


app = FastAPI(title="Transcriptor de Sesiones", lifespan=lifespan)

app.mount(
    "/static",
    StaticFiles(directory="app/interfaces/web/static"),
    name="static",
)

from fastapi.middleware.cors import CORSMiddleware

# En desarrollo, el dev server de Vite (5173) llama a /api desde otro origen.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

from app.interfaces.web.routes import api, audio, dev_gallery, export, jobs, review, sessions

app.include_router(api.router)
app.include_router(sessions.router)
app.include_router(jobs.router)
app.include_router(review.router)
app.include_router(export.router)
app.include_router(audio.router)
app.include_router(dev_gallery.router)

# Frontend React compilado (web/dist). El instalador lo compila una vez; el
# usuario final no necesita Node. Si no está compilado, esta sección se omite.
# Como es una SPA, las rutas profundas (/app/sessions/1/review) devuelven
# index.html para que el router de React resuelva del lado del cliente.
_web_dist = Path(__file__).parent.parent / "web" / "dist"
if _web_dist.exists():
    from fastapi.responses import FileResponse

    @app.get("/app")
    @app.get("/app/{full_path:path}")
    def serve_react(full_path: str = ""):
        candidate = _web_dist / full_path
        if full_path and candidate.is_file():
            return FileResponse(str(candidate))
        return FileResponse(str(_web_dist / "index.html"))
