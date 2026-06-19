-- supabase/migrations/0025_research_tree_projection_model.sql
-- 25. Research Tree Projection Model Supporting Advanced Move Glyphs and Canonical FEN Unique Controls

-- 1. Extend research_position_nodes with canonical fen_key
ALTER TABLE public.research_position_nodes 
    ADD COLUMN IF NOT EXISTS fen_key TEXT;

-- Convert existing fen_text to canonical fen_key (Pieces, Turn, Castling, EnPassant)
UPDATE public.research_position_nodes
SET fen_key = (
    split_part(fen_text, ' ', 1) || ' ' || 
    COALESCE(NULLIF(split_part(fen_text, ' ', 2), ''), 'w') || ' ' || 
    COALESCE(NULLIF(split_part(fen_text, ' ', 3), ''), '-') || ' ' || 
    COALESCE(NULLIF(split_part(fen_text, ' ', 4), ''), '-')
)
WHERE fen_key IS NULL OR fen_key = '';

-- Fill default value for any potential empty fen_key to avoid constraint violation
UPDATE public.research_position_nodes
SET fen_key = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq -'
WHERE fen_key IS NULL OR fen_key = '';

-- Make fen_key NOT NULL
ALTER TABLE public.research_position_nodes ALTER COLUMN fen_key SET NOT NULL;

-- Manage UNIQUE constraint for (document_id, fen_key) safely
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'research_position_nodes_doc_fen_key_unique'
    ) THEN
        ALTER TABLE public.research_position_nodes DROP CONSTRAINT research_position_nodes_doc_fen_key_unique;
    END IF;

    ALTER TABLE public.research_position_nodes 
        ADD CONSTRAINT research_position_nodes_doc_fen_key_unique UNIQUE(document_id, fen_key);
END $$;


-- 2. Validate and extend research_line_occurrences
ALTER TABLE public.research_line_occurrences
    ADD COLUMN IF NOT EXISTS position_node_id UUID REFERENCES public.research_position_nodes(id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS parent_occurrence_id UUID REFERENCES public.research_line_occurrences(id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS path_uci TEXT,
    ADD COLUMN IF NOT EXISTS path_san TEXT,
    ADD COLUMN IF NOT EXISTS ply INT,
    ADD COLUMN IF NOT EXISTS occurrence_index INT DEFAULT 0,
    ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;


-- 3. Extend research_move_edges with glyph stickers, move numbers, and transposition states
ALTER TABLE public.research_move_edges
    ADD COLUMN IF NOT EXISTS parent_occurrence_id UUID REFERENCES public.research_line_occurrences(id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS child_occurrence_id UUID REFERENCES public.research_line_occurrences(id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS parent_position_node_id UUID REFERENCES public.research_position_nodes(id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS child_position_node_id UUID REFERENCES public.research_position_nodes(id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS move_number INT,
    ADD COLUMN IF NOT EXISTS side_to_move_before_move TEXT,
    ADD COLUMN IF NOT EXISTS glyph TEXT, -- User-annotated: '!!' | '!' | '!?' | '?!' | '?' | '??'
    ADD COLUMN IF NOT EXISTS is_transposition BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS is_return_to_earlier_position BOOLEAN DEFAULT FALSE;
