-- 2단계: 제약 조건 삭제 (실제 이름으로)
-- 위에서 확인한 정확한 이름을 사용하세요
ALTER TABLE prize_winners DROP CONSTRAINT IF EXISTS prize_winners_prize_draw_id_profile_id_key;
