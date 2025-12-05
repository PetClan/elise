"""Initial migration

Revision ID: 001
Revises: 
Create Date: 2024-12-05

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '001'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create contacts table
    op.create_table('contacts',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('care_home_name', sa.String(255), nullable=False),
        sa.Column('telephone', sa.String(50), nullable=True),
        sa.Column('contact_person', sa.String(255), nullable=True),
        sa.Column('email', sa.String(255), nullable=True),
        sa.Column('address', sa.Text(), nullable=True),
        sa.Column('postcode', sa.String(20), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_contacts_id', 'contacts', ['id'])

    # Create call_logs table
    op.create_table('call_logs',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('contact_id', sa.Integer(), nullable=False),
        sa.Column('call_datetime', sa.DateTime(), nullable=False),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(['contact_id'], ['contacts.id']),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_call_logs_id', 'call_logs', ['id'])

    # Create callbacks table
    op.create_table('callbacks',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('contact_id', sa.Integer(), nullable=False),
        sa.Column('original_call_datetime', sa.DateTime(), nullable=False),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('callback_datetime', sa.DateTime(), nullable=False),
        sa.Column('callback_type', sa.Enum('AWAITING_CALLBACK', 'TO_CALL_BACK', name='callbacktype'), nullable=False),
        sa.ForeignKeyConstraint(['contact_id'], ['contacts.id']),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_callbacks_id', 'callbacks', ['id'])

    # Create bookings table
    op.create_table('bookings',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('contact_id', sa.Integer(), nullable=False),
        sa.Column('booking_from', sa.DateTime(), nullable=False),
        sa.Column('booking_to', sa.DateTime(), nullable=False),
        sa.Column('booking_type', sa.Text(), nullable=True),
        sa.Column('fee_agreed', sa.Numeric(10, 2), nullable=True),
        sa.Column('fee_status', sa.Enum('UNPAID', 'INVOICED', 'PAID', name='feestatus'), nullable=False),
        sa.ForeignKeyConstraint(['contact_id'], ['contacts.id']),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_bookings_id', 'bookings', ['id'])


def downgrade() -> None:
    op.drop_table('bookings')
    op.drop_table('callbacks')
    op.drop_table('call_logs')
    op.drop_table('contacts')