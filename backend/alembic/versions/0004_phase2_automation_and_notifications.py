"""phase2 automation and notifications

Revision ID: 0004_phase2
Revises: 0003_add_admin_fields
Create Date: 2024-10-11 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "0004_phase2"
down_revision = "0003_add_admin_fields"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("ALTER TYPE vacancysource ADD VALUE IF NOT EXISTS 'rss'")
    op.execute("ALTER TYPE vacancysource ADD VALUE IF NOT EXISTS 'html'")
    op.execute("ALTER TYPE vacancysource ADD VALUE IF NOT EXISTS 'csv_url'")

    op.create_table(
        "vacancy_sources",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "type",
            sa.Enum("rss", "html", "csv_url", "manual", name="vacancysourcetype"),
            nullable=False,
        ),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("url", sa.String(length=1024), nullable=True),
        sa.Column("config", postgresql.JSONB, nullable=True),
        sa.Column("is_enabled", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    op.add_column("profiles", sa.Column("skills", postgresql.JSONB, nullable=True))

    op.add_column("vacancies", sa.Column("source_id", postgresql.UUID(as_uuid=True), nullable=True))
    op.add_column("vacancies", sa.Column("external_id", sa.String(length=255), nullable=True))
    op.add_column("vacancies", sa.Column("company", sa.String(length=255), nullable=True))
    op.create_foreign_key("fk_vacancies_source", "vacancies", "vacancy_sources", ["source_id"], ["id"])

    op.add_column("matches", sa.Column("matched_skills", postgresql.JSONB, nullable=True))
    op.add_column("matches", sa.Column("reasons", postgresql.JSONB, nullable=True))

    op.add_column("applications", sa.Column("interview_notes", sa.Text(), nullable=True))

    op.create_table(
        "vacancy_import_runs",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("source_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("started_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("finished_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("inserted_count", sa.Float(), nullable=False, server_default="0"),
        sa.Column("updated_count", sa.Float(), nullable=False, server_default="0"),
        sa.Column("status", sa.String(length=50), nullable=False, server_default="running"),
        sa.Column("error", sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(["source_id"], ["vacancy_sources.id"]),
    )

    op.create_table(
        "reminders",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("application_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("note", sa.Text(), nullable=True),
        sa.Column("due_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column(
            "status",
            sa.Enum("pending", "done", "snoozed", name="reminderstatus"),
            nullable=False,
            server_default="pending",
        ),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["application_id"], ["applications.id"]),
    )

    op.create_table(
        "application_attachments",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("application_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("document_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["application_id"], ["applications.id"]),
        sa.ForeignKeyConstraint(["document_id"], ["documents.id"]),
    )

    op.create_table(
        "notifications",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column(
            "type",
            sa.Enum("matches", "document_failed", "reminder_due", name="notificationtype"),
            nullable=False,
        ),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("body", sa.Text(), nullable=True),
        sa.Column("is_read", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
    )

    op.create_table(
        "shared_links",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("generated_package_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("token", sa.String(length=255), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["generated_package_id"], ["generated_packages.id"]),
    )
    op.create_index("ix_shared_links_token", "shared_links", ["token"], unique=True)


def downgrade() -> None:
    op.drop_index("ix_shared_links_token", table_name="shared_links")
    op.drop_table("shared_links")
    op.drop_table("notifications")
    op.drop_table("application_attachments")
    op.drop_table("reminders")
    op.drop_table("vacancy_import_runs")
    op.drop_table("vacancy_sources")

    op.drop_column("applications", "interview_notes")
    op.drop_column("matches", "reasons")
    op.drop_column("matches", "matched_skills")
    op.drop_constraint("fk_vacancies_source", "vacancies", type_="foreignkey")
    op.drop_column("vacancies", "company")
    op.drop_column("vacancies", "external_id")
    op.drop_column("vacancies", "source_id")
    op.drop_column("profiles", "skills")

    op.execute("DROP TYPE IF EXISTS vacancysourcetype")
    op.execute("DROP TYPE IF EXISTS reminderstatus")
    op.execute("DROP TYPE IF EXISTS notificationtype")
