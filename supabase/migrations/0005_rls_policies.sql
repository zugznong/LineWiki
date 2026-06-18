-- supabase/migrations/0005_rls_policies.sql
-- 5. Row Level Security (RLS) & Authorization Policies

-- 이 마이그레이션 파일에서는 이전까지 정의되었던 각 테이블별 보안 규정과 예외 규칙을 취합하고,
-- 클라이언트 브라우저 공인 키(anon_key) 및 서비스 역할 키(service_role)의 사용 한계선을 명확히 수립합니다.

---------------------------------------------------------
-- 5.1 Profiles 보안 정책 및 RLS 재설정 가이드
---------------------------------------------------------
-- profiles 테이블에 대한 기본 RLS 활성화 여부를 보장합니다.
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 기존 정책 중복 방지를 위해 초기화 후 재생성하거나, 덮어씌웁니다.
DROP POLICY IF EXISTS "Profiles are publicly readable" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

-- [READ] 최소 노출 조건: 공개된 프로필만 조회하거나 일차적으로 누구나 셀렉트 가능하도록 기본형 제공
CREATE POLICY "Profiles are publicly readable"
    ON public.profiles
    FOR SELECT
    USING (true);

-- [WRITE] 본인의 프로필 기입에 대한 오너십 바인딩
CREATE POLICY "Users can insert their own profile"
    ON public.profiles
    FOR INSERT
    WITH CHECK (auth.uid() = id);

-- [UPDATE] 본인의 프로필만 수정 허용
CREATE POLICY "Users can update their own profile"
    ON public.profiles
    FOR UPDATE
    USING (auth.uid() = id);


---------------------------------------------------------
-- 5.2 Research Documents, Lines 및 Revisions 보안 상세
---------------------------------------------------------
ALTER TABLE public.research_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.research_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.research_revisions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Select active visible documents" ON public.research_documents;
DROP POLICY IF EXISTS "Modify owned documents" ON public.research_documents;

-- [READ] Visibility 구분에 따른 상세 접근 제어
-- - private: 작성자(author_id) 본인 세션만 읽기 허용
-- - unlisted: URL 다이렉트 매핑을 아는 자 및 본인 허용 (is_deleted = false 환경 하에)
-- - public: 전체 가독 대상 (is_deleted = false 환경 하에)
CREATE POLICY "Select active visible documents"
    ON public.research_documents
    FOR SELECT
    USING (
        is_deleted = FALSE AND (
            (visibility = 'public' OR visibility = 'unlisted') OR 
            (auth.uid() = author_id)
        )
    );

-- [WRITE / UPDATE / DELETE] 문헌 작성자 소유 정책 연동 (오직 소유주만 삽입, 편집, 소프트 삭제 수행)
CREATE POLICY "Modify owned documents"
    ON public.research_documents
    FOR ALL
    USING (auth.uid() = author_id)
    WITH CHECK (auth.uid() = author_id);


---------------------------------------------------------
-- 5.3 Discussion 스레드 및 코멘트 상태 정보 기반 RLS 제어
---------------------------------------------------------
ALTER TABLE public.discussion_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discussion_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Select active threads" ON public.discussion_threads;
DROP POLICY IF EXISTS "Insert individual threads" ON public.discussion_threads;
DROP POLICY IF EXISTS "Update own threads" ON public.discussion_threads;

DROP POLICY IF EXISTS "Select visible comments" ON public.discussion_comments;
DROP POLICY IF EXISTS "Insert thread comments" ON public.discussion_comments;
DROP POLICY IF EXISTS "Update own comments" ON public.discussion_comments;

-- 스레드:
-- - status = 'hidden' 이거나 'deleted' 인 경우 오직 작성자 본인 혹은 관리자(백앤드 호출)만 가시
CREATE POLICY "Select active threads"
    ON public.discussion_threads
    FOR SELECT
    USING (
        status IN ('open', 'locked') OR 
        auth.uid() = author_id
    );

