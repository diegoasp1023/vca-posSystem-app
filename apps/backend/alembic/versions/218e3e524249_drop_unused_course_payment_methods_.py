"""drop unused course payment methods tables

Revision ID: 218e3e524249
Revises: 0d00d74c24e9
Create Date: 2026-08-12 21:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '218e3e524249'
down_revision: Union[str, Sequence[str], None] = '0d00d74c24e9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.drop_table('course_payment_methods')
    op.drop_table('payment_methods')


def downgrade() -> None:
    """Downgrade schema."""
    op.create_table(
        'payment_methods',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name_es', sa.String(length=120), nullable=False),
        sa.Column('name_en', sa.String(length=120), nullable=False),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_table(
        'course_payment_methods',
        sa.Column('course_id', sa.Integer(), nullable=False),
        sa.Column('payment_method_id', sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(['course_id'], ['courses.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(
            ['payment_method_id'], ['payment_methods.id'], ondelete='CASCADE'
        ),
        sa.PrimaryKeyConstraint('course_id', 'payment_method_id'),
    )
