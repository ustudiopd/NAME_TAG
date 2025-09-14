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

-- 5. namecards 테이블 생성 (사전 인쇄된 명찰 용지 맞춤 출력용)
CREATE TABLE IF NOT EXISTS namecards (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  template_name TEXT NOT NULL,
  canvas_json JSONB NOT NULL,
  is_default BOOLEAN DEFAULT false,
  -- 템플릿 설정 정보
  template_settings JSONB, -- 용지 크기, 배경 이미지, 인쇄 영역 등 설정
              paper_width_cm DECIMAL(5,2) DEFAULT 9.0, -- 명찰 용지 너비 (cm)
  paper_height_cm DECIMAL(5,2) DEFAULT 12.5, -- 명찰 용지 높이 (cm)
  background_image_url TEXT, -- 배경 이미지 URL (가이드용)
  print_areas JSONB, -- 인쇄 영역 정보 [{id, name, x, y, width, height, type}]
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. namecards 테이블 RLS 정책
CREATE POLICY "Allow public access to namecards" ON "public"."namecards"
FOR ALL USING (true);

-- 7. namecards 테이블 인덱스
CREATE INDEX IF NOT EXISTS idx_namecards_event_id ON namecards(event_id);
CREATE INDEX IF NOT EXISTS idx_namecards_template_name ON namecards(template_name);
CREATE INDEX IF NOT EXISTS idx_namecards_paper_size ON namecards(paper_width_cm, paper_height_cm);

-- 8. 기존 namecards 테이블에 새 컬럼 추가 (마이그레이션)
ALTER TABLE namecards ADD COLUMN IF NOT EXISTS is_default BOOLEAN DEFAULT false;
ALTER TABLE namecards ADD COLUMN IF NOT EXISTS template_settings JSONB;
ALTER TABLE namecards ADD COLUMN IF NOT EXISTS paper_width_cm DECIMAL(5,2) DEFAULT 9.0;
ALTER TABLE namecards ADD COLUMN IF NOT EXISTS paper_height_cm DECIMAL(5,2) DEFAULT 12.5;
ALTER TABLE namecards ADD COLUMN IF NOT EXISTS background_image_url TEXT;
ALTER TABLE namecards ADD COLUMN IF NOT EXISTS print_areas JSONB;

-- 9. 스토리지 버킷 생성 및 RLS 정책 설정
-- namecard-images 버킷 생성 (이미 존재할 수 있음)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('namecard-images', 'namecard-images', true)
ON CONFLICT (id) DO NOTHING;

-- 스토리지 버킷 RLS 정책 설정
-- 기존 정책이 있다면 삭제
DROP POLICY IF EXISTS "Allow public uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow public access" ON storage.objects;
DROP POLICY IF EXISTS "Allow public deletes" ON storage.objects;

-- 모든 사용자가 파일 업로드 가능
CREATE POLICY "Allow public uploads" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'namecard-images');

-- 모든 사용자가 파일 조회 가능
CREATE POLICY "Allow public access" ON storage.objects
FOR SELECT USING (bucket_id = 'namecard-images');

-- 모든 사용자가 파일 삭제 가능
CREATE POLICY "Allow public deletes" ON storage.objects
FOR DELETE USING (bucket_id = 'namecard-images');

-- 10. 샘플 데이터 삽입
INSERT INTO events (event_name, event_date, description) VALUES
('9.19 행사', '2024-09-19', '9월 19일 행사'),
('9.20 행사', '2024-09-20', '9월 20일 행사'),
('10.1 행사', '2024-10-01', '10월 1일 행사')
ON CONFLICT DO NOTHING;
