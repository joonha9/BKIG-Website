"""Add terminal_user_alumni_profiles for Network & Career (profile alumni info + show_in_directory)

Revision ID: add_user_alumni
Revises: 83be2f81b2d3
Create Date: 2026-03-01

"""
from alembic import op
import sqlalchemy as sa


revision = 'add_user_alumni'
down_revision = '8da4ac271f33'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'terminal_user_alumni_profiles',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('company', sa.String(length=200), nullable=True),
        sa.Column('role', sa.String(length=200), nullable=True),
        sa.Column('industry', sa.String(length=64), nullable=True),
        sa.Column('location', sa.String(length=64), nullable=True),
        sa.Column('status', sa.String(length=32), nullable=True, server_default='email_me'),
        sa.Column('tags', sa.String(length=500), nullable=True),
        sa.Column('linkedin', sa.String(length=500), nullable=True),
        sa.Column('graduation_year', sa.Integer(), nullable=True),
        sa.Column('show_in_directory', sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(['user_id'], ['terminal_users.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id', name='uq_terminal_user_alumni_user_id')
    )


def downgrade():
    op.drop_table('terminal_user_alumni_profiles')
