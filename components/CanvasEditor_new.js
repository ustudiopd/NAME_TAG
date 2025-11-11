'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import dynamic from 'next/dynamic'
import ContextMenu from './ContextMenu'
import { getDefaultTemplate } from '../lib/namecardDatabase'
import ImageUpload from './ImageUpload'
import ImageUploadLibrary from './ImageUploadLibrary'
import { uploadImage } from '../lib/storage'
import { 
  saveTextObjectSettings, 
  getTextObjectSettings, 
  getDefaultTextObjectSettings 
} from '../lib/textObjectSettingsDatabase'

// Fabric.js를 동적으로 import하여 SSR 문제 해결
let fabric = null
let fabricLoading = false
let fabricLoadPromise = null

const loadFabric = async () => {
  if (typeof window === 'undefined') return null
  
  if (fabric) return fabric
  
  if (fabricLoading && fabricLoadPromise) {
    return await fabricLoadPromise
  }
  
  fabricLoading = true
  fabricLoadPromise = (async () => {
    try {
      console.log('Loading fabric.js...')
      const fabricModule = await import('fabric')
      fabric = fabricModule.fabric
      console.log('Fabric.js loaded successfully')
      return fabric
    } catch (error) {
      console.error('Failed to load fabric.js:', error)
      return null
    } finally {
      fabricLoading = false
    }
  })()
  
  return await fabricLoadPromise
}

