-- 기존 행사별 템플릿들을 전역으로 마이그레이션하는 SQL 스크립트 (수정된 버전)

-- 1단계: 기존 행사별 템플릿들을 전역으로 변경
UPDATE namecards 
SET 
  event_id = NULL,
  is_global = true
WHERE 
  event_id IS NOT NULL 
  AND is_global = false;

-- 2단계: 마이그레이션 결과 확인
SELECT 
  'Total global templates' as category,
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

-- 3단계: 중복된 템플릿 이름 확인 (선택사항)
SELECT 
  template_name,
  COUNT(*) as duplicate_count
FROM namecards 
WHERE is_global = true
GROUP BY template_name
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC;
