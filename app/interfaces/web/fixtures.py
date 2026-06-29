"""
Datos fixture para la galería de estados (el homólogo de Storybook).
Reproducen la forma de SegmentView sin tocar la base de datos, para revisar
visualmente cada estado nombrado de forma aislada.

Basados en transcripción real del audio de muestra (large-v3): las palabras
dudosas son nombres propios y términos legales ("Karla", "Medina", "Ad[-hoc]").
"""
from app.interfaces.web.word_view import RenderedWord, SegmentView

_t = 1000  # base ms ficticia


def _seg(seg_id, start_ms, speaker, words):
    """words: lista de (texto, kind). kind ∈ plain|doubt-mid|doubt-high|sealed."""
    rwords = []
    total = left = 0
    for i, (text, kind) in enumerate(words):
        if kind in ("doubt-mid", "doubt-high"):
            total += 1
            left += 1
        elif kind == "sealed":
            total += 1
        rwords.append(RenderedWord(text=text, kind=kind, idx=i,
                                   start_ms=start_ms + i * 400, end_ms=start_ms + i * 400 + 350))
    return SegmentView(id=seg_id, start_ms=start_ms, speaker=speaker, rwords=rwords,
                       total_doubts=total, doubts_left=left,
                       plain_text=" ".join(t for t, _ in words))


def _p(*texts):
    return [(t, "plain") for t in texts]


# ── happy: intervenciones con dudas reales sin resolver ──────────────────────
def happy_segments():
    return [
        _seg(1, 0, "Hablante 1",
             _p("Por", "lo", "cual,", "voy", "a", "dar", "pase", "a", "la", "licenciada")
             + [("Karla", "doubt-mid")]),
        _seg(2, 9000, "Hablante 2",
             _p("Buenas", "tardes,", "señor", "alcalde,", "miembros", "del", "consejo.")),
        _seg(3, 59000, "Hablante 2",
             _p("Se", "me", "designa", "excepcionalmente", "a", "mi", "persona,", "Carla")
             + [("Medina", "doubt-high")]
             + _p("Rojas,", "como", "Secretaria")
             + [("Ad", "doubt-high")]
             + _p("hoc", "de", "la", "presente", "sesión.")),
    ]


def happy_counts():
    segs = happy_segments()
    return sum(s.total_doubts for s in segs), sum(s.doubts_left for s in segs)


# ── all-resolved: las mismas dudas, ya selladas ──────────────────────────────
def resolved_segments():
    return [
        _seg(1, 0, "Hablante 1",
             _p("Por", "lo", "cual,", "voy", "a", "dar", "pase", "a", "la", "licenciada")
             + [("Carla", "sealed")]),
        _seg(3, 59000, "Hablante 2",
             _p("Se", "me", "designa", "excepcionalmente", "a", "mi", "persona,", "Carla")
             + [("Medina", "sealed")]
             + _p("Rojas,", "como", "Secretaria")
             + [("Ad", "sealed")]
             + _p("hoc", "de", "la", "presente", "sesión.")),
    ]


# ── empty-no-doubts: transcripción de alta confianza, nada que revisar ───────
def clean_segments():
    return [
        _seg(1, 0, "Hablante 1", _p("Se", "abre", "la", "sesión", "ordinaria", "del", "consejo.")),
        _seg(2, 5000, "Hablante 2", _p("Damos", "lectura", "al", "acta", "de", "la", "sesión", "anterior.")),
    ]