export default function CanvasEditor({ 
  selectedProfile, 
  onCanvasUpdate, 
  selectedObject, 
  onPropertyChange,
  eventId,
  onTemplateLoad,
  onCanvasRef
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
  
  // 동일 프로필 재바인딩 차단을 위한 시그니처 ref
  const lastProfileSigRef = useRef('')
  
  // 드래그 중인지 추적 (강제 선택 최소화)
  const isDraggingRef = useRef(false)

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
    if (!canvas || !fabric) return

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
    if (!canvas || !fabric) return

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
    const initializeCanvas = async () => {
      if (!canvasRef.current) {
        console.log('Canvas ref not ready, retrying...')
        setTimeout(initializeCanvas, 100)
        return
      }

      // Fabric.js 로드 대기 (재시도 로직 포함)
      let fabricLib = null
      let retryCount = 0
      const maxRetries = 5
      
      while (!fabricLib && retryCount < maxRetries) {
        fabricLib = await loadFabric()
        if (!fabricLib) {
          retryCount++
          console.log(`Fabric.js loading retry ${retryCount}/${maxRetries}`)
          await new Promise(resolve => setTimeout(resolve, 200 * retryCount))
        }
      }
      
      if (!fabricLib) {
        console.error('Fabric.js could not be loaded after retries')
        return
      }

      console.log('Initializing canvas with fabric.js...')
      
      // 고정 캔버스 크기 (9cm x 12.5cm)
      const widthPx = 340  // 9cm * 37.8px/cm
      const heightPx = 472 // 12.5cm * 37.8px/cm
      
      const canvas = new fabricLib.Canvas(canvasRef.current, {
        width: widthPx,
        height: heightPx,
        backgroundColor: '#ffffff',
        enableRetinaScaling: true,
        imageSmoothingEnabled: true,
        selection: true,
        preserveObjectStacking: true
      })

    fabricCanvasRef.current = canvas
    setIsCanvasReady(true)
    
    // 부모 컴포넌트에 canvasRef 전달
    if (onCanvasRef) {
      onCanvasRef(canvasRef.current)
    }

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

    // 저장된 설정 불러오기
    let savedSettings = null
    if (eventId) {
      const { data, error } = await getTextObjectSettings(eventId)
      if (!error && data) {
        savedSettings = data
        console.log('Loaded saved text object settings:', savedSettings)
      } else {
        console.log('No saved settings found, using defaults')
      }
    }
    
    // 기본 템플릿 생성 (저장된 설정이 있으면 사용)
    if (savedSettings) {
      await createSingleTextObject(canvas, savedSettings)
    } else {
      await createDefaultTemplate(canvas)
    }

    // 강제 렌더링 실행 (배포 환경 대응)
    canvas.renderAll()
    
    // 배포 환경에서 안정적인 렌더링을 위한 다중 렌더링
    const forceRender = () => {
      canvas.renderAll()
      console.log('Canvas force rendered')
    }
    
    // 여러 번 강제 렌더링
    setTimeout(forceRender, 50)
    setTimeout(forceRender, 100)
    setTimeout(forceRender, 200)
    setTimeout(forceRender, 300)
    setTimeout(forceRender, 500)
    setTimeout(forceRender, 800)
    setTimeout(forceRender, 1000)
    setTimeout(forceRender, 1500)
    setTimeout(forceRender, 2000)
    
    // 최종 렌더링 확인
    setTimeout(() => {
      const objects = canvas.getObjects()
      console.log(`Canvas initialization complete. Objects count: ${objects.length}`)
      canvas.renderAll()
    }, 1000)

    // 이벤트 리스너 등록
    canvas.on('object:moving', () => {
      isDraggingRef.current = true // 드래그 시작
      if (onCanvasUpdate) onCanvasUpdate()
    })
    
    canvas.on('object:modified', () => {
      isDraggingRef.current = false // 드래그 종료
      if (onCanvasUpdate) onCanvasUpdate()
    })
    
    canvas.on('mouse:up', () => {
      isDraggingRef.current = false // 마우스 업 시 드래그 종료
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

    }

    initializeCanvas()

    return () => {
      if (fabricCanvasRef.current) {
        fabricCanvasRef.current.dispose()
      }
    }
  }, []) // 컴포넌트 마운트 시 한 번만 실행

  // 기본 템플릿 생성
  // 단일 텍스트 객체 생성 (설정 기반)
  const createSingleTextObject = async (canvas, settings = null) => {
    console.log('Creating single text object for canvas:', canvas.width, 'x', canvas.height)
    
    if (!canvas) return
    
    // Fabric.js 로드 확인
    const fabricLib = await loadFabric()
    if (!fabricLib) {
      console.error('Fabric.js not loaded for text object')
      return
    }
    fabric = fabricLib // 전역 fabric 변수에 할당
    
    // 기본 설정 또는 저장된 설정 사용
    const defaultSettings = {
      textContent: '이름',
      left: 170,
      top: 236,
      fontSize: 32,
      fontFamily: 'Arial',
      fontWeight: 'bold',
      fill: '#000000',
      textAlign: 'center',
      originX: 'center',
      originY: 'center',
      angle: 0,
      opacity: 1.0,
      scaleX: 1.0,
      scaleY: 1.0
    }
    
    const finalSettings = settings || defaultSettings
    
    // 단일 텍스트 객체 생성
    const textObject = new fabric.IText(finalSettings.textContent, {
      left: finalSettings.left,
      top: finalSettings.top,
      fontSize: finalSettings.fontSize,
      fontFamily: finalSettings.fontFamily,
      fontWeight: finalSettings.fontWeight,
      fill: finalSettings.fill,
      textAlign: finalSettings.textAlign,
      originX: finalSettings.originX,
      originY: finalSettings.originY,
      angle: finalSettings.angle,
      opacity: finalSettings.opacity,
      scaleX: finalSettings.scaleX,
      scaleY: finalSettings.scaleY,
      zIndex: 1000,
      dataField: 'profileText' // 단일 객체 식별자
    })
    
    canvas.add(textObject)
    console.log('Added single text object:', finalSettings.textContent, 'at', finalSettings.left, finalSettings.top)
    
    safeRenderAll(canvas)
    return textObject
  }

  // 기본 템플릿 생성 (단일 텍스트 객체)
  const createDefaultTemplate = async (canvas) => {
    console.log('Creating default template with single text object')
    
    // 기존 텍스트 객체 제거
    const existingTextObjects = canvas.getObjects().filter(o => o.type === 'i-text')
    existingTextObjects.forEach(obj => canvas.remove(obj))
    
    // 단일 텍스트 객체 생성
    await createSingleTextObject(canvas)
    
    const totalObjects = canvas.getObjects().length
    const textObjectsCount = canvas.getObjects().filter(o => o.type === 'i-text').length
    console.log('Default template created, total objects:', totalObjects, 'text objects:', textObjectsCount)
  }

  // 프로필 데이터로 단일 텍스트 객체 업데이트
  const updateCanvasWithProfile = useCallback((profile) => {
    if (!fabricCanvasRef.current) return

    const canvas = fabricCanvasRef.current
    
    // 캔버스가 유효한지 확인
    if (!canvas || typeof canvas.renderAll !== 'function') {
      console.warn('Canvas is not properly initialized')
      return
    }

    console.log('Updating canvas with profile:', profile)

    // 단일 텍스트 객체 찾기
    let textObject = canvas.getObjects().find(o => 
      o.type === 'i-text' && o.dataField === 'profileText'
    )
    
    // 텍스트 객체가 없으면 생성
    if (!textObject) {
      console.log('Text object not found, creating new one')
      createSingleTextObject(canvas).then(obj => {
        if (obj) {
          updateTextObjectWithProfile(obj, profile, canvas)
        }
      })
      return
    }
    
    // 텍스트 객체에 프로필 데이터 담기
    updateTextObjectWithProfile(textObject, profile, canvas)
  }, [fabricCanvasRef, onPropertyChange])
  
  // 텍스트 객체에 프로필 데이터 업데이트
  const updateTextObjectWithProfile = (textObject, profile, canvas) => {
    if (!textObject || !profile) return
    
    // 프로필 정보를 하나의 텍스트로 조합 (회사명 - 이름 - 직급)
    const parts = []
    if (profile.company) parts.push(profile.company)
    if (profile.name) parts.push(profile.name)
    if (profile.title) parts.push(profile.title)
    
    const profileText = parts.length > 0 ? parts.join(' - ') : '이름'
    
    // 텍스트 업데이트
    textObject.set('text', profileText)
    console.log('✅ Updated text object to:', profileText)
    
    // 드래그 중이 아닐 때만 자동 선택
    if (onPropertyChange && !isDraggingRef.current) {
      setTimeout(() => {
        if (isDraggingRef.current) {
          console.log('Skipping auto-select: user is dragging')
          return
        }
        
        canvas.setActiveObject(textObject)
        canvas.renderAll()
        onPropertyChange('selectedObject', textObject)
        console.log('Text object selected for position adjustment:', textObject.text)
      }, 150)
    }
    
    safeRenderAll(canvas)
  }

  // 기본 템플릿으로 캔버스 초기화 (프로필 없이)
  const initializeCanvasWithDefaultTemplate = useCallback(async () => {
    if (!fabricCanvasRef.current) return

    const canvas = fabricCanvasRef.current
    
    // 기존 객체들 모두 제거
    canvas.clear()
    
    // 기본 템플릿 생성
    await createDefaultTemplate(canvas)
    
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
    // 커스텀 속성(dataField) 포함하여 저장
    const data = canvas.toJSON(['dataField'])
    console.log('Canvas JSON:', data)
    return data
  }

  // 현재 캔버스 JSON 가져오기 (최대 단순화)
  const getCurrentCanvasJson = useCallback(() => {
    if (!fabricCanvasRef.current) return null
    
    const canvas = fabricCanvasRef.current
    
    // 캔버스 JSON을 그대로 반환 (커스텀 속성 포함)
    const canvasJson = canvas.toJSON(['dataField'])
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
    console.log('=== TEMPLATE LOADING START ===')
    console.log('Loading template:', template)
    console.log('Template ID:', template?.id)
    console.log('Template name:', template?.template_name)
    console.log('Canvas ready:', !!fabricCanvasRef.current)
    console.log('Fabric loaded:', !!fabric)
    
    if (!fabricCanvasRef.current) {
      console.error('Canvas not ready')
      return
    }

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
      // Fabric.js 로드 확인
      const fabricLib = await loadFabric()
      if (!fabricLib) {
        console.error('Fabric.js not loaded')
        setIsLoading(false)
        return
      }
      fabric = fabricLib // 전역 fabric 변수에 할당
      console.log('Fabric.js loaded for template loading')
      
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
      console.log('=== TEMPLATE LOADING COMPLETED ===')
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
            zIndex: 1000,  // 배경 이미지보다 앞에 오도록 설정
            dataField: objData.dataField // 커스텀 필드 복원 (구버전 템플릿 호환)
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

  // selectedProfile 변경 시 캔버스 업데이트 (동일 프로필 재바인딩 차단)
  useEffect(() => {
    if (!fabricCanvasRef.current || !isCanvasReady) {
      console.log('CanvasEditor: Canvas not ready yet')
      return
    }

    // 템플릿 로딩 중이면 프로필 업데이트 건너뛰기
    if (isLoading) {
      console.log('CanvasEditor: Skipping profile update - template loading in progress')
      return
    }

    // 캔버스에 텍스트 객체가 있는지 확인
    const canvas = fabricCanvasRef.current
    const textObjects = canvas.getObjects().filter(o => o.type === 'i-text')
    if (textObjects.length === 0) {
      console.warn('CanvasEditor: No text objects found, cannot update profile. Template may not be initialized yet.')
      return
    }
    
    // dataField가 설정된 텍스트 객체가 있는지 확인
    const objectsWithDataField = textObjects.filter(o => o.dataField)
    if (objectsWithDataField.length === 0 && textObjects.length > 0) {
      console.warn('CanvasEditor: Text objects found but no dataField set. This may be an old template.')
      // 구버전 템플릿이므로 fallback 매칭으로 처리됨
    }

    if (!selectedProfile) {
      console.log('CanvasEditor: No profile selected, keeping current canvas content')
      lastProfileSigRef.current = '' // 프로필 해제 시 시그니처 초기화
      return
    }

    // 프로필 시그니처 생성 (동일 프로필 재바인딩 차단)
    const sig = [
      selectedProfile.id ?? '',
      selectedProfile.name ?? '',
      selectedProfile.company ?? '',
      selectedProfile.title ?? ''
    ].join('|')

    // 동일 프로필이면 재바인딩 스킵
    if (lastProfileSigRef.current === sig) {
      console.log('CanvasEditor: Profile unchanged; skip rebinding')
      return
    }

    // 프로필이 실제로 변경된 경우에만 업데이트
    console.log('CanvasEditor: Updating canvas with profile:', selectedProfile.name)
    console.log('CanvasEditor: Text objects available:', textObjects.length)
    updateCanvasWithProfile(selectedProfile)
    lastProfileSigRef.current = sig
  }, [selectedProfile, isCanvasReady, updateCanvasWithProfile, isLoading])

  // 외부에서 템플릿 로드 호출 가능하도록 노출 (캔버스 준비 후)
  useEffect(() => {
    if (onTemplateLoad && fabricCanvasRef.current && isCanvasReady) {
      console.log('CanvasEditor: Exposing canvas methods to parent')
      
      // 현재 텍스트 객체 설정 저장
      const saveCurrentSettings = async () => {
        if (!eventId || !fabricCanvasRef.current) {
          console.warn('Cannot save settings: eventId or canvas not available')
          return { success: false, error: 'Event ID or canvas not available' }
        }
        
        const canvas = fabricCanvasRef.current
        const textObject = canvas.getObjects().find(o => 
          o.type === 'i-text' && o.dataField === 'profileText'
        )
        
        if (!textObject) {
          console.warn('No text object found to save')
          return { success: false, error: 'No text object found' }
        }
        
        const settings = {
          textContent: textObject.text || '',
          left: textObject.left || 170,
          top: textObject.top || 236,
          fontSize: textObject.fontSize || 32,
          fontFamily: textObject.fontFamily || 'Arial',
          fontWeight: textObject.fontWeight || 'bold',
          fill: textObject.fill || '#000000',
          textAlign: textObject.textAlign || 'center',
          originX: textObject.originX || 'center',
          originY: textObject.originY || 'center',
          angle: textObject.angle || 0,
          opacity: textObject.opacity || 1.0,
          scaleX: textObject.scaleX || 1.0,
          scaleY: textObject.scaleY || 1.0
        }
        
        const { data, error } = await saveTextObjectSettings(eventId, settings)
        if (error) {
          console.error('Failed to save settings:', error)
          return { success: false, error }
        }
        
        console.log('Settings saved successfully:', data)
        return { success: true, data }
      }
      
      const canvasMethods = {
        loadTemplate,
        fabricCanvasRef: fabricCanvasRef.current,
        updateCanvasWithProfile,
        initializeCanvasWithDefaultTemplate,
        getCurrentCanvasJson,
        saveCurrentSettings,
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
      
      <div 
        className="border-2 border-gray-300 rounded-lg relative flex justify-center bg-gray-50"
        style={{
          height: '500px',
          minHeight: '472px',
          position: 'relative',
          overflow: 'visible'
        }}
      >
        <div 
          id="fabric-canvas-container"
          style={{
            position: 'relative',
            width: '340px',
            height: '472px',
            backgroundColor: '#ffffff',
            border: '1px solid #e5e7eb',
            borderRadius: '4px',
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
            margin: '0 auto'
          }}
        >
          <canvas
            ref={canvasRef}
            style={{
              display: 'block',
              width: '100%',
              height: '100%'
            }}
            onContextMenu={(e) => e.preventDefault()} // 기본 우클릭 메뉴 비활성화
          />
        </div>
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

