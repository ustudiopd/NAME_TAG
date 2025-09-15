# 데이터베이스 스키마 정보

## 📊 테이블 구조

### events 테이블 (행사 정보)
| 컬럼명 | 데이터 타입 | NULL 허용 | 설명 |
|--------|-------------|-----------|------|
| id | uuid | NO | 기본 키 (자동 생성) |
| event_name | text | NO | 행사명 |
| event_date | date | NO | 행사 날짜 |
| description | text | YES | 행사 설명 |
| created_at | timestamp with time zone | YES | 생성 시간 |
| updated_at | timestamp with time zone | YES | 수정 시간 |

### profiles 테이블 (명단 정보)
| 컬럼명 | 데이터 타입 | NULL 허용 | 설명 |
|--------|-------------|-----------|------|
| id | uuid | NO | 기본 키 (자동 생성) |
| created_at | timestamp with time zone | NO | 생성 시간 |
| company | text | YES | 회사명 |
| name | text | YES | 이름 |
| title | text | YES | 직급 |
| is_checked_in | boolean | NO | 체크인 상태 (기본값: false) |
| checked_in_at | timestamp with time zone | YES | 체크인 시간 |
| event_id | uuid | YES | 행사 ID (외래키) |
| phone_number | text | YES | 전화번호 (동명이인 구분용) |
| email | text | YES | 이메일 (동명이인 구분용) |

### namecards 테이블 (명찰 템플릿)
| 컬럼명 | 데이터 타입 | NULL 허용 | 설명 |
|--------|-------------|-----------|------|
| id | uuid | NO | 기본 키 (자동 생성) |
| event_id | uuid | YES | 행사 ID (외래키) |
| template_name | text | NO | 템플릿 이름 |
| canvas_json | jsonb | NO | Fabric.js 캔버스 JSON |
| created_at | timestamp with time zone | YES | 생성 시간 |
| updated_at | timestamp with time zone | YES | 수정 시간 |
| template_settings | jsonb | YES | 템플릿 설정 |
| paper_width_cm | numeric | YES | 용지 너비 (기본값: 9.5cm) |
| paper_height_cm | numeric | YES | 용지 높이 (기본값: 12.5cm) |
| background_image_url | text | YES | 배경 이미지 URL |
| print_areas | jsonb | YES | 인쇄 영역 설정 |
| is_default | boolean | YES | 기본 템플릿 여부 (기본값: false) |
| is_global | boolean | YES | 전역 템플릿 여부 (기본값: false) |

### prize_draws 테이블 (경품추첨 세션)
| 컬럼명 | 데이터 타입 | NULL 허용 | 설명 |
|--------|-------------|-----------|------|
| id | uuid | NO | 기본 키 (자동 생성) |
| event_id | uuid | YES | 행사 ID (외래키) |
| title | text | NO | 경품추첨 제목 |
| description | text | YES | 경품추첨 설명 |
| is_active | boolean | YES | 활성 상태 (기본값: true) |
| created_at | timestamp with time zone | YES | 생성 시간 |
| updated_at | timestamp with time zone | YES | 수정 시간 |

### prizes 테이블 (경품 정보)
| 컬럼명 | 데이터 타입 | NULL 허용 | 설명 |
|--------|-------------|-----------|------|
| id | uuid | NO | 기본 키 (자동 생성) |
| prize_draw_id | uuid | YES | 경품추첨 ID (외래키) |
| name | text | NO | 경품명 |
| description | text | YES | 경품 설명 |
| quantity | integer | NO | 수량 (기본값: 1) |
| rank_order | integer | NO | 등수 순서 (1등, 2등, 3등) |
| image_url | text | YES | 경품 이미지 URL |
| created_at | timestamp with time zone | YES | 생성 시간 |

### prize_winners 테이블 (추첨 결과)
| 컬럼명 | 데이터 타입 | NULL 허용 | 설명 |
|--------|-------------|-----------|------|
| id | uuid | NO | 기본 키 (자동 생성) |
| prize_draw_id | uuid | YES | 경품추첨 ID (외래키) |
| prize_id | uuid | YES | 경품 ID (외래키) |
| profile_id | uuid | YES | 참가자 ID (외래키) |
| won_at | timestamp with time zone | YES | 당첨 시간 (기본값: now()) |

## 🔗 관계 설정

### 외래키 관계
- `profiles.event_id` → `events.id`
- `namecards.event_id` → `events.id`
- `prize_draws.event_id` → `events.id`
- `prizes.prize_draw_id` → `prize_draws.id`
- `prize_winners.prize_draw_id` → `prize_draws.id`
- `prize_winners.prize_id` → `prizes.id`
- `prize_winners.profile_id` → `profiles.id`
- CASCADE DELETE: 행사 삭제 시 관련 명단, 템플릿, 경품추첨도 함께 삭제

