import os
import tempfile
from io import BytesIO

import pytest
from fastapi.testclient import TestClient

os.environ["DATABASE_URL"] = "sqlite:///./test.db"
os.environ["USE_LOCAL_STORAGE"] = "true"

from app.core.database import Base, SessionLocal, engine  # noqa: E402
from app.main import app  # noqa: E402
from app.models.models import GeneratedPackage  # noqa: E402
from app.workers import tasks  # noqa: E402


class DummyQueue:
    def enqueue(self, func, *args, **kwargs):
        func(*args, **kwargs)


class DummyRedis:
    @staticmethod
    def from_url(_url):
        return None


@pytest.fixture(autouse=True)
def setup_db(monkeypatch):
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    monkeypatch.setattr(tasks, "parse_document", lambda *_args, **_kwargs: None)
    monkeypatch.setattr("app.api.me.Queue", lambda *args, **kwargs: DummyQueue())
    monkeypatch.setattr("app.api.matching.Queue", lambda *args, **kwargs: DummyQueue())
    monkeypatch.setattr("app.api.generation.Queue", lambda *args, **kwargs: DummyQueue())
    monkeypatch.setattr("app.api.me.Redis", DummyRedis)
    monkeypatch.setattr("app.api.matching.Redis", DummyRedis)
    monkeypatch.setattr("app.api.generation.Redis", DummyRedis)
    yield
    Base.metadata.drop_all(bind=engine)


def test_end_to_end_flow():
    client = TestClient(app)

    register = client.post(
        "/auth/register", json={"email": "user@example.com", "password": "password123"}
    )
    assert register.status_code == 200
    token = register.json()["access_token"]

    headers = {"Authorization": f"Bearer {token}"}

    profile = client.put(
        "/me/profile",
        headers=headers,
        json={"full_name": "Test User", "desired_roles": ["Engineer"], "languages": {"en": "native"}},
    )
    assert profile.status_code == 200

    csv_data = b"title,location,remote\nBackend Engineer,Berlin,true\n"
    resp = client.post(
        "/vacancies/import/csv",
        headers=headers,
        files={"file": ("vacancies.csv", csv_data, "text/csv")},
    )
    assert resp.status_code == 200
    vacancy_id = resp.json()[0]["id"]

    with tempfile.NamedTemporaryFile(suffix=".docx") as tmp:
        tmp.write(
            b"PK\x03\x04\x14\x00\x00\x00\x08\x00\x00\x00!\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x13\x00\x00\x00[Content_Types].xml"
        )
        tmp.flush()
        doc_resp = client.post(
            "/me/documents/upload",
            headers=headers,
            files={"file": ("resume.docx", BytesIO(tmp.read()), "application/vnd.openxmlformats-officedocument.wordprocessingml.document")},
            data={"kind": "resume"},
        )
    assert doc_resp.status_code == 200

    match_resp = client.post("/matching/run", headers=headers)
    assert match_resp.status_code == 200

    matches = client.get("/me/matches", headers=headers)
    assert matches.status_code == 200
    assert len(matches.json()) >= 1

    gen_resp = client.post(f"/generation/{vacancy_id}", headers=headers)
    assert gen_resp.status_code == 200

    db = SessionLocal()
    try:
        package = db.query(GeneratedPackage).first()
        assert package is not None
        get_package = client.get(f"/me/generated/{package.id}", headers=headers)
        assert get_package.status_code == 200
    finally:
        db.close()
