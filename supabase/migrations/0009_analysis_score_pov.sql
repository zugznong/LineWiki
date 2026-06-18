-- supabase/migrations/0009_analysis_score_pov.sql
-- 9. Add Score POV Metadata to Analysis Tables

-- analysis_observations 테이블에 score_pov 컬럼 추가
-- 'white' = White's point of view (항상 백 측 기준으로 점수가 상승하면 좋고 하락하면 나쁨)
-- 'side_to_move' = 현재 턴 진영 기준 (상대적 point of view)
ALTER TABLE public.analysis_observations 
    ADD COLUMN IF NOT EXISTS score_pov TEXT DEFAULT 'white' NOT NULL;

-- analysis_aggregates 테이블에 score_pov 컬럼 추가
ALTER TABLE public.analysis_aggregates 
    ADD COLUMN IF NOT EXISTS score_pov TEXT DEFAULT 'white' NOT NULL;
