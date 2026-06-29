"""
Construye el prompt de sesgo (initial_prompt) de Whisper a partir del glosario.
Whisper limita el initial_prompt a la mitad de su contexto de texto (~224
tokens), así que solo conviene meter lo que de verdad falla (nombres, jerga).
"""
import math

MUNICIPALIDAD = "Municipalidad Distrital de Subtanjalla"
PROMPT_TOKEN_LIMIT = 224


def build_initial_prompt(personas: list[str], terminos: list[str]) -> str:
    base = f"Sesión de concejo de la {MUNICIPALIDAD}."
    if personas:
        base += " Participan: " + ", ".join(personas) + "."
    if terminos:
        base += " Términos: " + ", ".join(terminos) + "."
    return base


def estimate_tokens(text: str) -> int:
    """Aproximación BPE: ~1 token por cada 3 caracteres de palabra (los nombres
    propios largos se parten en varios sub-tokens)."""
    return sum(max(1, math.ceil(len(w) / 3)) for w in text.split())
