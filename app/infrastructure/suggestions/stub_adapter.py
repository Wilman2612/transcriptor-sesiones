from typing import Optional

from app.application.ports import SuggestionPort


class StubSuggestionAdapter(SuggestionPort):
    """Placeholder para la Fase 6: siempre retorna None (sin sugerencias)."""

    def suggest(self, text: str, session_id: int) -> Optional[str]:
        return None
