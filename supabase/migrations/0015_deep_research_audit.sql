-- supabase/migrations/0015_deep_research_audit.sql
-- 15. Deep Research Audits Schema

CREATE TABLE IF NOT EXISTS public.deep_research_audits (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    submission_id UUID REFERENCES public.deep_research_submissions(id) ON DELETE CASCADE NOT NULL,
    audit_status TEXT NOT NULL CHECK (audit_status IN ('pass', 'fail', 'outlier')),
    verified_depth INT,
    verified_nodes BIGINT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Trigger for updated_at
CREATE TRIGGER update_deep_research_audits_updated_at
    BEFORE UPDATE ON public.deep_research_audits
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE public.deep_research_audits ENABLE ROW LEVEL SECURITY;

-- Policies
-- 1. Public Select
CREATE POLICY "Select deep research audits publicly"
    ON public.deep_research_audits
    FOR SELECT
    USING (true);

-- CRITICAL: Client cannot write to deep_research_audits. 
-- Only service_role or admin can insert/update, bypassing RLS automatically.
