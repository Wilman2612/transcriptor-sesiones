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


def is_doubt(text: str, confidence: float, low: float, mid: float, floor: float) -> bool:
    """Una palabra es 'duda' si su confianza es baja Y vale la pena revisarla.
    Las palabras funcionales cortas con confianza no-catastrófica se omiten:
    son ruido de alineación, no errores reales."""
    if confidence >= mid:
        return False
    if confidence < floor:
        return True  # catastrófica: siempre duda, aunque sea corta
    w = text.strip().lower().strip(".,;:!?¿¡()\"'»«—-")
    if len(w) <= 2 or w in _FUNCTION_WORDS:
        return False
    return True


@dataclass
class RenderedWord:
    text: str
    kind: str       # plain | doubt-mid | doubt-high | sealed
    idx: int
    start_ms: int
    end_ms: int


@dataclass
class SegmentView:
    id: int
    start_ms: int
    speaker: str
    rwords: list[RenderedWord]
    total_doubts: int       # dudas originales en el segmento
    doubts_left: int        # dudas aún sin resolver
    plain_text: str         # texto plano reconstruido (fallback / sin palabras)

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
            if is_doubt(text, w.confidence, low, mid, floor):
                total += 1
                if w.resolved:
                    kind = "sealed"
                else:
                    left += 1
                    kind = "doubt-high" if w.confidence < low else "doubt-mid"
            else:
                kind = "plain"
            rwords.append(
                RenderedWord(text=text, kind=kind, idx=i, start_ms=w.start_ms, end_ms=w.end_ms)
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
    )
