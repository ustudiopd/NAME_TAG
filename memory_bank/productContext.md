# 명찰 출력 프로그램 - 비즈니스 로직 및 기능 동작

## 🎯 핵심 비즈니스 로직

### 명찰 제작 워크플로우
1. **엑셀 명단 불러오기** → 데이터 검증 → 명단 목록 표시
2. **명찰 디자인** → 텍스트 위치 조정 → 이미지 삽입 → 스타일 설정
3. **미리보기 확인** → 실시간 미리보기 → 수정 사항 반영
4. **출력 실행** → 프린터 설정 → 명찰 출력

### 데이터 구조
```python
# 명단 데이터 구조
namecard_data = {
    'name': '홍길동',           # 이름
    'company': '리더스시스템즈',  # 회사명
    'title': '과장',            # 직급
    'image_path': 'logo.png'    # 로고 이미지 경로
}
```

## 📋 주요 기능 상세

### 1. 엑셀 명단 관리
- **지원 형식**: .xlsx, .xls
- **필수 컬럼**: 이름, 회사명, 직급
- **데이터 검증**: 컬럼명 확인, 빈 값 체크
- **에러 처리**: 잘못된 형식 파일 경고

### 2. 명찰 디자인 시스템
- **A4 용지 기준**: 595x842 픽셀
- **텍스트 요소**: 회사명, 이름, 직급
- **위치 조정**: 드래그 앤 드롭으로 실시간 조정
- **폰트 관리**: 크기, 스타일, 색상 조정

### 3. 이미지 처리
- **지원 형식**: PNG, JPG, JPEG, BMP
- **크기 조절**: 비율 유지하며 크기 조정
- **위치 조정**: 드래그로 위치 변경
- **최적화**: 대용량 이미지 자동 리사이징

### 4. 설정 관리
- **내보내기**: HTML 이미지맵 형식으로 설정 저장
- **불러오기**: 저장된 설정 파일 로드
- **템플릿**: 자주 사용하는 설정을 템플릿으로 저장

### 5. 프린트 설정 안내
- **자동 안내**: 출력 버튼 클릭 시 프린터 설정 방법 자동 안내
- **용지 크기**: 89mm x 127mm 명찰 용지 크기 설정 방법 안내
- **품질 설정**: 고품질 출력을 위한 프린터 설정 가이드
- **여백 설정**: 정확한 출력을 위한 여백 설정 안내

## 🎨 사용자 인터페이스 로직

### 메인 화면 구성
```
┌─────────────────────────────────────┐
│ 도구막대: [엑셀불러오기] [폰트] [이미지] │
├─────────────────────────────────────┤
│                                     │
│        명찰 디자인 영역 (A4)          │
│                                     │
│  ┌─────────────────────────────┐    │
│  │        회사명               │    │
│  │                             │    │
│  │        이름                 │    │
│  │                             │    │
│  │        직급                 │    │
│  └─────────────────────────────┘    │
│                                     │
└─────────────────────────────────────┘
```

### 상호작용 로직
- **드래그 앤 드롭**: 텍스트/이미지 요소 이동
- **실시간 미리보기**: 변경사항 즉시 반영
- **우클릭 메뉴**: 컨텍스트 메뉴로 빠른 설정
- **키보드 단축키**: Ctrl+S (저장), Ctrl+O (열기)
- **프린트 안내 모달**: 출력 시 자동으로 프린터 설정 방법 안내

## 📊 데이터 처리 로직

### 엑셀 파일 처리
```python
def process_excel_data(df):
    # 1. 필수 컬럼 확인
    required_cols = ["이름", "회사명", "직급"]
    if not all(col in df.columns for col in required_cols):
        raise ValueError("필수 컬럼이 없습니다.")
    
    # 2. 빈 값 처리
    df = df.dropna(subset=required_cols)
    
    # 3. 데이터 정규화
    df['이름'] = df['이름'].str.strip()
    df['회사명'] = df['회사명'].str.strip()
    df['직급'] = df['직급'].str.strip()
    
    return df
```

### 명찰 생성 로직
```python
def generate_namecard(data):
    # 1. 텍스트 요소 생성
    company_text = create_text_item(data['company'])
    name_text = create_text_item(data['name'])
    title_text = create_text_item(data['title'])
    
    # 2. 위치 설정
    set_text_positions(company_text, name_text, title_text)
    
    # 3. 이미지 처리
    if data.get('image_path'):
        image_item = create_image_item(data['image_path'])
        set_image_position(image_item)
    
    # 4. 스타일 적용
    apply_styles(company_text, name_text, title_text)
    
    return namecard
```

## 🔄 상태 관리

### 애플리케이션 상태
```python
class AppState:
    def __init__(self):
        self.current_data = None          # 현재 명단 데이터
        self.selected_person = None       # 선택된 사람
        self.namecard_settings = {}       # 명찰 설정
        self.is_modified = False          # 수정 여부
        self.current_font = "Arial"       # 현재 폰트
        self.current_font_size = 16       # 현재 폰트 크기
```

### 이벤트 처리
```python
def handle_text_position_change(self, text_item, x, y):
    # 1. 위치 업데이트
    text_item.setPos(x, y)
    
    # 2. 상태 저장
    self.save_text_position(text_item, x, y)
    
    # 3. 미리보기 업데이트
    self.update_preview()
    
    # 4. 수정 상태 표시
    self.mark_as_modified()
```

## 🎯 비즈니스 규칙

### 명찰 제작 규칙
1. **최소 크기**: 텍스트는 8pt 이상
2. **여백**: 가장자리에서 최소 10px 여백
3. **비율**: 이미지는 원본 비율 유지
4. **색상**: 인쇄용 CMYK 색상 권장

### 데이터 검증 규칙
1. **이름**: 1-20자, 특수문자 제한
2. **회사명**: 1-50자
3. **직급**: 1-20자
4. **이미지**: 최대 5MB, 지원 형식만

### 출력 규칙
1. **용지**: A4 (210x297mm) 또는 명찰 용지 (89mm x 127mm)
2. **해상도**: 300 DPI 권장
3. **여백**: 프린터 여백 고려
4. **방향**: 세로 방향 고정
5. **프린터 설정**: 89mm x 127mm 용지 크기 선택 필수

## 📈 성능 최적화

### 메모리 관리
- 이미지 로드 시 크기 제한
- 사용하지 않는 데이터 정리
- 캐시 크기 제한

### 렌더링 최적화
- 불필요한 리페인트 방지
- 드래그 중 렌더링 최적화
- 미리보기 품질 조절

---
**작성일**: 2025년 9월 13일  
**버전**: 1.0  
**프로젝트**: 명찰 출력 프로그램
