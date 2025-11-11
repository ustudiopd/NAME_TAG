# 명찰 출력 프로그램 - 아키텍처 패턴 및 코딩 규칙

## 🏗️ 아키텍처 패턴

### MVC 패턴 적용
- **Model**: 데이터 모델 (엑셀 데이터, 명찰 설정)
- **View**: PyQt5 GUI 컴포넌트
- **Controller**: 이벤트 핸들러 및 비즈니스 로직

### 컴포넌트 기반 설계
- **재사용 가능한 컴포넌트**: CenteredTextItem, 이미지 아이템
- **이벤트 기반 통신**: 시그널/슬롯 패턴
- **상태 관리**: 중앙화된 상태 관리

## 📝 코딩 규칙

### Python 코딩 스타일
```python
# 클래스명: PascalCase
class MainWindow(QMainWindow):
    pass

# 함수명: snake_case
def load_excel_data(self):
    pass

# 변수명: snake_case
company_text = CenteredTextItem("")

# 상수: UPPER_SNAKE_CASE
A4_WIDTH_PX = 595
A4_HEIGHT_PX = 842
```

### PyQt5 특화 규칙
```python
# 시그널/슬롯 연결
self.company_text.positionChanged.connect(self.sync_company_pos)

# 이벤트 핸들러 명명
def on_action_triggered(self):
    pass

# 위젯 생성 패턴
def create_widget(self):
    widget = QWidget()
    layout = QVBoxLayout()
    widget.setLayout(layout)
    return widget
```

## 🎨 UI 컴포넌트 패턴

### React 컴포넌트 패턴 (Next.js)
```javascript
// 조건부 렌더링 패턴
const PropertyPanel = ({ selectedObject, onPropertyChange }) => {
  const objectType = selectedObject?.type || 'unknown'
  const isTextObject = objectType === 'i-text' || objectType === 'text'
  const isImageObject = objectType === 'image'
  
  return (
    <div>
      {isTextObject && <TextProperties />}
      {isImageObject && <ImageProperties />}
    </div>
  )
}

// 이벤트 처리 패턴
const handleSelection = (e) => {
  const activeObject = e.selected?.[0]
  if (activeObject && onPropertyChange) {
    onPropertyChange('selectedObject', activeObject)
  }
}
```

### 텍스트 아이템 패턴 (Legacy PyQt5)
```python
class CenteredTextItem(QGraphicsTextItem):
    positionChanged = pyqtSignal(float, float)
    
    def __init__(self, text, font_size=16):
        super().__init__(text)
        self.setFont(QFont("Arial", font_size))
        self.setFlag(QGraphicsItem.ItemIsMovable, True)
        self.setFlag(QGraphicsItem.ItemIsSelectable, True)
```

### 이미지 아이템 패턴
```python
def load_image(self, file_path):
    pixmap = QPixmap(file_path)
    if not pixmap.isNull():
        self.image_item = QGraphicsPixmapItem(pixmap)
        self.scene.addItem(self.image_item)
        return True
    return False
```

## 🔄 이벤트 처리 패턴

### React 이벤트 처리 (Next.js)
```javascript
// Fabric.js 캔버스 이벤트 처리
canvas.on('selection:created', (e) => {
  const activeObject = e.selected?.[0]
  if (activeObject) {
    onPropertyChange('selectedObject', activeObject)
  }
})

// 속성 변경 이벤트
const handlePropertyChange = (property, value) => {
  const newProperties = { ...properties, [property]: value }
  setProperties(newProperties)
  if (onPropertyChange) {
    onPropertyChange(property, value)
  }
}

// 명단 클릭 이벤트 처리 (이벤트 전파 방지)
const handleProfileClick = (profile, e) => {
  // 이벤트 전파 방지 (이름 편집 등 다른 클릭 이벤트와 충돌 방지)
  if (e) {
    e.stopPropagation()
    e.preventDefault()
  }
  
  // 프로필 선택 처리
  if (selectionMode === 'individual') {
    onProfileSelect(profile)
  }
}

// 프로필 업데이트 후 자동 객체 선택
const updateCanvasWithProfile = useCallback((profile) => {
  // 텍스트 객체 업데이트
  textObjects.forEach((obj, index) => {
    // 텍스트 업데이트 로직
  })
  
  // 이름 텍스트 객체 자동 선택
  if (nameTextObject && onPropertyChange) {
    setTimeout(() => {
      canvas.setActiveObject(nameTextObject)
      canvas.renderAll()
      onPropertyChange('selectedObject', nameTextObject)
    }, 150)
  }
}, [fabricCanvasRef, safeRenderAll, onPropertyChange])
```

