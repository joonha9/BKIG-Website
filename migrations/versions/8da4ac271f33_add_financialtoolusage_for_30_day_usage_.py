"""Add FinancialToolUsage for 30-day usage tracking

Revision ID: 8da4ac271f33
Revises: b9c0d1e2f3a4
Create Date: 2026-02-28 16:28:49.692857

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '8da4ac271f33'
down_revision = 'b9c0d1e2f3a4'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table('terminal_financial_tool_usage',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('user_id', sa.Integer(), nullable=False),
    sa.Column('usage_date', sa.Date(), nullable=False),
    sa.Column('action_type', sa.String(length=32), nullable=False),
    sa.Column('count', sa.Integer(), nullable=False),
    sa.ForeignKeyConstraint(['user_id'], ['terminal_users.id'], ),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('user_id', 'usage_date', 'action_type', name='uq_financial_usage_user_date_action')
    )


def downgrade():
    op.drop_table('terminal_financial_tool_usage')
