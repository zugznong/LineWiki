-- supabase/migrations/0014_deep_research_submissions.sql
-- 14. Deep Research Submissions Schema

CREATE TABLE IF NOT EXISTS public.deep_research_submissions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    fen_hash TEXT NOT NULL,
    fen_text TEXT NOT NULL,
    root_move_uci TEXT NOT NULL,
    score_cp INT,
    mate_in INT,
    depth_reached INT NOT NULL,
    nodes_evaluated BIGINT NOT NULL,
    nps BIGINT,
    pv TEXT,
    engine_identity TEXT,
    asset_hash TEXT,
    client_started_at TIMESTAMP WITH TIME ZONE,
    client_finished_at TIMESTAMP WITH TIME ZONE,
    status TEXT NOT NULL CHECK (status IN ('submitted', 'verified', 'rejected')) DEFAULT 'submitted',
    trust_level TEXT NOT NULL CHECK (trust_level IN ('untrusted', 'community-confirmed', 'server-audited', 'trusted')) DEFAULT 'untrusted',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_deep_research_submissions_updated_at ON public.deep_research_submissions;
CREATE TRIGGER update_deep_research_submissions_updated_at
    BEFORE UPDATE ON public.deep_research_submissions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE public.deep_research_submissions ENABLE ROW LEVEL SECURITY;

-- Policies
-- 1. Public Select
DROP POLICY IF EXISTS "Select deep research submissions publicly" ON public.deep_research_submissions;
CREATE POLICY "Select deep research submissions publicly"
    ON public.deep_research_submissions
    FOR SELECT
    USING (true);

-- 2. Authenticated Insert for User's own data
DROP POLICY IF EXISTS "Insert own deep research submissions" ON public.deep_research_submissions;
CREATE POLICY "Insert own deep research submissions"
    ON public.deep_research_submissions
    FOR INSERT
    WITH CHECK (
        auth.uid() = user_id 
        AND status = 'submitted' 
        AND trust_level = 'untrusted'
    );
