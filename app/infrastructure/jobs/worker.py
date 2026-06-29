"""
Worker en hilo de fondo que procesa jobs de la tabla `jobs`.
Se integra al ciclo de vida de FastAPI (lifespan).
"""
import threading
import time
import traceback
from typing import Callable

_handlers: dict[str, Callable] = {}
_lock = threading.Lock()
_queue: list[int] = []  # job IDs


def register_handler(job_type: str, fn: Callable) -> None:
    _handlers[job_type] = fn


def enqueue(job_id: int) -> None:
    with _lock:
        _queue.append(job_id)


def _worker_loop(get_db_fn: Callable, job_repo_cls, session_repo_cls) -> None:
    while True:
        job_id = None
        with _lock:
            if _queue:
                job_id = _queue.pop(0)

        if job_id is not None:
            db = get_db_fn()
            try:
                job_repo = job_repo_cls(db)
                job = job_repo.get(job_id)
                if job and job.type.value in _handlers:
                    _handlers[job.type.value](job_id, db)
            except Exception:
                traceback.print_exc()
            finally:
                db.close()

        time.sleep(0.5)


def start_worker(get_db_fn: Callable, job_repo_cls, session_repo_cls) -> threading.Thread:
    t = threading.Thread(
        target=_worker_loop,
        args=(get_db_fn, job_repo_cls, session_repo_cls),
        daemon=True,
        name="transcriptor-worker",
    )
    t.start()
    return t
