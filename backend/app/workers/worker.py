import os
import threading
from datetime import datetime, timezone

import redis
from rq import Connection, Worker

from app.core.config import get_settings

settings = get_settings()

HEARTBEAT_INTERVAL_SECONDS = 10


def _heartbeat(redis_conn: redis.Redis, stop_event: threading.Event) -> None:
    while not stop_event.is_set():
        redis_conn.set("worker:last_heartbeat", datetime.now(timezone.utc).isoformat())
        stop_event.wait(HEARTBEAT_INTERVAL_SECONDS)


def main():
    redis_conn = redis.from_url(settings.redis_url)
    stop_event = threading.Event()
    heartbeat_thread = threading.Thread(
        target=_heartbeat,
        args=(redis_conn, stop_event),
        name="worker-heartbeat",
        daemon=True,
    )
    heartbeat_thread.start()
    with Connection(redis_conn):
        worker = Worker(["default"])
        try:
            worker.work(with_scheduler=True)
        finally:
            stop_event.set()


if __name__ == "__main__":
    os.environ.setdefault("PYTHONPATH", "/app")
    main()
