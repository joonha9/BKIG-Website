"""Add terminal_bkig_applications table for Join Us Apply to BKIG

Revision ID: c4d5e6f7a8b9
Revises: 543216266b13
Create Date: 2026-02-26

"""
from alembic import op
import sqlalchemy as sa


revision = 'c4d5e6f7a8b9'
down_revision = '543216266b13'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'terminal_bkig_applications',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=120), nullable=False),
        sa.Column('email', sa.String(length=255), nullable=False),
        sa.Column('school', sa.String(length=200), nullable=False),
        sa.Column('major', sa.String(length=200), nullable=True),
        sa.Column('grade', sa.String(length=32), nullable=True),
        sa.Column('division', sa.String(length=64), nullable=True),
        sa.Column('resume_path', sa.String(length=500), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.PrimaryKeyConstraint('id')
    )


def downgrade():
    op.drop_table('terminal_bkig_applications')
