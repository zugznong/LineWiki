-- supabase/migrations/0011_analysis_job_locking.sql
-- 11. Add Heartbeat, Locking & Fault Analysis Columns to Analysis Jobs

ALTER TABLE public.analysis_jobs 
    ADD COLUMN IF NOT EXISTS claimed_by TEXT DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS claimed_at TIMESTAMPTZ DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS heartbeat_at TIMESTAMPTZ DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS failed_reason TEXT DEFAULT NULL;
