from __future__ import annotations

from datetime import datetime, timezone
import logging

from apscheduler.schedulers.background import BackgroundScheduler
from redis import Redis
from rq import Queue, Retry
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.database import SessionLocal
from app.models.models import Notification, NotificationType, Reminder, ReminderStatus, VacancySourceConfig
from app.services.ingestion import ingest_source
from app.workers import tasks

logger = logging.getLogger(__name__)
settings = get_settings()

scheduler: BackgroundScheduler | None = None


def _redis_client() -> Redis:
    return Redis.from_url(settings.redis_url)


def record_scheduler_run(label: str) -> None:
    redis_conn = _redis_client()
    redis_conn.set(f"scheduler:last_run:{label}", datetime.now(timezone.utc).isoformat())
    redis_conn.set("scheduler:last_run", datetime.now(timezone.utc).isoformat())


def run_vacancy_ingestion() -> None:
    db: Session = SessionLocal()
    try:
        sources = db.query(VacancySourceConfig).filter(VacancySourceConfig.is_enabled.is_(True)).all()
        for source in sources:
            ingest_source(db, source)
        record_scheduler_run("vacancy_ingestion")
    finally:
        db.close()


def run_match_recompute() -> None:
    redis_conn = _redis_client()
    queue = Queue("default", connection=redis_conn)
    queue.enqueue(tasks.compute_matches_for_all, retry=Retry(max=3, interval=[30, 60, 120]))
    record_scheduler_run("match_recompute")


def run_reminder_notifications() -> None:
    db: Session = SessionLocal()
    try:
        now = datetime.now(timezone.utc)
        reminders = (
            db.query(Reminder)
            .filter(Reminder.status == ReminderStatus.pending, Reminder.due_at <= now)
            .all()
        )
        for reminder in reminders:
            existing = (
                db.query(Notification)
                .filter(
                    Notification.user_id == reminder.user_id,
                    Notification.type == NotificationType.reminder_due,
                    Notification.title == "Reminder due",
                    Notification.body == reminder.title,
                    Notification.created_at >= reminder.due_at,
                )
                .first()
            )
            if existing:
                continue
            db.add(
                Notification(
                    user_id=reminder.user_id,
                    type=NotificationType.reminder_due,
                    title="Reminder due",
                    body=reminder.title,
                )
            )
        db.commit()
        record_scheduler_run("reminder_notifications")
    finally:
        db.close()


def start_scheduler() -> None:
    global scheduler
    if scheduler:
        return
    scheduler = BackgroundScheduler(timezone="UTC")
    scheduler.add_job(run_vacancy_ingestion, "cron", hour=2, minute=0, id="vacancy_ingestion")
    scheduler.add_job(run_match_recompute, "cron", hour=3, minute=0, id="match_recompute")
    scheduler.add_job(run_reminder_notifications, "interval", minutes=30, id="reminder_notifications")
    scheduler.start()
    logger.info("Scheduler started")
