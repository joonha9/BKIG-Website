"""Add email column to terminal_user_alumni_profiles

Revision ID: add_alumni_email
Revises: add_user_graduated
Create Date: 2026-03-01

"""
from alembic import op
import sqlalchemy as sa


revision = 'add_alumni_email'
down_revision = 'add_user_graduated'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('terminal_user_alumni_profiles', sa.Column('email', sa.String(length=255), nullable=True))


def downgrade():
    op.drop_column('terminal_user_alumni_profiles', 'email')
