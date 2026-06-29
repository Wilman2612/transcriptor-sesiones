from pathlib import Path

from app.application.ports import TranscribedSegment, TranscriberPort
from app.config import settings


class OpenAIWhisperAdapter(TranscriberPort):
    def __init__(self):
        import openai
        self.client = openai.OpenAI(api_key=settings.openai_api_key)

    def transcribe(
        self, audio_path: str, chunk_offset_ms: int = 0, initial_prompt: str = ""
    ) -> list[TranscribedSegment]:
        with open(audio_path, "rb") as f:
            response = self.client.audio.transcriptions.create(
                model="whisper-1",
                file=f,
                language=settings.whisper_language,
                response_format="verbose_json",
                timestamp_granularities=["segment"],
                prompt=initial_prompt or "",
            )

        result = []
        for seg in response.segments:
            # OpenAI expone avg_logprob y no_speech_prob por segmento
            avg_logprob = getattr(seg, "avg_logprob", -1.0)
            no_speech_prob = getattr(seg, "no_speech_prob", 0.0)

            confidence = max(0.0, min(1.0, 1.0 + avg_logprob / 5.0))
            if no_speech_prob > 0.6:
                confidence *= 0.3

            result.append(
                TranscribedSegment(
                    start_ms=chunk_offset_ms + int(seg.start * 1000),
                    end_ms=chunk_offset_ms + int(seg.end * 1000),
                    text=seg.text.strip(),
                    confidence=confidence,
                )
            )
        return result
