"""Add User faccting_token for Analyst Ranking (FACCTing-connected users only)

Revision ID: a8b9c0d1e2f3
Revises: f7a8b9c0d1e2
Create Date: 2026-02-28

"""
from alembic import op
import sqlalchemy as sa


revision = 'a8b9c0d1e2f3'
down_revision = 'f7a8b9c0d1e2'
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table('terminal_users', schema=None) as batch_op:
        batch_op.add_column(sa.Column('faccting_token', sa.String(length=512), nullable=True))


def downgrade():
    with op.batch_alter_table('terminal_users', schema=None) as batch_op:
        batch_op.drop_column('faccting_token')
