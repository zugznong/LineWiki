-- GitHub Actions schema contract 전용 (LineWiki Database Schema Contract Verification)
-- Checks defined database objects for essential research and wiki functionalities.
-- If any object is missing, the script throws an SQL exception causing the deployment pipeline to abort.

DO $$
DECLARE
  missing_msg TEXT := '';
BEGIN
  -- 1. Check tables presence in public schema
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'research_position_nodes') THEN
    missing_msg := missing_msg || ' research_position_nodes,';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'research_move_edges') THEN
    missing_msg := missing_msg || ' research_move_edges,';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'research_line_occurrences') THEN
    missing_msg := missing_msg || ' research_line_occurrences,';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'research_annotations') THEN
    missing_msg := missing_msg || ' research_annotations,';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'research_contribution_requests') THEN
    missing_msg := missing_msg || ' research_contribution_requests,';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'research_votes') THEN
    missing_msg := missing_msg || ' research_votes,';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'research_comments') THEN
    missing_msg := missing_msg || ' research_comments,';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'bug_reports') THEN
    missing_msg := missing_msg || ' bug_reports,';
  END IF;

  -- 2. Check research_documents.root_node_id column presence
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'research_documents' 
      AND column_name = 'root_node_id'
  ) THEN
    missing_msg := missing_msg || ' research_documents.root_node_id column,';
  END IF;

  -- 2.1. Check research_line_occurrences columns presence
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'research_line_occurrences' 
      AND column_name = 'position_node_id'
  ) THEN
    missing_msg := missing_msg || ' research_line_occurrences.position_node_id column,';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'research_line_occurrences' 
      AND column_name = 'parent_occurrence_id'
  ) THEN
    missing_msg := missing_msg || ' research_line_occurrences.parent_occurrence_id column,';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'research_line_occurrences' 
      AND column_name = 'move_uci'
  ) THEN
    missing_msg := missing_msg || ' research_line_occurrences.move_uci column,';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'research_line_occurrences' 
      AND column_name = 'move_san'
  ) THEN
    missing_msg := missing_msg || ' research_line_occurrences.move_san column,';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'research_line_occurrences' 
      AND column_name = 'path_uci'
  ) THEN
    missing_msg := missing_msg || ' research_line_occurrences.path_uci column,';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'research_line_occurrences' 
      AND column_name = 'path_san'
  ) THEN
    missing_msg := missing_msg || ' research_line_occurrences.path_san column,';
  END IF;

  -- 2.2. Check research_move_edges columns presence
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'research_move_edges' 
      AND column_name = 'parent_occurrence_id'
  ) THEN
    missing_msg := missing_msg || ' research_move_edges.parent_occurrence_id column,';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'research_move_edges' 
      AND column_name = 'child_occurrence_id'
  ) THEN
    missing_msg := missing_msg || ' research_move_edges.child_occurrence_id column,';
  END IF;

  -- 3. Evaluate results
  IF missing_msg <> '' THEN
    RAISE EXCEPTION 'DATABASE CONTRACT BREACH: Missing objects: %', RTRIM(missing_msg, ',');
  ELSE
    RAISE NOTICE 'DATABASE CONTRACT ALL PASSED: Verified all critical opening research database models!';
  END IF;
END $$;
