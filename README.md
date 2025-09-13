# 명찰 제작 시스템 (웹 버전)

이 프로젝트는 Supabase와 Next.js를 활용한 웹 기반 명찰(이름표) 디자인 및 출력 시스템입니다.

## 🚀 주요 기능

- **명단 관리**: Supabase 데이터베이스 기반 명단 CRUD 기능
- **실시간 체크인**: QR 코드를 통한 체크인/체크아웃 기능
- **명찰 편집**: Fabric.js 기반 드래그 앤 드롭 명찰 디자인
- **이미지 관리**: Supabase Storage를 통한 배경 이미지 업로드/관리
- **엑셀 연동**: 엑셀 파일 업로드로 대량 명단 등록
- **설정 저장**: 명찰 템플릿 JSON 형태로 저장/불러오기
- **반응형 디자인**: 모바일/태블릿/데스크톱 지원

## 🛠 기술 스택

- **프론트엔드**: Next.js 14, React 18, Tailwind CSS
- **백엔드**: Supabase (PostgreSQL, Auth, Storage)
- **캔버스**: Fabric.js
- **파일 처리**: XLSX.js
- **배포**: Vercel

## 📋 사전 요구사항

- Node.js 18.0 이상
- Supabase 계정
- Git

## 🚀 설치 및 실행

1. **저장소 클론**
   ```bash
   git clone https://github.com/ustudiopd/name_tag.git
   cd name_tag
   ```

2. **의존성 설치**
   ```bash
   npm install
   ```

3. **환경 변수 설정**
   `.env.local` 파일이 이미 설정되어 있습니다:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **개발 서버 실행**
   ```bash
   npm run dev
   ```

5. **브라우저에서 확인**
   [http://localhost:3000](http://localhost:3000)에서 애플리케이션을 확인할 수 있습니다.

## 📊 데이터베이스 스키마

### profiles 테이블
| 컬럼명 | 타입 | 설명 |
|--------|------|------|
| id | uuid | 기본 키 |
| created_at | timestamptz | 생성 시간 |
| company | text | 회사명 |
| name | text | 이름 |
| title | text | 직급 |
| is_checked_in | boolean | 체크인 상태 |
| checked_in_at | timestamptz | 체크인 시간 |

### Storage
- **namecard-images**: 배경 이미지 저장용 공개 버킷

## 🔧 개발 가이드

### 프로젝트 구조
```
├── app/                    # Next.js App Router
│   ├── globals.css        # 전역 스타일
│   ├── layout.js          # 루트 레이아웃
│   └── page.js            # 메인 페이지
├── components/            # React 컴포넌트
│   ├── ProfileList.js     # 명단 목록
│   └── ProfileForm.js     # 명단 추가 폼
├── lib/                   # 유틸리티 함수
│   ├── supabaseClient.js  # Supabase 클라이언트
│   ├── database.js        # 데이터베이스 함수
│   └── storage.js         # 스토리지 함수
└── memory_bank/           # 프로젝트 문서
```

### 주요 함수
- `getAllProfiles()`: 모든 프로필 조회
- `createProfile()`: 프로필 생성
- `updateProfile()`: 프로필 업데이트
- `updateCheckInStatus()`: 체크인 상태 업데이트
- `uploadImage()`: 이미지 업로드
- `createProfilesBulk()`: 대량 프로필 생성

## 🚀 배포

### Vercel 배포
1. GitHub 저장소에 코드 푸시
2. Vercel에서 프로젝트 연결
3. 환경 변수 설정
4. 자동 배포 완료

## 📝 사용법

1. **명단 추가**: 우상단 "명단 추가" 버튼 클릭
2. **명단 선택**: 좌측 목록에서 명단 클릭하여 편집
3. **체크인 관리**: 각 명단의 체크인 버튼으로 상태 변경
4. **명찰 편집**: 중앙 캔버스에서 드래그 앤 드롭으로 디자인
5. **이미지 추가**: 배경 이미지 업로드 및 적용
6. **설정 저장**: JSON 형태로 템플릿 저장/불러오기

## 🔒 보안

- Row Level Security (RLS) 활성화
- 환경 변수를 통한 API 키 관리
- 파일 업로드 크기 제한 (5MB)
- 이미지 타입 검증

## 📱 반응형 지원

- 모바일: 세로 레이아웃, 터치 최적화
- 태블릿: 적응형 그리드 레이아웃
- 데스크톱: 3단 컬럼 레이아웃

## 🤝 기여하기

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 라이선스
MIT License

---

### GitHub 저장소
- [https://github.com/ustudiopd/name_tag.git](https://github.com/ustudiopd/name_tag.git) 