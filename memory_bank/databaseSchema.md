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

## 🔗 관계 설정

### 외래키 관계
- `profiles.event_id` → `events.id`
- CASCADE DELETE: 행사 삭제 시 관련 명단도 함께 삭제

### 인덱스
- `idx_profiles_event_id`: profiles.event_id 인덱스
- `idx_events_event_date`: events.event_date 인덱스
- `idx_profiles_checked_in`: profiles.is_checked_in 인덱스

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
**업데이트일**: 2025년 1월 13일  
**데이터베이스**: Supabase PostgreSQL  
**버전**: 1.0
