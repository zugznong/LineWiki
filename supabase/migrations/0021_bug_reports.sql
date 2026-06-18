-- supabase/migrations/0021_bug_reports.sql

CREATE TABLE IF NOT EXISTS public.bug_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    bug_type TEXT NOT NULL,
    url TEXT,
    fen TEXT,
    browser_info TEXT,
    steps TEXT NOT NULL,
    expected TEXT,
    actual TEXT NOT NULL,
    screenshot_name TEXT,
    screenshot_base64 TEXT,
    user_email TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 트리거 설정
CREATE TRIGGER update_bug_reports_updated_at
    BEFORE UPDATE ON public.bug_reports
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) 활성화
ALTER TABLE public.bug_reports ENABLE ROW LEVEL SECURITY;

-- 1. 누구나 버그 리포트를 입력할 수 있음 (비로그인자 포함)
CREATE POLICY "Anyone can insert bug reports"
    ON public.bug_reports
    FOR INSERT
    WITH CHECK (true);

-- 2. 로그인된 사용자는 자신의 버그 리포트를 조회할 수 있음
CREATE POLICY "Users can select their own bug reports"
    ON public.bug_reports
    FOR SELECT
    USING (auth.uid() = user_id);
