from app.application.ports import TranscriberPort
from app.config import settings


def get_transcriber() -> TranscriberPort:
    if settings.whisper_backend == "openai":
        from app.infrastructure.transcription.openai_adapter import OpenAIWhisperAdapter
        return OpenAIWhisperAdapter()
    from app.infrastructure.transcription.faster_whisper_adapter import FasterWhisperAdapter
    return FasterWhisperAdapter()
