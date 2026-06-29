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

# La consola de Windows usa cp1252 por defecto: cualquier acento o emoji en un
# print (o en los logs de uvicorn/la app) lanzaría UnicodeEncodeError y tumbaría
# el arranque. Forzamos UTF-8 tolerante.
for _stream in (sys.stdout, sys.stderr):
    try:
        _stream.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

BASE = Path(__file__).parent


def ensure_dirs():
    # Crea la carpeta de datos donde la configura settings (repo en dev, Documentos
    # si el instalador puso DATA_DIR). mkdir con parents crea también la raíz, así
    # SQLite encuentra el directorio antes de abrir la BD.
    from app.config import settings
    for d in [settings.uploads_dir, settings.chunks_dir, settings.exports_dir, settings.models_dir]:
        Path(d).mkdir(parents=True, exist_ok=True)


def run_migrations():
    alembic_ini = BASE / "alembic.ini"
    if alembic_ini.exists():
        subprocess.run([sys.executable, "-m", "alembic", "upgrade", "head"], cwd=BASE, check=False)


def open_browser(port: int):
    webbrowser.open(f"http://localhost:{port}/app/")


if __name__ == "__main__":
    # Anclar el directorio de trabajo a la carpeta del programa: así los datos
    # (data/transcriptor.db, audios, exports) viven SIEMPRE dentro de esta carpeta
    # —autocontenido, como un juego— sin importar desde dónde se lance. En dev es
    # el repo; instalado, la carpeta donde se descomprimió.
    os.chdir(BASE)

    # Copiar .env.example → .env si no existe (antes de leer la configuración).
    env_file = BASE / ".env"
    if not env_file.exists():
        example = BASE / ".env.example"
        if example.exists():
            env_file.write_text(example.read_text())
            print("Creado .env desde .env.example — revisa la configuración si es necesario.")

    ensure_dirs()
    run_migrations()

    port = int(os.environ.get("PORT", 8000))
    print(f"\n[OK] Transcriptor iniciado en http://localhost:{port}\n")
    Timer(1.5, open_browser, args=(port,)).start()

    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=port, reload=False)
