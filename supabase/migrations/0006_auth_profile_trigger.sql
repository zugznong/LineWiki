-- supabase/migrations/0006_auth_profile_trigger.sql
-- auth.users 가입 시 public.profiles 로우를 자동 생성하는 트리거 함수

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  base_username TEXT;
  final_username TEXT;
  counter INT := 1;
BEGIN
  -- 1. 이메일 기반 base_username 추출
  IF NEW.email IS NOT NULL AND NEW.email <> '' THEN
    base_username := split_part(NEW.email, '@', 1);
  ELSE
    base_username := 'user_' || substring(NEW.id::text from 1 for 8);
  END IF;

  -- 영문, 숫자, 언더스코어 외의 특수문자는 언더스코어로 정규화 처리
  base_username := regexp_replace(base_username, '[^a-zA-Z0-9_]', '_', 'g');
  
  -- 너무 짧은 경우 예외 처리
  IF length(base_username) < 3 THEN
    base_username := base_username || '_user';
  END IF;

  final_username := base_username;

  -- 2. 중복 제약 조건 방지를 위해 유일성 검증 루프
  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE username = final_username) LOOP
    final_username := base_username || counter::text;
    counter := counter + 1;
  END LOOP;

  -- 3. public.profiles 테이블에 새로운 프로필 행 삽입
  INSERT INTO public.profiles (
    id,
    username,
    display_name,
    avatar_url,
    bio
  ) VALUES (
    NEW.id,
    final_username,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NULL),
    NULL
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 4. auth.users 테이블에 가입 완료 후 실행되는 트리거 정의
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
