-- 기존 데이터를 event_layouts로 마이그레이션하는 스크립트
-- 실행 전 백업 권장

-- 1. 기존 namecards 테이블의 이벤트별 템플릿을 event_layouts로 마이그레이션
-- (is_global = false이고 event_id가 있는 경우)

INSERT INTO nametag.event_layouts (
  event_id,
  template_id,
  canvas_json,
  paper_width_cm,
  paper_height_cm,
  background_image_url,
  print_areas,
  created_at,
  updated_at
)
SELECT DISTINCT ON (nc.event_id)
  nc.event_id,
  nc.id as template_id,
  nc.canvas_json,
  COALESCE(nc.paper_width_cm, 9.0) as paper_width_cm,
  COALESCE(nc.paper_height_cm, 12.5) as paper_height_cm,
  nc.background_image_url,
  nc.print_areas,
  nc.created_at,
  nc.updated_at
FROM nametag.namecards nc
WHERE nc.event_id IS NOT NULL
  AND (nc.is_global IS NULL OR nc.is_global = false)
  AND NOT EXISTS (
    SELECT 1 FROM nametag.event_layouts el 
    WHERE el.event_id = nc.event_id
  )
ORDER BY nc.event_id, nc.updated_at DESC;

-- 2. text_object_snapshots의 full_state를 canvas_json으로 마이그레이션
-- (full_state가 있고 canvas_json이 NULL인 경우)

UPDATE nametag.text_object_snapshots
SET canvas_json = full_state
WHERE full_state IS NOT NULL 
  AND canvas_json IS NULL;

-- 3. 이벤트별 최신 스냅샷을 event_layouts의 canvas_json으로 업데이트
-- (스냅샷이 더 최신인 경우에만)

UPDATE nametag.event_layouts el
SET 
  canvas_json = (
    SELECT tos.full_state
    FROM nametag.text_object_snapshots tos
    WHERE tos.event_id = el.event_id
      AND tos.profile_id IS NULL
      AND tos.full_state IS NOT NULL
    ORDER BY tos.created_at DESC
    LIMIT 1
  ),
  updated_at = (
    SELECT tos.created_at
    FROM nametag.text_object_snapshots tos
    WHERE tos.event_id = el.event_id
      AND tos.profile_id IS NULL
      AND tos.full_state IS NOT NULL
    ORDER BY tos.created_at DESC
    LIMIT 1
  )
WHERE EXISTS (
  SELECT 1
  FROM nametag.text_object_snapshots tos
  WHERE tos.event_id = el.event_id
    AND tos.profile_id IS NULL
    AND tos.full_state IS NOT NULL
    AND tos.created_at > el.updated_at
);

-- 마이그레이션 결과 확인
SELECT 
  'event_layouts' as table_name,
  COUNT(*) as count
FROM nametag.event_layouts
UNION ALL
SELECT 
  'text_object_snapshots with canvas_json' as table_name,
  COUNT(*) as count
FROM nametag.text_object_snapshots
WHERE canvas_json IS NOT NULL;

