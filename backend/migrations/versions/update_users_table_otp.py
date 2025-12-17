"""Update users table - rename columns and add OTP fields

Revision ID: update_users_otp
Revises: 
Create Date: 2024-12-17

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'update_users_otp'
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    # Rename columns
    op.alter_column('users', 'taikhoan', new_column_name='username')
    op.alter_column('users', 'matkhau', new_column_name='password_hash')
    op.alter_column('users', 'hoten', new_column_name='full_name')
    op.alter_column('users', 'sdt', new_column_name='phone')
    op.alter_column('users', 'diachi', new_column_name='address')
    
    # Add new columns for OTP verification
    op.add_column('users', sa.Column('is_verified', sa.Boolean(), nullable=True, server_default='true'))
    op.add_column('users', sa.Column('otp_code', sa.String(6), nullable=True))
    op.add_column('users', sa.Column('otp_expires', sa.TIMESTAMP(), nullable=True))
    
    # Drop old reset token columns if they exist
    try:
        op.drop_column('users', 'reset_token')
        op.drop_column('users', 'reset_token_expires')
    except:
        pass
    
    # Set all existing users as verified
    op.execute("UPDATE users SET is_verified = true WHERE is_verified IS NULL")


def downgrade():
    # Rename columns back
    op.alter_column('users', 'username', new_column_name='taikhoan')
    op.alter_column('users', 'password_hash', new_column_name='matkhau')
    op.alter_column('users', 'full_name', new_column_name='hoten')
    op.alter_column('users', 'phone', new_column_name='sdt')
    op.alter_column('users', 'address', new_column_name='diachi')
    
    # Drop new columns
    op.drop_column('users', 'is_verified')
    op.drop_column('users', 'otp_code')
    op.drop_column('users', 'otp_expires')
    
    # Add back old columns
    op.add_column('users', sa.Column('reset_token', sa.String(100), nullable=True))
    op.add_column('users', sa.Column('reset_token_expires', sa.TIMESTAMP(), nullable=True))
