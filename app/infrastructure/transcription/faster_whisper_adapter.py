import os
import subprocess
import tempfile

from app.application.ports import TranscribedSegment, TranscribedWord, TranscriberPort
from app.config import settings

# Parámetros de decodificación anti-alucinación. El default de faster-whisper
# escala la temperatura hasta 1.0 cuando un segmento "falla", y a esa temperatura
# sobre audio confuso inventa texto fluido (las fugas al inglés del 5:23).
# Además condition_on_previous_text arrastra esa alucinación hacia adelante.
DECODE_PARAMS = dict(
    language=settings.whisper_language,
    word_timestamps=True,
    vad_filter=True,
    condition_on_previous_text=False,           # corta la cascada de alucinación
    temperature=[0.0, 0.2, 0.4],                # techo bajo: si falla, baja confianza, no invento
    compression_ratio_threshold=2.2,            # rechaza texto repetitivo/inventado
    log_prob_threshold=-0.8,                    # rechaza segmentos poco probables
    no_speech_threshold=0.6,
)


def _detect_device() -> tuple[str, str]:
    """Retorna (device, compute_type): respeta WHISPER_DEVICE del .env, o autodetecta."""
    forced = settings.whisper_device.lower()
    if forced == "cuda":
        return "cuda", "float16"
    if forced == "cpu":
        return "cpu", "int8"
    try:
        import ctranslate2
        supported = ctranslate2.get_supported_compute_types("cuda")
        if "float16" in supported:
            return "cuda", "float16"
    except Exception:
        pass
    return "cpu", "int8"


def _word(w, offset_ms: int) -> TranscribedWord:
    return TranscribedWord(
        text=w.word,
        confidence=max(0.0, min(1.0, w.probability)),
        start_ms=offset_ms + int(w.start * 1000),
        end_ms=offset_ms + int(w.end * 1000),
    )


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

    def transcribe(
        self, audio_path: str, chunk_offset_ms: int = 0, initial_prompt: str = ""
    ) -> list[TranscribedSegment]:
        model = self._get_model()
        params = {**DECODE_PARAMS, "initial_prompt": initial_prompt or None}
        segments_iter, _ = model.transcribe(audio_path, **params)

        result = []
        for seg in segments_iter:
            confidence = max(0.0, min(1.0, 1.0 + seg.avg_logprob / 5.0))
            if seg.no_speech_prob > 0.6:
                confidence *= 0.3
            words = [_word(w, chunk_offset_ms) for w in (seg.words or [])]
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

    def transcribe_region(
        self, audio_path: str, start_ms: int, end_ms: int, initial_prompt: str = ""
    ) -> list[TranscribedWord]:
        """Segunda pasada: re-transcribe SOLO el tramo [start_ms, end_ms] en
        aislamiento (resetea el contexto que causó la alucinación) y devuelve
        las palabras con tiempos absolutos de la sesión."""
        model = self._get_model()
        tmp = tempfile.NamedTemporaryFile(suffix=".wav", delete=False)
        tmp.close()
        try:
            subprocess.run(
                ["ffmpeg", "-y", "-ss", f"{start_ms/1000:.3f}", "-t", f"{(end_ms-start_ms)/1000:.3f}",
                 "-i", audio_path, "-ar", "16000", "-ac", "1", tmp.name],
                capture_output=True, check=True,
            )
            params = {**DECODE_PARAMS, "initial_prompt": initial_prompt or None}
            segments_iter, _ = model.transcribe(tmp.name, **params)
            words: list[TranscribedWord] = []
            for seg in segments_iter:
                words.extend(_word(w, start_ms) for w in (seg.words or []))
            return words
        finally:
            try:
                os.unlink(tmp.name)
            except OSError:
                pass
