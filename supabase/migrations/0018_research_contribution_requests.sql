-- supabase/migrations/0018_research_contribution_requests.sql
-- 18. Research Contribution Requests (PR / 수정 제안) Schema

CREATE TABLE IF NOT EXISTS public.research_contribution_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    document_id UUID REFERENCES public.research_documents(id) ON DELETE CASCADE NOT NULL,
    target_node_id UUID REFERENCES public.research_position_nodes(id) ON DELETE SET NULL,
    proposed_patch JSONB NOT NULL, -- 트리/노드/주석 변경 패치 데이터
    status TEXT CHECK (status IN ('pending', 'approved', 'rejected', 'merged')) DEFAULT 'pending' NOT NULL,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    warning_accepted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 타임스탬프 자동 업데이트 트리거 선언
CREATE TRIGGER update_research_contribution_requests_updated_at
    BEFORE UPDATE ON public.research_contribution_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- RLS 활성화
ALTER TABLE public.research_contribution_requests ENABLE ROW LEVEL SECURITY;

-- SELECT 정책: 제출자 본인이거나 해당 문서를 열람할 수 있는 권한이 있을 경우 노출
CREATE POLICY "Select visible contribution requests"
    ON public.research_contribution_requests
    FOR SELECT
    USING (
        created_by = auth.uid() OR
        EXISTS (
            SELECT 1 FROM public.research_documents d
            WHERE d.id = document_id
              AND d.is_deleted = FALSE
              AND (d.visibility IN ('public', 'unlisted') OR d.author_id = auth.uid())
        )
    );

-- INSERT/UPDATE/DELETE 정책: 제출자 본인은 pending 상태에서 제어 가능하고, 문서 오너는 언제나 검토(상태 변경) 및 제어 가능
CREATE POLICY "Modify owned or managed contribution requests"
    ON public.research_contribution_requests
    FOR ALL
    USING (
        (created_by = auth.uid() AND status = 'pending') OR
        EXISTS (
            SELECT 1 FROM public.research_documents d
            WHERE d.id = document_id AND d.author_id = auth.uid()
        )
    );
