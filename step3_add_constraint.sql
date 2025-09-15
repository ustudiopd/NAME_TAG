-- 3단계: 올바른 제약 조건 추가
ALTER TABLE prize_winners ADD CONSTRAINT prize_winners_unique_prize_participant 
UNIQUE (prize_draw_id, prize_id, profile_id);
