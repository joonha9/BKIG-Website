"""Add company_name to terminal_bkig_inquiries for partnership form

Revision ID: add_inquiry_company
Revises: a8b9c0d1e2f3
Create Date: 2026-03-01

"""
from alembic import op
import sqlalchemy as sa


revision = 'add_inquiry_company'
down_revision = 'add_alumni_bio'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('terminal_bkig_inquiries', sa.Column('company_name', sa.String(length=200), nullable=True))


def downgrade():
    op.drop_column('terminal_bkig_inquiries', 'company_name')
