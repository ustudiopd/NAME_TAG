-- 행사 관리 시스템을 위한 데이터베이스 스키마

-- 1. events 테이블 생성
CREATE TABLE IF NOT EXISTS events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_name TEXT NOT NULL,
  event_date DATE NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. profiles 테이블에 event_id 컬럼 추가
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS event_id UUID REFERENCES events(id) ON DELETE CASCADE;

-- 3. RLS 정책 설정
-- events 테이블 정책
CREATE POLICY "Allow public access to events" ON "public"."events"
FOR ALL USING (true);

-- profiles 테이블 정책 (기존 정책이 있다면 삭제 후 재생성)
DROP POLICY IF EXISTS "Allow public insert on profiles" ON "public"."profiles";
DROP POLICY IF EXISTS "Allow public select on profiles" ON "public"."profiles";
DROP POLICY IF EXISTS "Allow public update on profiles" ON "public"."profiles";
DROP POLICY IF EXISTS "Allow public delete on profiles" ON "public"."profiles";

CREATE POLICY "Allow public access to profiles" ON "public"."profiles"
FOR ALL USING (true);

-- 4. 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_profiles_event_id ON profiles(event_id);
CREATE INDEX IF NOT EXISTS idx_events_event_date ON events(event_date);

-- 5. 샘플 데이터 삽입
INSERT INTO events (event_name, event_date, description) VALUES
('9.19 행사', '2024-09-19', '9월 19일 행사'),
('9.20 행사', '2024-09-20', '9월 20일 행사'),
('10.1 행사', '2024-10-01', '10월 1일 행사')
ON CONFLICT DO NOTHING;
