import { useEffect, useRef, useState, useCallback } from 'react'
import { fabric } from 'fabric'
import ContextMenu from './ContextMenu'
import { getDefaultTemplate } from '../lib/namecardDatabase'
import ImageUpload from './ImageUpload'
import ImageUploadLibrary from './ImageUploadLibrary'
import { uploadImage } from '../lib/storage'

export default function CanvasEditor({ 
  selectedProfile, 
  onCanvasUpdate, 
  selectedObject, 
  onPropertyChange,
  eventId,
  onTemplateLoad
}) {
  const canvasRef = useRef(null)
  const fabricCanvasRef = useRef(null)
  const [isCanvasReady, setIsCanvasReady] = useState(false)
  const [contextMenu, setContextMenu] = useState({ visible: false, position: null })
  const [rightClickedObject, setRightClickedObject] = useState(null)
  const [showJsonView, setShowJsonView] = useState(false)
  const [jsonData, setJsonData] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [showImageUpload, setShowImageUpload] = useState(false)
  const [uploadedImages, setUploadedImages] = useState([])
  const [templateSettings, setTemplateSettings] = useState(null)
  const [backgroundImage, setBackgroundImage] = useState(null) // 배경 이미지 상태 추가
  const [showBackgroundUpload, setShowBackgroundUpload] = useState(false) // 배경 이미지 업로드 패널 상태
  const [backgroundOpacity, setBackgroundOpacity] = useState(0.7) // 배경 이미지 투명도
  const [isTemplateLoaded, setIsTemplateLoaded] = useState(false) // 템플릿 로드 상태
  const [isBackgroundSelected, setIsBackgroundSelected] = useState(false) // 배경 이미지 선택 상태
  const [paperSettings, setPaperSettings] = useState({
    width: 9.0, // cm
    height: 12.5, // cm
    showGuidelines: true // 가이드라인 표시 여부
  })

  // 안전한 캔버스 렌더링 함수
  const safeRenderAll = (canvas) => {
    if (!canvas || typeof canvas.renderAll !== 'function') {
      console.warn('Canvas is not properly initialized for rendering')
      return false
    }
    
    try {
      canvas.renderAll()
      return true
    } catch (error) {
      console.error('Error rendering canvas:', error)
      return false
    }
  }

  // 용지 설정에 따른 캔버스 크기 조정
  const updateCanvasSize = (canvas, widthCm, heightCm) => {
    if (!canvas) return

    // cm를 픽셀로 변환 (37.8px/cm 기준)
    const widthPx = Math.round(widthCm * 37.8)
    const heightPx = Math.round(heightCm * 37.8)
    
    // 캔버스 크기 업데이트
    canvas.setDimensions({
      width: widthPx,
      height: heightPx
    })
    
    // 객체 위치는 유지하고 좌표만 업데이트
    canvas.getObjects().forEach(obj => {
      obj.setCoords()
    })
    
    safeRenderAll(canvas)
    console.log(`Canvas size updated: ${widthCm}cm x ${heightCm}cm (${widthPx}px x ${heightPx}px)`)
  }

  // 가이드라인 생성/업데이트
  const updateGuidelines = (canvas, widthCm, heightCm, showGuidelines) => {
    if (!canvas) return

    // 기존 가이드라인 제거
    const existingGuidelines = canvas.getObjects().filter(obj => obj.type === 'guideline')
    existingGuidelines.forEach(obj => canvas.remove(obj))

    if (!showGuidelines) return

    // cm를 픽셀로 변환
    const widthPx = Math.round(widthCm * 37.8)
    const heightPx = Math.round(heightCm * 37.8)
    
    // 여백 설정 (5mm = 0.5cm)
    const marginCm = 0.5
    const marginPx = Math.round(marginCm * 37.8)
    
    // 가이드라인 생성
    const guidelines = [
      // 외곽선
      new fabric.Rect({
        left: 0,
        top: 0,
        width: widthPx,
        height: heightPx,
        fill: 'transparent',
        stroke: '#ff0000',
        strokeWidth: 1,
        strokeDashArray: [5, 5],
        selectable: false,
        evented: false,
        type: 'guideline',
        zIndex: -999
      }),
      // 안전 여백
      new fabric.Rect({
        left: marginPx,
        top: marginPx,
        width: widthPx - (marginPx * 2),
        height: heightPx - (marginPx * 2),
        fill: 'transparent',
        stroke: '#00ff00',
        strokeWidth: 1,
        strokeDashArray: [3, 3],
        selectable: false,
        evented: false,
        type: 'guideline',
        zIndex: -998
      }),
      // 중앙선 (가로)
      new fabric.Line([0, heightPx / 2, widthPx, heightPx / 2], {
        stroke: '#0000ff',
        strokeWidth: 1,
        strokeDashArray: [2, 2],
        selectable: false,
        evented: false,
        type: 'guideline',
        zIndex: -997
      }),
      // 중앙선 (세로)
      new fabric.Line([widthPx / 2, 0, widthPx / 2, heightPx], {
        stroke: '#0000ff',
        strokeWidth: 1,
        strokeDashArray: [2, 2],
        selectable: false,
        evented: false,
        type: 'guideline',
        zIndex: -997
      })
    ]

    // 가이드라인을 캔버스에 추가
    guidelines.forEach(guideline => {
      canvas.add(guideline)
    })
    
    safeRenderAll(canvas)
  }

  // 용지 설정 변경 핸들러
  const handlePaperSettingsChange = (field, value) => {
    const newValue = parseFloat(value)
    if (newValue <= 0) return

    setPaperSettings(prev => {
      const newSettings = { ...prev, [field]: newValue }
      
      // 캔버스가 준비된 상태에서만 크기 업데이트
      if (fabricCanvasRef.current && (field === 'width' || field === 'height')) {
        updateCanvasSize(fabricCanvasRef.current, newSettings.width, newSettings.height)
        updateGuidelines(fabricCanvasRef.current, newSettings.width, newSettings.height, newSettings.showGuidelines)
      }
      
      return newSettings
    })
  }

  // 가이드라인 표시 토글
  const toggleGuidelines = () => {
    if (!fabricCanvasRef.current) return
    
    setPaperSettings(prev => {
      const newSettings = { ...prev, showGuidelines: !prev.showGuidelines }
      
      // 가이드라인만 업데이트 (캔버스 크기는 변경하지 않음)
      updateGuidelines(fabricCanvasRef.current, newSettings.width, newSettings.height, newSettings.showGuidelines)
      
      return newSettings
    })
  }

  // 배경 이미지 선택
  const selectBackgroundImage = () => {
    if (!fabricCanvasRef.current) return
    
    const canvas = fabricCanvasRef.current
    const objects = canvas.getObjects()
    const backgroundImage = objects.find(obj => obj.type === 'background')
    
    if (backgroundImage) {
      canvas.setActiveObject(backgroundImage)
      safeRenderAll(canvas)
      setIsBackgroundSelected(true)
      console.log('배경 이미지가 선택되었습니다.')
    }
  }

  // 배경 이미지 선택 해제
  const deselectBackgroundImage = () => {
    if (!fabricCanvasRef.current) return
    
    const canvas = fabricCanvasRef.current
    canvas.discardActiveObject()
    safeRenderAll(canvas)
    setIsBackgroundSelected(false)
    console.log('배경 이미지 선택이 해제되었습니다.')
  }

  // 캔버스 초기화
  useEffect(() => {
    if (!canvasRef.current) return

    // 용지 설정에 따른 캔버스 크기 계산
    const widthPx = Math.round(paperSettings.width * 37.8)
    const heightPx = Math.round(paperSettings.height * 37.8)
    
    const canvas = new fabric.Canvas(canvasRef.current, {
      width: widthPx,
      height: heightPx,
      backgroundColor: '#ffffff',
      enableRetinaScaling: true,
      imageSmoothingEnabled: true
    })

    fabricCanvasRef.current = canvas
    setIsCanvasReady(true)

    // 가이드라인 추가
    updateGuidelines(canvas, paperSettings.width, paperSettings.height, paperSettings.showGuidelines)

    // 크기 표시 텍스트 추가
    const sizeText = new fabric.IText(`${paperSettings.width}cm × ${paperSettings.height}cm`, {
      left: 10,
      top: 10,
      fontSize: 12,
      fill: '#999999',
      selectable: false,
      evented: false,
      type: 'border'
    })
    canvas.add(sizeText)

    // 기본 템플릿 생성
    createDefaultTemplate(canvas)

    // 이벤트 리스너 등록
    canvas.on('object:moving', () => {
      if (onCanvasUpdate) onCanvasUpdate()
    })


    // 배경 이미지 선택을 위한 더블클릭 이벤트
    canvas.on('mouse:dblclick', (e) => {
      const objects = canvas.getObjects()
      const backgroundImage = objects.find(obj => obj.type === 'background')
      
      if (backgroundImage) {
        canvas.setActiveObject(backgroundImage)
        safeRenderAll(canvas)
        console.log('배경 이미지가 선택되었습니다.')
      }
    })

    // Ctrl + 클릭으로 배경 이미지 선택
    canvas.on('mouse:down', (e) => {
      if (e.e.ctrlKey || e.e.metaKey) {
        const objects = canvas.getObjects()
        const backgroundImage = objects.find(obj => obj.type === 'background')
        
        if (backgroundImage) {
          canvas.setActiveObject(backgroundImage)
          safeRenderAll(canvas)
          console.log('Ctrl + 클릭으로 배경 이미지가 선택되었습니다.')
        }
      } else {
        // 일반 클릭 시 배경 이미지가 아닌 객체 우선 선택
        const target = e.target
        if (target && target.type !== 'background') {
          canvas.setActiveObject(target)
          safeRenderAll(canvas)
        }
      }
    })

    canvas.on('object:scaling', (e) => {
      handleObjectScaling(e)
      if (onCanvasUpdate) onCanvasUpdate()
    })

    canvas.on('object:rotating', () => {
      if (onCanvasUpdate) onCanvasUpdate()
    })

    canvas.on('selection:created', (e) => {
      const activeObject = e.selected?.[0]
      if (activeObject) {
        // 배경 이미지가 아닌 경우에만 부모 컴포넌트에 전달
        if (activeObject.type !== 'background') {
          if (onPropertyChange) {
            onPropertyChange('selectedObject', activeObject)
          }
          
          if (onCanvasUpdate) {
            onCanvasUpdate({
              type: 'selection',
              object: activeObject,
              properties: getObjectProperties(activeObject)
            })
          }
        }
        
        // 배경 이미지 선택 시 상태 업데이트
        if (activeObject.type === 'background') {
          setIsBackgroundSelected(true)
        }
      }
    })

    canvas.on('selection:updated', (e) => {
      const activeObject = e.selected?.[0]
      if (activeObject) {
        // 배경 이미지가 아닌 경우에만 부모 컴포넌트에 전달
        if (activeObject.type !== 'background') {
          if (onPropertyChange) {
            onPropertyChange('selectedObject', activeObject)
          }
          
          if (onCanvasUpdate) {
            onCanvasUpdate({
              type: 'selection',
              object: activeObject,
              properties: getObjectProperties(activeObject)
            })
          }
        }
        
        // 배경 이미지 선택 시 상태 업데이트
        if (activeObject.type === 'background') {
          setIsBackgroundSelected(true)
        }
      }
    })

    canvas.on('selection:cleared', () => {
      // 부모 컴포넌트에 선택 해제 전달
      if (onPropertyChange) {
        onPropertyChange('selectedObject', null)
      }
      
      if (onCanvasUpdate) {
        onCanvasUpdate({
          type: 'selection',
          object: null,
          properties: null
        })
      }
      
      // 배경 이미지 선택 해제 상태 업데이트
      setIsBackgroundSelected(false)
    })

    // 우클릭 이벤트
    canvas.on('mouse:down', (e) => {
      if (e.e.button === 2) { // 우클릭
        e.e.preventDefault()
        const pointer = canvas.getPointer(e.e)
        setContextMenu({
          visible: true,
          position: { x: pointer.x, y: pointer.y }
        })
        setRightClickedObject(e.target)
      } else {
        setContextMenu({ visible: false, position: null })
      }
    })

    return () => {
      canvas.dispose()
    }
  }, [])

  // 기본 템플릿 생성
  const createDefaultTemplate = (canvas) => {
    // 회사명 텍스트
    const companyText = new fabric.IText('회사명', {
      left: 170,
      top: 100,
      fontSize: 24,
      fontFamily: 'Arial',
      fill: '#000000',
      textAlign: 'center',
      originX: 'center',
      originY: 'center',
      zIndex: 1000  // 배경 이미지보다 앞에 오도록 설정
    })
    canvas.add(companyText)

    // 이름 텍스트
    const nameText = new fabric.IText('이름', {
      left: 170,
      top: 200,
      fontSize: 32,
      fontFamily: 'Arial',
      fontWeight: 'bold',
      fill: '#000000',
      textAlign: 'center',
      originX: 'center',
      originY: 'center',
      zIndex: 1000  // 배경 이미지보다 앞에 오도록 설정
    })
    canvas.add(nameText)

    // 직급 텍스트
    const titleText = new fabric.IText('직급', {
      left: 170,
      top: 300,
      fontSize: 20,
      fontFamily: 'Arial',
      fill: '#000000',
      textAlign: 'center',
      originX: 'center',
      originY: 'center',
      zIndex: 1000  // 배경 이미지보다 앞에 오도록 설정
    })
    canvas.add(titleText)

    safeRenderAll(canvas)
  }

  // 프로필 데이터로 캔버스 업데이트 (위치 유지하면서 텍스트만 변경)
  const updateCanvasWithProfile = useCallback((profile) => {
    if (!fabricCanvasRef.current) return

    const canvas = fabricCanvasRef.current
    
    // 캔버스가 유효한지 확인
    if (!canvas || typeof canvas.renderAll !== 'function') {
      console.warn('Canvas is not properly initialized')
      return
    }

    const objects = canvas.getObjects()

    console.log('Updating canvas with profile:', profile)
    console.log('Current objects count:', objects.length)

    // 🔥 새로운 로직: 텍스트 객체들을 Y 좌표 순으로 정렬하여 순서대로 업데이트
    const textObjects = objects
      .filter(obj => obj.type === 'i-text')
      .sort((a, b) => (a.top || 0) - (b.top || 0))

    console.log('Text objects found:', textObjects.length)

    // 텍스트 객체를 순서대로 업데이트 (위치 기반)
    textObjects.forEach((obj, index) => {
      const currentText = obj.text || ''
      console.log(`Text object ${index}: "${currentText}" at position:`, obj.left, obj.top)
      
      // 첫 번째 텍스트 객체는 회사명으로 설정
      if (index === 0) {
        obj.set('text', profile.company || '회사명')
        console.log('Updated first text to company:', profile.company)
      }
      // 두 번째 텍스트 객체는 이름으로 설정
      else if (index === 1) {
        obj.set('text', profile.name || '이름')
        console.log('Updated second text to name:', profile.name)
      }
      // 세 번째 텍스트 객체는 직급으로 설정
      else if (index === 2) {
        obj.set('text', profile.title || '직급')
        console.log('Updated third text to title:', profile.title)
      }
      // 기존 키워드 매칭 로직도 유지 (호환성)
      else {
        const lowerText = currentText.toLowerCase()
        
        if (currentText === '회사명' || currentText === 'Company' || 
            currentText === '회사' || currentText === 'company') {
          obj.set('text', profile.company || '회사명')
          console.log('Updated company text to:', profile.company)
        }
        else if (currentText === '이름' || currentText === 'Name' || 
                 currentText === '성명' || currentText === 'fullname') {
          obj.set('text', profile.name || '이름')
          console.log('Updated name text to:', profile.name)
        }
        else if (currentText === '직급' || currentText === 'Title' || 
                 currentText === 'Position' || currentText === '부서') {
          obj.set('text', profile.title || '직급')
          console.log('Updated title text to:', profile.title)
        }
      }
    })

    // 안전한 렌더링
    if (safeRenderAll(canvas)) {
      console.log('Canvas updated with profile data')
    }
  }, [fabricCanvasRef, safeRenderAll])

  // 기본 템플릿으로 캔버스 초기화 (프로필 없이)
  const initializeCanvasWithDefaultTemplate = useCallback(() => {
    if (!fabricCanvasRef.current) return

    const canvas = fabricCanvasRef.current
    
    // 기존 객체들 모두 제거
    canvas.clear()
    
    // 기본 템플릿 생성
    createDefaultTemplate(canvas)
    
    console.log('Canvas initialized with default template')
  }, [fabricCanvasRef, createDefaultTemplate])

  // 텍스트 객체 크기 조절 핸들러 (폰트 크기로 변환)
  const handleObjectScaling = (e) => {
    const obj = e.target
    if (obj.type === 'i-text') {
      const scaleX = obj.scaleX || 1
      const scaleY = obj.scaleY || 1
      const currentFontSize = obj.fontSize || 16
      
      // 평균 스케일 팩터 계산
      const scaleFactor = (scaleX + scaleY) / 2
      
      // 새로운 폰트 크기 계산
      const newFontSize = Math.max(8, Math.min(200, currentFontSize * scaleFactor))
      
      // 폰트 크기 업데이트
      obj.set('fontSize', newFontSize)
      
      // 스케일 리셋
      obj.set('scaleX', 1)
      obj.set('scaleY', 1)
      
      console.log(`Text scaled: ${currentFontSize}px → ${newFontSize}px`)
    }
  }

  // 캔버스 초기화
  const clearCanvas = () => {
    if (!fabricCanvasRef.current) return
    
    const canvas = fabricCanvasRef.current
    canvas.clear()
    
    // 테두리와 크기 텍스트 다시 추가
    const border = new fabric.Rect({
      left: 0,
      top: 0,
      width: 340,
      height: 472,
      fill: 'transparent',
      stroke: '#cccccc',
      strokeWidth: 2,
      strokeDashArray: [5, 5],
      selectable: false,
      evented: false,
      type: 'border'
    })
    canvas.add(border)

    const sizeText = new fabric.IText('9cm × 12.5cm', {
      left: 10,
      top: 10,
      fontSize: 12,
      fill: '#999999',
      selectable: false,
      evented: false,
      type: 'border'
    })
    canvas.add(sizeText)
    
    safeRenderAll(canvas)
    
    if (onCanvasUpdate) onCanvasUpdate()
  }

  // JSON 보기 함수
  const viewJson = () => {
    if (!fabricCanvasRef.current) return
    
    const data = exportCanvas()
    setJsonData(data)
    setShowJsonView(true)
  }

  // JSON 보기 닫기
  const closeJsonView = () => {
    setShowJsonView(false)
    setJsonData(null)
  }

  // 캔버스 JSON 내보내기
  const exportCanvas = () => {
    if (!fabricCanvasRef.current) return null
    
    const canvas = fabricCanvasRef.current
    const data = canvas.toJSON()
    console.log('Canvas JSON:', data)
    return data
  }

  // 현재 캔버스 JSON 가져오기 (최대 단순화)
  const getCurrentCanvasJson = useCallback(() => {
    if (!fabricCanvasRef.current) return null
    
    const canvas = fabricCanvasRef.current
    
    // 캔버스 JSON을 그대로 반환 (모든 정보가 이미 포함되어 있음)
    const canvasJson = canvas.toJSON()
    console.log('Canvas JSON:', canvasJson)
    
    return canvasJson
  }, [fabricCanvasRef])

  // 에러 타입별 메시지 분류
  const getErrorMessage = (error) => {
    if (error.message.includes('image load failed')) {
      return '이미지 로드에 실패했습니다. 이미지 파일을 확인해주세요.'
    } else if (error.message.includes('Invalid template JSON')) {
      return '템플릿 데이터 형식이 올바르지 않습니다.'
    } else if (error.message.includes('Template data not provided')) {
      return '템플릿 정보가 없습니다.'
    } else if (error.message.includes('is not a constructor')) {
      return '템플릿에 지원되지 않는 객체 타입이 포함되어 있습니다. 템플릿을 다시 생성해주세요.'
    } else if (error.message.includes('Background image load failed')) {
      return '배경 이미지 로드에 실패했습니다.'
    } else if (error.message.includes('fromObject')) {
      return '템플릿 객체 생성 중 오류가 발생했습니다. 템플릿을 다시 저장해주세요.'
    } else if (error.message.includes('Cannot read properties of undefined')) {
      return '템플릿 데이터 구조에 문제가 있습니다. 템플릿을 다시 저장해주세요.'
    } else {
      return `템플릿 로드 중 오류가 발생했습니다: ${error.message}`
    }
  }

  // 템플릿 로드 (최적화된 JSON 처리)
  const loadTemplate = useCallback(async (template) => {
    if (!fabricCanvasRef.current) return

    console.log('Loading template:', template)
    setIsLoading(true)
    
    if (!template) {
      console.error('Template data not provided')
      setIsLoading(false)
      return
    }
    
    if (!template.canvas_json) {
      console.error('Template JSON data not provided')
      setIsLoading(false)
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
        hasCanvas: !!templateData.canvas,
        objectTypes: templateData.objects?.map(obj => obj.type) || []
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
        
        // loadFromJSON 대신 수동 객체 생성으로 안정성 향상
        await loadOptimizedTemplate(canvas, jsonData)
      }
      
    } catch (error) {
      console.error('Error loading template:', error)
      // createDefaultTemplate 호출 제거 - 에러를 명확히 표시
      alert(getErrorMessage(error))
    } finally {
      setIsLoading(false)
    }
  }, [fabricCanvasRef, getErrorMessage])

  // 최적화된 템플릿 로드
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
      
      // 배경 이미지 로드 - objects 배열에서 background 타입 찾기
      const backgroundObj = templateData.objects?.find(obj => obj.type === 'background')
      if (backgroundObj && backgroundObj.src) {
        console.log('Loading background image from objects:', backgroundObj.src)
        
        // 배경 이미지 상태 업데이트
        setBackgroundImage({
          url: backgroundObj.src,
          fileName: 'background.png',
          opacity: backgroundObj.opacity || 0.7
        })
        
        const backgroundPromise = new Promise((resolve, reject) => {
          fabric.Image.fromURL(backgroundObj.src, (img) => {
            if (!img) {
              reject(new Error(`Background image load failed: ${backgroundObj.src}`))
              return
            }
            
            img.set({
              left: backgroundObj.left || 0,
              top: backgroundObj.top || 0,
              scaleX: backgroundObj.scaleX || (340 / img.width),
              scaleY: backgroundObj.scaleY || (472 / img.height),
              selectable: true,   // 배경 이미지 선택 가능
              evented: true,      // 배경 이미지 이벤트 활성화
              opacity: backgroundObj.opacity || backgroundOpacity,
              type: 'background',
              crossOrigin: 'anonymous',
              src: backgroundObj.src,
              angle: backgroundObj.angle || 0,
              originX: backgroundObj.originX || 'left',
              originY: backgroundObj.originY || 'top',
              zIndex: -1000       // 가장 뒤쪽으로 정렬
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
            lockUniScaling: true,
            zIndex: 1000  // 배경 이미지보다 앞에 오도록 설정
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
                crossOrigin: 'anonymous',
                zIndex: 500  // 배경 이미지보다 앞에, 텍스트보다는 뒤에
            })
              img.setCoords()
            canvas.add(img)
              resolve()
            }, { crossOrigin: 'anonymous' })
          })
          asyncTasks.push(imagePromise)
          
        } else if (objData.type === 'background') {
          // 배경 이미지 객체는 이미 위에서 처리됨 (중복 처리 방지)
          console.log('Skipping background object (already processed)')
          continue
          
        } else {
          // 기타 객체들 (Rect, Circle 등) - 안전한 객체 생성
          try {
            const className = objData.type.charAt(0).toUpperCase() + objData.type.slice(1)
            
            // 지원되는 Fabric.js 객체 타입 확인
            const supportedTypes = ['Rect', 'Circle', 'Ellipse', 'Line', 'Polygon', 'Path', 'Group']
            
            if (!supportedTypes.includes(className) || !fabric[className]) {
              console.warn(`Unsupported object type: ${objData.type}, skipping...`)
              continue
            }
            
            // fromObject 대신 직접 생성자 사용
            let obj
            switch (objData.type) {
              case 'rect':
                obj = new fabric.Rect({
            left: objData.left,
            top: objData.top,
            width: objData.width,
            height: objData.height,
            fill: objData.fill,
            stroke: objData.stroke,
            strokeWidth: objData.strokeWidth,
            angle: objData.angle,
                  scaleX: objData.scaleX || 1,
                  scaleY: objData.scaleY || 1,
                  zIndex: 500  // 배경 이미지보다 앞에, 텍스트보다는 뒤에
                })
                break
              case 'circle':
                obj = new fabric.Circle({
                  left: objData.left,
                  top: objData.top,
                  radius: objData.radius || (objData.width / 2),
                  fill: objData.fill,
                  stroke: objData.stroke,
                  strokeWidth: objData.strokeWidth,
                  angle: objData.angle,
                  scaleX: objData.scaleX || 1,
                  scaleY: objData.scaleY || 1,
                  zIndex: 500  // 배경 이미지보다 앞에, 텍스트보다는 뒤에
                })
                break
              case 'ellipse':
                obj = new fabric.Ellipse({
                  left: objData.left,
                  top: objData.top,
                  rx: objData.rx || (objData.width / 2),
                  ry: objData.ry || (objData.height / 2),
                  fill: objData.fill,
                  stroke: objData.stroke,
                  strokeWidth: objData.strokeWidth,
                  angle: objData.angle,
                  scaleX: objData.scaleX || 1,
                  scaleY: objData.scaleY || 1,
                  zIndex: 500  // 배경 이미지보다 앞에, 텍스트보다는 뒤에
                })
                break
              case 'line':
                obj = new fabric.Line(
                  [objData.x1 || 0, objData.y1 || 0, objData.x2 || objData.width, objData.y2 || objData.height],
                  {
                    left: objData.left,
                    top: objData.top,
                    stroke: objData.stroke || '#000000',
                    strokeWidth: objData.strokeWidth || 1,
                    angle: objData.angle,
                    scaleX: objData.scaleX || 1,
                    scaleY: objData.scaleY || 1,
                    zIndex: 500  // 배경 이미지보다 앞에, 텍스트보다는 뒤에
                  }
                )
                break
              default:
                // 기타 타입은 기본 속성으로 생성
                if (fabric[className] && typeof fabric[className] === 'function') {
                  obj = new fabric[className]({
                    left: objData.left,
                    top: objData.top,
                    width: objData.width,
                    height: objData.height,
                    fill: objData.fill,
                    stroke: objData.stroke,
                    strokeWidth: objData.strokeWidth,
                    angle: objData.angle,
                    scaleX: objData.scaleX || 1,
                    scaleY: objData.scaleY || 1,
                    zIndex: 500  // 배경 이미지보다 앞에, 텍스트보다는 뒤에
                  })
                } else {
                  console.warn(`Cannot create object of type ${objData.type}, skipping...`)
                  continue
                }
            }
            
            if (obj) {
              obj.setCoords()
          canvas.add(obj)
            }
          } catch (error) {
            console.warn(`Failed to create object of type ${objData.type}:`, error)
            // 지원되지 않는 객체 타입은 건너뛰고 계속 진행
            continue
          }
        }
      }
      
      // 모든 비동기 작업 완료 대기
      if (asyncTasks.length > 0) {
        await Promise.all(asyncTasks)
      }
      
      // 최종 렌더링
      safeRenderAll(canvas)
      setIsTemplateLoaded(true)
      console.log('Optimized template loaded successfully')
      
    } catch (error) {
      console.error('Error loading optimized template:', error)
      throw error // 에러를 상위로 전파
    }
  }

  // 이미지 추가 버튼 클릭
  const handleAddImage = () => {
    setShowImageUpload(!showImageUpload)
  }

  // 배경 이미지 업로드 버튼 클릭
  const handleAddBackgroundImage = () => {
    setShowBackgroundUpload(!showBackgroundUpload)
  }

  // 배경 이미지 선택 핸들러 (라이브러리에서 선택)
  const handleBackgroundImageSelect = (imageData) => {
    if (!fabricCanvasRef.current) return
    
    // 기존 배경 이미지 제거
    removeBackgroundImage()
    
    // Fabric.js 이미지 객체 생성
    fabric.Image.fromURL(imageData.url, (img) => {
      const canvas = fabricCanvasRef.current
      const canvasWidth = canvas.getWidth()
      const canvasHeight = canvas.getHeight()
      
      img.set({
        left: 0,
        top: 0,
        scaleX: canvasWidth / img.width,
        scaleY: canvasHeight / img.height,
        selectable: true,   // 배경 이미지 선택 가능
        evented: false,     // 배경 이미지 이벤트 비활성화 (다른 객체 선택 방해 방지)
        opacity: backgroundOpacity,
        type: 'background', // 배경 이미지 타입
        src: imageData.url, // src 속성 추가
        zIndex: -1000       // 가장 뒤쪽으로 정렬
      })
      
      canvas.add(img)
      canvas.sendToBack(img)
      safeRenderAll(canvas)
      
      // 배경 이미지 상태 업데이트
      setBackgroundImage({
        ...imageData,
        scaleX: canvasWidth / img.width,
        scaleY: canvasHeight / img.height,
        left: 0,
        top: 0
      })
    })
  }

  // 배경 이미지 업로드 핸들러 (새로 업로드)
  const handleBackgroundImageUpload = (imageData) => {
    handleBackgroundImageSelect(imageData)
  }

  // 배경 이미지 제거
  const removeBackgroundImage = () => {
    if (!fabricCanvasRef.current) return
    
    const canvas = fabricCanvasRef.current
    const objects = canvas.getObjects()
    
    objects.forEach((obj) => {
      if (obj.type === 'background') {
        canvas.remove(obj)
      }
    })
    
    safeRenderAll(canvas)
    setBackgroundImage(null)
  }

  // 배경 이미지를 캔버스에 맞춤
  const fitBackgroundImageToCanvas = () => {
    if (!fabricCanvasRef.current) return

    const canvas = fabricCanvasRef.current
    const objects = canvas.getObjects()
    const backgroundImage = objects.find(obj => obj.type === 'background')
    
    if (backgroundImage) {
      const canvasWidth = canvas.getWidth()
      const canvasHeight = canvas.getHeight()
      
      backgroundImage.set({
        left: 0,
        top: 0,
        scaleX: canvasWidth / backgroundImage.width,
        scaleY: canvasHeight / backgroundImage.height
      })
      safeRenderAll(canvas)
    }
  }

  // 배경 이미지를 화면에 맞춤 (비율 유지)
  const fitBackgroundImageToScreen = () => {
    if (!fabricCanvasRef.current) return

    const canvas = fabricCanvasRef.current
    const objects = canvas.getObjects()
    const backgroundImage = objects.find(obj => obj.type === 'background')
    
    if (backgroundImage) {
      const canvasWidth = canvas.getWidth()
      const canvasHeight = canvas.getHeight()
      
      // 비율을 유지하면서 캔버스에 맞춤
      const scaleX = canvasWidth / backgroundImage.width
      const scaleY = canvasHeight / backgroundImage.height
      const scale = Math.min(scaleX, scaleY)
      
      backgroundImage.set({
        left: canvasWidth / 2,
        top: canvasHeight / 2,
        scaleX: scale,
        scaleY: scale,
        originX: 'center',
        originY: 'center'
      })
      safeRenderAll(canvas)
    }
  }

  // 배경 이미지 크기 조절 (비율 유지)
  const resizeBackgroundImage = (scale) => {
    if (!fabricCanvasRef.current) return

    const canvas = fabricCanvasRef.current
    const objects = canvas.getObjects()
    const backgroundImage = objects.find(obj => obj.type === 'background')
    
    if (backgroundImage) {
      backgroundImage.set({
        scaleX: scale,
        scaleY: scale
      })
      safeRenderAll(canvas)
      
      // 상태 업데이트
      setBackgroundImage(prev => ({
        ...prev,
        scaleX: scale,
        scaleY: scale
      }))
    }
  }

  // 배경 이미지 위치 조절
  const moveBackgroundImage = (left, top) => {
    if (!fabricCanvasRef.current) return

    const canvas = fabricCanvasRef.current
    const objects = canvas.getObjects()
    const backgroundImage = objects.find(obj => obj.type === 'background')
    
    if (backgroundImage) {
      backgroundImage.set({
        left: left,
        top: top
      })
      safeRenderAll(canvas)
    }
  }

  // 배경 이미지 투명도 업데이트
  const updateBackgroundOpacity = (opacity) => {
    if (!fabricCanvasRef.current) return
    
    const canvas = fabricCanvasRef.current
    const objects = canvas.getObjects()
    const backgroundImage = objects.find(obj => obj.type === 'background')
    
    if (backgroundImage) {
      backgroundImage.set('opacity', opacity)
      safeRenderAll(canvas)
    }
  }

  // 객체 속성 추출 함수
  const getObjectProperties = (obj) => {
    if (!obj) return null

    return {
      left: Math.round(obj.left || 0),
      top: Math.round(obj.top || 0),
      width: Math.round((obj.width || 0) * (obj.scaleX || 1)),
      height: Math.round((obj.height || 0) * (obj.scaleY || 1)),
      fontSize: obj.fontSize || 16,
      fontFamily: obj.fontFamily || 'Arial',
      fontWeight: obj.fontWeight || 'normal',
      fontStyle: obj.fontStyle || 'normal',
      fill: obj.fill || '#000000',
      textAlign: obj.textAlign || 'left',
      angle: Math.round(obj.angle || 0),
      scaleX: obj.scaleX || 1,
      scaleY: obj.scaleY || 1,
      opacity: obj.opacity || 1,
      stroke: obj.stroke || 'transparent',
      strokeWidth: obj.strokeWidth || 0,
      originX: obj.originX || 'left',
      originY: obj.originY || 'top'
    }
  }

  // 이미지 선택 핸들러
  const handleImageSelect = (imageData) => {
    if (!fabricCanvasRef.current) return

    fabric.Image.fromURL(imageData.url, (img) => {
      img.set({
        left: 100,
        top: 100,
        scaleX: 0.5,
        scaleY: 0.5,
        selectable: true,
        evented: true,
        type: 'editable' // 편집 가능한 이미지 타입
      })
      
      fabricCanvasRef.current.add(img)
      fabricCanvasRef.current.setActiveObject(img)
      fabricCanvasRef.current.renderAll()
      
      if (onCanvasUpdate) {
        onCanvasUpdate()
      }
    })
  }

  // 컨텍스트 메뉴 닫기
  const closeContextMenu = () => {
    setContextMenu({ visible: false, position: null })
  }

  // 컨텍스트 메뉴 액션 처리
  const handleContextAction = (action) => {
    if (!fabricCanvasRef.current) return
    
    const canvas = fabricCanvasRef.current
    const activeObject = canvas.getActiveObject()
    
    if (!activeObject) return
    
    switch (action) {
      case 'bringToFront':
        canvas.bringToFront(activeObject)
        break
      case 'sendToBack':
        canvas.sendToBack(activeObject)
        break
      case 'bringForward':
        canvas.bringForward(activeObject)
        break
      case 'sendBackwards':
        canvas.sendBackwards(activeObject)
        break
      case 'delete':
        canvas.remove(activeObject)
        break
      default:
        break
    }
    
    safeRenderAll(canvas)
    closeContextMenu()
    
    if (onCanvasUpdate) {
      onCanvasUpdate()
    }
  }

  // selectedProfile 변경 시 캔버스 업데이트
  useEffect(() => {
    if (!fabricCanvasRef.current || !isCanvasReady) return

    if (selectedProfile) {
      // 프로필이 선택된 경우 해당 프로필로 업데이트
      updateCanvasWithProfile(selectedProfile)
    } else {
      // 프로필이 선택되지 않은 경우 기본 템플릿으로 초기화
      initializeCanvasWithDefaultTemplate()
    }
  }, [selectedProfile, isCanvasReady])

  // 외부에서 템플릿 로드 호출 가능하도록 노출 (캔버스 준비 후)
  useEffect(() => {
    if (onTemplateLoad && fabricCanvasRef.current && isCanvasReady) {
      console.log('CanvasEditor: Exposing canvas methods to parent')
      
      const canvasMethods = {
        loadTemplate,
        fabricCanvasRef: fabricCanvasRef.current,
        updateCanvasWithProfile,
        initializeCanvasWithDefaultTemplate,
        getCurrentCanvasJson,
        bringToFront: () => {
          const canvas = fabricCanvasRef.current
          const activeObject = canvas.getActiveObject()
          if (activeObject) {
            canvas.bringToFront(activeObject)
            safeRenderAll(canvas)
          }
        },
        sendToBack: () => {
          const canvas = fabricCanvasRef.current
          const activeObject = canvas.getActiveObject()
          if (activeObject) {
            canvas.sendToBack(activeObject)
            safeRenderAll(canvas)
          }
        },
        bringForward: () => {
          const canvas = fabricCanvasRef.current
          const activeObject = canvas.getActiveObject()
          if (activeObject) {
            canvas.bringForward(activeObject)
            safeRenderAll(canvas)
          }
        },
        sendBackwards: () => {
          const canvas = fabricCanvasRef.current
          const activeObject = canvas.getActiveObject()
          if (activeObject) {
            canvas.sendBackwards(activeObject)
            safeRenderAll(canvas)
          }
        }
      }
      
      onTemplateLoad(canvasMethods)
    }
  }, [isCanvasReady]) // onTemplateLoad 의존성 제거

  // 용지 크기 변경 시 캔버스 크기 업데이트
  useEffect(() => {
    if (fabricCanvasRef.current && isCanvasReady) {
      updateCanvasSize(fabricCanvasRef.current, paperSettings.width, paperSettings.height)
      updateGuidelines(fabricCanvasRef.current, paperSettings.width, paperSettings.height, paperSettings.showGuidelines)
    }
  }, [paperSettings.width, paperSettings.height, isCanvasReady])


  return (
    <div className="h-full flex flex-col">
      {/* 용지 설정 패널 */}
      <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <div className="flex justify-between items-center mb-3">
          <h4 className="text-sm font-semibold text-gray-900">용지 설정</h4>
          <button
            onClick={toggleGuidelines}
            className={`px-3 py-1 text-xs rounded transition-colors ${
              paperSettings.showGuidelines
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
            }`}
          >
            {paperSettings.showGuidelines ? '가이드라인 숨기기' : '가이드라인 표시'}
          </button>
        </div>
        
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-gray-600 mb-1">용지 너비 (cm)</label>
            <input
              type="number"
              step="0.1"
              min="1"
              max="50"
              value={paperSettings.width}
              onChange={(e) => handlePaperSettingsChange('width', e.target.value)}
              className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">용지 높이 (cm)</label>
            <input
              type="number"
              step="0.1"
              min="1"
              max="50"
              value={paperSettings.height}
              onChange={(e) => handlePaperSettingsChange('height', e.target.value)}
              className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
        
        <div className="mt-2 text-xs text-gray-500">
          💡 가이드라인: 빨간선(외곽), 초록선(안전여백), 파란선(중앙선)
        </div>
      </div>

      <div className="mb-4 flex justify-between items-center">
        <h3 className="text-lg font-semibold">명찰 편집</h3>
        <div className="space-x-2">
          <button
            onClick={handleAddBackgroundImage}
            className="px-3 py-2 bg-yellow-500 text-white text-sm rounded hover:bg-yellow-600"
          >
            배경 이미지
          </button>
          <button
            onClick={handleAddImage}
            className="px-3 py-2 bg-green-500 text-white text-sm rounded hover:bg-green-600"
          >
            편집 이미지
          </button>
          <button
            onClick={clearCanvas}
            className="px-3 py-2 bg-gray-500 text-white text-sm rounded hover:bg-gray-600"
          >
            초기화
          </button>
          <button
            onClick={viewJson}
            className="px-3 py-2 bg-blue-500 text-white text-sm rounded hover:bg-blue-600"
          >
            JSON 보기
          </button>
        </div>
      </div>

      {/* 배경 이미지 선택/해제 버튼 */}
      {backgroundImage && (
        <div className="mb-4 p-3 bg-orange-50 rounded-lg border border-orange-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-orange-800">
                배경 이미지: {backgroundImage.name}
              </span>
              <span className="text-xs text-orange-600">
                {isBackgroundSelected ? '(선택됨)' : '(선택 안됨)'}
              </span>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={selectBackgroundImage}
                disabled={isBackgroundSelected}
                className={`px-3 py-1 text-xs rounded transition-colors ${
                  isBackgroundSelected
                    ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                    : 'bg-orange-500 text-white hover:bg-orange-600'
                }`}
              >
                배경 선택
              </button>
              <button
                onClick={deselectBackgroundImage}
                disabled={!isBackgroundSelected}
                className={`px-3 py-1 text-xs rounded transition-colors ${
                  !isBackgroundSelected
                    ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                    : 'bg-gray-500 text-white hover:bg-gray-600'
                }`}
              >
                선택 해제
              </button>
            </div>
          </div>
          <div className="mt-2 text-xs text-orange-600">
            💡 배경 이미지를 선택하면 크기 조절 핸들로 자유롭게 조정할 수 있습니다
          </div>
        </div>
      )}
      
      <div className="border-2 border-gray-300 rounded-lg overflow-hidden relative flex justify-center bg-gray-50">
        <canvas
          ref={canvasRef}
          className="block"
          style={{
            width: '340px',
            height: '472px',
            backgroundColor: '#ffffff'
          }}
          onContextMenu={(e) => e.preventDefault()} // 기본 우클릭 메뉴 비활성화
        />
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75 z-10">
            <div className="flex flex-col items-center space-y-2">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              <div className="text-sm text-gray-600">템플릿 로딩 중...</div>
            </div>
          </div>
        )}
      </div>
      
      {!isCanvasReady && (
        <div className="flex items-center justify-center h-64 bg-gray-100">
          <div className="text-gray-500">캔버스 로딩 중...</div>
        </div>
      )}

      {/* 배경 이미지 업로드 패널 */}
      {showBackgroundUpload && (
        <div className="mt-4 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
          <div className="flex justify-between items-center mb-3">
            <h4 className="text-sm font-semibold text-gray-900">배경 이미지 업로드 (가이드용)</h4>
            <button
              onClick={() => setShowBackgroundUpload(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <ImageUploadLibrary 
            onImageUpload={handleBackgroundImageUpload}
            onImageSelect={handleBackgroundImageSelect}
            type="background"
          />
          
          {/* 배경 이미지 조절 패널 */}
          {backgroundImage && (
            <div className="mt-4 space-y-2">
              <div className="flex justify-between items-center p-2 bg-yellow-100 rounded">
                <span className="text-sm text-yellow-800">
                  선택됨: {backgroundImage.name} (인쇄 시 제외)
                </span>
                <button
                  onClick={removeBackgroundImage}
                  className="text-red-500 hover:text-red-700 text-sm"
                >
                  제거
                </button>
              </div>
              
              {/* 배경 이미지 조절 버튼들 */}
              <div className="space-y-2">
                {/* 크기 맞춤 버튼들 */}
                <div className="flex space-x-2">
                  <button
                    onClick={fitBackgroundImageToCanvas}
                    className="flex-1 px-3 py-2 bg-blue-500 text-white text-xs rounded hover:bg-blue-600"
                  >
                    캔버스에 맞춤
                  </button>
                  <button
                    onClick={fitBackgroundImageToScreen}
                    className="flex-1 px-3 py-2 bg-purple-500 text-white text-xs rounded hover:bg-purple-600"
                  >
                    비율 유지 맞춤
                  </button>
                </div>
                
                {/* 크기 조절 슬라이더 */}
                <div className="space-y-2">
                  <label className="block text-xs font-medium text-gray-700">
                    크기 조절: {Math.round((() => {
                      if (!fabricCanvasRef.current) return 100
                      const canvas = fabricCanvasRef.current
                      const objects = canvas.getObjects()
                      const bgImage = objects.find(obj => obj.type === 'background')
                      return Math.round((bgImage?.scaleX || 1) * 100)
                    })())}%
                  </label>
                  <input
                    type="range"
                    min="0.1"
                    max="3"
                    step="0.1"
                    value={(() => {
                      if (!fabricCanvasRef.current) return 1
                      const canvas = fabricCanvasRef.current
                      const objects = canvas.getObjects()
                      const bgImage = objects.find(obj => obj.type === 'background')
                      return bgImage?.scaleX || 1
                    })()}
                    onChange={(e) => {
                      const scale = parseFloat(e.target.value)
                      resizeBackgroundImage(scale)
                    }}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>10%</span>
                    <span>100%</span>
                    <span>300%</span>
                  </div>
                </div>
                
                {/* 위치 조절 버튼들 */}
                <div className="space-y-2">
                  <label className="block text-xs font-medium text-gray-700">위치 조절</label>
                  <div className="grid grid-cols-3 gap-1">
                    <button
                      onClick={() => moveBackgroundImage(0, 0)}
                      className="px-2 py-1 bg-gray-200 text-gray-700 text-xs rounded hover:bg-gray-300"
                    >
                      좌상
                    </button>
                    <button
                      onClick={() => {
                        const canvas = fabricCanvasRef.current
                        const canvasWidth = canvas.getWidth()
                        moveBackgroundImage(canvasWidth / 2, 0)
                      }}
                      className="px-2 py-1 bg-gray-200 text-gray-700 text-xs rounded hover:bg-gray-300"
                    >
                      상단
                    </button>
                    <button
                      onClick={() => {
                        const canvas = fabricCanvasRef.current
                        const canvasWidth = canvas.getWidth()
                        moveBackgroundImage(canvasWidth, 0)
                      }}
                      className="px-2 py-1 bg-gray-200 text-gray-700 text-xs rounded hover:bg-gray-300"
                    >
                      우상
                    </button>
                    <button
                      onClick={() => {
                        const canvas = fabricCanvasRef.current
                        const canvasHeight = canvas.getHeight()
                        moveBackgroundImage(0, canvasHeight / 2)
                      }}
                      className="px-2 py-1 bg-gray-200 text-gray-700 text-xs rounded hover:bg-gray-300"
                    >
                      좌측
                    </button>
                    <button
                      onClick={() => {
                        const canvas = fabricCanvasRef.current
                        const canvasWidth = canvas.getWidth()
                        const canvasHeight = canvas.getHeight()
                        moveBackgroundImage(canvasWidth / 2, canvasHeight / 2)
                      }}
                      className="px-2 py-1 bg-gray-200 text-gray-700 text-xs rounded hover:bg-gray-300"
                    >
                      중앙
                    </button>
                    <button
                      onClick={() => {
                        const canvas = fabricCanvasRef.current
                        const canvasWidth = canvas.getWidth()
                        const canvasHeight = canvas.getHeight()
                        moveBackgroundImage(canvasWidth, canvasHeight / 2)
                      }}
                      className="px-2 py-1 bg-gray-200 text-gray-700 text-xs rounded hover:bg-gray-300"
                    >
                      우측
                    </button>
                    <button
                      onClick={() => {
                        const canvas = fabricCanvasRef.current
                        const canvasHeight = canvas.getHeight()
                        moveBackgroundImage(0, canvasHeight)
                      }}
                      className="px-2 py-1 bg-gray-200 text-gray-700 text-xs rounded hover:bg-gray-300"
                    >
                      좌하
                    </button>
                    <button
                      onClick={() => {
                        const canvas = fabricCanvasRef.current
                        const canvasWidth = canvas.getWidth()
                        const canvasHeight = canvas.getHeight()
                        moveBackgroundImage(canvasWidth / 2, canvasHeight)
                      }}
                      className="px-2 py-1 bg-gray-200 text-gray-700 text-xs rounded hover:bg-gray-300"
                    >
                      하단
                    </button>
                    <button
                      onClick={() => {
                        const canvas = fabricCanvasRef.current
                        const canvasWidth = canvas.getWidth()
                        const canvasHeight = canvas.getHeight()
                        moveBackgroundImage(canvasWidth, canvasHeight)
                      }}
                      className="px-2 py-1 bg-gray-200 text-gray-700 text-xs rounded hover:bg-gray-300"
                    >
                      우하
                    </button>
                  </div>
                </div>
              </div>
              
              {/* 투명도 조절 */}
              <div className="space-y-2">
                <label className="block text-xs font-medium text-gray-700">
                  투명도: {Math.round(backgroundOpacity * 100)}%
                </label>
                <input
                  type="range"
                  min="0.1"
                  max="1"
                  step="0.1"
                  value={backgroundOpacity}
                  onChange={(e) => {
                    const opacity = parseFloat(e.target.value)
                    setBackgroundOpacity(opacity)
                    updateBackgroundOpacity(opacity)
                  }}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
              </div>
              
              <div className="text-xs text-gray-600">
                💡 상단의 "배경 선택" 버튼을 클릭하여 배경 이미지를 선택하고 크기 조절 핸들로 자유롭게 조정할 수 있습니다
              </div>
            </div>
          )}
        </div>
      )}

      {/* 이미지 업로드 패널 */}
      {showImageUpload && (
        <div className="mt-4 p-4 bg-green-50 rounded-lg border border-green-200">
          <div className="flex justify-between items-center mb-3">
            <h4 className="text-sm font-semibold text-gray-900">편집 이미지 업로드 (인쇄 포함)</h4>
            <button
              onClick={() => setShowImageUpload(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <ImageUploadLibrary 
            onImageUpload={handleImageUpload}
            onImageSelect={handleImageSelect}
            type="image"
          />
        </div>
      )}

      {/* 우클릭 컨텍스트 메뉴 */}
      <ContextMenu
        visible={contextMenu.visible}
        position={contextMenu.position}
        onClose={closeContextMenu}
        onAction={handleContextAction}
        selectedObject={rightClickedObject}
      />

      {/* JSON 보기 모달 */}
      {showJsonView && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-4xl max-h-[80vh] overflow-hidden">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">캔버스 JSON 데이터</h3>
              <div className="space-x-2">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(JSON.stringify(jsonData, null, 2))
                    alert('JSON이 클립보드에 복사되었습니다!')
                  }}
                  className="px-3 py-1 bg-green-500 text-white text-sm rounded hover:bg-green-600"
                >
                  복사
                </button>
                <button
                  onClick={closeJsonView}
                  className="px-3 py-1 bg-gray-500 text-white text-sm rounded hover:bg-gray-600"
                >
                  닫기
                </button>
              </div>
            </div>
            
            <div className="bg-gray-100 rounded p-4 overflow-auto max-h-96">
              <pre className="text-xs text-gray-800 whitespace-pre-wrap">
                {JSON.stringify(jsonData, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

