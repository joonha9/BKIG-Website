"""Add graduated column to terminal_users (Profile & Network & Career only access)

Revision ID: add_user_graduated
Revises: add_user_alumni
Create Date: 2026-03-01

"""
from alembic import op
import sqlalchemy as sa


revision = 'add_user_graduated'
down_revision = 'add_user_alumni'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('terminal_users', sa.Column('graduated', sa.Boolean(), nullable=False, server_default=sa.false()))


def downgrade():
    op.drop_column('terminal_users', 'graduated')
