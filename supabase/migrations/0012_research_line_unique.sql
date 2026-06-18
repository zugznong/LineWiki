-- supabase/migrations/0012_research_line_unique.sql
-- 12. Add Unique Constraint to Research Lines to prevent duplicates and enable clean UPSERTs

ALTER TABLE public.research_lines
    ADD CONSTRAINT research_lines_document_id_fen_hash_key UNIQUE (document_id, fen_hash);
