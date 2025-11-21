'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import dynamic from 'next/dynamic'
import ContextMenu from './ContextMenu'
import { getDefaultTemplate } from '../lib/namecardDatabase'
import ImageUpload from './ImageUpload'
import ImageUploadLibrary from './ImageUploadLibrary'
import { uploadImage } from '../lib/storage'
import { 
  saveTextObjectSnapshot, 
  getAllSnapshots,
  getSnapshotById,
  getLatestSnapshotByEvent,
  saveOrUpdateEventSnapshot
} from '../lib/textObjectSnapshotDatabase'

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
  const lastProfileIdRef = useRef(null)
  const lastProfileDataRef = useRef(null) // 마지막 프로필 데이터 저장
  const isUserInteractingRef = useRef(false) // 사용자 상호작용 감지
  // 🔹 레이아웃/텍스트 "저장 컨테이너"
  const layoutStateRef = useRef({ company: null, name: null, title: null }) // 각각 fabric IText 객체의 좌표/스타일 스냅샷
  const currentTextRef = useRef({ company: '', name: '', title: '' }) // 🔹 초기값 개념 제거
  const currentProfileSigRef = useRef('')
  const isSnapshotJustRestoredRef = useRef(false) // 🔹 스냅샷 복원 직후 플래그
  const hasProfileBeenAppliedRef = useRef(false) // 🔹 프로필 데이터가 한 번이라도 적용된 적이 있는지 플래그
  const hasRestoredSnapshotForEventRef = useRef(false) // 🔹 이벤트 당 1회만 복원
  const isLayoutDirtyRef = useRef(false) // 🔹 레이아웃이 변경되었는지 표시
  const saveTimerRef = useRef(null) // 🔹 스냅샷 저장 디바운스 타이머
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

  // fabric IText의 좌표/스타일만 뽑는 헬퍼
  const pickLayout = (obj) => obj ? {
    left: obj.left,
    top: obj.top,
    angle: obj.angle || 0,
    fontSize: obj.fontSize,
    fontWeight: obj.fontWeight,
    fontFamily: obj.fontFamily,
    fill: obj.fill,
    textAlign: obj.textAlign,
    originX: obj.originX,
    originY: obj.originY,
    lineHeight: obj.lineHeight,
    charSpacing: obj.charSpacing,
    scaleX: obj.scaleX || 1,
    scaleY: obj.scaleY || 1
  } : null

  const applyLayout = (obj, snap) => {
    if (!obj || !snap) {
      console.warn('⚠️ applyLayout: 객체 또는 스냅샷이 없음', { obj: !!obj, snap: !!snap })
      return
    }
    
    // 🔹 레이아웃만 적용 (텍스트는 절대 변경하지 않음)
    // 텍스트를 명시적으로 제외하고 레이아웃 속성만 적용
    const savedText = obj.text || '\u00A0' // non-breaking space
    const savedTextAlign = obj.textAlign
    const savedDataField = obj.dataField
    const savedVisible = obj.visible !== false // visible이 false가 아니면 true
    const savedOpacity = obj.opacity !== undefined ? obj.opacity : 1
    
    // 레이아웃 속성만 추출 (텍스트 관련 속성 제외)
    const layoutOnly = { ...snap }
    delete layoutOnly.text // 혹시 모를 텍스트 속성 제거
    delete layoutOnly.dataField // dataField는 유지해야 함
    
    // 레이아웃 적용
    obj.set(layoutOnly)
    
    // 텍스트, textAlign, dataField, visible, opacity 명시적으로 복원 (절대 보장)
    // setCoords 전에 복원하여 좌표 계산에 영향 없도록 함
    if (obj.text !== savedText) {
      obj.set('text', savedText)
    }
    if (obj.textAlign !== savedTextAlign) {
      obj.set('textAlign', savedTextAlign)
    }
    if (obj.dataField !== savedDataField) {
      obj.set('dataField', savedDataField)
    }
    if (obj.visible !== savedVisible) {
      obj.set('visible', savedVisible)
    }
    if (obj.opacity !== savedOpacity) {
      obj.set('opacity', savedOpacity)
    }
    
    obj.setCoords()
    
    // 최종 확인: 텍스트와 가시성이 여전히 유지되는지 확인
    if (obj.text !== savedText) {
      console.error(`❌ applyLayout: 텍스트가 변경됨! 복원 시도: ${savedText} (현재: ${obj.text})`)
      obj.set('text', savedText)
      obj.setCoords()
    }
    if (obj.visible === false) {
      console.error(`❌ applyLayout: 객체가 숨겨짐! 복원 시도`)
      obj.set('visible', true)
      obj.setCoords()
    }
    if (obj.opacity === 0) {
      console.error(`❌ applyLayout: 객체 투명도가 0! 복원 시도`)
      obj.set('opacity', 1)
      obj.setCoords()
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

    // 기본 템플릿 생성
    await createDefaultTemplate(canvas)

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

    // 이벤트 리스너 등록 (중복 제거 - 위에서 이미 등록됨)
    // canvas.on('object:moving', ...) 는 위에서 이미 처리됨


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

    // mouse:down 이벤트 통합 (Ctrl+클릭 배경 선택, 우클릭 메뉴, 일반 클릭)
    canvas.on('mouse:down', (e) => {
      // mouse:down에서는 isUserInteractingRef를 설정하지 않음
      // 실제 드래그가 시작될 때(object:moving)만 설정
      
      // 우클릭 처리 (최우선)
      if (e.e.button === 2) {
        e.e.preventDefault()
        const pointer = canvas.getPointer(e.e)
        setContextMenu({
          visible: true,
          position: { x: pointer.x, y: pointer.y }
        })
        setRightClickedObject(e.target)
        return
      }
      
      // Ctrl + 클릭으로 배경 이미지 선택
      if (e.e.ctrlKey || e.e.metaKey) {
        const objects = canvas.getObjects()
        const backgroundImage = objects.find(obj => obj.type === 'background')
        
        if (backgroundImage) {
          canvas.setActiveObject(backgroundImage)
          safeRenderAll(canvas)
          console.log('Ctrl + 클릭으로 배경 이미지가 선택되었습니다.')
        }
        return
      }
      
      // 일반 클릭 시 배경 이미지가 아닌 객체 선택
      const target = e.target
      if (target && target.type !== 'background') {
        // 명시적으로 객체 선택
        canvas.setActiveObject(target)
        safeRenderAll(canvas)
        console.log('Object selected:', target.type, target.text || target.dataField)
        // 🔹 클릭 시 프로필 데이터 반영 제거 - 객체 선택만 하고 프로필 업데이트는 하지 않음
        // 프로필 업데이트는 명단 클릭 시에만 발생해야 함
      } else if (!target) {
        // 배경 클릭 시 선택 해제
        canvas.discardActiveObject()
        safeRenderAll(canvas)
      }
      
      // 컨텍스트 메뉴 닫기
      setContextMenu({ visible: false, position: null })
    })

    // 사용자 상호작용 종료 감지
    canvas.on('mouse:up', () => {
      isUserInteractingRef.current = false
    })

    canvas.on('mouse:out', () => {
      isUserInteractingRef.current = false
    })

    canvas.on('object:moving', () => {
      isUserInteractingRef.current = true
      isLayoutDirtyRef.current = true // 🔹 레이아웃 변경 표시
      // 드래그 중에는 onCanvasUpdate 호출하지 않음 (과도한 로그 방지)
      // 드래그 완료 시 object:modified에서 처리
      // 🔹 이동 시작 시 현재 텍스트 저장 (이동 중 텍스트 변경 감지용)
      const obj = canvas.getActiveObject()
      if (obj && obj.type === 'i-text' && obj.dataField) {
        obj._movingStartText = obj.text // 이동 시작 시 텍스트 저장
      }
    })

    canvas.on('object:modified', () => {
      // 약간의 지연 후 false로 설정 (드래그 완료 후)
      setTimeout(() => {
        isUserInteractingRef.current = false
      }, 100)
      
      // 🔹 레이아웃 변경 시 저장(드래그 등)
      const obj = canvas.getActiveObject()
      if (obj && obj.type === 'i-text' && obj.dataField) {
        layoutStateRef.current[obj.dataField] = pickLayout(obj)
        
        // 🔹 텍스트는 절대 복원하지 않음 - 현재 캔버스의 텍스트를 그대로 유지
        // 프로필 바인딩으로 업데이트된 텍스트나 사용자가 수정한 텍스트 모두 유지
        const currentText = obj.text
        
        // 🔹 currentTextRef는 현재 캔버스 텍스트로 동기화만 함 (복원하지 않음)
        // 이동 시작 시 저장된 텍스트와 비교하여 실제 텍스트 변경 여부 확인
        const textChanged = obj._movingStartText !== undefined && obj._movingStartText !== currentText
        
        if (textChanged) {
          // 사용자가 직접 텍스트를 수정한 경우
          // 🔹 플레이스홀더(non-breaking space)는 빈 문자열로 변환
          const normalizedText = currentText === '\u00A0' ? '' : currentText
          currentTextRef.current[obj.dataField] = normalizedText
          console.log(`Layout snapshot updated for ${obj.dataField}, text changed by user: ${normalizedText || '(empty)'} (was: ${obj._movingStartText === '\u00A0' ? '(empty)' : obj._movingStartText})`)
        } else {
          // 레이아웃만 변경된 경우 - currentTextRef를 현재 캔버스 텍스트로 동기화
          // (프로필 바인딩으로 업데이트된 텍스트가 캔버스에 반영되었지만 currentTextRef가 업데이트되지 않은 경우)
          // 🔹 플레이스홀더(non-breaking space)는 빈 문자열로 변환
          const normalizedText = currentText === '\u00A0' ? '' : currentText
          if (currentTextRef.current[obj.dataField] !== normalizedText) {
            currentTextRef.current[obj.dataField] = normalizedText
            console.log(`Layout snapshot updated for ${obj.dataField}, text synced: ${normalizedText || '(empty)'} (was: ${currentTextRef.current[obj.dataField] || '(empty)'})`)
          } else {
            console.log(`Layout snapshot updated for ${obj.dataField}, layout only (text unchanged): ${normalizedText || '(empty)'}`)
          }
        }
        // 이동 시작 텍스트 초기화
        delete obj._movingStartText
      }
      
      // 🔹 이동/수정이 끝났을 때 스냅샷 저장(디바운스)
      if (eventId) {
        if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
        saveTimerRef.current = setTimeout(async () => {
          try {
            // 🔹 플레이스홀더나 빈 문자열은 null로 저장 (실제 텍스트가 없음을 의미)
            const normalizeTextForSnapshot = (text) => {
              if (!text || text === '\u00A0' || text.trim().length === 0) {
                return null
              }
              return text
            }
            
            const snap = {
              eventId,
              snapshotName: `에디트창_스냅샷_${new Date().toISOString()}`,
              companyText: normalizeTextForSnapshot(currentTextRef.current.company),
              companyLayout: layoutStateRef.current.company,
              nameText: normalizeTextForSnapshot(currentTextRef.current.name),
              nameLayout: layoutStateRef.current.name,
              titleText: normalizeTextForSnapshot(currentTextRef.current.title),
              titleLayout: layoutStateRef.current.title,
              fullState: {
                company: { 
                  text: normalizeTextForSnapshot(currentTextRef.current.company), 
                  layout: layoutStateRef.current.company 
                },
                name: { 
                  text: normalizeTextForSnapshot(currentTextRef.current.name), 
                  layout: layoutStateRef.current.name 
                },
                title: { 
                  text: normalizeTextForSnapshot(currentTextRef.current.title), 
                  layout: layoutStateRef.current.title 
                }
              }
            }
            const result = await saveOrUpdateEventSnapshot(snap)
            if (result.success) {
              console.log('💾 레이아웃 변경 스냅샷 저장:', result.data?.id)
              isLayoutDirtyRef.current = false
            }
          } catch (e) {
            console.warn('스냅샷 저장 실패:', e)
          }
        }, 400) // 디바운스
      }
      
      if (onCanvasUpdate) {
        onCanvasUpdate({
          type: 'modification',
          object: canvas.getActiveObject()
        })
      }
    })

    canvas.on('selection:created', (e) => {
      const activeObject = e.selected?.[0]
      if (activeObject) {
        // 배경 이미지가 아닌 경우에만 부모 컴포넌트에 전달
        if (activeObject.type !== 'background') {
          // 🔹 객체 선택 시 텍스트는 절대 변경하지 않음
          // Fabric.js가 내부적으로 텍스트를 변경하지 않으므로 복원 로직 제거
          // 텍스트는 프로필 바인딩이나 사용자 수정으로만 변경되어야 함
          
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
          
          // 🔹 객체 선택 시 프로필 데이터 반영 제거
          // mouse:down에서만 처리하여 중복 호출 방지
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


    }

    initializeCanvas()

    return () => {
      if (fabricCanvasRef.current) {
        fabricCanvasRef.current.dispose()
      }
    }
  }, []) // 컴포넌트 마운트 시 한 번만 실행

  // 기본 템플릿 생성
  const createDefaultTemplate = async (canvas) => {
    console.log('Creating default template for canvas:', canvas.width, 'x', canvas.height)
    
    if (!canvas) return
    
    // Fabric.js 로드 확인
    const fabricLib = await loadFabric()
    if (!fabricLib) {
      console.error('Fabric.js not loaded for default template')
      return
    }
    fabric = fabricLib // 전역 fabric 변수에 할당
    
    // 캔버스 중앙 좌표
    const centerX = canvas.width / 2  // 170
    const centerY = canvas.height / 2 // 236
    
    // 🔹 텍스트는 최소한의 플레이스홀더로 시작 (공백만으로는 렌더링되지 않을 수 있음)
    // 프로필이 선택되면 그때 실제 텍스트로 업데이트됨
    // 공백 대신 보이지 않는 문자(non-breaking space) 사용하여 객체가 항상 보이도록 함
    const companyTextValue = currentTextRef.current.company || '\u00A0' // non-breaking space
    const nameTextValue = currentTextRef.current.name || '\u00A0'
    const titleTextValue = currentTextRef.current.title || '\u00A0'
    
    // 회사명 텍스트
    const companyText = new fabric.IText(companyTextValue, {
      dataField: 'company',
      left: centerX,
      top: centerY - 80,
      fontSize: 24,
      fontFamily: 'Arial',
      fill: '#000000',
      textAlign: 'center',
      originX: 'center',
      originY: 'center',
      zIndex: 1000
    })
    canvas.add(companyText)
    console.log('Added company text at:', centerX, centerY - 80, 'text:', companyTextValue)

    // 이름 텍스트
    const nameText = new fabric.IText(nameTextValue, {
      dataField: 'name',
      left: centerX,
      top: centerY,
      fontSize: 32,
      fontFamily: 'Arial',
      fontWeight: 'bold',
      fill: '#000000',
      textAlign: 'center',
      originX: 'center',
      originY: 'center',
      zIndex: 1000
    })
    canvas.add(nameText)
    console.log('Added name text at:', centerX, centerY, 'text:', nameTextValue)

    // 직급 텍스트
    const titleText = new fabric.IText(titleTextValue, {
      dataField: 'title',
      left: centerX,
      top: centerY + 80,
      fontSize: 20,
      fontFamily: 'Arial',
      fill: '#000000',
      textAlign: 'center',
      originX: 'center',
      originY: 'center',
      zIndex: 1000
    })
    canvas.add(titleText)
    console.log('Added title text at:', centerX, centerY + 80, 'text:', titleTextValue)

    // 🔹 최초 레이아웃 스냅샷 저장 (템플릿 생성 시에만)
    // currentTextRef는 프로필 데이터가 있을 때만 업데이트되므로 여기서 초기화하지 않음
    layoutStateRef.current = {
      company: pickLayout(companyText),
      name: pickLayout(nameText),
      title: pickLayout(titleText),
    }
    // currentTextRef는 프로필 업데이트 시에만 변경되므로 초기화하지 않음
    // 초기값은 컴포넌트 마운트 시 설정된 값 유지

    safeRenderAll(canvas)
    console.log('Default template created, total objects:', canvas.getObjects().length)
  }

  // 프로필 데이터로 캔버스 업데이트 (dataField 기반 안정 매핑, 위치 유지)
  // 🔹 단일 소스 오브 트루스: Fabric.js Canvas 객체를 유일한 진실의 원천으로 사용
  const updateCanvasWithProfile = useCallback((profile) => {
    if (!fabricCanvasRef.current) return
    if (isUserInteractingRef.current) {
      console.log('Skip binding: user interacting')
      return
    }

    const canvas = fabricCanvasRef.current
    const objects = canvas.getObjects()
    
    // dataField로 직접 찾기
    const byField = (f) => objects.find(o => o.type === 'i-text' && o.dataField === f)

    const companyObj = byField('company')
    const nameObj = byField('name')
    const titleObj = byField('title')
    
    // 🔹 객체 존재 확인 및 디버깅
    if (!companyObj || !nameObj || !titleObj) {
      console.error('❌ 텍스트 객체를 찾을 수 없음:', {
        company: !!companyObj,
        name: !!nameObj,
        title: !!titleObj,
        totalObjects: objects.length,
        textObjects: objects.filter(o => o.type === 'i-text').map(o => ({
          dataField: o.dataField,
          text: o.text,
          type: o.type,
          visible: o.visible,
          opacity: o.opacity
        }))
      })
      // 객체를 찾을 수 없어도 계속 진행 (객체가 나중에 생성될 수 있음)
      // return하지 않고 부분 업데이트 진행
    }

    // 🔹 단일 텍스트 업데이트 함수: 캔버스 객체를 단일 소스로 사용
    // 우선순위: 프로필 데이터 > 현재 캔버스 텍스트 > 공백 유지
    // 🔹 스냅샷 복원 직후라면 스냅샷 텍스트를 보존하되, 프로필 데이터도 반영
    const updateTextObject = (obj, profileValue, fieldName) => {
      if (!obj) return null
      
      const currentCanvasText = obj.text || '\u00A0'
      const isPlaceholder = currentCanvasText === '\u00A0' || currentCanvasText.trim().length === 0
      
      // 🔹 스냅샷 복원 직후: 스냅샷 텍스트가 있으면 보존, 없으면 프로필 데이터 사용
      if (isSnapshotJustRestoredRef.current) {
        // 스냅샷 텍스트가 있으면 유지 (플레이스홀더가 아닌 경우)
        if (!isPlaceholder) {
          console.log(`✅ ${fieldName}: 스냅샷 복원 직후 - 텍스트 유지 - ${currentCanvasText}`)
          return currentCanvasText
        }
        // 스냅샷 텍스트가 플레이스홀더면 프로필 데이터 사용
        if (profile && profileValue && typeof profileValue === 'string' && profileValue.trim().length > 0) {
          obj.set('text', profileValue)
          console.log(`✅ ${fieldName}: 스냅샷 복원 직후 - 프로필 데이터 적용 - ${profileValue}`)
          return profileValue
        }
      }
      
      // 일반적인 경우: 프로필 데이터가 있으면 사용
      if (profile && profileValue && typeof profileValue === 'string' && profileValue.trim().length > 0) {
        obj.set('text', profileValue)
        console.log(`✅ ${fieldName}: 프로필 데이터 적용 - ${profileValue}`)
        return profileValue
      }
      
      // 프로필 데이터가 없으면 현재 캔버스 텍스트 유지 (플레이스홀더가 아닌 경우)
      if (!isPlaceholder) {
        console.log(`✅ ${fieldName}: 캔버스 텍스트 유지 - ${currentCanvasText}`)
        return currentCanvasText
      }
      
      // 모두 없으면 보이지 않는 문자 유지 (빈 문자열로 덮어쓰지 않음)
      // non-breaking space를 사용하여 객체가 항상 보이도록 함
      console.log(`✅ ${fieldName}: 플레이스홀더 유지`)
      if (obj.text !== '\u00A0') {
        obj.set('text', '\u00A0')
      }
      return '\u00A0' // non-breaking space
    }

    // 텍스트 업데이트 (캔버스 객체에 직접 쓰기)
    const finalCompany = companyObj ? updateTextObject(companyObj, profile?.company, '회사명') : null
    const finalName = nameObj ? updateTextObject(nameObj, profile?.name, '이름') : null
    const finalTitle = titleObj ? updateTextObject(titleObj, profile?.title, '직급') : null
    
    // 🔹 객체 가시성 확인 및 복원
    if (companyObj && (!companyObj.visible || companyObj.opacity === 0)) {
      console.warn('⚠️ 회사명 객체가 보이지 않음, 복원 시도')
      companyObj.set({ visible: true, opacity: 1 })
    }
    if (nameObj && (!nameObj.visible || nameObj.opacity === 0)) {
      console.warn('⚠️ 이름 객체가 보이지 않음, 복원 시도')
      nameObj.set({ visible: true, opacity: 1 })
    }
    if (titleObj && (!titleObj.visible || titleObj.opacity === 0)) {
      console.warn('⚠️ 직급 객체가 보이지 않음, 복원 시도')
      titleObj.set({ visible: true, opacity: 1 })
    }

    // 🔹 레이아웃 적용 및 동기화 (텍스트 업데이트 후)
    if (companyObj) {
      // 레이아웃 적용 (텍스트는 이미 업데이트됨)
      if (layoutStateRef.current.company) {
        applyLayout(companyObj, layoutStateRef.current.company)
      }
      companyObj.setCoords()
      // layoutStateRef를 현재 캔버스 객체 상태로 동기화
      layoutStateRef.current.company = pickLayout(companyObj)
    }
    
    if (nameObj) {
      // 레이아웃 적용 (텍스트는 이미 업데이트됨)
      if (layoutStateRef.current.name) {
        applyLayout(nameObj, layoutStateRef.current.name)
      }
      nameObj.setCoords()
      // layoutStateRef를 현재 캔버스 객체 상태로 동기화
      layoutStateRef.current.name = pickLayout(nameObj)
    }
    
    if (titleObj) {
      // 레이아웃 적용 (텍스트는 이미 업데이트됨)
      if (layoutStateRef.current.title) {
        applyLayout(titleObj, layoutStateRef.current.title)
      }
      titleObj.setCoords()
      // layoutStateRef를 현재 캔버스 객체 상태로 동기화
      layoutStateRef.current.title = pickLayout(titleObj)
    }

    // 🔹 스냅샷 복원 직후 플래그 해제
    // (프로필 업데이트가 완료되었으므로 다음 업데이트부터는 정상 동작)
    if (isSnapshotJustRestoredRef.current) {
      isSnapshotJustRestoredRef.current = false
      console.log('🔹 스냅샷 복원 직후 플래그 해제 (프로필 업데이트 완료 후)')
    }

    // 🔹 단일 동기화 지점: 캔버스 객체에서 읽어와서 currentTextRef 업데이트
    // 쓰기는 항상 캔버스 객체에 직접, 읽기는 항상 캔버스 객체에서
    // 플레이스홀더(non-breaking space)는 실제 텍스트로 간주하지 않음
    currentTextRef.current = {
      company: companyObj ? (companyObj.text === '\u00A0' ? '' : companyObj.text) : '',
      name: nameObj ? (nameObj.text === '\u00A0' ? '' : nameObj.text) : '',
      title: titleObj ? (titleObj.text === '\u00A0' ? '' : titleObj.text) : ''
    }
    
    // 🔹 프로필 데이터가 적용되었는지 확인하여 플래그 설정
    if (profile && (finalCompany || finalName || finalTitle)) {
      hasProfileBeenAppliedRef.current = true
      console.log('🔹 프로필 데이터 적용 플래그 설정')
    }
    
    console.log('💾 currentTextRef 동기화 완료 (캔버스 객체에서 읽어옴):', currentTextRef.current)
    console.log('📝 텍스트 업데이트 요약:', {
      profile: profile ? `${profile.name} (${profile.id})` : 'null',
      company: finalCompany,
      name: finalName,
      title: finalTitle
    })
    
    // 🔻 프로필 바인딩 단계에서는 스냅샷 저장하지 않음 (레이아웃 보존 목적)
    // 스냅샷 저장은 object:modified(레이아웃이 바뀐 경우)에서만 수행
    
    canvas.renderAll()
  }, [fabricCanvasRef, eventId])

  // 스냅샷 복원 함수
  const restoreSnapshot = useCallback(async (snapshot) => {
    if (!fabricCanvasRef.current || !snapshot) return false

    const canvas = fabricCanvasRef.current
    const objects = canvas.getObjects()
    
    const byField = (f) => objects.find(o => o.type === 'i-text' && o.dataField === f)
    
    const companyObj = byField('company')
    const nameObj = byField('name')
    const titleObj = byField('title')

    try {
      // 🔹 layoutStateRef를 먼저 업데이트 (updateCanvasWithProfile에서 사용하기 위해)
      if (snapshot.company_layout) layoutStateRef.current.company = snapshot.company_layout
      if (snapshot.name_layout) layoutStateRef.current.name = snapshot.name_layout
      if (snapshot.title_layout) layoutStateRef.current.title = snapshot.title_layout
      
      // 🔹 회사명 복원 (텍스트 + 레이아웃 모두 복원)
      if (companyObj) {
        // 텍스트 복원
        if (snapshot.company_text) {
          companyObj.set('text', snapshot.company_text)
          currentTextRef.current.company = snapshot.company_text
          console.log('📸 회사명 텍스트 복원:', snapshot.company_text)
        }
        // 레이아웃 복원
        if (snapshot.company_layout) {
          applyLayout(companyObj, snapshot.company_layout)
          companyObj.setCoords()
          layoutStateRef.current.company = pickLayout(companyObj)
          console.log('🔹 스냅샷 복원 후 layoutStateRef.company 동기화:', layoutStateRef.current.company)
        }
      }
      
      // 🔹 이름 복원 (텍스트 + 레이아웃 모두 복원)
      if (nameObj) {
        // 텍스트 복원
        if (snapshot.name_text) {
          nameObj.set('text', snapshot.name_text)
          currentTextRef.current.name = snapshot.name_text
          console.log('📸 이름 텍스트 복원:', snapshot.name_text)
        }
        // 레이아웃 복원
        if (snapshot.name_layout) {
          applyLayout(nameObj, snapshot.name_layout)
          nameObj.setCoords()
          layoutStateRef.current.name = pickLayout(nameObj)
          console.log('🔹 스냅샷 복원 후 layoutStateRef.name 동기화:', layoutStateRef.current.name)
        }
      }
      
      // 🔹 직급 복원 (텍스트 + 레이아웃 모두 복원)
      if (titleObj) {
        // 텍스트 복원
        if (snapshot.title_text) {
          titleObj.set('text', snapshot.title_text)
          currentTextRef.current.title = snapshot.title_text
          console.log('📸 직급 텍스트 복원:', snapshot.title_text)
        }
        // 레이아웃 복원
        if (snapshot.title_layout) {
          applyLayout(titleObj, snapshot.title_layout)
          titleObj.setCoords()
          layoutStateRef.current.title = pickLayout(titleObj)
          console.log('🔹 스냅샷 복원 후 layoutStateRef.title 동기화:', layoutStateRef.current.title)
        }
      }
      
      // 🔹 단일 동기화 지점: 캔버스 객체에서 읽어와서 currentTextRef 업데이트
      // 스냅샷에 텍스트가 없으면 현재 캔버스 텍스트 유지
      // 플레이스홀더(non-breaking space)는 실제 텍스트로 간주하지 않음
      currentTextRef.current = {
        company: companyObj ? (companyObj.text === '\u00A0' ? '' : companyObj.text || '') : '',
        name: nameObj ? (nameObj.text === '\u00A0' ? '' : nameObj.text || '') : '',
        title: titleObj ? (titleObj.text === '\u00A0' ? '' : titleObj.text || '') : ''
      }
      
      console.log('📸 스냅샷 복원 후 currentTextRef (캔버스 객체에서 읽어옴):', currentTextRef.current)
      console.log('📸 스냅샷 복원 후 layoutStateRef:', layoutStateRef.current)

      // 🔹 스냅샷 복원 직후 플래그 설정 (updateCanvasWithProfile에서 텍스트 덮어쓰기 방지)
      isSnapshotJustRestoredRef.current = true
      
      canvas.renderAll()
      console.log('✅ 스냅샷 복원 완료:', snapshot.id)
      return true
    } catch (error) {
      console.error('스냅샷 복원 오류:', error)
      return false
    }
  }, [fabricCanvasRef])

  // 이벤트별 최신 스냅샷 불러오기 (에디트창용)
  const loadLatestSnapshot = useCallback(async (eventId) => {
    if (!eventId) return null

    try {
      const result = await getLatestSnapshotByEvent(eventId)
      if (result.success && result.data) {
        console.log('📸 이벤트별 최신 스냅샷 발견:', result.data.id)
        return result.data
      }
      return null
    } catch (error) {
      console.error('이벤트별 스냅샷 조회 오류:', error)
      return null
    }
  }, [])

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
    
    if (onCanvasUpdate) {
      onCanvasUpdate({
        type: 'modification',
        object: null
      })
    }
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

  // 캔버스 JSON 내보내기 (dataField 포함)
  const exportCanvas = () => {
    if (!fabricCanvasRef.current) return null
    
    const canvas = fabricCanvasRef.current
    // 커스텀 속성(dataField)을 JSON 저장에 포함
    const data = canvas.toJSON(['dataField'])
    console.log('Canvas JSON:', data)
    return data
  }

  // 현재 캔버스 JSON 가져오기 (dataField 포함)
  const getCurrentCanvasJson = useCallback(() => {
    if (!fabricCanvasRef.current) return null
    
    const canvas = fabricCanvasRef.current
    
    // 커스텀 속성(dataField)을 JSON 저장에 포함
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
      
      // 🔹 배경 이미지 보존: 기존 배경 이미지 저장
      const existingBackgroundImage = canvas.getObjects().find(obj => obj.type === 'background')
      const backgroundImageData = existingBackgroundImage ? {
        src: existingBackgroundImage.src,
        left: existingBackgroundImage.left,
        top: existingBackgroundImage.top,
        scaleX: existingBackgroundImage.scaleX,
        scaleY: existingBackgroundImage.scaleY,
        opacity: existingBackgroundImage.opacity,
        angle: existingBackgroundImage.angle
      } : null
      
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
      
      // 🔹 배경 이미지 복원: 템플릿에 배경 이미지가 없으면 기존 배경 이미지 복원
      const templateHasBackground = templateData.objects?.some(obj => obj.type === 'background')
      if (backgroundImageData && !templateHasBackground) {
        console.log('Restoring existing background image:', backgroundImageData.src)
        fabric.Image.fromURL(backgroundImageData.src, (img) => {
          if (!img) return
          
          img.set({
            left: backgroundImageData.left || 0,
            top: backgroundImageData.top || 0,
            scaleX: backgroundImageData.scaleX || (canvas.getWidth() / img.width),
            scaleY: backgroundImageData.scaleY || (canvas.getHeight() / img.height),
            selectable: true,
            evented: false,
            opacity: backgroundImageData.opacity || backgroundOpacity,
            type: 'background',
            src: backgroundImageData.src,
            angle: backgroundImageData.angle || 0,
            zIndex: -1000
          })
          
          canvas.add(img)
          canvas.sendToBack(img)
          safeRenderAll(canvas)
          
          // 배경 이미지 상태 업데이트
          setBackgroundImage({
            url: backgroundImageData.src,
            fileName: 'background.png',
            opacity: backgroundImageData.opacity || backgroundOpacity
          })
        }, { crossOrigin: 'anonymous' })
      }
      
    } catch (error) {
      console.error('Error loading template:', error)
      // createDefaultTemplate 호출 제거 - 에러를 명확히 표시
      alert(getErrorMessage(error))
    } finally {
      setIsLoading(false)
      console.log('=== TEMPLATE LOADING COMPLETED ===')
    }
  }, [fabricCanvasRef, getErrorMessage, backgroundOpacity, setBackgroundImage])

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
          // 🔹 템플릿 텍스트 로드 (빈 문자열이면 currentTextRef의 값 사용)
          let textToLoad = objData.text || ''
          
          // 템플릿 텍스트가 비어있고 currentTextRef에 값이 있으면 사용
          if (!textToLoad && objData.dataField && currentTextRef.current[objData.dataField]) {
            textToLoad = currentTextRef.current[objData.dataField]
            console.log(`⚠️ 템플릿 텍스트 비어있음, currentTextRef 사용: ${objData.dataField} = ${textToLoad}`)
          }
          
          // 텍스트 객체는 동기 처리
          const textObj = new fabric.IText(textToLoad, {
            dataField: objData.dataField, // 🔹 커스텀 속성 복원
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
          
          // 로드 시 레이아웃 스냅샷도 갱신
          if (objData.dataField) {
            layoutStateRef.current[objData.dataField] = pickLayout(textObj)
            // 템플릿에서 로드한 텍스트가 초기값이 아니면 업데이트, 초기값이면 현재 값 유지
            const loadedText = textObj.text
            const isLoadedInitial = (objData.dataField === 'company' && loadedText === '회사명') ||
                                    (objData.dataField === 'name' && loadedText === '이름') ||
                                    (objData.dataField === 'title' && loadedText === '직급')
            
            if (!isLoadedInitial && loadedText) {
              currentTextRef.current[objData.dataField] = loadedText
            }
            // 초기값이면 currentTextRef는 유지 (덮어쓰지 않음)
            console.log(`Layout snapshot restored for ${objData.dataField}, text: ${loadedText}, isInitial: ${isLoadedInitial}`)
          }
          
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
      
      // 🔹 배경 이미지 복원: 템플릿에 배경 이미지가 없으면 기존 배경 이미지 복원
      // (loadTemplate에서 저장한 backgroundImageData 사용)
      // 주의: 이 함수는 loadTemplate 내부에서 호출되므로 backgroundImageData를 파라미터로 받아야 함
      // 하지만 현재 구조상 backgroundImageData는 loadTemplate의 지역 변수이므로
      // 대신 loadTemplate에서 직접 처리하도록 변경
      
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
        onCanvasUpdate({
          type: 'modification',
          object: img
        })
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
      onCanvasUpdate({
        type: 'modification',
        object: canvas.getActiveObject()
      })
    }
  }

  // selectedProfile 변경 시: 프로필 데이터로 텍스트 업데이트
  // 🔹 스냅샷 복원 직후에는 텍스트 업데이트 건너뛰기 (스냅샷 텍스트 보존)
  useEffect(() => {
    if (!fabricCanvasRef.current || !isCanvasReady) return

    // 템플릿 로딩 중이면 프로필 업데이트 건너뛰기
    if (isLoading) {
      console.log('CanvasEditor: Skipping profile update - template loading in progress')
      return
    }

    // 🔹 스냅샷 복원 직후에는 텍스트 업데이트를 건너뛰지 않음
    // 대신 updateCanvasWithProfile에서 스냅샷 텍스트를 보존하도록 처리
    // (스냅샷 복원 직후에도 프로필 클릭 시 편집창에 반영되어야 함)

    let timeoutId = null

    // 사용자 상호작용 중이면 바인딩 지연 (약간의 지연 후 재시도)
    if (isUserInteractingRef.current) {
      console.log('CanvasEditor: User interacting; defer binding')
      // 200ms 후 재시도
      timeoutId = setTimeout(() => {
        if (!isUserInteractingRef.current && selectedProfile) {
          console.log('CanvasEditor: Retrying profile update after interaction')
          updateCanvasWithProfile(selectedProfile)
          // 프로필 시그니처 업데이트
          const sig = [
            selectedProfile?.id ?? '',
            selectedProfile?.name ?? '',
            selectedProfile?.company ?? '',
            selectedProfile?.title ?? ''
          ].join('|')
          currentProfileSigRef.current = sig
        }
      }, 200)
    } else {
      if (!selectedProfile) {
        console.log('CanvasEditor: No profile selected, keeping current canvas content')
        currentProfileSigRef.current = ''
        return
      }
      // 동일 프로필이면 스킵
      const sig = [
        selectedProfile?.id ?? '',
        selectedProfile?.name ?? '',
        selectedProfile?.company ?? '',
        selectedProfile?.title ?? ''
      ].join('|')
      if (currentProfileSigRef.current === sig) {
        console.log('CanvasEditor: Profile unchanged, skip')
        return
      }
      console.log('CanvasEditor: Updating canvas with profile:', selectedProfile.name)
      updateCanvasWithProfile(selectedProfile)
      currentProfileSigRef.current = sig
    }

    // cleanup 함수
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
    }
  }, [selectedProfile?.id, isCanvasReady, updateCanvasWithProfile, isLoading])

  // ✅ 이벤트(페이지) 진입 시 1회만 스냅샷 복원
  useEffect(() => {
    if (!fabricCanvasRef.current || !isCanvasReady || !eventId) return
    if (hasRestoredSnapshotForEventRef.current) return
    
    ;(async () => {
      try {
        const latest = await loadLatestSnapshot(eventId)
        if (latest) {
          console.log('📸 최초 1회 스냅샷 복원:', latest.id)
          await restoreSnapshot(latest)
          hasRestoredSnapshotForEventRef.current = true
          isLayoutDirtyRef.current = false
        }
      } catch (e) {
        console.warn('스냅샷 1회 복원 실패:', e)
      }
    })()
  }, [isCanvasReady, eventId, loadLatestSnapshot, restoreSnapshot])

  // eventId 변경 시 플래그 리셋
  useEffect(() => {
    hasRestoredSnapshotForEventRef.current = false
    isLayoutDirtyRef.current = false
  }, [eventId])

  // 컴포넌트 언마운트 시 타이머 정리
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current)
      }
    }
  }, [])

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

