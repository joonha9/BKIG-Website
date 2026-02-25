"""Add terminal_internal_research_documents table for Internal Research & Resources

Revision ID: a1b2c3d4e5f6
Revises: 165273cc265e
Create Date: 2026-02-23

"""
from alembic import op
import sqlalchemy as sa


revision = 'a1b2c3d4e5f6'
down_revision = '165273cc265e'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'terminal_internal_research_documents',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('document_title', sa.String(length=300), nullable=False),
        sa.Column('category', sa.String(length=32), nullable=False),
        sa.Column('tickers', sa.String(length=200), nullable=True),
        sa.Column('author', sa.String(length=120), nullable=False),
        sa.Column('file_path', sa.String(length=500), nullable=False),
        sa.Column('file_format', sa.String(length=20), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('uploaded_by_id', sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(['uploaded_by_id'], ['terminal_users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )


def downgrade():
    op.drop_table('terminal_internal_research_documents')
