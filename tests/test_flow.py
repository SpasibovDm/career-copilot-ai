import os
import importlib
from fastapi.testclient import TestClient
from sqlalchemy.orm import sessionmaker


def setup_module():
    os.environ["DATABASE_URL"] = "sqlite:///./test.db"
    os.environ["JWT_SECRET"] = "test-secret"


def test_end_to_end_flow(tmp_path):
    os.environ["DATABASE_URL"] = f"sqlite:///{tmp_path}/test.db"
    os.environ["JWT_SECRET"] = "test-secret"

    import app.database as database
    importlib.reload(database)
    import app.main as main
    importlib.reload(main)

    database.Base.metadata.create_all(bind=database.engine)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=database.engine)

    def override_get_db():
        db = SessionLocal()
        try:
            yield db
        finally:
            db.close()

    main.app.dependency_overrides[database.get_db] = override_get_db

    client = TestClient(main.app)

    register = client.post("/auth/register", json={"email": "user@example.com", "password": "secret"})
    assert register.status_code == 200

    login = client.post(
        "/auth/login",
        data={"username": "user@example.com", "password": "secret"},
    )
    assert login.status_code == 200
    token = login.json()["access_token"]

    headers = {"Authorization": f"Bearer {token}"}

    profile = client.post(
        "/profiles/me",
        json={
            "full_name": "Ada Lovelace",
            "title": "Data Engineer",
            "summary": "ETL, Python, SQL",
            "skills": "python, sql, airflow",
            "location": "Berlin",
        },
        headers=headers,
    )
    assert profile.status_code == 200

    vacancy = client.post(
        "/vacancies/",
        json={
            "title": "Data Engineer",
            "description": "We need python and SQL skills",
            "location": "Berlin",
            "company": "Example GmbH",
        },
        headers=headers,
    )
    assert vacancy.status_code == 200
    vacancy_id = vacancy.json()["id"]

    match = client.post(f"/matches/generate/{vacancy_id}", headers=headers)
    assert match.status_code == 200
    match_id = match.json()["id"]

    package = client.post(f"/generate/{match_id}", headers=headers)
    assert package.status_code == 200
    assert package.json()["language"] in ["de", "en"]
