"""add saved filters

Revision ID: 0006_add_saved_filters
Revises: 0005_add_matching_run_and_package_timestamps
Create Date: 2025-02-14 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision = "0006_add_saved_filters"
down_revision = "0005_add_matching_run_and_package_timestamps"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "saved_filters",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("location", sa.String(length=255), nullable=True),
        sa.Column("remote", sa.Boolean(), nullable=True),
        sa.Column("salary_min", sa.Float(), nullable=True),
        sa.Column("role_keywords", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )


def downgrade() -> None:
    op.drop_table("saved_filters")
