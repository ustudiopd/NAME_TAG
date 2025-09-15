-- 중복된 템플릿 이름을 수정하는 SQL 스크립트

-- 1단계: 중복된 템플릿 이름 확인
SELECT 
  template_name,
  COUNT(*) as duplicate_count,
  array_agg(id ORDER BY created_at) as template_ids
FROM namecards 
WHERE is_global = true
GROUP BY template_name
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC;

-- 2단계: 중복된 이름을 가진 템플릿들에 번호 추가
-- (첫 번째 템플릿은 원래 이름 유지, 나머지는 번호 추가)
DO $$
DECLARE
    template_record RECORD;
    counter INTEGER;
BEGIN
    -- 중복된 이름을 가진 템플릿들을 처리
    FOR template_record IN 
        SELECT 
            template_name,
            array_agg(id ORDER BY created_at) as template_ids
        FROM namecards 
        WHERE is_global = true
        GROUP BY template_name
        HAVING COUNT(*) > 1
    LOOP
        counter := 1;
        -- 첫 번째 템플릿은 그대로 두고, 나머지에 번호 추가
        FOR i IN 2..array_length(template_record.template_ids, 1) LOOP
            UPDATE namecards 
            SET template_name = template_record.template_name || ' (' || counter || ')'
            WHERE id = template_record.template_ids[i];
            counter := counter + 1;
        END LOOP;
    END LOOP;
END $$;

-- 3단계: 수정 결과 확인
SELECT 
  template_name,
  COUNT(*) as count
FROM namecards 
WHERE is_global = true
GROUP BY template_name
ORDER BY template_name;
