-- SQL Migration Script: Update users table columns and add OTP fields
-- Run this script directly on PostgreSQL if Alembic migration fails

-- Step 1: Rename existing columns
ALTER TABLE users RENAME COLUMN taikhoan TO username;
ALTER TABLE users RENAME COLUMN matkhau TO password_hash;
ALTER TABLE users RENAME COLUMN hoten TO full_name;
ALTER TABLE users RENAME COLUMN sdt TO phone;
ALTER TABLE users RENAME COLUMN diachi TO address;

-- Step 2: Add new columns for OTP verification
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT true;
ALTER TABLE users ADD COLUMN IF NOT EXISTS otp_code VARCHAR(6);
ALTER TABLE users ADD COLUMN IF NOT EXISTS otp_expires TIMESTAMP;

-- Step 3: Drop old reset token columns (if they exist)
ALTER TABLE users DROP COLUMN IF EXISTS reset_token;
ALTER TABLE users DROP COLUMN IF EXISTS reset_token_expires;

-- Step 4: Set all existing users as verified
UPDATE users SET is_verified = true WHERE is_verified IS NULL;

-- Verify the changes
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'users' 
ORDER BY ordinal_position;
