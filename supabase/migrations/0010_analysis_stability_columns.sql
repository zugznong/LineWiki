-- supabase/migrations/0010_analysis_stability_columns.sql
-- 10. Add Precision, Node Counts & Evaluation Stability Metrics to Analysis Aggregates

-- analysis_aggregates 테이블에 정밀 수치, 탐색 노드량, 변동 여부, 신뢰 척도 컬럼을 추가합니다.
ALTER TABLE public.analysis_aggregates 
    ADD COLUMN IF NOT EXISTS min_depth_reached INT DEFAULT 0,
    ADD COLUMN IF NOT EXISTS max_depth_reached INT DEFAULT 0,
    ADD COLUMN IF NOT EXISTS min_nodes BIGINT DEFAULT 0,
    ADD COLUMN IF NOT EXISTS max_nodes BIGINT DEFAULT 0,
    ADD COLUMN IF NOT EXISTS sign_flip_count INT DEFAULT 0,
    ADD COLUMN IF NOT EXISTS pv_change_count INT DEFAULT 0,
    ADD COLUMN IF NOT EXISTS confidence_label TEXT DEFAULT 'provisional', -- 'stable', 'provisional', 'volatile', 'unstable'
    ADD COLUMN IF NOT EXISTS is_stable BOOLEAN DEFAULT FALSE;
