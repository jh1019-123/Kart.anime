-- Supabase SQL Script to set up the 'rankings' table for Kartrider Arcade.
-- This script creates the rankings table, enables Row Level Security (RLS),
-- allows public read access, and allows authenticated users (or anyone if you want simple public posting)
-- to insert records.

-- 1. Create the rankings table
CREATE TABLE IF NOT EXISTS rankings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    player_name TEXT NOT NULL,
    map_name TEXT NOT NULL,
    final_time_ms INTEGER NOT NULL,
    kart_name TEXT,
    game_mode TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Enable Row Level Security (RLS)
ALTER TABLE rankings ENABLE ROW LEVEL SECURITY;

-- 3. Create a policy to allow anyone to read the rankings (Public Access)
CREATE POLICY "Allow public read access" 
ON rankings 
FOR SELECT 
USING (true);

-- 4. Create a policy to allow authenticated users to insert records
CREATE POLICY "Allow authenticated inserts" 
ON rankings 
FOR INSERT 
TO authenticated 
WITH CHECK (true);

-- 5. Optional: If you want to allow anonymous public posts (simplifies sandbox testing without logging in),
-- you can run the following policy instead of or alongside the authenticated one:
-- CREATE POLICY "Allow anonymous inserts" 
-- ON rankings 
-- FOR INSERT 
-- TO anon 
-- WITH CHECK (true);