### 드래그 앤 드롭 (Legacy PyQt5)
```python
def mouseMoveEvent(self, event):
    if event.buttons() == Qt.LeftButton:
        # 드래그 로직
        self.positionChanged.emit(self.pos().x(), self.pos().y())
    super().mouseMoveEvent(event)
```

### 메뉴 액션
```python
def setup_menu_actions(self):
    action = QAction("엑셀 불러오기", self)
    action.triggered.connect(self.load_excel_data)
    self.main_toolbar.addAction(action)
```

## 📊 데이터 관리 패턴

### Supabase 데이터 처리 (Next.js)
```javascript
// 템플릿 저장 (최적화된 JSON)
const saveNamecardTemplate = async (templateData) => {
  const optimizedData = {
    objects: templateData.objects.map(obj => ({
      type: obj.type,
      left: obj.left,
      top: obj.top,
      width: obj.width,
      height: obj.height,
      fontSize: obj.fontSize,
      fontFamily: obj.fontFamily,
      fill: obj.fill,
      textAlign: obj.textAlign,
      scaleX: obj.scaleX,
      scaleY: obj.scaleY,
      angle: obj.angle,
      opacity: obj.opacity,
      // 이미지는 URL만 저장 (base64 제외)
      src: obj.src || obj.image?.src
    }))
  }
  
  const { data, error } = await supabase
    .from('namecard_templates')
    .insert({ template_data: optimizedData })
}

// Supabase Storage 이미지 업로드
const uploadImage = async (file) => {
  const sanitizedName = sanitizeFileName(file.name)
  const { data, error } = await supabase.storage
    .from('namecard-images')
    .upload(sanitizedName, file)
}
```

### 엑셀 데이터 처리 (Legacy PyQt5)
```python
def load_excel_data(self):
    try:
        df = pd.read_excel(file_path)
        required_cols = ["이름", "회사명", "직급"]
        if all(col in df.columns for col in required_cols):
            self.process_data(df)
    except Exception as e:
        QMessageBox.warning(self, "오류", f"엑셀 파일 로드 실패: {str(e)}")
```

### 설정 저장/로드
```python
def save_settings(self):
    settings = {
        'company_text': self.company_text.toPlainText(),
        'name_text': self.name_text.toPlainText(),
        'title_text': self.title_text.toPlainText()
    }
    # JSON 또는 HTML 형식으로 저장
```

## 🎯 성능 최적화 패턴

### 메모리 관리
```python
# 이미지 로드 시 메모리 최적화
def load_image_optimized(self, file_path):
    pixmap = QPixmap(file_path)
    if pixmap.width() > 1000 or pixmap.height() > 1000:
        pixmap = pixmap.scaled(1000, 1000, Qt.KeepAspectRatio, Qt.SmoothTransformation)
    return pixmap
```

### 렌더링 최적화
```python
# 불필요한 리페인트 방지
def update_text(self, text_item, new_text):
    if text_item.toPlainText() != new_text:
        text_item.setPlainText(new_text)
        self.scene.update()
```

## 🔒 에러 처리 패턴

