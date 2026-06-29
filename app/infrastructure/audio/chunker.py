import wave
from pathlib import Path

from app.application.ports import ChunkerPort
from pydub import AudioSegment
from pydub.silence import detect_silence


class SilenceChunker(ChunkerPort):
    """Corta audio en silencio dentro de la ventana [min_seconds, max_seconds]."""

    def __init__(self, min_seconds: int = 600, silence_thresh_db: int = -40, min_silence_ms: int = 1000):
        self.min_seconds = min_seconds
        self.silence_thresh_db = silence_thresh_db
        self.min_silence_ms = min_silence_ms

    def chunk(self, audio_path: str, output_dir: str, max_seconds: int) -> list[dict]:
        output_dir = Path(output_dir)
        output_dir.mkdir(parents=True, exist_ok=True)

        audio = AudioSegment.from_file(audio_path)
        duration_ms = len(audio)
        max_ms = max_seconds * 1000
        min_ms = self.min_seconds * 1000

        # Detectar todos los silencios
        silences = detect_silence(audio, min_silence_len=self.min_silence_ms, silence_thresh=self.silence_thresh_db)

        chunks = []
        start = 0
        chunk_idx = 0

        while start < duration_ms:
            target_end = start + max_ms

            if target_end >= duration_ms:
                # último trozo
                chunk = audio[start:]
                path = str(output_dir / f"chunk_{chunk_idx:03d}.wav")
                chunk.export(path, format="wav")
                chunks.append({"path": path, "start_ms": start, "end_ms": duration_ms})
                break

            # Buscar el silencio más largo dentro de la ventana [min_ms, max_ms]
            cut_point = self._find_best_cut(silences, start, min_ms, max_ms)
            if cut_point is None:
                cut_point = target_end  # corte duro si no hay silencio

            chunk = audio[start:cut_point]
            path = str(output_dir / f"chunk_{chunk_idx:03d}.wav")
            chunk.export(path, format="wav")
            chunks.append({"path": path, "start_ms": start, "end_ms": cut_point})

            start = cut_point
            chunk_idx += 1

        return chunks

    def _find_best_cut(self, silences: list, start: int, min_ms: int, max_ms: int) -> int | None:
        window_start = start + min_ms
        window_end = start + max_ms

        candidates = [
            (s_start + (s_end - s_start) // 2, s_end - s_start)
            for s_start, s_end in silences
            if window_start <= s_start <= window_end
        ]

        if not candidates:
            return None

        # Preferir el silencio más largo dentro de la ventana
        best_mid, _ = max(candidates, key=lambda x: x[1])
        return best_mid