### 인덱스
- `idx_profiles_event_id`: profiles.event_id 인덱스
- `idx_events_event_date`: events.event_date 인덱스
- `idx_profiles_checked_in`: profiles.is_checked_in 인덱스
- `idx_namecards_event_id`: namecards.event_id 인덱스
- `idx_namecards_is_global`: namecards.is_global 인덱스 (전역 템플릿 검색용)
- `idx_profiles_phone_email`: profiles.phone_number, email 복합 인덱스 (동명이인 검색용)
- `idx_prize_draws_event_id`: prize_draws.event_id 인덱스
- `idx_prizes_prize_draw_id`: prizes.prize_draw_id 인덱스
- `idx_prize_winners_prize_draw_id`: prize_winners.prize_draw_id 인덱스
- `idx_prize_winners_profile_id`: prize_winners.profile_id 인덱스

## 🔒 보안 정책 (RLS)

### events 테이블
```sql
CREATE POLICY "Allow public access to events" ON "public"."events"
FOR ALL USING (true);
```

### profiles 테이블
```sql
CREATE POLICY "Allow public access to profiles" ON "public"."profiles"
FOR ALL USING (true);
```

## 📝 샘플 데이터

### events 테이블 샘플
```sql
INSERT INTO events (event_name, event_date, description) VALUES
('9.19 행사', '2024-09-19', '9월 19일 행사'),
('9.20 행사', '2024-09-20', '9월 20일 행사'),
('10.1 행사', '2024-10-01', '10월 1일 행사'),
('10.15 컨퍼런스', '2024-10-15', '10월 15일 컨퍼런스'),
('11.1 워크샵', '2024-11-01', '11월 1일 워크샵');
```

## 🛠️ 주요 쿼리 패턴

### 행사별 명단 조회
```sql
SELECT p.*, e.event_name, e.event_date
FROM profiles p
JOIN events e ON p.event_id = e.id
WHERE p.event_id = $1
ORDER BY p.created_at DESC;
```

### 동명이인 검색 (전화번호/이메일 기반)
```sql
SELECT p.*, e.event_name, e.event_date
FROM profiles p
JOIN events e ON p.event_id = e.id
WHERE p.event_id = $1 
  AND (p.phone_number = $2 OR p.email = $3)
ORDER BY p.created_at DESC;
```

### 행사 통계 조회
```sql
SELECT 
  COUNT(*) as total,
  COUNT(CASE WHEN is_checked_in = true THEN 1 END) as checked_in,
  COUNT(CASE WHEN is_checked_in = false THEN 1 END) as not_checked_in
FROM profiles 
WHERE event_id = $1;
```

### 체크인 상태 업데이트
```sql
UPDATE profiles 
SET 
  is_checked_in = $2,
  checked_in_at = CASE WHEN $2 = true THEN NOW() ELSE NULL END
WHERE id = $1;
```

## 🔧 데이터베이스 함수

### JavaScript/TypeScript 함수
- `getAllEvents()`: 모든 행사 조회
- `createEvent(eventData)`: 행사 생성
- `updateEvent(id, updates)`: 행사 수정
- `deleteEvent(id)`: 행사 삭제
- `getProfilesByEvent(eventId)`: 특정 행사의 명단 조회
- `getEventStats(eventId)`: 행사 통계 조회
- `createProfile(profileData)`: 명단 생성
- `updateProfile(id, updates)`: 명단 수정
- `updateCheckInStatus(id, isCheckedIn)`: 체크인 상태 업데이트
- `searchProfilesByContact(eventId, phoneNumber, email)`: 전화번호/이메일로 동명이인 검색
- `getTemplatesByEvent(eventId)`: 행사별 명찰 템플릿 조회
- `createTemplate(templateData)`: 명찰 템플릿 생성
- `updateTemplate(id, updates)`: 명찰 템플릿 수정
- `getPrizeDrawsByEvent(eventId)`: 행사별 경품추첨 조회
- `createPrizeDraw(eventId, data)`: 경품추첨 생성
- `updatePrizeDraw(prizeDrawId, data)`: 경품추첨 수정
- `deletePrizeDraw(prizeDrawId)`: 경품추첨 삭제
- `getPrizesByPrizeDraw(prizeDrawId)`: 경품추첨별 경품 조회
- `createPrize(prizeDrawId, data)`: 경품 생성
- `updatePrize(prizeId, data)`: 경품 수정
- `deletePrize(prizeId)`: 경품 삭제
- `executePrizeDraw(prizeDrawId)`: 경품추첨 실행
- `getPrizeWinners(prizeDrawId)`: 추첨 결과 조회
- `resetPrizeDraw(prizeDrawId)`: 추첨 결과 초기화

## 📈 성능 최적화

### 쿼리 최적화
- 인덱스를 활용한 빠른 조회
- JOIN 쿼리 최적화
- 페이지네이션 지원

### 데이터 무결성
- 외래키 제약조건
- NOT NULL 제약조건
- 기본값 설정

---
**업데이트일**: 2025년 1월 27일  
**데이터베이스**: Supabase PostgreSQL  
**버전**: 3.0 (경품추첨 기능 추가, 전역 템플릿 지원)
