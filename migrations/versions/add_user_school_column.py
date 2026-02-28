"""Add User.school (nullable, for Applications parity)

Revision ID: b9c0d1e2f3a4
Revises: a8b9c0d1e2f3
Create Date: 2026-02-28

"""
from alembic import op
import sqlalchemy as sa


revision = 'b9c0d1e2f3a4'
down_revision = 'a8b9c0d1e2f3'
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table('terminal_users', schema=None) as batch_op:
        batch_op.add_column(sa.Column('school', sa.String(length=200), nullable=True))


def downgrade():
    with op.batch_alter_table('terminal_users', schema=None) as batch_op:
        batch_op.drop_column('school')
