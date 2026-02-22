"""Initial migration and add is_active

Revision ID: 56983429a759
Revises:
Create Date: 2026-02-20 16:42:19.002627

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '56983429a759'
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'terminal_users',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('email', sa.String(length=255), nullable=False),
        sa.Column('password_hash', sa.String(length=255), nullable=False),
        sa.Column('name', sa.String(length=120), nullable=False),
        sa.Column('division', sa.String(length=120), nullable=False),
        sa.Column('role', sa.String(length=32), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.text('1')),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('email'),
    )


def downgrade():
    op.drop_table('terminal_users')
