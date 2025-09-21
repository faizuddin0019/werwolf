-- Migration to fix 'werewolf' to 'werwolf' in player_role enum
-- Run this in your Supabase SQL editor

-- First, add the new value to the enum
ALTER TYPE player_role ADD VALUE 'werwolf';

-- Update existing records that have 'werewolf' to 'werwolf'
UPDATE players SET role = 'werwolf' WHERE role = 'werewolf';

-- Note: We cannot remove the old enum value 'werewolf' in PostgreSQL
-- The old value will remain but won't be used
