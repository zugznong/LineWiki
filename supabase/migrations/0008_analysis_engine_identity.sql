-- supabase/migrations/0008_analysis_engine_identity.sql
-- 8. Add Engine Identity Metadata to Analysis Jobs

-- analysis_jobs 테이블에 상세 엔진 구성 식별 컬럼 추가
ALTER TABLE public.analysis_jobs 
    ADD COLUMN IF NOT EXISTS engine_name TEXT DEFAULT 'Stockfish' NOT NULL,
    ADD COLUMN IF NOT EXISTS engine_build TEXT DEFAULT 'WASM' NOT NULL,
    ADD COLUMN IF NOT EXISTS network_name TEXT,
    ADD COLUMN IF NOT EXISTS network_sha TEXT,
    ADD COLUMN IF NOT EXISTS network_mode TEXT,
    ADD COLUMN IF NOT EXISTS threads INT DEFAULT 1,
    ADD COLUMN IF NOT EXISTS hash_mb INT DEFAULT 16;
