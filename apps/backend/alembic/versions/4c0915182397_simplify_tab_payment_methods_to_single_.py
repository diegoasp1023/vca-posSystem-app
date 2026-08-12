"""simplify tab_payment_methods to single name, drop sort_order

Revision ID: 4c0915182397
Revises: 31629331fa6a
Create Date: 2026-08-11 19:20:41.431505

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '4c0915182397'
down_revision: Union[str, Sequence[str], None] = '31629331fa6a'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('tab_payment_methods', sa.Column('name', sa.String(length=50), nullable=True))
    op.execute('UPDATE tab_payment_methods SET name = name_es')
    op.alter_column('tab_payment_methods', 'name', nullable=False)
    op.drop_column('tab_payment_methods', 'name_es')
    op.drop_column('tab_payment_methods', 'name_en')
    op.drop_column('tab_payment_methods', 'sort_order')


def downgrade() -> None:
    """Downgrade schema."""
    op.add_column('tab_payment_methods', sa.Column('sort_order', sa.INTEGER(), autoincrement=False, nullable=False, server_default='0'))
    op.add_column('tab_payment_methods', sa.Column('name_en', sa.VARCHAR(length=50), autoincrement=False, nullable=True))
    op.add_column('tab_payment_methods', sa.Column('name_es', sa.VARCHAR(length=50), autoincrement=False, nullable=True))
    op.execute('UPDATE tab_payment_methods SET name_es = name, name_en = name')
    op.alter_column('tab_payment_methods', 'name_es', nullable=False)
    op.alter_column('tab_payment_methods', 'name_en', nullable=False)
    op.alter_column('tab_payment_methods', 'sort_order', server_default=None)
    op.drop_column('tab_payment_methods', 'name')
