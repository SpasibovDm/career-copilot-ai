import os

import redis
from rq import Connection, Worker

from app.core.config import get_settings

settings = get_settings()


def main():
    redis_conn = redis.from_url(settings.redis_url)
    with Connection(redis_conn):
        worker = Worker(["default"])
        worker.work(with_scheduler=True)


if __name__ == "__main__":
    os.environ.setdefault("PYTHONPATH", "/app")
    main()
