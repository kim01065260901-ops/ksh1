
-- Create the records table
CREATE TABLE IF NOT EXISTS public.records (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    attempts INTEGER NOT NULL,
    seconds INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS (Optional, for public access as requested by the user's provided public key)
ALTER TABLE public.records ENABLE ROW LEVEL SECURITY;

-- Create policy to allow anyone to read records
CREATE POLICY "Allow public read access" ON public.records
    FOR SELECT USING (true);

-- Create policy to allow anyone to insert records
CREATE POLICY "Allow public insert access" ON public.records
    FOR INSERT WITH CHECK (true);

-- Index for performance on the leaderboard
CREATE INDEX IF NOT EXISTS idx_records_score ON public.records (attempts ASC, seconds ASC);
