from app.application.ports import TranscribedSegment, TranscribedWord, TranscriberPort
from app.config import settings


def _detect_device() -> tuple[str, str]:
    """Retorna (device, compute_type): respeta WHISPER_DEVICE del .env, o autodetecta."""
    forced = settings.whisper_device.lower()
    if forced == "cuda":
        return "cuda", "float16"
    if forced == "cpu":
        return "cpu", "int8"
    # auto: intentar CUDA, caer a CPU
    try:
        import ctranslate2
        supported = ctranslate2.get_supported_compute_types("cuda")
        if "float16" in supported:
            return "cuda", "float16"
    except Exception:
        pass
    return "cpu", "int8"


class FasterWhisperAdapter(TranscriberPort):
    def __init__(self):
        self._model = None

    def _get_model(self):
        if self._model is None:
            from faster_whisper import WhisperModel
            device, compute_type = _detect_device()
            try:
                self._model = WhisperModel(settings.whisper_model, device=device, compute_type=compute_type)
            except Exception as e:
                if device == "cuda":
                    print(f"[WARN] GPU no disponible ({e}), usando CPU...")
                    self._model = WhisperModel(settings.whisper_model, device="cpu", compute_type="int8")
                else:
                    raise
        return self._model

    def transcribe(self, audio_path: str, chunk_offset_ms: int = 0) -> list[TranscribedSegment]:
        model = self._get_model()
        segments_iter, _ = model.transcribe(
            audio_path,
            language=settings.whisper_language,
            word_timestamps=True,
            vad_filter=True,
        )

        result = []
        for seg in segments_iter:
            # avg_logprob en [-inf, 0]; convertir a [0, 1]
            confidence = max(0.0, min(1.0, 1.0 + seg.avg_logprob / 5.0))
            # penalizar si probabilidad de silencio es alta
            if seg.no_speech_prob > 0.6:
                confidence *= 0.3

            # Confianza por palabra: word.probability ya viene en [0, 1]
            words = []
            for w in seg.words or []:
                words.append(
                    TranscribedWord(
                        text=w.word,
                        confidence=max(0.0, min(1.0, w.probability)),
                        start_ms=chunk_offset_ms + int(w.start * 1000),
                        end_ms=chunk_offset_ms + int(w.end * 1000),
                    )
                )

            result.append(
                TranscribedSegment(
                    start_ms=chunk_offset_ms + int(seg.start * 1000),
                    end_ms=chunk_offset_ms + int(seg.end * 1000),
                    text=seg.text.strip(),
                    confidence=confidence,
                    words=words,
                )
            )
        return result
