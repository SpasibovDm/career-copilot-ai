from io import BytesIO
from sqlalchemy.orm import Session
from PyPDF2 import PdfReader
from docx import Document as DocxDocument

from app import models
from app.database import SessionLocal
from app.storage import download_file


def parse_document(document_id: int) -> None:
    db: Session = SessionLocal()
    try:
        document = db.query(models.Document).get(document_id)
        if not document:
            return
        content = download_file(document.storage_key)
        parsed_text = ""
        if document.content_type == "application/pdf":
            reader = PdfReader(BytesIO(content))
            parsed_text = "\n".join(page.extract_text() or "" for page in reader.pages)
        elif document.content_type in [
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "application/msword",
        ]:
            doc = DocxDocument(BytesIO(content))
            parsed_text = "\n".join(paragraph.text for paragraph in doc.paragraphs)
        else:
            parsed_text = "Unsupported format"
        document.parsed_text = parsed_text
        document.status = "parsed"
        db.add(document)
        db.commit()
    finally:
        db.close()
