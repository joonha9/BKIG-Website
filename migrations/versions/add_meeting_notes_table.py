"""Add terminal_meeting_notes table for Meeting Intelligence

Revision ID: b2c3d4e5f6a7
Revises: a1b2c3d4e5f6
Create Date: 2026-02-23

"""
from alembic import op
import sqlalchemy as sa


revision = 'b2c3d4e5f6a7'
down_revision = 'a1b2c3d4e5f6'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'terminal_meeting_notes',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('ticker', sa.String(length=32), nullable=True),
        sa.Column('meeting_type', sa.String(length=32), nullable=False, server_default='IC'),
        sa.Column('sentiment', sa.String(length=32), nullable=False, server_default='Neutral'),
        sa.Column('attendees', sa.String(length=500), nullable=True),
        sa.Column('executive_summary', sa.Text(), nullable=True),
        sa.Column('main_discussion', sa.Text(), nullable=True),
        sa.Column('next_actions', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('created_by_id', sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(['created_by_id'], ['terminal_users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )


def downgrade():
    op.drop_table('terminal_meeting_notes')
