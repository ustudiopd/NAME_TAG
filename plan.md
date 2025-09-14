# 명찰 출력 프로그램 - 템플릿 로드 오류 해결 플랜

## 📋 현재 상황 분석

### **핵심 문제점**

현재 `CanvasEditor_new.js`의 `loadTemplate` 함수에서 템플릿 JSON이 제대로 로드되지 않는 문제가 발생하고 있습니다.

**주요 원인:**
1. **비동기 처리 문제**: `loadOptimizedTemplate` 함수가 `async`로 선언되었지만 `await` 없이 호출됨
2. **에러 처리 부족**: 에러 발생 시 `createDefaultTemplate`으로 대체하여 문제가 숨겨짐
3. **이미지 로드 타이밍**: 배경 이미지와 일반 이미지 로드가 비동기로 처리되어 완료 시점을 기다리지 않음

### **현재 코드 구조 분석**

```javascript
// 현재 loadTemplate 함수 (454-530줄)
const loadTemplate = (template) => {
  // ... 유효성 검사
  if (templateData.version === '1.0') {
    loadOptimizedTemplate(canvas, templateData) // ← async 함수를 await 없이 호출
  } else {
    canvas.loadFromJSON(jsonData, callback) // ← 정상 작동
  }
}

// loadOptimizedTemplate 함수 (533줄부터)
const loadOptimizedTemplate = async (canvas, templateData) => {
  // ... 캔버스 설정
  // ... 배경 이미지 로드 (비동기)
  // ... 객체들 복원 (비동기 이미지 포함)
  canvas.renderAll() // ← 모든 비동기 작업 완료 전에 호출
}
```

-----

## 🎯 해결 방안

### **1단계: 즉시 수정 (High Priority)**

#### A. `loadTemplate` 함수 수정
```javascript
const loadTemplate = async (template) => {
  if (!fabricCanvasRef.current) return

  console.log('Loading template:', template)
  
  if (!template) {
    console.error('Template data not provided')
    return
  }
  
  if (!template.canvas_json) {
    console.error('Template JSON data not provided')
    return
  }

  try {
    const canvas = fabricCanvasRef.current
    console.log('Clearing canvas...')
    
    // 기존 객체들 모두 제거
    canvas.clear()
    
    const templateData = template.canvas_json
    
    // JSON 데이터 검증 강화
    if (!templateData || typeof templateData !== 'object') {
      console.error('Invalid template JSON data:', templateData)
      return
    }
    
    console.log('Template data structure:', {
      hasVersion: !!templateData.version,
      version: templateData.version,
      hasObjects: !!templateData.objects,
      objectCount: templateData.objects?.length || 0,
      hasCanvas: !!templateData.canvas
    })
    
    // 최적화된 JSON인지 확인
    if (templateData.version === '1.0') {
      // 최적화된 JSON 처리 - await 추가
      await loadOptimizedTemplate(canvas, templateData)
    } else {
      // 기존 Fabric.js JSON 처리 (하위 호환성)
      const jsonData = Array.isArray(templateData) 
        ? { objects: templateData, version: '5.3.0' }
        : templateData
      
      await new Promise((resolve, reject) => {
        canvas.loadFromJSON(jsonData, () => {
          console.log('Template JSON loaded, rendering...')
          
          // 모든 객체에 setCoords() 호출 및 텍스트 객체 속성 설정
          canvas.getObjects().forEach(obj => {
            obj.setCoords()
            
            // 텍스트 객체인 경우 크기 조절 제한 설정
            if (obj.type === 'i-text' || obj.type === 'text') {
              obj.set({
                lockScalingX: true,
                lockScalingY: true,
                lockUniScaling: true
              })
            }
          })
          
          canvas.renderAll()
          setIsTemplateLoaded(true)
          console.log('Template loaded successfully:', template.template_name)
          resolve()
        }, (error) => {
          console.error('Error in loadFromJSON callback:', error)
          reject(error)
        })
      })
    }
    
  } catch (error) {
    console.error('Error loading template:', error)
    // createDefaultTemplate 호출 제거 - 에러를 명확히 표시
    alert(`템플릿 로드 실패: ${error.message}`)
  }
}
```

