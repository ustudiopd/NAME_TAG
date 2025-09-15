-- 4단계: 최종 확인
SELECT conname, contype, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conrelid = 'prize_winners'::regclass;
