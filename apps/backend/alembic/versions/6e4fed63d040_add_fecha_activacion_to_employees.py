"""add fecha_activacion to employees

Revision ID: 6e4fed63d040
Revises: 9497afa0a68d
Create Date: 2026-08-06 06:58:57.592173

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '6e4fed63d040'
down_revision: Union[str, Sequence[str], None] = '9497afa0a68d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('employees', sa.Column('fecha_activacion', sa.Date(), nullable=True))
    op.execute('UPDATE employees SET fecha_activacion = fecha_ingreso WHERE fecha_activacion IS NULL')
    op.alter_column('employees', 'fecha_activacion', nullable=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('employees', 'fecha_activacion')
