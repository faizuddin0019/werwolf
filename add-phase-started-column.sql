-- Add phase_started column to round_state table
-- Run this in your Supabase SQL editor

-- First, check if the column exists
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'round_state' 
        AND column_name = 'phase_started'
    ) THEN
        -- Add the column if it doesn't exist
        ALTER TABLE round_state 
        ADD COLUMN phase_started BOOLEAN DEFAULT FALSE;
        
        RAISE NOTICE 'Added phase_started column to round_state table';
    ELSE
        RAISE NOTICE 'phase_started column already exists in round_state table';
    END IF;
END $$;

-- Verify the column was added
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'round_state' 
ORDER BY ordinal_position;
