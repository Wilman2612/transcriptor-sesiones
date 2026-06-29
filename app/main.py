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


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Crear tablas si no existen
    Base.metadata.create_all(bind=engine)

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

from app.interfaces.web.routes import audio, dev_gallery, export, jobs, review, sessions

app.include_router(sessions.router)
app.include_router(jobs.router)
app.include_router(review.router)
app.include_router(export.router)
app.include_router(audio.router)
app.include_router(dev_gallery.router)
