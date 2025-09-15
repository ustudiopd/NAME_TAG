-- 기존 행사별 템플릿들을 전역으로 마이그레이션하는 SQL 스크립트

-- 1. 기존 행사별 템플릿들을 전역으로 변경
UPDATE namecards 
SET 
  event_id = NULL,
  is_global = true
WHERE 
  event_id IS NOT NULL 
  AND is_global = false;

-- 2. 중복된 템플릿 이름이 있는 경우 처리 (선택사항)
-- 같은 이름의 템플릿이 여러 개 있는 경우 하나만 남기고 나머지는 이름에 번호 추가
WITH duplicate_templates AS (
  SELECT 
    id,
    template_name,
    ROW_NUMBER() OVER (PARTITION BY template_name ORDER BY created_at) as rn
  FROM namecards 
  WHERE is_global = true
)
UPDATE namecards 
SET template_name = duplicate_templates.template_name || ' (' || (duplicate_templates.rn - 1) || ')'
FROM duplicate_templates
WHERE namecards.id = duplicate_templates.id 
  AND duplicate_templates.rn > 1;

-- 3. 마이그레이션 결과 확인
SELECT 
  'Total templates' as category,
  COUNT(*) as count
FROM namecards 
WHERE is_global = true

UNION ALL

SELECT 
  'Templates with event_id' as category,
  COUNT(*) as count
FROM namecards 
WHERE is_global = true AND event_id IS NOT NULL

UNION ALL

SELECT 
  'Templates without event_id' as category,
  COUNT(*) as count
FROM namecards 
WHERE is_global = true AND event_id IS NULL;
