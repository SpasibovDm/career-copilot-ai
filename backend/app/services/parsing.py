from pathlib import Path

from docx import Document as DocxDocument
from pdfminer.high_level import extract_text


class ParsingError(Exception):
    pass


def extract_text_from_file(file_path: str) -> tuple[str, dict]:
    path = Path(file_path)
    suffix = path.suffix.lower()
    if suffix == ".pdf":
        text = extract_text(file_path)
        if not text or not text.strip():
            raise ParsingError("OCR_TODO")
        return text, {"pages": text.count("\f") + 1}
    if suffix == ".docx":
        doc = DocxDocument(file_path)
        text = "\n".join([p.text for p in doc.paragraphs])
        return text, {"paragraphs": len(doc.paragraphs)}
    raise ParsingError("UNSUPPORTED_FORMAT")
