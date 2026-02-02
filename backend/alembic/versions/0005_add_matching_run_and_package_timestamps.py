"""add matching run timestamp and package created_at

Revision ID: 0005_add_matching_run
Revises: 0004_phase2_automation_and_notifications
Create Date: 2025-02-15 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "0005_add_matching_run"
down_revision = "0004_phase2_automation_and_notifications"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("users", sa.Column("last_matching_run_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column(
        "generated_packages",
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
    )


def downgrade() -> None:
    op.drop_column("generated_packages", "created_at")
    op.drop_column("users", "last_matching_run_at")
