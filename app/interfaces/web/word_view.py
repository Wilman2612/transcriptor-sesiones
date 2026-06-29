"""
Capa de presentación: convierte los segmentos del dominio en una vista lista
para la plantilla, clasificando cada palabra según su confianza.

Una "duda" es una palabra con confianza < mid que la usuaria aún no resolvió.
- conf < low        -> 'doubt-high' (muy dudosa, rojo)
- low <= conf < mid -> 'doubt-mid'  (dudosa, ámbar)
- resuelta          -> 'sealed'     (sellada, teal)
- el resto          -> 'plain'
"""
from dataclasses import dataclass

from app.config import settings

# Palabras funcionales del español: whisper les asigna baja probabilidad por
# alineación temporal, pero casi siempre son correctas. No las marcamos como
# duda salvo que la confianza sea catastrófica (word_confidence_floor).
_FUNCTION_WORDS = {
    "el", "la", "los", "las", "un", "una", "unos", "unas", "de", "del", "al", "a",
    "y", "o", "u", "e", "en", "que", "se", "su", "sus", "lo", "le", "les", "me",
    "te", "nos", "con", "por", "para", "es", "mi", "tu", "este", "esta", "esto",
    "ese", "esa", "eso", "como", "mas", "más", "ya", "no", "si", "sí", "ha", "he",
    "han", "del", "se", "ni", "son", "fue", "muy", "sus", "the",
}


def is_eligible(text: str, confidence: float, floor: float) -> bool:
    """¿Esta palabra puede ser una duda a ALGÚN umbral? Las palabras funcionales
    cortas no (son ruido de alineación), salvo confianza catastrófica.
    El umbral concreto lo decide el cliente con el slider; esto es independiente."""
    if confidence < floor:
        return True
    w = text.strip().lower().strip(".,;:!?¿¡()\"'»«—-")
    return len(w) > 2 and w not in _FUNCTION_WORDS


def is_doubt(text: str, confidence: float, low: float, mid: float, floor: float) -> bool:
    """Una palabra es 'duda' a este umbral si su confianza es baja Y es elegible."""
    return confidence < mid and is_eligible(text, confidence, floor)


@dataclass
class RenderedWord:
    text: str
    kind: str       # plain | doubt-mid | doubt-high | sealed  (para la UI HTML)
    idx: int
    start_ms: int
    end_ms: int
    confidence: float = 1.0   # cruda 0-1 (para el slider en el cliente React)
    eligible: bool = False    # candidata a duda a algún umbral
    sealed: bool = False      # ya confirmada/corregida


@dataclass
class SegmentView:
    id: int
    start_ms: int
    speaker: str
    rwords: list[RenderedWord]
    total_doubts: int       # dudas originales en el segmento
    doubts_left: int        # dudas aún sin resolver
    plain_text: str         # texto plano reconstruido (fallback / sin palabras)
    override_text: str | None = None  # reescritura libre de la frase, si existe

    @property
    def had_doubts(self) -> bool:
        return self.total_doubts > 0


def classify_segment(seg, low: float = None, mid: float = None) -> SegmentView:
    low = settings.word_confidence_low if low is None else low
    mid = settings.word_confidence_mid if mid is None else mid
    floor = settings.word_confidence_floor

    rwords: list[RenderedWord] = []
    total = 0
    left = 0

    if seg.words:
        for i, w in enumerate(seg.words):
            text = w.text.strip()
            eligible = is_eligible(text, w.confidence, floor)
            if eligible and w.confidence < mid:
                total += 1
                if w.resolved:
                    kind = "sealed"
                else:
                    left += 1
                    kind = "doubt-high" if w.confidence < low else "doubt-mid"
            else:
                kind = "sealed" if w.resolved else "plain"
            rwords.append(
                RenderedWord(
                    text=text, kind=kind, idx=i, start_ms=w.start_ms, end_ms=w.end_ms,
                    confidence=round(w.confidence, 4), eligible=eligible, sealed=w.resolved,
                )
            )
        plain = " ".join(r.text for r in rwords)
    else:
        # Sin datos de palabra (p. ej. backend OpenAI): mostramos el segmento entero
        plain = seg.original_text
        rwords = [RenderedWord(text=seg.original_text, kind="plain", idx=0,
                               start_ms=seg.start_ms, end_ms=seg.end_ms)]

    return SegmentView(
        id=seg.id,
        start_ms=seg.start_ms,
        speaker=seg.speaker,
        rwords=rwords,
        total_doubts=total,
        doubts_left=left,
        plain_text=plain,
        override_text=getattr(seg, "override_text", None),
    )
