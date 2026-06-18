-- supabase/migrations/0002_research_foundation.sql
-- 2. Chess Research Schema

-- Visibility 타입 제약 정의 (도메인 범위)
-- postgres 에서는 create domain 이나 check 제약을 통해 구현 가능합니다.
CREATE TABLE IF NOT EXISTS public.research_documents (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    author_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    visibility TEXT NOT NULL CHECK (visibility IN ('private', 'unlisted', 'public')) DEFAULT 'private',
    is_deleted BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 타임스탬프 업데이트 트리거
CREATE TRIGGER update_research_documents_updated_at
    BEFORE UPDATE ON public.research_documents
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Research Lines 테이블 (FEN 해시 및 오프닝 라인 데이터 저장)
CREATE TABLE IF NOT EXISTS public.research_lines (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    document_id UUID REFERENCES public.research_documents(id) ON DELETE CASCADE NOT NULL,
    fen_text TEXT NOT NULL,
    fen_hash TEXT NOT NULL, -- 검색 및 인덱싱 가속을 위한 FEN 해시
    san_moves TEXT[] NOT NULL, -- PGN의 SAN 수순 리스트
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Research Revisions 테이블 (개정 히스토리 관리)
CREATE TABLE IF NOT EXISTS public.research_revisions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    document_id UUID REFERENCES public.research_documents(id) ON DELETE CASCADE NOT NULL,
    revision_number INT NOT NULL,
    content_snapshot JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- RLS 활성화
ALTER TABLE public.research_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.research_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.research_revisions ENABLE ROW LEVEL SECURITY;

-- Security Policies 정의
-- 1. documents 정책
--  - public 혹은 unlisted 상태이면서 삭제 플래그(is_deleted)가 꺼져 있으면 누구나 SELECT 가능
--  - private은 소유자만 SELECT 가능
CREATE POLICY "Select active visible documents"
    ON public.research_documents
    FOR SELECT
    USING (
        is_deleted = FALSE AND (
            visibility IN ('public', 'unlisted') OR 
            auth.uid() = author_id
        )
    );

--  - 본인 소유의 문서만 업데이트/소프트 삭제 가능
CREATE POLICY "Modify owned documents"
    ON public.research_documents
    FOR ALL
    USING (auth.uid() = author_id)
    WITH CHECK (auth.uid() = author_id);

-- 2. lines 정책
--  - 연관된 문서가 본인 소유이거나, 공개 상태일 때 select 가능
CREATE POLICY "Select linked research lines"
    ON public.research_lines
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.research_documents d
            WHERE d.id = document_id 
              AND d.is_deleted = FALSE 
              AND (d.visibility IN ('public', 'unlisted') OR d.author_id = auth.uid())
        )
    );

--  - 본인 소유 문서 아래에만 lines 삽입/삭제 가능
CREATE POLICY "Modify linked research lines"
    ON public.research_lines
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.research_documents d
            WHERE d.id = document_id AND d.author_id = auth.uid()
        )
    );

-- 3. revisions 정책
--  - 문헌 변경 기록 또한 위와 유사하게 보안 설정 적용
CREATE POLICY "Select document revisions"
    ON public.research_revisions
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.research_documents d
            WHERE d.id = document_id 
              AND d.is_deleted = FALSE 
              AND (d.visibility IN ('public', 'unlisted') OR d.author_id = auth.uid())
        )
    );

CREATE POLICY "Insert document revisions"
    ON public.research_revisions
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.research_documents d
            WHERE d.id = document_id AND d.author_id = auth.uid()
        )
    );
