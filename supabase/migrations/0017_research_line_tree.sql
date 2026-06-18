-- supabase/migrations/0017_research_line_tree.sql
-- Extension of Chess Research Lines to support hierarchical tree structures

ALTER TABLE public.research_lines
    ADD COLUMN IF NOT EXISTS parent_line_id UUID REFERENCES public.research_lines(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS parent_fen_hash TEXT,
    ADD COLUMN IF NOT EXISTS move_uci TEXT,
    ADD COLUMN IF NOT EXISTS move_san TEXT,
    ADD COLUMN IF NOT EXISTS ply INT,
    ADD COLUMN IF NOT EXISTS path_uci TEXT,
    ADD COLUMN IF NOT EXISTS path_san TEXT,
    ADD COLUMN IF NOT EXISTS sort_order INT DEFAULT 0;

-- 같은 문서 안에서 동일한 path_uci를 가지는 수순이 중복 저장되지 않도록 고유 제약 설정
ALTER TABLE public.research_lines
    ADD CONSTRAINT research_lines_document_id_path_uci_key UNIQUE (document_id, path_uci);
