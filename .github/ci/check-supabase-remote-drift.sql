-- .github/ci/check-supabase-remote-drift.sql
-- Remote DB Migration History vs. Physical Objects Drift Validation Query

WITH table_checks AS (
    SELECT 
        'profiles' AS object_name,
        EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'profiles') AS is_present
    UNION ALL
    SELECT 
        'research_documents' AS object_name,
        EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'research_documents') AS is_present
    UNION ALL
    SELECT 
        'research_position_nodes' AS object_name,
        EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'research_position_nodes') AS is_present
    UNION ALL
    SELECT 
        'research_move_edges' AS object_name,
        EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'research_move_edges') AS is_present
    UNION ALL
    SELECT 
        'research_line_occurrences' AS object_name,
        EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'research_line_occurrences') AS is_present
    UNION ALL
    SELECT 
        'bug_reports' AS object_name,
        EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'bug_reports') AS is_present
    UNION ALL
    SELECT 
        'update_profiles_updated_at' AS object_name,
        EXISTS (SELECT FROM pg_trigger WHERE tgname = 'update_profiles_updated_at') AS is_present
),
migration_stats AS (
    SELECT 
        EXISTS (SELECT FROM pg_tables WHERE schemaname = 'supabase_migrations' AND tablename = 'schema_migrations') AS migration_table_exists,
        COALESCE((SELECT COUNT(*) FROM supabase_migrations.schema_migrations), 0) AS migration_count
)
SELECT 
    tc.object_name,
    tc.is_present,
    ms.migration_table_exists,
    ms.migration_count,
    CASE 
        WHEN (ms.migration_table_exists = FALSE OR ms.migration_count = 0) AND tc.is_present = TRUE THEN 'DRIFT_DETECTED'
        ELSE 'OK'
    END AS drift_status
FROM table_checks tc, migration_stats ms;
