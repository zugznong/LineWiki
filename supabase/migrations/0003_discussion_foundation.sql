-- supabase/migrations/0003_discussion_foundation.sql
-- 3. Discussion Forums Schema

-- 토론 스레드 테이블 생성
CREATE TABLE IF NOT EXISTS public.discussion_threads (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    author_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    fen_context TEXT, -- 연관된 FEN 포지션 컨텍스트 (선택적)
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('open', 'locked', 'hidden', 'deleted')) DEFAULT 'open',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 타임스탬프 트리거 연결
CREATE TRIGGER update_discussion_threads_updated_at
    BEFORE UPDATE ON public.discussion_threads
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 토론 댓글 테이블 생성
CREATE TABLE IF NOT EXISTS public.discussion_comments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    thread_id UUID REFERENCES public.discussion_threads(id) ON DELETE CASCADE NOT NULL,
    author_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    content TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('visible', 'hidden', 'deleted')) DEFAULT 'visible',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE TRIGGER update_discussion_comments_updated_at
    BEFORE UPDATE ON public.discussion_comments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 불건전 게시글 신고용 테이블 생성
CREATE TABLE IF NOT EXISTS public.reports (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    reporter_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    target_type TEXT NOT NULL CHECK (target_type IN ('thread', 'comment')),
    target_id UUID NOT NULL, -- thread_id 또는 comment_id
    reason TEXT NOT NULL,
    resolved BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- RLS 활성화
ALTER TABLE public.discussion_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discussion_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- 1. discussion_threads Policies
--  - hidden, deleted 상태가 아닌 글은 비로그인 유저를 포함한 누구나 SELECT 가능
--  - hidden, deleted 상태의 경우 작성자 본인이거나 관리자만 SELECT 가능
CREATE POLICY "Select active threads"
    ON public.discussion_threads
    FOR SELECT
    USING (
        status IN ('open', 'locked') OR 
        auth.uid() = author_id
    );

--  - 로그인한 세션 사용자 전원 글 작성 가능 (INSERT)
CREATE POLICY "Insert individual threads"
    ON public.discussion_threads
    FOR INSERT
    WITH CHECK (auth.uid() = author_id);

--  - 본인 소유의 글 내용 업데이트 가능 (단 상태 변경 제약 혹은 본인확인)
CREATE POLICY "Update own threads"
    ON public.discussion_threads
    FOR UPDATE
    USING (auth.uid() = author_id)
    WITH CHECK (auth.uid() = author_id);

-- 2. discussion_comments Policies
--  - visible 상태 댓글 누구나 조회 가능, 그 외에는 본인만
CREATE POLICY "Select visible comments"
    ON public.discussion_comments
    FOR SELECT
    USING (
        status = 'visible' OR 
        auth.uid() = author_id
    );

--  - 댓글 작성 (스레드가 잠김 상태가 아닐 때에만)
CREATE POLICY "Insert thread comments"
    ON public.discussion_comments
    FOR INSERT
    WITH CHECK (
        auth.uid() = author_id AND
        EXISTS (
            SELECT 1 FROM public.discussion_threads t
            WHERE t.id = thread_id AND t.status != 'locked'
        )
    );

--  - 본인 댓글 수정
CREATE POLICY "Update own comments"
    ON public.discussion_comments
    FOR UPDATE
    USING (auth.uid() = author_id)
    WITH CHECK (auth.uid() = author_id);

-- 3. reports Policies
--  - 신고 접수는 본인 명의로만 삽입 가능
CREATE POLICY "Insert report logs"
    ON public.reports
    FOR INSERT
    WITH CHECK (auth.uid() = reporter_id);

--  - 일반 사용자는 타인의 신고 로그를 조회할 수 없음 (관리자 전용 혹은 SELECT 불가 기본값)
CREATE POLICY "Users can see their own reports"
    ON public.reports
    FOR SELECT
    USING (auth.uid() = reporter_id);
