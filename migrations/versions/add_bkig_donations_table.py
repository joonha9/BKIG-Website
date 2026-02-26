"""Add terminal_bkig_donations table for Donation page

Revision ID: e6f7a8b9c0d1
Revises: d5e6f7a8b9c0
Create Date: 2026-02-26

"""
from alembic import op
import sqlalchemy as sa


revision = 'e6f7a8b9c0d1'
down_revision = 'd5e6f7a8b9c0'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'terminal_bkig_donations',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=120), nullable=False),
        sa.Column('email', sa.String(length=255), nullable=False),
        sa.Column('amount', sa.String(length=120), nullable=False),
        sa.Column('completed', sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.PrimaryKeyConstraint('id')
    )


def downgrade():
    op.drop_table('terminal_bkig_donations')
