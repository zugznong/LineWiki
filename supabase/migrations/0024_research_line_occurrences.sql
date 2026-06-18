-- supabase/migrations/0023_research_line_occurrences.sql
-- 23. Research Line Occurrences & Expanded Edges supporting duplicate/transposed FEN paths

CREATE TABLE IF NOT EXISTS public.research_line_occurrences (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    document_id UUID REFERENCES public.research_documents(id) ON DELETE CASCADE NOT NULL,
    position_node_id UUID REFERENCES public.research_position_nodes(id) ON DELETE CASCADE NOT NULL,
    parent_occurrence_id UUID REFERENCES public.research_line_occurrences(id) ON DELETE CASCADE,
    path_uci TEXT,
    path_san TEXT,
    ply INT NOT NULL,
    occurrence_index INT DEFAULT 0 NOT NULL,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- research_position_nodes unique constraint
-- doc_id + fen_hash unique index/constraint to allow find-or-create behavior safely
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'research_position_nodes_doc_fen_unique'
    ) THEN
        ALTER TABLE public.research_position_nodes 
            ADD CONSTRAINT research_position_nodes_doc_fen_unique UNIQUE(document_id, fen_hash);
    END IF;
END $$;

-- research_move_edges 테이블 확장 (occurrence 결합 컬럼 추가)
ALTER TABLE public.research_move_edges 
    ADD COLUMN IF NOT EXISTS parent_occurrence_id UUID REFERENCES public.research_line_occurrences(id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS child_occurrence_id UUID REFERENCES public.research_line_occurrences(id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS parent_position_node_id UUID REFERENCES public.research_position_nodes(id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS child_position_node_id UUID REFERENCES public.research_position_nodes(id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS is_transposition BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS is_return_to_earlier_position BOOLEAN DEFAULT FALSE;

-- RLS 활성화
ALTER TABLE public.research_line_occurrences ENABLE ROW LEVEL SECURITY;

-- research_line_occurrences RLS Policies
CREATE POLICY "Select linked occurrences"
    ON public.research_line_occurrences
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.research_documents d
            WHERE d.id = document_id 
              AND d.is_deleted = FALSE 
              AND (d.visibility IN ('public', 'unlisted') OR d.author_id = auth.uid())
        )
    );

CREATE POLICY "Modify linked occurrences"
    ON public.research_line_occurrences
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.research_documents d
            WHERE d.id = document_id AND d.author_id = auth.uid()
        )
    );
