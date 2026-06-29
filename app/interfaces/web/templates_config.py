from pathlib import Path

from fastapi.templating import Jinja2Templates

_templates_dir = Path(__file__).parent / "templates"
templates = Jinja2Templates(directory=str(_templates_dir))


def ms_to_str(ms: int) -> str:
    total_s = ms // 1000
    h, rem = divmod(total_s, 3600)
    m, s = divmod(rem, 60)
    if h:
        return f"{h:02d}:{m:02d}:{s:02d}"
    return f"{m:02d}:{s:02d}"


templates.env.filters["ms_to_str"] = ms_to_str
templates.env.filters["pct"] = lambda v, total: round((v / total) * 100) if total else 0
