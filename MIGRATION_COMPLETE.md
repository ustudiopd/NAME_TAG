# Supabase 마이그레이션 완료 가이드

## 📋 프로젝트 정보

- **프로젝트 이름**: uslab-ai
- **프로젝트 ID**: gaeidefaprbhowallumd
- **프로젝트 URL**: https://gaeidefaprbhowallumd.supabase.co
- **스키마**: nametag

## ✅ 완료된 작업

1. **스키마 생성**: `nametag` 스키마 생성 완료
2. **테이블 구조 마이그레이션**: 8개 테이블 생성 완료
   - events
   - profiles
   - namecards
   - text_object_settings
   - text_object_snapshots
   - prize_draws
   - prizes
   - prize_winners
3. **인덱스 생성**: 모든 테이블에 인덱스 생성 완료
4. **RLS 정책 설정**: 모든 테이블에 RLS 정책 설정 완료
5. **Storage 버킷 생성**: `nametag-images` 버킷 생성 및 정책 설정 완료
6. **코드 수정**: 
   - `lib/supabaseClient.js`: 새 프로젝트 URL 및 스키마 설정
   - `lib/storage.js`: 버킷 이름 변경

## 📋 남은 작업

### 1. 데이터 마이그레이션

데이터 마이그레이션은 `migrate_data.sql` 파일을 사용하여 진행하세요.

**방법 1: Supabase Dashboard 사용 (권장)**

1. 기존 프로젝트 (`ekmuddykdzebbxmgigif`) Dashboard → SQL Editor
2. `migrate_data.sql` 파일의 각 INSERT 문을 복사하여 실행
3. 또는 전체 스크립트를 한 번에 실행

**방법 2: Supabase CLI 사용**

```bash
# 기존 프로젝트에서 데이터 추출
supabase db dump --data-only -f data_backup.sql

# 새 프로젝트에 데이터 삽입 (스키마 이름 변경 필요)
sed 's/public\./nametag./g' data_backup.sql | \
  psql -h db.xiygbsaewuqocaxoxeqn.supabase.co -U postgres -d postgres
```

### 2. Storage 파일 마이그레이션

Storage 파일은 수동으로 복사해야 합니다.

**방법 1: Supabase Dashboard 사용**

1. 기존 프로젝트 Dashboard → Storage → `namecard-images` 버킷
2. 모든 파일 다운로드
3. 새 프로젝트 Dashboard → Storage → `nametag-images` 버킷
4. 파일 업로드

**방법 2: Supabase CLI 사용**

```bash
# 기존 프로젝트에서 파일 다운로드
supabase storage download namecard-images ./storage_backup

# 새 프로젝트에 파일 업로드
supabase storage upload nametag-images ./storage_backup/*
```

**방법 3: Python 스크립트 사용**

Storage 파일 마이그레이션을 위한 Python 스크립트를 생성할 수 있습니다.

### 3. 환경 변수 설정 (선택사항)

`.env.local` 파일을 생성하여 환경 변수를 설정할 수 있습니다:

```env
NEXT_PUBLIC_SUPABASE_URL=https://gaeidefaprbhowallumd.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdhZWlkZWZhcHJiaG93YWxsdW1kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM2MjI2NjgsImV4cCI6MjA3OTE5ODY2OH0.WNdr6Wq_-Rd5fxna3kKazPtkMiSVC4dDrDDad_Kf1mU
```

현재는 `lib/supabaseClient.js`에 하드코딩되어 있으므로, 환경 변수 파일이 없어도 동작합니다.

## 🔍 검증 방법

### 데이터 마이그레이션 검증

새 프로젝트의 Supabase Dashboard → SQL Editor에서 실행:

```sql
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
```

예상 결과:
- events: 4
- profiles: 451
- namecards: 6
- text_object_settings: 0
- text_object_snapshots: 18
- prize_draws: 5
- prizes: 13
- prize_winners: 110

### Storage 버킷 검증

새 프로젝트 Dashboard → Storage → `nametag-images` 버킷에서 파일 목록 확인

## 🚀 다음 단계

1. 데이터 마이그레이션 실행 (`migrate_data.sql`)
2. Storage 파일 복사
3. 애플리케이션 테스트
4. 기존 프로젝트 백업 (선택사항)

## 📝 참고사항

- 모든 테이블은 `nametag` 스키마에 생성되었습니다
- 코드에서 스키마를 명시적으로 설정했으므로, `supabase.from('events')`는 자동으로 `nametag.events`를 참조합니다
- Storage 버킷 이름이 `namecard-images`에서 `nametag-images`로 변경되었습니다
- RLS 정책은 모든 사용자에게 공개 접근을 허용하도록 설정되었습니다 (필요시 수정 가능)

## ⚠️ 주의사항

- 데이터 마이그레이션 전에 기존 프로젝트의 데이터를 백업하세요
- Storage 파일 마이그레이션 시 파일 경로나 URL이 변경될 수 있습니다
- 마이그레이션 완료 후 기존 프로젝트는 유지하거나 삭제할 수 있습니다

