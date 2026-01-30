"""add applications and match timestamps

Revision ID: 0002_add_applications
Revises: 0001_initial
Create Date: 2024-10-01 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = "0002_add_applications"
down_revision = "0001_initial"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("profiles", sa.Column("location", sa.String(length=255), nullable=True))
    op.add_column(
        "matches",
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    op.create_table(
        "applications",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("vacancy_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column(
            "status",
            sa.Enum("saved", "applied", "interview", "offer", "rejected", name="applicationstatus"),
            nullable=False,
            server_default="saved",
        ),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["vacancy_id"], ["vacancies.id"]),
    )
    op.create_unique_constraint(
        "uq_application_user_vacancy",
        "applications",
        ["user_id", "vacancy_id"],
    )


def downgrade() -> None:
    op.drop_constraint("uq_application_user_vacancy", "applications", type_="unique")
    op.drop_table("applications")
    op.drop_column("matches", "created_at")
    op.drop_column("profiles", "location")
    op.execute("DROP TYPE IF EXISTS applicationstatus")
