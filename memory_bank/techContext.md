# 명찰 제작 시스템 - 기술 스택 정보

## 🛠️ 핵심 기술 스택

### 프론트엔드
- **Next.js 14**: React 기반 프레임워크
- **React 18**: UI 라이브러리
- **Tailwind CSS**: 스타일링 프레임워크
- **Fabric.js**: 캔버스 조작 라이브러리
- **XLSX.js**: 엑셀 파일 처리 (클라이언트 사이드)

### 백엔드 및 데이터베이스
- **Supabase**: 백엔드 서비스 (PostgreSQL, Auth, Storage)
- **PostgreSQL**: 관계형 데이터베이스
- **Row Level Security (RLS)**: 데이터 보안 정책

### 개발 환경
- **Node.js 18+**: JavaScript 런타임
- **npm**: 패키지 관리자
- **Vercel**: 배포 플랫폼

## 🏗️ 아키텍처 구조

### 데이터베이스 스키마
- **events 테이블**: 행사 정보 저장
  - `id` (uuid, PK): 행사 고유 ID
  - `event_name` (text): 행사명
  - `event_date` (date): 행사 날짜
  - `description` (text): 행사 설명
  - `created_at`, `updated_at` (timestamptz): 생성/수정 시간

- **profiles 테이블**: 명단 정보 저장
  - `id` (uuid, PK): 프로필 고유 ID
  - `event_id` (uuid, FK): 행사 ID (events 테이블 참조)
  - `company` (text): 회사명
  - `name` (text): 이름
  - `title` (text): 직급
  - `is_checked_in` (boolean): 체크인 상태
  - `checked_in_at` (timestamptz): 체크인 시간
  - `created_at` (timestamptz): 생성 시간

### 핵심 컴포넌트
- **EventManager**: 행사 관리 컴포넌트
- **ProfileList**: 명단 목록 컴포넌트
- **CanvasEditor**: Fabric.js 기반 명찰 편집기
- **PropertyPanel**: 속성 조절 패널
- **ExcelUpload**: 엑셀 파일 업로드 및 컬럼 매핑

## 📁 프로젝트 구조
```
name_tag/
├── app/                  # Next.js App Router
│   ├── globals.css      # 전역 스타일
│   ├── layout.js        # 루트 레이아웃
│   └── page.js          # 메인 페이지
├── components/          # React 컴포넌트
│   ├── EventManager.js  # 행사 관리
│   ├── ProfileList.js   # 명단 목록
│   ├── ProfileForm.js   # 명단 추가 폼
│   ├── CanvasEditor.js  # 캔버스 편집기
│   ├── PropertyPanel.js # 속성 패널
│   ├── ExcelUpload.js   # 엑셀 업로드
│   └── ColumnMapping.js # 컬럼 매핑
├── lib/                 # 유틸리티 함수
│   ├── supabaseClient.js # Supabase 클라이언트
│   ├── database.js      # 데이터베이스 함수
│   ├── eventDatabase.js # 행사 관련 DB 함수
│   ├── storage.js       # 스토리지 함수
│   ├── excelUtils.js    # 엑셀 유틸리티
│   └── testData.js      # 테스트 데이터
├── memory_bank/         # 프로젝트 문서
│   ├── projectbrief.md
│   ├── techContext.md
│   ├── systemPatterns.md
│   ├── productContext.md
│   ├── activeContext.md
│   └── progress.md
├── package.json         # Node.js 의존성
├── next.config.js       # Next.js 설정
└── tailwind.config.js   # Tailwind CSS 설정
```

## 🔧 개발 도구 및 설정

### 필수 패키지 (package.json)
```json
{
  "dependencies": {
    "@supabase/supabase-js": "^2.38.4",
    "fabric": "^5.3.0",
    "next": "14.0.4",
    "react": "^18",
    "react-dom": "^18",
    "xlsx": "^0.18.5"
  },
  "devDependencies": {
    "autoprefixer": "^10.0.1",
    "eslint": "^8",
    "eslint-config-next": "14.0.4",
    "postcss": "^8",
    "tailwindcss": "^3.3.0"
  }
}
```

### 환경 변수
- `NEXT_PUBLIC_SUPABASE_URL`: Supabase 프로젝트 URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabase 익명 키

## 🎨 UI/UX 기술

### React 컴포넌트
- **Fabric.js Canvas**: 드래그 앤 드롭 명찰 편집
- **Tailwind CSS**: 반응형 스타일링
- **Modal 시스템**: 행사/명단 추가 폼
- **Context Menu**: 우클릭 메뉴 시스템
- **File Upload**: 드래그 앤 드롭 파일 업로드

### 스타일링
- **Tailwind CSS**: 유틸리티 기반 CSS
- **반응형 디자인**: 모바일/태블릿/데스크톱 지원
- **컬러 시스템**: 일관된 색상 팔레트
- **그리드 레이아웃**: 5단 컬럼 레이아웃

## 📊 성능 고려사항

### 메모리 관리
- 클라이언트 사이드 엑셀 파싱
- Fabric.js 캔버스 메모리 최적화
- 이미지 업로드 크기 제한 (5MB)

### 렌더링 최적화
- React 컴포넌트 최적화
- 실시간 캔버스 업데이트
- 대용량 명단 가상화 (향후 구현)

## 🔒 보안 및 안정성

### 데이터 보안
- Row Level Security (RLS) 정책
- 환경 변수를 통한 API 키 관리
- 파일 업로드 검증

### 에러 처리
- Supabase 연결 실패 처리
- 파일 파싱 에러 처리
- 사용자 입력 검증

## 🚀 배포 및 운영

### 배포 환경
- **Vercel**: 자동 배포
- **Supabase**: 백엔드 서비스
- **GitHub**: 버전 관리

### 모니터링
- Supabase 대시보드 모니터링
- Vercel 성능 메트릭
- 사용자 에러 로깅

---
**작성일**: 2025년 1월 13일  
**버전**: 2.0 (웹 버전)  
**프로젝트**: 명찰 제작 시스템
