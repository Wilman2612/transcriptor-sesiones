import subprocess
from pathlib import Path

import noisereduce as nr
import numpy as np
import soundfile as sf

from app.application.ports import AudioProcessorPort


class FfmpegNoisereduceProcessor(AudioProcessorPort):
    """Convierte a WAV mono 16kHz, normaliza y reduce ruido."""

    def preprocess(self, input_path: str, output_path: str) -> str:
        tmp = Path(output_path).with_suffix(".tmp.wav")

        # ffmpeg: mono, 16kHz, normalización de volumen
        subprocess.run(
            [
                "ffmpeg", "-y", "-i", input_path,
                "-ac", "1",
                "-ar", "16000",
                "-af", "loudnorm",
                str(tmp),
            ],
            check=True,
            capture_output=True,
        )

        # reducción de ruido con noisereduce
        data, sr = sf.read(str(tmp))
        reduced = nr.reduce_noise(y=data, sr=sr, prop_decrease=0.75, stationary=False)
        sf.write(output_path, reduced.astype(np.float32), sr)
        tmp.unlink(missing_ok=True)
        return output_path
