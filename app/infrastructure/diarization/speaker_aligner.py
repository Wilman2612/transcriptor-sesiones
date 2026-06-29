from app.application.ports import S24Segment, SpeakerAlignerPort, TranscribedSegment
from app.infrastructure.diarization.s24_parser import parse_s24_file


class S24SpeakerAligner(SpeakerAlignerPort):
    def parse_s24(self, transcript_path: str) -> list[S24Segment]:
        return parse_s24_file(transcript_path)

    def align(
        self,
        whisper_segments: list[TranscribedSegment],
        s24_segments: list[S24Segment],
    ) -> list[dict]:
        """
        A cada segmento de Whisper le asigna el hablante del S24 con mayor
        solapamiento temporal. Si no hay solapamiento, usa "Desconocido".
        """
        result = []
        for ws in whisper_segments:
            best_speaker = "Desconocido"
            best_overlap = 0

            for s24 in s24_segments:
                overlap_start = max(ws.start_ms, s24.start_ms)
                overlap_end = min(ws.end_ms, s24.end_ms)
                overlap = max(0, overlap_end - overlap_start)
                if overlap > best_overlap:
                    best_overlap = overlap
                    best_speaker = s24.speaker

            result.append(
                {
                    "start_ms": ws.start_ms,
                    "end_ms": ws.end_ms,
                    "text": ws.text,
                    "confidence": ws.confidence,
                    "speaker": best_speaker,
                    "words": ws.words,
                }
            )
        return result
