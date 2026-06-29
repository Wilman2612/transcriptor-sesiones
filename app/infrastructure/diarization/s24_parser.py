import re
from pathlib import Path

from app.application.ports import S24Segment


# Patrón: "Hablante X  (MM:SS)" o "Hablante X  (HH:MM:SS)"
_HEADER_RE = re.compile(r"Hablante\s+(\S+)\s+\((\d{1,2}:\d{2}(?::\d{2})?)\)")


def _parse_timestamp(ts: str) -> int:
    """Convierte MM:SS o HH:MM:SS a milisegundos."""
    parts = ts.split(":")
    parts = [int(p) for p in parts]
    if len(parts) == 2:
        return (parts[0] * 60 + parts[1]) * 1000
    return (parts[0] * 3600 + parts[1] * 60 + parts[2]) * 1000


def parse_s24_file(path: str) -> list[S24Segment]:
    """
    Parsea la exportación de transcripción del Samsung Galaxy S24.
    Soporta UTF-16 LE (con o sin BOM) y UTF-8.
    """
    raw = Path(path).read_bytes()

    # Detectar codificación
    if raw[:2] in (b'\xff\xfe', b'\xfe\xff'):
        text = raw.decode("utf-16")
    else:
        text = raw.decode("utf-8", errors="replace")

    # Normalizar: eliminar caracteres nulos y espacios extra entre letras (UTF-16 wide)
    # Si hay caracteres nulos intercalados, es UTF-16 mal decodificado
    if "\x00" in text:
        text = raw.decode("utf-16-le", errors="replace").replace("\x00", "")

    lines = text.splitlines()
    segments: list[S24Segment] = []
    current_speaker = ""
    current_start_ms = 0
    current_lines: list[str] = []

    for line in lines:
        line = line.strip()
        if not line:
            continue

        m = _HEADER_RE.search(line)
        if m:
            # Guardar segmento anterior
            if current_speaker and current_lines:
                segments.append(
                    S24Segment(
                        speaker=f"Hablante {current_speaker}",
                        start_ms=current_start_ms,
                        end_ms=current_start_ms,  # end se calcula abajo
                        text=" ".join(current_lines).strip(),
                    )
                )
            current_speaker = m.group(1)
            current_start_ms = _parse_timestamp(m.group(2))
            current_lines = []
        else:
            current_lines.append(line)

    # Último segmento
    if current_speaker and current_lines:
        segments.append(
            S24Segment(
                speaker=f"Hablante {current_speaker}",
                start_ms=current_start_ms,
                end_ms=current_start_ms,
                text=" ".join(current_lines).strip(),
            )
        )

    # Calcular end_ms: cada segmento termina donde empieza el siguiente
    for i, seg in enumerate(segments[:-1]):
        object.__setattr__(seg, "end_ms", segments[i + 1].start_ms) if hasattr(seg, "__dataclass_fields__") else None
        seg.__dict__["end_ms"] = segments[i + 1].start_ms

    if segments:
        last = segments[-1]
        last.__dict__["end_ms"] = last.start_ms + 30_000  # asumir 30s para el último

    return segments
