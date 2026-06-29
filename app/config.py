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
    database_url: str = "sqlite:///./data/transcriptor.db"
    uploads_dir: str = "data/uploads"
    chunks_dir: str = "data/chunks"


settings = Settings()
