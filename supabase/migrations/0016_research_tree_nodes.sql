-- supabase/migrations/0016_research_tree_nodes.sql
-- 16. Research Tree Nodes (Positions & Edges) Schema

CREATE TABLE IF NOT EXISTS public.research_position_nodes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    document_id UUID REFERENCES public.research_documents(id) ON DELETE CASCADE NOT NULL,
    fen_hash TEXT NOT NULL,
    fen_text TEXT NOT NULL,
    ply INT NOT NULL,
    path_uci TEXT,
    path_san TEXT,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 타임스탬프 자동 업데이트 트리거 선언
CREATE TRIGGER update_research_position_nodes_updated_at
    BEFORE UPDATE ON public.research_position_nodes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.research_move_edges (
    document_id UUID REFERENCES public.research_documents(id) ON DELETE CASCADE NOT NULL,
    parent_node_id UUID REFERENCES public.research_position_nodes(id) ON DELETE CASCADE NOT NULL,
    child_node_id UUID REFERENCES public.research_position_nodes(id) ON DELETE CASCADE NOT NULL,
    move_uci TEXT NOT NULL,
    move_san TEXT NOT NULL,
    sort_order INT DEFAULT 0 NOT NULL,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    PRIMARY KEY (parent_node_id, child_node_id)
);

-- RLS 활성화
ALTER TABLE public.research_position_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.research_move_edges ENABLE ROW LEVEL SECURITY;

-- 1. research_position_nodes RLS Policies
CREATE POLICY "Select linked position nodes"
    ON public.research_position_nodes
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.research_documents d
            WHERE d.id = document_id 
              AND d.is_deleted = FALSE 
              AND (d.visibility IN ('public', 'unlisted') OR d.author_id = auth.uid())
        )
    );

CREATE POLICY "Modify linked position nodes"
    ON public.research_position_nodes
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.research_documents d
            WHERE d.id = document_id AND d.author_id = auth.uid()
        )
    );

-- 2. research_move_edges RLS Policies
CREATE POLICY "Select linked move edges"
    ON public.research_move_edges
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.research_documents d
            WHERE d.id = document_id 
              AND d.is_deleted = FALSE 
              AND (d.visibility IN ('public', 'unlisted') OR d.author_id = auth.uid())
        )
    );

CREATE POLICY "Modify linked move edges"
    ON public.research_move_edges
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.research_documents d
            WHERE d.id = document_id AND d.author_id = auth.uid()
        )
    );
