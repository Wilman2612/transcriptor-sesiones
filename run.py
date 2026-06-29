"""
Lanzador principal: crea directorios, corre migraciones e inicia el servidor.
Uso: python run.py
"""
import os
import subprocess
import sys
import webbrowser
from pathlib import Path
from threading import Timer

BASE = Path(__file__).parent


def ensure_dirs():
    for d in ["data/uploads", "data/chunks", "data/exports"]:
        (BASE / d).mkdir(parents=True, exist_ok=True)


def run_migrations():
    alembic_ini = BASE / "alembic.ini"
    if alembic_ini.exists():
        subprocess.run([sys.executable, "-m", "alembic", "upgrade", "head"], cwd=BASE, check=False)


def open_browser(port: int):
    # Si el frontend React está compilado, abrir esa interfaz; si no, la HTML.
    path = "/app/" if (BASE / "web" / "dist" / "index.html").exists() else "/"
    webbrowser.open(f"http://localhost:{port}{path}")


if __name__ == "__main__":
    ensure_dirs()

    # Copiar .env.example → .env si no existe
    env_file = BASE / ".env"
    if not env_file.exists():
        example = BASE / ".env.example"
        if example.exists():
            env_file.write_text(example.read_text())
            print("Creado .env desde .env.example — revisa la configuración si es necesario.")

    run_migrations()

    port = int(os.environ.get("PORT", 8000))
    print(f"\n✅  Transcriptor iniciado en http://localhost:{port}\n")
    Timer(1.5, open_browser, args=(port,)).start()

    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=port, reload=False)
