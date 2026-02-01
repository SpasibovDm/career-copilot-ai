from __future__ import annotations

from datetime import datetime
import hashlib
import logging
from typing import Any

import feedparser
import httpx
from bs4 import BeautifulSoup
from sqlalchemy.orm import Session

from app.models.models import Vacancy, VacancyImportRun, VacancySource, VacancySourceConfig, VacancySourceType

logger = logging.getLogger(__name__)


def _normalize_key(*parts: str | None) -> str:
    combined = "|".join(part.strip().lower() for part in parts if part)
    return hashlib.sha256(combined.encode("utf-8")).hexdigest()


def _get_text(element, selector: str | None) -> str | None:
    if not selector or element is None:
        return None
    found = element.select_one(selector)
    return found.get_text(strip=True) if found else None


def _get_attr(element, selector: str | None, attr: str | None) -> str | None:
    if not selector or not attr or element is None:
        return None
    found = element.select_one(selector)
    if not found:
        return None
    return found.get(attr)


def _ensure_run(db: Session, source: VacancySourceConfig) -> VacancyImportRun:
    run = VacancyImportRun(source_id=source.id, status="running")
    db.add(run)
    db.commit()
    db.refresh(run)
    return run


def _finalize_run(db: Session, run: VacancyImportRun, status: str, error: str | None = None) -> None:
    run.finished_at = datetime.utcnow()
    run.status = status
    run.error = error
    db.commit()


def _dedup_lookup(db: Session, source: VacancySourceConfig, external_id: str | None, title: str, location: str | None, url: str | None, company: str | None) -> Vacancy | None:
    if external_id:
        return (
            db.query(Vacancy)
            .filter(Vacancy.source_id == source.id, Vacancy.external_id == external_id)
            .first()
        )
    normalized = _normalize_key(company, title, location or "", url or "")
    return db.query(Vacancy).filter(Vacancy.external_id == normalized).first()


def ingest_source(db: Session, source: VacancySourceConfig) -> VacancyImportRun:
    run = _ensure_run(db, source)
    inserted = 0
    updated = 0
    try:
        if source.type == VacancySourceType.rss:
            inserted, updated = _ingest_rss(db, source)
        elif source.type == VacancySourceType.html:
            inserted, updated = _ingest_html(db, source)
        elif source.type == VacancySourceType.csv_url:
            inserted, updated = _ingest_csv_url(db, source)
        else:
            raise ValueError("Unsupported source type")
        run.inserted_count = inserted
        run.updated_count = updated
        _finalize_run(db, run, "success")
    except Exception as exc:  # noqa: BLE001
        logger.exception("Vacancy ingestion failed for %s", source.id)
        _finalize_run(db, run, "failed", str(exc))
    return run


def _ingest_rss(db: Session, source: VacancySourceConfig) -> tuple[int, int]:
    if not source.url:
        raise ValueError("RSS source URL missing")
    feed = feedparser.parse(source.url)
    inserted = 0
    updated = 0
    for entry in feed.entries:
        title = entry.get("title", "Untitled")
        url = entry.get("link")
        external_id = entry.get("id") or url
        description = entry.get("summary") or entry.get("description")
        company = entry.get("author")
        location = entry.get("location")
        vacancy = _dedup_lookup(db, source, external_id, title, location, url, company)
        if vacancy:
            vacancy.title = title
            vacancy.url = url
            vacancy.description = description
            vacancy.company = company
            vacancy.location = location
            updated += 1
        else:
            if not external_id:
                external_id = _normalize_key(company, title, location or "", url or "")
            vacancy = Vacancy(
                source_id=source.id,
                external_id=external_id,
                title=title,
                company=company,
                location=location,
                description=description,
                url=url,
                source=VacancySource.rss,
            )
            db.add(vacancy)
            inserted += 1
    db.commit()
    return inserted, updated


def _ingest_html(db: Session, source: VacancySourceConfig) -> tuple[int, int]:
    if not source.url:
        raise ValueError("HTML source URL missing")
    response = httpx.get(source.url, timeout=30, follow_redirects=True)
    response.raise_for_status()
    soup = BeautifulSoup(response.text, "html.parser")
    config: dict[str, Any] = source.config or {}
    list_selector = config.get("list_selector", "article")
    title_selector = config.get("title_selector", "h2")
    location_selector = config.get("location_selector")
    company_selector = config.get("company_selector")
    url_selector = config.get("url_selector", "a")
    description_selector = config.get("description_selector")
    external_id_attr = config.get("external_id_attr")
    items = soup.select(list_selector)
    inserted = 0
    updated = 0
    for item in items:
        title = _get_text(item, title_selector) or "Untitled"
        location = _get_text(item, location_selector)
        company = _get_text(item, company_selector)
        url = _get_attr(item, url_selector, "href") or source.url
        description = _get_text(item, description_selector)
        external_id = None
        if external_id_attr:
            external_id = item.get(external_id_attr)
        vacancy = _dedup_lookup(db, source, external_id, title, location, url, company)
        if vacancy:
            vacancy.title = title
            vacancy.url = url
            vacancy.description = description
            vacancy.company = company
            vacancy.location = location
            updated += 1
        else:
            if not external_id:
                external_id = _normalize_key(company, title, location or "", url or "")
            vacancy = Vacancy(
                source_id=source.id,
                external_id=external_id,
                title=title,
                company=company,
                location=location,
                description=description,
                url=url,
                source=VacancySource.html,
            )
            db.add(vacancy)
            inserted += 1
    db.commit()
    return inserted, updated


def _ingest_csv_url(db: Session, source: VacancySourceConfig) -> tuple[int, int]:
    if not source.url:
        raise ValueError("CSV URL missing")
    response = httpx.get(source.url, timeout=30, follow_redirects=True)
    response.raise_for_status()
    lines = response.text.splitlines()
    if not lines:
        return 0, 0
    headers = [h.strip().lower() for h in lines[0].split(",")]
    inserted = 0
    updated = 0
    for line in lines[1:]:
        values = [v.strip() for v in line.split(",")]
        data = dict(zip(headers, values, strict=False))
        title = data.get("title") or "Untitled"
        url = data.get("url")
        location = data.get("location")
        company = data.get("company")
        external_id = data.get("external_id") or url
        vacancy = _dedup_lookup(db, source, external_id, title, location, url, company)
        if vacancy:
            vacancy.title = title
            vacancy.url = url
            vacancy.description = data.get("description")
            vacancy.company = company
            vacancy.location = location
            updated += 1
        else:
            if not external_id:
                external_id = _normalize_key(company, title, location or "", url or "")
            vacancy = Vacancy(
                source_id=source.id,
                external_id=external_id,
                title=title,
                company=company,
                location=location,
                description=data.get("description"),
                url=url,
                source=VacancySource.csv_url,
            )
            db.add(vacancy)
            inserted += 1
    db.commit()
    return inserted, updated
