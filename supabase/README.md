# Supabase Database Migration Guides

이 디렉토리는 LineWiki에 필요한 PostgreSQL 스키마 및 마이그레이션 변경 파일을 보관하는 소스 컨트롤 영역입니다.

## 1. 구성 파일 목록

- **`0001_profiles_and_foundation.sql`**: 회원 프로필 테이블(`profiles`) 정의 및 Row Level Security (RLS) 기초 정책.
- **`0002_research_foundation.sql`**: 오프닝 연구 데이터 구조(`research_documents`, `research_lines`, `research_revisions`) 및 오너 전용 수정 정책.
- **`0003_discussion_foundation.sql`**: FEN 및 체스 맥락 커뮤니티 질의 장치(`discussion_threads`, `discussion_comments`, `reports`).
- **`0004_analysis_foundation.sql`**: 클라우드 고해상도 서버 분석 및 샘플 통계 정보 파이프라인(`analysis_jobs`, `analysis_runs`, `analysis_observations`, `analysis_aggregates`).
- **`0005_rls_policies.sql`**: 테이블별 심화 Row Level Security(RLS) 보안 격리 정책 확립.
- **`0006_auth_profile_trigger.sql`**: Supabase Auth 회원가입 시 `profiles`가 자동 안착되는 Postgres 트리거 시스템.
- **`0007_analysis_worker_rpc.sql`**: 분산 연산 워커들의 고속 연계용 RPC 원격 프로시저 자격 구성.
- **`0008_analysis_engine_identity.sql`**: Stockfish 엔진 드라이버 버전 식별성 및 무결 속성 테이블 수립.
- **`0009_analysis_score_pov.sql`**: 센티폰 평가 점수 흑백 시점(POV, Point Of View) 조율식 및 유틸리티 뷰 마그네틱.
- **`0010_analysis_stability_columns.sql`**: 분석 값의 수치적 안정성과 변폭 신뢰성 측정을 위한 편차 데이터 메트릭 컬럼 보강.
- **`0011_analysis_job_locking.sql`**: 동시성 일감 수주 충돌 방지용 FOR UPDATE SKIP LOCKED 원자적 락킹 제어 수립.
- **`0012_research_line_unique.sql`**: 오프닝 도큐멘트 내 수순 라인의 무단 중복 방지 고유 제약 및 인덱스 장전.
- **`0013_profile_avatar_storage.sql`**: 프로필 커스텀 아바타 저장을 위한 독자 스토리지 정책 구축.
- **`0014_deep_research_submissions.sql`**: 로컬 웹워커 연산 결과물의 글로벌 수렴 및 '검증 대기 제출'용 테이블 구축.
- **`0015_deep_research_audit.sql`**: 검증 대기 데이터의 엄격 교차 분석 및 정식 승격 감사(Audit) 모듈 연동.
- **`0016_analysis_position_summaries.sql`**: **[성능 핵심 경로]** 대표 FEN 국면에 대해 다중 ROW 풀 스캔을 탈피하고 summaries 기반으로 자식 FEN 및 최선 후보수들의 평가 수치를 초고속 리딩하는 핵심 가속 뷰 및 인덱스 세트.

## 2. 로컬 개발 환경 데이터베이스 적용 방법

Supabase 공식 CLI를 활용하여 스키마를 로컬이나 원격 환경 보드에 직접 포팅할 수 있습니다.

```bash
# 1. Supabase CLI 설치 확인
npm install -g supabase

# 2. 로컬 개발 데이터베이스 기동 (Docker 필수)
supabase start

# 3. 마이그레이션 스키마 스크립트 강제 리셋 및 적용
supabase db reset

# 4. 원격 프로덕션 프로젝트로 스크립트 원격 푸시
supabase login
supabase link --project-ref your-project-ref-id
supabase db push
```

## 3. 보안 안내 (중요)

- 절대 클라이언트 빌드(SvelteKit 빌드 결과물) 또는 `.env` 프론트엔드 공개 환경변수에 `SUPABASE_SERVICE_ROLE_KEY`를 노출해서는 안 됩니다.
- 모든 API 통신은 클라이언트 브라우저 공인 익명 키(`anon_key`) 기반으로 작동하며, 데이터를 생성 또는 수정할 때는 RLS 규칙의 보증 하에 세션 검토가 진행됩니다.
