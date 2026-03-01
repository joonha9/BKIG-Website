"""Add terminal_network_jobs, terminal_network_upcoming_sessions, terminal_network_partner_links

Revision ID: add_network_jobs
Revises: add_alumni_email
Create Date: 2026-03-01

"""
from alembic import op
import sqlalchemy as sa


revision = 'add_network_jobs'
down_revision = 'add_alumni_email'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'terminal_network_jobs',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('title', sa.String(length=300), nullable=False),
        sa.Column('company', sa.String(length=200), nullable=False),
        sa.Column('type', sa.String(length=32), nullable=False, server_default='Intern'),
        sa.Column('deadline', sa.Date(), nullable=True),
        sa.Column('is_referral', sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column('referral_alumni_id', sa.Integer(), nullable=True),
        sa.Column('referral_alumni_name', sa.String(length=120), nullable=True),
        sa.Column('link', sa.String(length=500), nullable=True),
        sa.Column('firm_type', sa.String(length=32), nullable=True),
        sa.Column('event_type', sa.String(length=64), nullable=True),
        sa.Column('is_featured', sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column('is_partner', sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column('visa_sponsorship', sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column('sort_order', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_table(
        'terminal_network_upcoming_sessions',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('date', sa.String(length=32), nullable=False),
        sa.Column('company', sa.String(length=200), nullable=False),
        sa.Column('event_type', sa.String(length=64), nullable=True),
        sa.Column('sort_order', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_table(
        'terminal_network_partner_links',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=200), nullable=False),
        sa.Column('url', sa.String(length=500), nullable=False),
        sa.Column('sort_order', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.PrimaryKeyConstraint('id')
    )


def downgrade():
    op.drop_table('terminal_network_partner_links')
    op.drop_table('terminal_network_upcoming_sessions')
    op.drop_table('terminal_network_jobs')
