import os
import uuid
from pathlib import Path
from typing import BinaryIO

import boto3
from botocore.client import Config

from app.core.config import get_settings

settings = get_settings()

LOCAL_STORAGE_ROOT = Path(os.getenv("LOCAL_STORAGE_ROOT", "/tmp/uploads"))


def _use_local_storage() -> bool:
    return os.getenv("USE_LOCAL_STORAGE", "false").lower() == "true"


def upload_file(file_obj: BinaryIO, filename: str) -> str:
    key = f"uploads/{uuid.uuid4()}-{filename}"
    if _use_local_storage():
        LOCAL_STORAGE_ROOT.mkdir(parents=True, exist_ok=True)
        target = LOCAL_STORAGE_ROOT / key
        target.parent.mkdir(parents=True, exist_ok=True)
        with target.open("wb") as f:
            f.write(file_obj.read())
        return str(target)

    client = boto3.client(
        "s3",
        endpoint_url=settings.s3_endpoint_url,
        aws_access_key_id=settings.s3_access_key,
        aws_secret_access_key=settings.s3_secret_key,
        region_name=settings.s3_region,
        config=Config(signature_version="s3v4"),
    )
    client.upload_fileobj(file_obj, settings.s3_bucket, key)
    return key
