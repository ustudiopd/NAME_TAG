-- 1단계: 현재 제약 조건 확인
SELECT conname, contype, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conrelid = 'prize_winners'::regclass
AND contype = 'u';