### React 에러 처리 (Next.js)
```javascript
// 안전한 속성 접근
const getObjectProperties = (obj) => {
  if (!obj) return null
  
  return {
    left: Math.round(obj.left || 0),
    top: Math.round(obj.top || 0),
    fontSize: obj.fontSize || 16,
    fontFamily: obj.fontFamily || 'Arial',
    // undefined 방어 코드
  }
}

// Supabase 에러 처리
const handleSupabaseError = (error, operation) => {
  console.error(`${operation} failed:`, error)
  if (error.message.includes('Invalid key')) {
    alert('파일명에 특수문자가 포함되어 있습니다.')
  } else if (error.message.includes('row-level security')) {
    alert('권한이 없습니다. 관리자에게 문의하세요.')
  }
}
```

### 예외 처리 (Legacy PyQt5)
```python
def safe_operation(self, operation, error_message):
    try:
        return operation()
    except Exception as e:
        QMessageBox.warning(self, "오류", f"{error_message}: {str(e)}")
        return None
```

### 사용자 입력 검증
```python
def validate_excel_file(self, file_path):
    if not os.path.exists(file_path):
        return False, "파일이 존재하지 않습니다."
    
    if not file_path.endswith(('.xlsx', '.xls')):
        return False, "엑셀 파일만 지원됩니다."
    
    return True, "유효한 파일입니다."
```

## 📁 파일 구조 패턴

### 모듈 분리
```python
# main.py - 메인 애플리케이션
# components.py - UI 컴포넌트
# data_handler.py - 데이터 처리
# printer.py - 출력 관련
# utils.py - 유틸리티 함수
```

### 설정 관리
```python
# config.py
class Config:
    A4_WIDTH_PX = 595
    A4_HEIGHT_PX = 842
    DEFAULT_FONT_SIZE = 16
    SUPPORTED_IMAGE_FORMATS = ['.png', '.jpg', '.jpeg', '.bmp']
```

## 🆕 최신 패턴 업데이트 (2025-01-27)

### JSON 최적화 패턴
```javascript
// 템플릿 데이터 최적화 (99% 크기 감소)
const optimizeTemplateData = (fabricObjects) => {
  return fabricObjects.map(obj => ({
    // 필수 속성만 추출
    type: obj.type,
    left: obj.left,
    top: obj.top,
    width: obj.width,
    height: obj.height,
    // 텍스트 속성
    fontSize: obj.fontSize,
    fontFamily: obj.fontFamily,
    fill: obj.fill,
    textAlign: obj.textAlign,
    // 변환 속성
    scaleX: obj.scaleX,
    scaleY: obj.scaleY,
    angle: obj.angle,
    opacity: obj.opacity,
    // 이미지는 URL만 저장 (base64 제외)
    src: obj.src || obj.image?.src
  }))
}
```

### 파일명 정리 패턴
```javascript
// Supabase Storage 호환 파일명 생성
const sanitizeFileName = (filename) => {
  return filename
    .replace(/[^a-zA-Z0-9.-]/g, '_')  // 특수문자 제거
    .replace(/_+/g, '_')              // 연속 언더스코어 제거
    .toLowerCase()                    // 소문자 변환
}
```

### 조건부 렌더링 패턴
```javascript
// 객체 타입별 속성 패널 렌더링
const renderPropertySection = (objectType, properties) => {
  switch (objectType) {
    case 'i-text':
    case 'text':
      return <TextProperties properties={properties} />
    case 'image':
      return <ImageProperties properties={properties} />
    case 'background':
      return <BackgroundProperties properties={properties} />
    default:
      return <BasicProperties properties={properties} />
  }
}
```

---
**작성일**: 2025년 9월 13일  
**업데이트**: 2025년 11월 12일 오전  
**버전**: 2.2 (명단 클릭 이벤트 개선 및 프로필 기반 위치 조정)  
**프로젝트**: 명찰 출력 프로그램
