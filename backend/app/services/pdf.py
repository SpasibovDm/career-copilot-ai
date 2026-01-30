from io import BytesIO
from typing import Optional

from reportlab.lib import colors
from reportlab.lib.pagesizes import LETTER
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer

from app.models.models import GeneratedPackage, Profile


TEMPLATE_STYLES = {
    "minimal": {
        "title": colors.HexColor("#111827"),
        "accent": colors.HexColor("#4b5563"),
    },
    "modern": {
        "title": colors.HexColor("#0f172a"),
        "accent": colors.HexColor("#2563eb"),
    },
    "classic": {
        "title": colors.HexColor("#1f2937"),
        "accent": colors.HexColor("#b45309"),
    },
}


def _paragraphs_from_text(text: str, style: ParagraphStyle) -> list[Paragraph]:
    lines = [line.strip() for line in text.splitlines()]
    return [Paragraph(line, style) for line in lines if line]


def render_package_pdf(
    package: GeneratedPackage, template: str = "modern", profile: Optional[Profile] = None
) -> bytes:
    palette = TEMPLATE_STYLES.get(template, TEMPLATE_STYLES["modern"])
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=LETTER,
        leftMargin=0.9 * inch,
        rightMargin=0.9 * inch,
        topMargin=0.8 * inch,
        bottomMargin=0.8 * inch,
        title="Career Copilot Package",
    )
    styles = getSampleStyleSheet()
    styles.add(
        ParagraphStyle(
            name="PackageTitle",
            fontSize=20,
            leading=26,
            textColor=palette["title"],
            spaceAfter=12,
        )
    )
    styles.add(
        ParagraphStyle(
            name="SectionHeader",
            fontSize=13,
            leading=18,
            textColor=palette["accent"],
            spaceBefore=12,
            spaceAfter=6,
        )
    )
    styles.add(
        ParagraphStyle(
            name="BodyText",
            parent=styles["BodyText"],
            fontSize=10.5,
            leading=16,
            textColor=colors.HexColor("#111827"),
        )
    )

    story: list[Paragraph | Spacer] = []
    story.append(Paragraph("Career Copilot Package", styles["PackageTitle"]))
    if profile and profile.full_name:
        summary = profile.full_name
        if profile.location:
            summary = f"{summary} · {profile.location}"
        story.append(Paragraph(summary, styles["BodyText"]))
        story.append(Spacer(1, 6))

    story.append(Paragraph("Tailored CV", styles["SectionHeader"]))
    story.extend(_paragraphs_from_text(package.cv_text, styles["BodyText"]))

    story.append(Spacer(1, 12))
    story.append(Paragraph("Cover Letter", styles["SectionHeader"]))
    story.extend(_paragraphs_from_text(package.cover_letter_text, styles["BodyText"]))

    story.append(Spacer(1, 12))
    story.append(Paragraph("HR Message", styles["SectionHeader"]))
    story.extend(_paragraphs_from_text(package.hr_message_text, styles["BodyText"]))

    doc.build(story)
    buffer.seek(0)
    return buffer.read()