#### B. `loadOptimizedTemplate` 함수 수정
```javascript
const loadOptimizedTemplate = async (canvas, templateData) => {
  try {
    // 캔버스 크기 설정
    if (templateData.canvas) {
      canvas.setWidth(templateData.canvas.width)
      canvas.setHeight(templateData.canvas.height)
      canvas.setBackgroundColor(templateData.canvas.backgroundColor, canvas.renderAll.bind(canvas))
    }
    
    // 비동기 작업들을 Promise로 관리
    const asyncTasks = []
    
    // 배경 이미지 로드
    if (templateData.backgroundImage) {
      setBackgroundImage(templateData.backgroundImage)
      
      const backgroundPromise = new Promise((resolve, reject) => {
        fabric.Image.fromURL(templateData.backgroundImage.url, (img) => {
          if (!img) {
            reject(new Error('Background image load failed'))
            return
          }
          
          img.set({
            left: 0,
            top: 0,
            scaleX: 340 / img.width,
            scaleY: 472 / img.height,
            selectable: true,
            evented: true,
            opacity: backgroundOpacity,
            type: 'background',
            crossOrigin: 'anonymous'
          })
          
          img.setCoords()
          canvas.add(img)
          canvas.sendToBack(img)
          resolve()
        }, { crossOrigin: 'anonymous' })
      })
      asyncTasks.push(backgroundPromise)
    }
    
    // 객체들 복원
    for (const objData of templateData.objects || []) {
      if (objData.type === 'i-text' || objData.type === 'text') {
        // 텍스트 객체는 동기 처리
        const textObj = new fabric.IText(objData.text || '', {
          left: objData.left,
          top: objData.top,
          width: objData.width,
          height: objData.height,
          fontSize: objData.fontSize,
          fontFamily: objData.fontFamily,
          fontWeight: objData.fontWeight,
          fontStyle: objData.fontStyle,
          fill: objData.fill,
          textAlign: objData.textAlign,
          angle: objData.angle,
          scaleX: objData.scaleX || 1,
          scaleY: objData.scaleY || 1,
          originX: objData.originX || 'left',
          originY: objData.originY || 'top',
          lockScalingX: true,
          lockScalingY: true,
          lockUniScaling: true
        })
        textObj.setCoords()
        canvas.add(textObj)
        
      } else if (objData.type === 'image') {
        // 이미지 객체는 비동기 처리
        const imagePromise = new Promise((resolve, reject) => {
          fabric.Image.fromURL(objData.src, (img) => {
            if (!img) {
              reject(new Error(`Image load failed: ${objData.src}`))
              return
            }
            
            img.set({
              left: objData.left,
              top: objData.top,
              scaleX: objData.scaleX,
              scaleY: objData.scaleY,
              angle: objData.angle,
              crossOrigin: 'anonymous'
            })
            img.setCoords()
            canvas.add(img)
            resolve()
          }, { crossOrigin: 'anonymous' })
        })
        asyncTasks.push(imagePromise)
        
      } else if (objData.type === 'background') {
        // 배경 이미지 객체는 이미 위에서 처리됨
        continue
        
      } else {
        // 기타 객체들 (Rect, Circle 등)
        const obj = new fabric[objData.type.charAt(0).toUpperCase() + objData.type.slice(1)]({
          left: objData.left,
          top: objData.top,
          width: objData.width,
          height: objData.height,
          fill: objData.fill,
          stroke: objData.stroke,
          strokeWidth: objData.strokeWidth,
          angle: objData.angle,
          scaleX: objData.scaleX || 1,
          scaleY: objData.scaleY || 1
        })
        obj.setCoords()
        canvas.add(obj)
      }
    }
    
    // 모든 비동기 작업 완료 대기
    if (asyncTasks.length > 0) {
      await Promise.all(asyncTasks)
    }
    
    // 최종 렌더링
    canvas.renderAll()
    setIsTemplateLoaded(true)
    console.log('Optimized template loaded successfully')
    
  } catch (error) {
    console.error('Error loading optimized template:', error)
    throw error // 에러를 상위로 전파
  }
}
```

