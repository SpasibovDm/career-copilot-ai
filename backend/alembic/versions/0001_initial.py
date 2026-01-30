"""initial schema

Revision ID: 0001_initial
Revises: 
Create Date: 2024-01-01 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision = "0001_initial"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("hashed_password", sa.String(length=255), nullable=False),
    )
    op.create_index("ix_users_email", "users", ["email"], unique=True)

    op.create_table(
        "profiles",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("full_name", sa.String(length=255), nullable=True),
        sa.Column("desired_roles", postgresql.JSONB, nullable=True),
        sa.Column("languages", postgresql.JSONB, nullable=True),
        sa.Column("salary_min", sa.Float, nullable=True),
        sa.Column("salary_max", sa.Float, nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.UniqueConstraint("user_id", name="uq_profile_user"),
    )

    op.create_table(
        "documents",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("kind", sa.Enum("resume", "cover_letter", "other", name="documentkind"), nullable=False),
        sa.Column("s3_key", sa.String(length=512), nullable=False),
        sa.Column("text_extracted", sa.Text, nullable=True),
        sa.Column("extracted_json", postgresql.JSONB, nullable=True),
        sa.Column("status", sa.Enum("pending", "processed", "failed", name="documentstatus"), nullable=False),
        sa.Column("failure_reason", sa.String(length=255), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
    )

    op.create_table(
        "vacancies",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("location", sa.String(length=255), nullable=True),
        sa.Column("remote", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("salary_min", sa.Float, nullable=True),
        sa.Column("salary_max", sa.Float, nullable=True),
        sa.Column("currency", sa.String(length=10), nullable=True),
        sa.Column("description", sa.Text, nullable=True),
        sa.Column("source", sa.Enum("manual", "csv", "api", name="vacancysource"), nullable=False),
        sa.Column("url", sa.String(length=512), nullable=True),
    )

    op.create_table(
        "matches",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("vacancy_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("score", sa.Float, nullable=False),
        sa.Column("explanation", sa.Text, nullable=True),
        sa.Column("missing_skills", postgresql.JSONB, nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["vacancy_id"], ["vacancies.id"]),
        sa.UniqueConstraint("user_id", "vacancy_id", name="uq_match_user_vacancy"),
    )

    op.create_table(
        "generated_packages",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("vacancy_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("cv_text", sa.Text, nullable=False),
        sa.Column("cover_letter_text", sa.Text, nullable=False),
        sa.Column("hr_message_text", sa.Text, nullable=False),
        sa.Column("export_pdf_s3_key", sa.String(length=512), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["vacancy_id"], ["vacancies.id"]),
    )


def downgrade() -> None:
    op.drop_table("generated_packages")
    op.drop_table("matches")
    op.drop_table("vacancies")
    op.drop_table("documents")
    op.drop_table("profiles")
    op.drop_index("ix_users_email", table_name="users")
    op.drop_table("users")
    op.execute("DROP TYPE IF EXISTS documentkind")
    op.execute("DROP TYPE IF EXISTS documentstatus")
    op.execute("DROP TYPE IF EXISTS vacancysource")
