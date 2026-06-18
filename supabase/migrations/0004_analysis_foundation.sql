-- supabase/migrations/0004_analysis_foundation.sql
-- 4. Deep Analysis Job & Aggregation Schema

-- Analysis Jobs 테이블 (요청된 엔진 세션 정보 관리)
CREATE TABLE IF NOT EXISTS public.analysis_jobs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    requester_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    fen_text TEXT NOT NULL,
    fen_hash TEXT NOT NULL, -- 검색 및 인덱싱 가속을 위한 FEN 해시
    engine_version TEXT DEFAULT 'Stockfish' NOT NULL, -- 엔진 알고리즘 버전
    target_depth INT NOT NULL DEFAULT 20,
    requested_runs INT NOT NULL DEFAULT 10,
    completed_runs INT NOT NULL DEFAULT 0,
    candidate_set_hash TEXT NOT NULL, -- 후보수 집합의 식별 키
    status TEXT NOT NULL CHECK (status IN ('pending', 'running', 'completed', 'failed')) DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE TRIGGER update_analysis_jobs_updated_at
    BEFORE UPDATE ON public.analysis_jobs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Analysis Runs 테이블 (개별 분석 세션 수행 정보)
CREATE TABLE IF NOT EXISTS public.analysis_runs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    job_id UUID REFERENCES public.analysis_jobs(id) ON DELETE CASCADE NOT NULL,
    worker_id TEXT, -- 워커 분산 식별을 위한 노드 키
    started_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    finished_at TIMESTAMP WITH TIME ZONE
);

-- Analysis Observations 테이블 (개별 수에 대한 평가 샘플 데이터)
CREATE TABLE IF NOT EXISTS public.analysis_observations (
    id BIGSERIAL PRIMARY KEY,
    run_id UUID REFERENCES public.analysis_runs(id) ON DELETE CASCADE NOT NULL,
    root_move_uci TEXT NOT NULL,
    san_move TEXT NOT NULL,
    raw_cp INT, -- 점수 (Centipawns)
    mate_in INT, -- 체크메이트 도달 수 (있을 경우 분리 저장)
    depth_reached INT NOT NULL,
    nodes_evaluated BIGINT,
    nps BIGINT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Analysis Aggregates 테이블 (통합 집계 점수 정보)
CREATE TABLE IF NOT EXISTS public.analysis_aggregates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    job_id UUID REFERENCES public.analysis_jobs(id) ON DELETE CASCADE NOT NULL,
    root_move_uci TEXT NOT NULL,
    san_move TEXT NOT NULL,
    mean_cp_x100 INT NOT NULL, -- 평균 센티폰 소수점 보정값
    stddev_cp_x100 INT NOT NULL, -- 표준 편차 소수점 보정값
    variance_cp2_x100 INT NOT NULL, -- 분산 소수점 보정값
    best_mate_line TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    CONSTRAINT unique_job_move UNIQUE (job_id, root_move_uci)
);

CREATE TRIGGER update_analysis_aggregates_updated_at
    BEFORE UPDATE ON public.analysis_aggregates
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- RLS 활성화
ALTER TABLE public.analysis_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analysis_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analysis_observations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analysis_aggregates ENABLE ROW LEVEL SECURITY;

-- Security Policies 정의
--  - 분석 잡(jobs)은 요청자 본인만 SELECT 검색 가능
CREATE POLICY "Select analysis jobs by requester"
    ON public.analysis_jobs
    FOR SELECT
    USING (auth.uid() = requester_id);

CREATE POLICY "Select analysis aggregates publicly"
    ON public.analysis_aggregates
    FOR SELECT
    USING (true);

--  - 로그인한 사용자만 분석 요청 잡 생성 가능
CREATE POLICY "Users can trigger analysis jobs"
    ON public.analysis_jobs
    FOR INSERT
    WITH CHECK (auth.uid() = requester_id);

--  - 분석 실행(runs) 및 소스 관측 데이터(observations)는 백엔드 워커(service_role)만 Write 가능하게 두거나 관리적 관점 하에 통제
--  - 일반 세션 유저는 SELECT만 허용
CREATE POLICY "Select runs publicly"
    ON public.analysis_runs
    FOR SELECT
    USING (true);

CREATE POLICY "Select observations publicly"
    ON public.analysis_observations
    FOR SELECT
    USING (true);

-- CRITICAL: 워커 노드는 Service Role 바이패스를 사용하므로 일반 클라이언트-세션용 INSERT 정책은 차단해 보안 가드 유지.
