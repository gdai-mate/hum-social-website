-- Add PIN column for login authentication
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/mclksiyohsfwhquhhxcb/sql

ALTER TABLE waitlist ADD COLUMN IF NOT EXISTS pin TEXT;

-- Create index for faster login lookups
CREATE INDEX IF NOT EXISTS idx_waitlist_email_pin ON waitlist(email, pin);

-- Note: Existing users won't have a PIN. They can use "Forgot PIN" to set one,
-- or we can generate random PINs for existing users with this:
-- UPDATE waitlist SET pin = LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0') WHERE pin IS NULL;
