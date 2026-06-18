-- supabase/migrations/0022_research_root_node.sql
-- Add root_node_id to research_documents to track the start of the opening tree

ALTER TABLE public.research_documents
ADD COLUMN root_node_id UUID REFERENCES public.research_position_nodes(id) ON DELETE SET NULL;
