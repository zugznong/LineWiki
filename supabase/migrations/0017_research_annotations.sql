-- supabase/migrations/0017_research_annotations.sql
-- 17. Research Annotations (Position Commentary & Analysis Notes) Schema

CREATE TABLE IF NOT EXISTS public.research_annotations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    node_id UUID REFERENCES public.research_position_nodes(id) ON DELETE CASCADE NOT NULL,
    body_markdown TEXT NOT NULL,
    author_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    status TEXT CHECK (status IN ('draft', 'published', 'archived')) DEFAULT 'published' NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 타임스탬프 자동 업데이트 트리거 선언
CREATE TRIGGER update_research_annotations_updated_at
    BEFORE UPDATE ON public.research_annotations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- RLS 활성화
ALTER TABLE public.research_annotations ENABLE ROW LEVEL SECURITY;

-- research_annotations RLS Policies
-- SELECT: 연관된 노드를 통하여 문서의 가시성을 체크하거나 본인 주석인 경우 조회 가용
CREATE POLICY "Select visible annotations"
    ON public.research_annotations
    FOR SELECT
    USING (
        author_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM public.research_position_nodes n
            JOIN public.research_documents d ON d.id = n.document_id
            WHERE n.id = node_id 
              AND d.is_deleted = FALSE 
              AND (d.visibility IN ('public', 'unlisted') OR d.author_id = auth.uid())
        )
    );

-- MODIFY/ALL: 본인 소유의 주석이거나, 해당 문서의 오너인 경우 전체 제어 허가
CREATE POLICY "Modify owned annotations"
    ON public.research_annotations
    FOR ALL
    USING (
        author_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM public.research_position_nodes n
            JOIN public.research_documents d ON d.id = n.document_id
            WHERE n.id = node_id AND d.author_id = auth.uid()
        )
    );
