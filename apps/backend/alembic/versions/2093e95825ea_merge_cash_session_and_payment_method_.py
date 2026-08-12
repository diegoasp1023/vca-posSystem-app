"""merge cash session and payment method simplification heads

Revision ID: 2093e95825ea
Revises: 4c0915182397, 603826e797c5
Create Date: 2026-08-11 19:27:01.077753

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '2093e95825ea'
down_revision: Union[str, Sequence[str], None] = ('4c0915182397', '603826e797c5')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
