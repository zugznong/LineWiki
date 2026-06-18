-- supabase/migrations/0001_profiles_and_foundation.sql
-- 1. Profiles & Foundation Schema

-- 확장 기능 및 타임스탬프 업데이트 자동화 트리거 함수 생성
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Profiles 테이블 생성
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    username TEXT UNIQUE,
    display_name TEXT,
    avatar_url TEXT,
    bio TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 트리거 설정
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) 활성화
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 구체적인 보안 정책 (Policies) 정의
-- 1. 프로필은 누구나 조회 가능 (공개 정책)
CREATE POLICY "Profiles are publicly readable" 
    ON public.profiles
    FOR SELECT 
    USING (true);

-- 2. 자기 자신의 프로필만 수정 또는 생성 가능
CREATE POLICY "Users can insert their own profile" 
    ON public.profiles
    FOR INSERT 
    WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile" 
    ON public.profiles
    FOR UPDATE 
    USING (auth.uid() = id);
