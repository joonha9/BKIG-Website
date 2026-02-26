"""Add approved_user_id to terminal_bkig_applications

Revision ID: d5e6f7a8b9c0
Revises: c4d5e6f7a8b9
Create Date: 2026-02-26

"""
from alembic import op
import sqlalchemy as sa


revision = 'd5e6f7a8b9c0'
down_revision = 'c4d5e6f7a8b9'
branch_labels = None
depends_on = None


def _has_column(conn, table, column):
    if conn.dialect.name == 'sqlite':
        r = conn.execute(sa.text("PRAGMA table_info({})".format(table))).fetchall()
        return any(row[1] == column for row in r)
    return False


def upgrade():
    conn = op.get_bind()
    if _has_column(conn, 'terminal_bkig_applications', 'approved_user_id'):
        return
    op.add_column('terminal_bkig_applications', sa.Column('approved_user_id', sa.Integer(), nullable=True))
    if conn.dialect.name != 'sqlite':
        op.create_foreign_key(
            'fk_bkig_applications_approved_user_id',
            'terminal_bkig_applications',
            'terminal_users',
            ['approved_user_id'],
            ['id'],
        )


def downgrade():
    if op.get_bind().dialect.name != 'sqlite':
        op.drop_constraint('fk_bkig_applications_approved_user_id', 'terminal_bkig_applications', type_='foreignkey')
    op.drop_column('terminal_bkig_applications', 'approved_user_id')
