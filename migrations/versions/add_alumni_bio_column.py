"""Add bio (자기소개) column to terminal_user_alumni_profiles

Revision ID: add_alumni_bio
Revises: add_network_jobs
Create Date: 2026-03-01

"""
from alembic import op
import sqlalchemy as sa


revision = 'add_alumni_bio'
down_revision = 'add_network_jobs'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('terminal_user_alumni_profiles', sa.Column('bio', sa.Text(), nullable=True))


def downgrade():
    op.drop_column('terminal_user_alumni_profiles', 'bio')
