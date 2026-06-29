from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    whisper_backend: str = "local"
    whisper_model: str = "medium"
    openai_api_key: str = ""
    confidence_threshold: float = 0.4
    # Resaltado por palabra: < low = muy dudoso (rojo); [low, mid) = dudoso (ambar)
    word_confidence_low: float = 0.55
    word_confidence_mid: float = 0.80
    # Confianza catastrófica: siempre es duda, aunque sea palabra funcional corta.
    word_confidence_floor: float = 0.35
    chunk_max_seconds: int = 780
    port: int = 8000
    whisper_language: str = "es"

    whisper_device: str = "auto"   # auto | cpu | cuda

    # Carpeta raíz de TODOS los datos (BD, audios, chunks, exports).
    #  - Dev: "data" (relativa al repo).
    #  - Instalado: el instalador escribe una ruta absoluta en Documentos, para
    #    que las sesiones corregidas sobrevivan si se vuelve a copiar/extraer el ZIP.
    data_dir: str = "data"

    @property
    def data_path(self) -> Path:
        return Path(self.data_dir)

    @property
    def database_url(self) -> str:
        return f"sqlite:///{(self.data_path / 'transcriptor.db').as_posix()}"

    @property
    def uploads_dir(self) -> str:
        return str(self.data_path / "uploads")

    @property
    def chunks_dir(self) -> str:
        return str(self.data_path / "chunks")

    @property
    def exports_dir(self) -> str:
        return str(self.data_path / "exports")


settings = Settings()