CREATE POLICY "Insert individual threads"
    ON public.discussion_threads
    FOR INSERT
    WITH CHECK (auth.uid() = author_id);

-- 본인 스레드에 대한 수정 권한 부여 (필요 시 관리자 숨김 처리는 bypass 정책에 위임)
CREATE POLICY "Update own threads"
    ON public.discussion_threads
    FOR UPDATE
    USING (auth.uid() = author_id)
    WITH CHECK (auth.uid() = author_id);

-- 댓글:
-- - status = 'hidden' 이거나 'deleted' 인 경우 작성자 본인 제외 차단
CREATE POLICY "Select visible comments"
    ON public.discussion_comments
    FOR SELECT
    USING (
        status = 'visible' OR 
        auth.uid() = author_id
    );

-- 스레드가 잠김('locked') 상태인 경우에는 새로운 댓글을 방지하기 위함
CREATE POLICY "Insert thread comments"
    ON public.discussion_comments
    FOR INSERT
    WITH CHECK (
        auth.uid() = author_id AND
        EXISTS (
            SELECT 1 FROM public.discussion_threads t
            WHERE t.id = thread_id AND t.status NOT IN ('locked', 'hidden', 'deleted')
        )
    );

CREATE POLICY "Update own comments"
    ON public.discussion_comments
    FOR UPDATE
    USING (auth.uid() = author_id)
    WITH CHECK (auth.uid() = author_id);


---------------------------------------------------------
-- 5.4 Analysis 인프라 - 브라우저 Write 금지 및 Worker(service_role) 전용 관리 규칙
---------------------------------------------------------
-- [보안 선언 및 강결 보증 주석]
-- 1. `analysis_runs`, `analysis_observations`, `analysis_aggregates` 테이블에는
--    클라이언트 다이렉트 WRITE(INSERT/UPDATE/DELETE)에 대한 어떠한 RLS Policy도 작성하지 않습니다.
-- 2. 이 테이블들은 전적으로 Rust worker 데몬 및 백엔드(service_role) 권한을 가집니다.
-- 3. 따라서 anon_key 하에 작동하는 사용자는 오로지 평가 데이터 및 연산 잡 상태를 SELECT 검색하는 정책만 부여받습니다.

ALTER TABLE public.analysis_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analysis_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analysis_observations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analysis_aggregates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Select analysis jobs publicly" ON public.analysis_jobs;
DROP POLICY IF EXISTS "Select analysis jobs by requester" ON public.analysis_jobs;
DROP POLICY IF EXISTS "Select analysis aggregates publicly" ON public.analysis_aggregates;
DROP POLICY IF EXISTS "Users can trigger analysis jobs" ON public.analysis_jobs;

-- 잡 요청은 로그인 유저 누구나 생성 가능
CREATE POLICY "Users can trigger analysis jobs"
    ON public.analysis_jobs
    FOR INSERT
    WITH CHECK (auth.uid() = requester_id);

CREATE POLICY "Select analysis jobs by requester"
    ON public.analysis_jobs
    FOR SELECT
    USING (auth.uid() = requester_id);

-- 분석 캐싱 집계 데이터 조회 정책
CREATE POLICY "Select analysis aggregates publicly"
    ON public.analysis_aggregates
    FOR SELECT
    USING (true);

-- 개별 실행 세션 및 관측치 조회 허용 (SELECT 만 가능하게 세팅하며, 일체의 클라이언트 단 삽입/갱신 RLS 정책은 제외 처리)
DROP POLICY IF EXISTS "Select runs publicly" ON public.analysis_runs;
DROP POLICY IF EXISTS "Select observations publicly" ON public.analysis_observations;

CREATE POLICY "Select runs publicly"
    ON public.analysis_runs
    FOR SELECT
    USING (true);

CREATE POLICY "Select observations publicly"
    ON public.analysis_observations
    FOR SELECT
    USING (true);
