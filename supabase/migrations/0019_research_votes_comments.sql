-- supabase/migrations/0019_research_votes_comments.sql
-- 19. Research Votes & Comments Schema

CREATE TABLE IF NOT EXISTS public.research_comments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    document_id UUID REFERENCES public.research_documents(id) ON DELETE CASCADE NOT NULL,
    node_id UUID REFERENCES public.research_position_nodes(id) ON DELETE CASCADE,
    annotation_id UUID REFERENCES public.research_annotations(id) ON DELETE CASCADE,
    author_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    body_text TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 타임스탬프 자동 업데이트 트리거 선언
CREATE TRIGGER update_research_comments_updated_at
    BEFORE UPDATE ON public.research_comments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.research_votes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    document_id UUID REFERENCES public.research_documents(id) ON DELETE CASCADE,
    node_id UUID REFERENCES public.research_position_nodes(id) ON DELETE CASCADE,
    annotation_id UUID REFERENCES public.research_annotations(id) ON DELETE CASCADE,
    comment_id UUID REFERENCES public.research_comments(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    vote_type TEXT CHECK (vote_type IN ('upvote', 'downvote')) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    
    -- 무결성 제한: 어떤 대상이든 한 행에 한 대상을 기준으로 투표가 기록되도록 설계
    CONSTRAINT check_single_vote_target CHECK (
        (document_id IS NOT NULL AND node_id IS NULL AND annotation_id IS NULL AND comment_id IS NULL) OR
        (document_id IS NULL AND node_id IS NOT NULL AND annotation_id IS NULL AND comment_id IS NULL) OR
        (document_id IS NULL AND node_id IS NULL AND annotation_id IS NOT NULL AND comment_id IS NULL) OR
        (document_id IS NULL AND node_id IS NULL AND annotation_id IS NULL AND comment_id IS NOT NULL)
    )
);

-- 유저당 하나의 타겟에 대해 투표 하나만 허용하는 고유 인덱스 구성
CREATE UNIQUE INDEX idx_unique_user_document_vote ON public.research_votes (user_id, document_id) WHERE document_id IS NOT NULL;
CREATE UNIQUE INDEX idx_unique_user_node_vote ON public.research_votes (user_id, node_id) WHERE node_id IS NOT NULL;
CREATE UNIQUE INDEX idx_unique_user_annotation_vote ON public.research_votes (user_id, annotation_id) WHERE annotation_id IS NOT NULL;
CREATE UNIQUE INDEX idx_unique_user_comment_vote ON public.research_votes (user_id, comment_id) WHERE comment_id IS NOT NULL;

-- RLS 활성화
ALTER TABLE public.research_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.research_votes ENABLE ROW LEVEL SECURITY;

-- 1. research_comments RLS Policies
CREATE POLICY "Select visible comments"
    ON public.research_comments
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.research_documents d
            WHERE d.id = document_id
              AND d.is_deleted = FALSE
              AND (d.visibility IN ('public', 'unlisted') OR d.author_id = auth.uid())
        )
    );

CREATE POLICY "Modify owned comments"
    ON public.research_comments
    FOR ALL
    USING (
        author_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM public.research_documents d
            WHERE d.id = document_id AND d.author_id = auth.uid()
        )
    );

-- 2. research_votes RLS Policies
CREATE POLICY "Select visible votes"
    ON public.research_votes
    FOR SELECT
    USING (true); -- 투표 수 합계 등은 공용으로 투명하게 조회 가능

CREATE POLICY "Modify owned votes"
    ON public.research_votes
    FOR ALL
    USING (user_id = auth.uid());
