from io import BytesIO
from minio import Minio
from minio.error import S3Error

from app.config import get_settings


settings = get_settings()
client = Minio(
    settings.minio_endpoint,
    access_key=settings.minio_access_key,
    secret_key=settings.minio_secret_key,
    secure=settings.minio_secure,
)


def ensure_bucket():
    try:
        if not client.bucket_exists(settings.minio_bucket):
            client.make_bucket(settings.minio_bucket)
    except S3Error:
        pass


def upload_file(key: str, content: bytes, content_type: str) -> None:
    ensure_bucket()
    client.put_object(
        settings.minio_bucket,
        key,
        BytesIO(content),
        length=len(content),
        content_type=content_type,
    )


def download_file(key: str) -> bytes:
    ensure_bucket()
    response = client.get_object(settings.minio_bucket, key)
    try:
        return response.read()
    finally:
        response.close()
        response.release_conn()