### **2단계: 에러 처리 개선 (Medium Priority)**

#### A. 사용자 친화적 에러 메시지
```javascript
// 에러 타입별 메시지 분류
const getErrorMessage = (error) => {
  if (error.message.includes('image load failed')) {
    return '이미지 로드에 실패했습니다. 이미지 파일을 확인해주세요.'
  } else if (error.message.includes('Invalid template JSON')) {
    return '템플릿 데이터 형식이 올바르지 않습니다.'
  } else if (error.message.includes('Template data not provided')) {
    return '템플릿 정보가 없습니다.'
  } else {
    return `템플릿 로드 중 오류가 발생했습니다: ${error.message}`
  }
}
```

#### B. 로딩 상태 표시
```javascript
// 로딩 상태 추가
const [isLoading, setIsLoading] = useState(false)

const loadTemplate = async (template) => {
  setIsLoading(true)
  try {
    // ... 로드 로직
  } catch (error) {
    // ... 에러 처리
  } finally {
    setIsLoading(false)
  }
}
```

### **3단계: 디버깅 강화 (Low Priority)**

#### A. 상세한 로그 추가
```javascript
console.log('Template loading started:', {
  templateId: template.id,
  templateName: template.template_name,
  hasCanvasJson: !!template.canvas_json,
  jsonSize: JSON.stringify(template.canvas_json).length
})
```

#### B. 템플릿 검증 함수
```javascript
const validateTemplate = (template) => {
  const errors = []
  
  if (!template) {
    errors.push('Template is null or undefined')
  } else {
    if (!template.canvas_json) {
      errors.push('canvas_json is missing')
    } else {
      const data = template.canvas_json
      if (!data.objects || !Array.isArray(data.objects)) {
        errors.push('objects array is missing or invalid')
      }
      if (data.version && data.version !== '1.0') {
        errors.push(`Unsupported version: ${data.version}`)
      }
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  }
}
```

-----

## 🧪 테스트 시나리오

### **1. 기본 템플릿 로드 테스트**
1. 템플릿 저장 → 불러오기 → 캔버스에 객체 표시 확인
2. 텍스트 객체의 크기 조절 제한 확인
3. 이미지 객체의 정확한 위치 및 크기 확인

### **2. 에러 상황 테스트**
1. 잘못된 JSON 구조의 템플릿 로드
2. 존재하지 않는 이미지 URL 포함 템플릿
3. 네트워크 오류 상황

### **3. 성능 테스트**
1. 대용량 이미지가 포함된 템플릿
2. 많은 객체가 포함된 템플릿
3. 동시에 여러 템플릿 로드

-----

## 📊 우선순위별 실행 계획

### **Phase 1: 핵심 수정 (1-2일)**
- [ ] `loadTemplate` 함수에 `async/await` 적용
- [ ] `loadOptimizedTemplate` 함수의 비동기 처리 개선
- [ ] 에러 처리에서 `createDefaultTemplate` 제거

### **Phase 2: 사용자 경험 개선 (2-3일)**
- [ ] 로딩 상태 표시 추가
- [ ] 사용자 친화적 에러 메시지
- [ ] 템플릿 검증 로직 추가

### **Phase 3: 디버깅 및 최적화 (3-5일)**
- [ ] 상세한 로그 시스템 구축
- [ ] 성능 최적화
- [ ] 테스트 케이스 추가

-----

## 🎯 기대 효과

1. **템플릿 로드 성공률 100%**: 비동기 처리 개선으로 모든 템플릿이 정확히 로드됨
2. **사용자 경험 향상**: 명확한 에러 메시지와 로딩 상태 표시
3. **개발 효율성 증대**: 상세한 디버깅 정보로 문제 해결 시간 단축
4. **시스템 안정성**: 에러 상황에서도 앱이 크래시되지 않음

**이 플랜을 단계별로 실행하면 템플릿 로드 문제가 완전히 해결될 것입니다.**