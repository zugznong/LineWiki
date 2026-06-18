-- supabase/migrations/0016_analysis_position_summaries.sql
-- 추가: analysis_position_summaries 뷰 및 get_child_evaluation_summaries rpc 추가

CREATE OR REPLACE VIEW public.analysis_position_summaries AS
WITH ranked_aggregates AS (
    SELECT 
        j.fen_hash AS job_fen_hash,
        a.root_move_uci,
        a.mean_cp_x100,
        ROW_NUMBER() OVER (
            PARTITION BY j.fen_hash 
            ORDER BY a.mean_cp_x100 DESC
        ) as rank
    FROM public.analysis_aggregates a
    JOIN public.analysis_jobs j ON a.job_id = j.id
)
SELECT 
    j.fen_hash,
    COALESCE(COUNT(a.root_move_uci), 0)::INT AS legal_reply_count,
    COALESCE(SUM(CASE WHEN j.completed_runs >= 10 AND j.target_depth >= 20 AND a.stddev_cp_x100 <= 50 THEN 1 ELSE 0 END), 0)::INT AS trusted_reply_count,
    (SELECT r.root_move_uci FROM ranked_aggregates r WHERE r.job_fen_hash = j.fen_hash AND r.rank = 1 LIMIT 1) AS best_known_reply_uci,
    (SELECT r.mean_cp_x100 FROM ranked_aggregates r WHERE r.job_fen_hash = j.fen_hash AND r.rank = 1 LIMIT 1) AS best_known_reply_score,
    CASE 
        WHEN COUNT(a.root_move_uci) > 0 THEN 
            SUM(CASE WHEN j.completed_runs >= 10 AND j.target_depth >= 20 AND a.stddev_cp_x100 <= 50 THEN 1 ELSE 0 END)::NUMERIC / COUNT(a.root_move_uci)::NUMERIC 
        ELSE 0::NUMERIC 
    END AS coverage_ratio,
    (COUNT(a.root_move_uci) > 0 AND COUNT(a.root_move_uci) = SUM(CASE WHEN j.completed_runs >= 10 AND j.target_depth >= 20 AND a.stddev_cp_x100 <= 50 THEN 1 ELSE 0 END)) AS is_complete
FROM public.analysis_jobs j
LEFT JOIN public.analysis_aggregates a ON j.id = a.job_id
GROUP BY j.fen_hash;

CREATE OR REPLACE FUNCTION public.get_child_evaluation_summaries(fen_hashes TEXT[])
RETURNS TABLE (
    fen_hash TEXT,
    legal_reply_count INT,
    trusted_reply_count INT,
    best_known_reply_uci TEXT,
    best_known_reply_score INT,
    coverage_ratio NUMERIC,
    is_complete BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    WITH ranked_aggregates AS (
        SELECT 
            j.fen_hash AS job_fen_hash,
            a.root_move_uci,
            a.mean_cp_x100,
            ROW_NUMBER() OVER (
                PARTITION BY j.fen_hash 
                ORDER BY a.mean_cp_x100 DESC
            ) as rank
        FROM public.analysis_aggregates a
        JOIN public.analysis_jobs j ON a.job_id = j.id
        WHERE j.fen_hash = ANY(fen_hashes)
    )
    SELECT 
        j.fen_hash,
        COALESCE(COUNT(a.root_move_uci), 0)::INT AS lrc,
        COALESCE(SUM(CASE WHEN j.completed_runs >= 10 AND j.target_depth >= 20 AND a.stddev_cp_x100 <= 50 THEN 1 ELSE 0 END), 0)::INT AS trc,
        (SELECT r.root_move_uci FROM ranked_aggregates r WHERE r.job_fen_hash = j.fen_hash AND r.rank = 1 LIMIT 1) AS bku,
        (SELECT r.mean_cp_x100 FROM ranked_aggregates r WHERE r.job_fen_hash = j.fen_hash AND r.rank = 1 LIMIT 1) AS bks,
        CASE 
            WHEN COUNT(a.root_move_uci) > 0 THEN 
                SUM(CASE WHEN j.completed_runs >= 10 AND j.target_depth >= 20 AND a.stddev_cp_x100 <= 50 THEN 1 ELSE 0 END)::NUMERIC / COUNT(a.root_move_uci)::NUMERIC 
            ELSE 0::NUMERIC 
        END AS cr,
        (COUNT(a.root_move_uci) > 0 AND COUNT(a.root_move_uci) = SUM(CASE WHEN j.completed_runs >= 10 AND j.target_depth >= 20 AND a.stddev_cp_x100 <= 50 THEN 1 ELSE 0 END)) AS ic
    FROM public.analysis_jobs j
    LEFT JOIN public.analysis_aggregates a ON j.id = a.job_id
    WHERE j.fen_hash = ANY(fen_hashes)
    GROUP BY j.fen_hash;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 뷰에 대한 비인가 DML 조작을 방지하기 위하여, 익명 및 일반인증 세션에서는 오직 SELECT만 허용하고 INSERT, UPDATE, DELETE 권한은 강제 박탈합니다.
REVOKE ALL ON TABLE public.analysis_position_summaries FROM public, anon, authenticated;
GRANT SELECT ON TABLE public.analysis_position_summaries TO anon, authenticated;

