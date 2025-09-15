-- 현재 prize_winners 테이블의 모든 제약 조건 확인
SELECT conname, contype, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conrelid = 'prize_winners'::regclass
ORDER BY contype, conname;
