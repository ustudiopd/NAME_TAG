-- 데이터 마이그레이션 스크립트
-- 기존 프로젝트 (ekmuddykdzebbxmgigif)에서 새 프로젝트 (gaeidefaprbhowallumd, uslab-ai)로 데이터 복사
-- 
-- 사용 방법:
-- 1. 기존 프로젝트에서 이 스크립트를 실행하여 데이터를 조회
-- 2. 조회한 데이터를 새 프로젝트에 삽입
-- 
-- 또는 Supabase Dashboard의 SQL Editor에서 직접 실행

-- ============================================
-- 1. events 데이터 마이그레이션
-- ============================================
-- 기존 프로젝트에서 실행:
-- SELECT * FROM public.events;
-- 
-- 새 프로젝트에 삽입 (아래 형식으로):
INSERT INTO nametag.events (id, event_name, event_date, description, created_at, updated_at)
SELECT id, event_name, event_date, description, created_at, updated_at
FROM public.events
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 2. profiles 데이터 마이그레이션
-- ============================================
INSERT INTO nametag.profiles (
  id, created_at, company, name, title, is_checked_in, 
  checked_in_at, event_id, phone_number, email
)
SELECT 
  id, created_at, company, name, title, is_checked_in,
  checked_in_at, event_id, phone_number, email
FROM public.profiles
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 3. namecards 데이터 마이그레이션
-- ============================================
INSERT INTO nametag.namecards (
  id, event_id, template_name, canvas_json, created_at, updated_at,
  template_settings, paper_width_cm, paper_height_cm, 
  background_image_url, print_areas, is_default, is_global
)
SELECT 
  id, event_id, template_name, canvas_json, created_at, updated_at,
  template_settings, paper_width_cm, paper_height_cm,
  background_image_url, print_areas, is_default, is_global
FROM public.namecards
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 4. text_object_settings 데이터 마이그레이션
-- ============================================
INSERT INTO nametag.text_object_settings (
  id, event_id, text_content, left_position, top_position,
  font_size, font_family, font_weight, fill_color, text_align,
  origin_x, origin_y, angle, opacity, scale_x, scale_y,
  is_default, created_at, updated_at
)
SELECT 
  id, event_id, text_content, left_position, top_position,
  font_size, font_family, font_weight, fill_color, text_align,
  origin_x, origin_y, angle, opacity, scale_x, scale_y,
  is_default, created_at, updated_at
FROM public.text_object_settings
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 5. text_object_snapshots 데이터 마이그레이션
-- ============================================
INSERT INTO nametag.text_object_snapshots (
  id, event_id, profile_id, snapshot_name,
  company_text, company_layout, name_text, name_layout,
  title_text, title_layout, full_state, created_at, updated_at
)
SELECT 
  id, event_id, profile_id, snapshot_name,
  company_text, company_layout, name_text, name_layout,
  title_text, title_layout, full_state, created_at, updated_at
FROM public.text_object_snapshots
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 6. prize_draws 데이터 마이그레이션
-- ============================================
INSERT INTO nametag.prize_draws (
  id, event_id, title, description, is_active,
  created_at, updated_at, selected_participants
)
SELECT 
  id, event_id, title, description, is_active,
  created_at, updated_at, selected_participants
FROM public.prize_draws
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 7. prizes 데이터 마이그레이션
-- ============================================
INSERT INTO nametag.prizes (
  id, prize_draw_id, name, description, quantity,
  rank_order, image_url, created_at
)
SELECT 
  id, prize_draw_id, name, description, quantity,
  rank_order, image_url, created_at
FROM public.prizes
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 8. prize_winners 데이터 마이그레이션
-- ============================================
INSERT INTO nametag.prize_winners (
  id, prize_draw_id, prize_id, profile_id, won_at
)
SELECT 
  id, prize_draw_id, prize_id, profile_id, won_at
FROM public.prize_winners
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 데이터 마이그레이션 완료 후 검증
-- ============================================
-- 새 프로젝트에서 실행하여 데이터 개수 확인:
SELECT 
  'events' as table_name, COUNT(*) as count FROM nametag.events
UNION ALL
SELECT 'profiles', COUNT(*) FROM nametag.profiles
UNION ALL
SELECT 'namecards', COUNT(*) FROM nametag.namecards
UNION ALL
SELECT 'text_object_settings', COUNT(*) FROM nametag.text_object_settings
UNION ALL
SELECT 'text_object_snapshots', COUNT(*) FROM nametag.text_object_snapshots
UNION ALL
SELECT 'prize_draws', COUNT(*) FROM nametag.prize_draws
UNION ALL
SELECT 'prizes', COUNT(*) FROM nametag.prizes
UNION ALL
SELECT 'prize_winners', COUNT(*) FROM nametag.prize_winners;

