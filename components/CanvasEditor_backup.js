'use client'

import { useEffect, useRef, useState } from 'react'
import { fabric } from 'fabric'
import ContextMenu from './ContextMenu'
import { getDefaultTemplate } from '../lib/namecardDatabase'
import ImageUpload from './ImageUpload'

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
  const [showImageUpload, setShowImageUpload] = useState(false)
  const [uploadedImages, setUploadedImages] = useState([])
  const [templateSettings, setTemplateSettings] = useState(null)
  const [backgroundImage, setBackgroundImage] = useState(null) // 배경 이미지 상태 추가
  const [showBackgroundUpload, setShowBackgroundUpload] = useState(false) // 배경 이미지 업로드 패널 상태
  const [backgroundOpacity, setBackgroundOpacity] = useState(0.7) // 배경 이미지 투명도
  const [isTemplateLoaded, setIsTemplateLoaded] = useState(false) // 템플릿 로드 상태

  // 캔버스 초기화
  useEffect(() => {
    if (!canvasRef.current) return

    // Fabric.js 캔버스 생성 (9cm x 12.5cm 정확한 크기, 고해상도)
    const canvas = new fabric.Canvas(canvasRef.current, {
      width: 340, // 9cm * 37.8px/cm (정확한 변환)
      height: 472, // 12.5cm * 37.8px/cm (정확한 변환)
      backgroundColor: '#ffffff',
      selection: true,
      preserveObjectStacking: true,
      enableRetinaScaling: true, // 고해상도 디스플레이 지원
      imageSmoothingEnabled: true, // 이미지 스무딩 활성화
    })

    fabricCanvasRef.current = canvas
    setIsCanvasReady(true)
    console.log('CanvasEditor: Canvas initialized and ready')

    // 캔버스 이벤트 리스너
    canvas.on('selection:created', handleSelection)
    canvas.on('selection:updated', handleSelection)
    canvas.on('selection:cleared', handleSelectionCleared)
    canvas.on('object:modified', handleObjectModified)
    canvas.on('object:moving', handleObjectMoving) // 객체 이동 시 실시간 업데이트
    canvas.on('object:scaling', handleObjectScaling) // 객체 크기 조절 시 실시간 업데이트
    canvas.on('object:rotating', handleObjectRotating) // 객체 회전 시 실시간 업데이트
    canvas.on('mouse:down', handleMouseDown)
    canvas.on('mouse:up', handleMouseUp)
    
    // 객체 추가/제거 이벤트
    canvas.on('object:added', (e) => {
      console.log('Object added:', e.target)
    })
    
    canvas.on('object:removed', (e) => {
      console.log('Object removed:', e.target)
    })

    // 기본 명찰 템플릿 생성
    createDefaultTemplate(canvas)

    return () => {
      canvas.dispose()
    }
  }, [])

  // 선택된 프로필이 변경될 때 캔버스 업데이트
  useEffect(() => {
    if (!fabricCanvasRef.current || !selectedProfile) return

    updateCanvasWithProfile(selectedProfile)
  }, [selectedProfile])

  // 이벤트 ID가 변경될 때 기본 템플릿 로드
  useEffect(() => {
    if (eventId && fabricCanvasRef.current) {
      loadDefaultTemplate()
    }
  }, [eventId])

  // 기본 템플릿 로드
  const loadDefaultTemplate = async () => {
    try {
      const { data, error } = await getDefaultTemplate(eventId)
      if (error) throw error
      
      if (data && data.canvas_json) {
        loadTemplate(data)
      }
    } catch (err) {
      console.error('Error loading default template:', err)
    }
  }


    // 기본 명찰 템플릿 생성 (9cm x 12.5cm 캔버스에 맞춤)
    const createDefaultTemplate = (canvas) => {
      // 캔버스 경계선 테두리 (9cm x 12.5cm)
      const border = new fabric.Rect({
        left: 0,
        top: 0,
        width: 340, // 9cm * 37.8px/cm
        height: 472, // 12.5cm * 37.8px/cm
        fill: 'transparent',
        stroke: '#d0d0d0',
        strokeWidth: 1,
        strokeDashArray: [5, 5], // 점선 스타일
        selectable: false,
        evented: false,
        type: 'border'
      })

      // 크기 표시 텍스트 (우하단)
      const sizeText = new fabric.IText('9cm × 12.5cm', {
        left: 320,
        top: 450,
        fontSize: 10,
        fontFamily: 'Arial',
        fill: '#999999',
        textAlign: 'right',
        originX: 'right',
        originY: 'bottom',
        selectable: false,
        evented: false,
        type: 'border'
      })

      // 회사명 텍스트 (9cm x 12.5cm 캔버스 중앙에 배치)
      const companyText = new fabric.IText('회사명', {
        left: 170, // 9cm 캔버스의 중앙 (340px / 2)
        top: 80,   // 상단에서 적절한 위치
        fontSize: 14,
        fontFamily: 'Arial',
        fill: '#333333',
        textAlign: 'center',
        originX: 'center',
        originY: 'center',
        // 텍스트 객체는 크기 조절을 폰트 크기로 변환
        lockUniScaling: true, // 비율 유지
        minScaleLimit: 0.1,
        maxScaleLimit: 5
      })

      // 이름 텍스트 (가장 중요한 요소, 중앙에 크게)
      const nameText = new fabric.IText('이름', {
        left: 170, // 9cm 캔버스의 중앙
        top: 200,  // 중앙 근처
        fontSize: 24,
        fontFamily: 'Arial',
        fontWeight: 'bold',
        fill: '#000000',
        textAlign: 'center',
        originX: 'center',
        originY: 'center',
        // 텍스트 객체는 크기 조절을 폰트 크기로 변환
        lockUniScaling: true, // 비율 유지
        minScaleLimit: 0.1,
        maxScaleLimit: 5
      })

      // 직급 텍스트
      const titleText = new fabric.IText('직급', {
        left: 170, // 9cm 캔버스의 중앙
        top: 320,  // 하단 근처
        fontSize: 12,
        fontFamily: 'Arial',
        fill: '#666666',
        textAlign: 'center',
        originX: 'center',
        originY: 'center',
        // 텍스트 객체는 크기 조절을 폰트 크기로 변환
        lockUniScaling: true, // 비율 유지
        minScaleLimit: 0.1,
        maxScaleLimit: 5
      })

      // 객체들을 캔버스에 추가 (경계선을 맨 뒤로)
      canvas.add(border, sizeText, companyText, nameText, titleText)
      canvas.sendToBack(border) // 경계선을 맨 뒤로 보내기
      canvas.sendToBack(sizeText) // 크기 표시도 맨 뒤로
      canvas.renderAll()
    }

  // 템플릿 불러오기 함수
  const loadTemplate = (template) => {
    console.log('CanvasEditor loadTemplate called:', template)
    
    if (!fabricCanvasRef.current) {
      console.error('Fabric canvas not available')
      return
    }
    
    if (!template) {
      console.error('Template data not provided')
      return
    }

    try {
      const canvas = fabricCanvasRef.current
      console.log('Clearing canvas...')
      
      // 기존 객체들 모두 제거
      canvas.clear()
      
      console.log('Loading template JSON:', template.canvas_json)
      
      // JSON 데이터 검증
      if (!template.canvas_json || typeof template.canvas_json !== 'object') {
        console.error('Invalid template JSON data')
        return
      }
      
      // 안전한 JSON 로드
      const jsonData = Array.isArray(template.canvas_json) 
        ? { objects: template.canvas_json, version: '5.3.0' }
        : template.canvas_json
      
      // 템플릿 JSON 데이터로 캔버스 복원
      canvas.loadFromJSON(jsonData, () => {
        console.log('Template JSON loaded, rendering...')
        canvas.renderAll()
        setIsTemplateLoaded(true)
        console.log('Template loaded successfully:', template.template_name)
      }, (error) => {
        console.error('Error in loadFromJSON callback:', error)
        // 오류 발생 시 기본 템플릿 생성
        createDefaultTemplate(canvas)
        setIsTemplateLoaded(true)
      })
      
    } catch (error) {
      console.error('Error loading template:', error)
      // 오류 발생 시 기본 템플릿 생성
      if (fabricCanvasRef.current) {
        createDefaultTemplate(fabricCanvasRef.current)
        setIsTemplateLoaded(true)
      }
    }
  }

  // 프로필 데이터로 캔버스 업데이트 (위치 유지하면서 텍스트만 변경)
  const updateCanvasWithProfile = (profile) => {
    if (!fabricCanvasRef.current) return

    const canvas = fabricCanvasRef.current
    const objects = canvas.getObjects()

    console.log('Updating canvas with profile:', profile)
    console.log('Current objects count:', objects.length)

    // 각 텍스트 객체 업데이트 (위치는 그대로 유지)
    objects.forEach((obj) => {
      if (obj.type === 'i-text') {
        const currentText = obj.text || ''
        
        console.log('Processing text object:', currentText, 'at position:', obj.left, obj.top)
        
        // 더 유연한 텍스트 매칭
        const lowerText = currentText.toLowerCase()
        
        // 🔥 정확한 키워드 매칭만 허용 (너무 광범위한 매칭 방지)
        if (currentText === '회사명' || currentText === 'Company' || 
            currentText === '회사' || currentText === 'company') {
          obj.set('text', profile.company || '회사명')
          console.log('Updated company text to:', profile.company)
        }
        // 이름 관련 텍스트 업데이트 (정확한 매칭만)
        else if (currentText === '이름' || currentText === 'Name' || 
                 currentText === '성명' || currentText === 'fullname') {
          obj.set('text', profile.name || '이름')
          console.log('Updated name text to:', profile.name)
        }
        // 직급 관련 텍스트 업데이트 (정확한 매칭만)
        else if (currentText === '직급' || currentText === 'Title' || 
                 currentText === 'Position' || currentText === '부서') {
          obj.set('text', profile.title || '직급')
          console.log('Updated title text to:', profile.title)
        }
        // 🔥 새로운 로직: 실제 회사명/이름/직급이 텍스트에 있는 경우 업데이트
        else if (profile.company && currentText === profile.company) {
          obj.set('text', profile.company)
          console.log('Updated existing company text to:', profile.company)
        }
        else if (profile.name && currentText === profile.name) {
          obj.set('text', profile.name)
          console.log('Updated existing name text to:', profile.name)
        }
        else if (profile.title && currentText === profile.title) {
          obj.set('text', profile.title)
          console.log('Updated existing title text to:', profile.title)
        }
        // 🔥 추가: 이전 프로필의 데이터가 남아있는 경우 강제 업데이트
        else if (profile.company && currentText !== profile.company && 
                 !lowerText.includes('회사') && !lowerText.includes('company') &&
                 !lowerText.includes('이름') && !lowerText.includes('name') &&
                 !lowerText.includes('직급') && !lowerText.includes('title')) {
          // 이전 프로필의 회사명이 남아있는 경우 새 프로필의 회사명으로 교체
          obj.set('text', profile.company)
          console.log('Force updated company text to:', profile.company)
        }
        // 🔥 최종 강제 업데이트: 모든 텍스트를 순서대로 업데이트
        else {
          // 텍스트 객체의 Y 좌표를 기준으로 순서 결정
          const textObjects = objects.filter(o => o.type === 'i-text').sort((a, b) => (a.top || 0) - (b.top || 0))
          const currentIndex = textObjects.findIndex(o => o === obj)
          
          console.log(`Text object ${currentIndex}: "${currentText}" - will be updated based on position`)
          
          if (currentIndex === 0) {
            obj.set('text', profile.company || '회사명')
            console.log('Force updated first text to company:', profile.company)
          } else if (currentIndex === 1) {
            obj.set('text', profile.name || '이름')
            console.log('Force updated second text to name:', profile.name)
          } else if (currentIndex === 2) {
            obj.set('text', profile.title || '직급')
            console.log('Force updated third text to title:', profile.title)
          }
        }
      }
    })

    canvas.renderAll()
    console.log('Canvas updated with profile data')
  }

  // 선택된 객체의 속성 변경 처리
  useEffect(() => {
    if (!fabricCanvasRef.current) return

    const canvas = fabricCanvasRef.current
    
    // 속성 변경을 캔버스에 반영하는 함수
    const updateObject = (property, value) => {
      console.log('CanvasEditor updateObject called:', property, value)
      
      const activeObject = canvas.getActiveObject()
      if (!activeObject) {
        console.log('No active object found')
        return
      }

      // 객체가 여전히 캔버스에 존재하는지 확인
      if (!validateObject(activeObject)) {
        console.log('Object no longer exists in canvas')
        return
      }

      if (property === 'bringToFront') {
        console.log('Bringing to front:', activeObject)
        canvas.bringToFront(activeObject)
        canvas.renderAll()
        // 레이어 순서 변경 후 부모 컴포넌트에 알림
        if (onCanvasUpdate) {
          onCanvasUpdate({ type: 'layerChanged', object: activeObject })
        }
      } else if (property === 'bringForward') {
        console.log('Bringing forward:', activeObject)
        canvas.bringForward(activeObject)
        canvas.renderAll()
        if (onCanvasUpdate) {
          onCanvasUpdate({ type: 'layerChanged', object: activeObject })
        }
      } else if (property === 'sendBackward') {
        console.log('Sending backward:', activeObject)
        canvas.sendBackwards(activeObject)
        canvas.renderAll()
        if (onCanvasUpdate) {
          onCanvasUpdate({ type: 'layerChanged', object: activeObject })
        }
      } else if (property === 'sendToBack') {
        console.log('Sending to back:', activeObject)
        canvas.sendToBack(activeObject)
        canvas.renderAll()
        if (onCanvasUpdate) {
          onCanvasUpdate({ type: 'layerChanged', object: activeObject })
        }
      } else {
        activeObject.set(property, value)
        canvas.renderAll()
        
        // 캔버스 업데이트 알림
        if (onCanvasUpdate) {
          onCanvasUpdate()
        }
      }
    }

    // 속성 변경 이벤트 리스너 등록
    if (onPropertyChange) {
      onPropertyChange(updateObject)
    }
  }, [onPropertyChange, onCanvasUpdate])

  // 객체 선택 이벤트 처리
  const handleSelection = (e) => {
    const activeObject = e.selected?.[0]
    console.log('Object selected:', activeObject)
    
    if (activeObject) {
      // 부모 컴포넌트에 선택된 객체 전달
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
  }

  // 선택 해제 이벤트 처리
  const handleSelectionCleared = () => {
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
  }

  // 객체 수정 이벤트 처리
  const handleObjectModified = (e) => {
    // 속성창에 수정된 속성 반영
    if (onPropertyChange) {
      onPropertyChange('selectedObject', e.target)
    }
    
    if (onCanvasUpdate) {
      onCanvasUpdate({
        type: 'modification',
        object: e.target,
        properties: getObjectProperties(e.target)
      })
    }
  }

  // 객체 이동 시 실시간 업데이트
  const handleObjectMoving = (e) => {
    const obj = e.target
    
    // 속성창에 실시간 반영
    if (onPropertyChange) {
      onPropertyChange('selectedObject', obj)
    }
    
    if (onCanvasUpdate) {
      onCanvasUpdate({
        type: 'moving',
        object: obj,
        properties: getObjectProperties(obj)
      })
    }
  }

  // 객체 크기 조절 시 실시간 업데이트
  const handleObjectScaling = (e) => {
    const obj = e.target
    
    // 텍스트 객체인 경우 폰트 크기로 변환
    if (obj.type === 'i-text') {
      // 현재 스케일 값 가져오기
      const scaleX = obj.scaleX || 1
      const scaleY = obj.scaleY || 1
      
      // 평균 스케일 계산 (비율 유지)
      const avgScale = (scaleX + scaleY) / 2
      
      // 원본 폰트 크기에서 새로운 폰트 크기 계산
      const originalFontSize = obj.fontSize || 16
      const newFontSize = Math.round(originalFontSize * avgScale)
      
      // 폰트 크기 업데이트 (최소 8, 최대 200)
      const clampedFontSize = Math.max(8, Math.min(200, newFontSize))
      
      // 스케일을 1로 리셋하고 폰트 크기만 변경
      obj.set({
        scaleX: 1,
        scaleY: 1,
        fontSize: clampedFontSize
      })
    }
    
    // 속성창에 실시간 반영
    if (onPropertyChange) {
      onPropertyChange('selectedObject', obj)
    }
    
    if (onCanvasUpdate) {
      onCanvasUpdate({
        type: 'scaling',
        object: obj,
        properties: getObjectProperties(obj)
      })
    }
  }

  // 객체 회전 시 실시간 업데이트
  const handleObjectRotating = (e) => {
    const obj = e.target
    
    // 속성창에 실시간 반영
    if (onPropertyChange) {
      onPropertyChange('selectedObject', obj)
    }
    
    if (onCanvasUpdate) {
      onCanvasUpdate({
        type: 'rotating',
        object: obj,
        properties: getObjectProperties(obj)
      })
    }
  }

  // 마우스 다운 이벤트 (우클릭 감지용)
  const handleMouseDown = (e) => {
    if (e.e.button === 2) { // 우클릭
      e.e.preventDefault()
      const pointer = fabricCanvasRef.current.getPointer(e.e)
      setRightClickedObject(e.target)
      setContextMenu({
        visible: true,
        position: { x: pointer.x, y: pointer.y }
      })
    }
  }

  // 마우스 업 이벤트
  const handleMouseUp = (e) => {
    // 일반적인 마우스 업 처리
  }

  // 컨텍스트 메뉴 닫기
  const closeContextMenu = () => {
    setContextMenu({ visible: false, position: null })
    setRightClickedObject(null)
  }

  // 컨텍스트 메뉴 액션 처리
  const handleContextAction = (action) => {
    if (!fabricCanvasRef.current) return

    const canvas = fabricCanvasRef.current
    const activeObject = canvas.getActiveObject() || rightClickedObject

    console.log('Context action:', action, 'on object:', activeObject)

    if (!activeObject) {
      console.log('No active object for context action')
      return
    }

    switch (action) {
      case 'fontSizeUp':
        activeObject.set('fontSize', Math.min((activeObject.fontSize || 16) + 2, 72))
        break
      case 'fontSizeDown':
        activeObject.set('fontSize', Math.max((activeObject.fontSize || 16) - 2, 8))
        break
      case 'toggleBold':
        activeObject.set('fontWeight', 
          activeObject.fontWeight === 'bold' ? 'normal' : 'bold'
        )
        break
      case 'toggleItalic':
        activeObject.set('fontStyle', 
          activeObject.fontStyle === 'italic' ? 'normal' : 'italic'
        )
        break
      case 'copy':
        // 클립보드에 복사 (간단한 구현)
        if (activeObject.text) {
          navigator.clipboard.writeText(activeObject.text)
        }
        break
      case 'duplicate':
        // 객체 복제
        activeObject.clone((cloned) => {
          cloned.set({
            left: (activeObject.left || 0) + 10,
            top: (activeObject.top || 0) + 10
          })
          canvas.add(cloned)
          canvas.setActiveObject(cloned)
          canvas.renderAll()
        })
        break
      case 'delete':
        console.log('Removing object:', activeObject)
        canvas.remove(activeObject)
        break
      case 'bringToFront':
        console.log('Bringing to front via context menu')
        canvas.bringToFront(activeObject)
        break
      case 'bringForward':
        console.log('Bringing forward via context menu')
        canvas.bringForward(activeObject)
        break
      case 'sendBackward':
        console.log('Sending backward via context menu')
        canvas.sendBackwards(activeObject)
        break
      case 'sendToBack':
        console.log('Sending to back via context menu')
        canvas.sendToBack(activeObject)
        break
      case 'centerHorizontal':
        activeObject.set('left', canvas.width / 2)
        activeObject.set('originX', 'center')
        break
      case 'centerVertical':
        activeObject.set('top', canvas.height / 2)
        activeObject.set('originY', 'center')
        break
    }

    canvas.renderAll()
    
    // 속성 패널 업데이트
    if (onCanvasUpdate) {
      onCanvasUpdate({
        type: 'modification',
        object: activeObject,
        properties: getObjectProperties(activeObject)
      })
    }
  }

  // 객체 속성 추출
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
      fill: obj.fill || '#000000',
      textAlign: obj.textAlign || 'left',
      angle: Math.round(obj.angle || 0),
      scaleX: obj.scaleX || 1,
      scaleY: obj.scaleY || 1,
      opacity: obj.opacity || 1,
    }
  }

  // 캔버스 내보내기 (JSON)
  const exportCanvas = () => {
    if (!fabricCanvasRef.current) return null
    return fabricCanvasRef.current.toJSON()
  }

  // 캔버스 불러오기 (JSON)
  const importCanvas = (jsonData) => {
    if (!fabricCanvasRef.current) return
    fabricCanvasRef.current.loadFromJSON(jsonData, () => {
      fabricCanvasRef.current.renderAll()
    })
  }

  // 캔버스 초기화
  const clearCanvas = () => {
    if (!fabricCanvasRef.current) return
    fabricCanvasRef.current.clear()
    createDefaultTemplate(fabricCanvasRef.current)
  }

  // 캔버스 이미지로 내보내기
  const exportAsImage = () => {
    if (!fabricCanvasRef.current) return
    return fabricCanvasRef.current.toDataURL({
      format: 'png',
      quality: 1,
      multiplier: 2
    })
  }

  // 현재 캔버스 JSON 반환 (템플릿 저장용)
  const getCurrentCanvasJson = () => {
    if (!fabricCanvasRef.current) return null
    return fabricCanvasRef.current.toJSON()
  }

  // 템플릿 로드 시 첫 번째 명단 자동 적용 (제거 - EventDetailView에서 처리)
  // useEffect(() => {
  //   if (isTemplateLoaded && selectedProfile) {
  //     updateCanvasWithProfile(selectedProfile)
  //   }
  // }, [isTemplateLoaded, selectedProfile])

  // 외부에서 템플릿 로드 호출 가능하도록 노출 (캔버스 준비 후)
  useEffect(() => {
    if (onTemplateLoad && fabricCanvasRef.current && isCanvasReady) {
      console.log('CanvasEditor: Exposing canvas methods to parent')
      
      const canvasMethods = {
        loadTemplate,
        fabricCanvasRef: fabricCanvasRef.current,
        updateCanvasWithProfile,
        getCurrentCanvasJson,
        bringToFront: () => {
          const canvas = fabricCanvasRef.current
          const activeObject = canvas?.getActiveObject()
          if (activeObject) {
            canvas.bringToFront(activeObject)
            canvas.renderAll()
            console.log('Direct bringToFront called')
          }
        },
        bringForward: () => {
          const canvas = fabricCanvasRef.current
          const activeObject = canvas?.getActiveObject()
          if (activeObject) {
            canvas.bringForward(activeObject)
            canvas.renderAll()
            console.log('Direct bringForward called')
          }
        },
        sendBackward: () => {
          const canvas = fabricCanvasRef.current
          const activeObject = canvas?.getActiveObject()
          if (activeObject) {
            canvas.sendBackwards(activeObject)
            canvas.renderAll()
            console.log('Direct sendBackward called')
          }
        },
        sendToBack: () => {
          const canvas = fabricCanvasRef.current
          const activeObject = canvas?.getActiveObject()
          if (activeObject) {
            canvas.sendToBack(activeObject)
            canvas.renderAll()
            console.log('Direct sendToBack called')
          }
        }
      }
      
      onTemplateLoad(canvasMethods)
    }
  }, [onTemplateLoad, isCanvasReady])

  // 이미지 업로드 처리
  const handleImageUpload = (imageData) => {
    setUploadedImages(prev => [...prev, imageData])
  }

  // 배경 이미지 업로드 처리
  const handleBackgroundImageUpload = (event) => {
    const file = event.target.files[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      const imageData = e.target.result
      setBackgroundImage({
        url: imageData,
        name: file.name,
        type: 'background' // 가이드용, 인쇄 제외
      })
      
      // 배경 이미지를 캔버스에 추가 (가이드용)
      if (fabricCanvasRef.current) {
        const img = new Image()
        img.onload = () => {
          // 캔버스 크기에 맞춰 자동 스케일 계산
          const canvas = fabricCanvasRef.current
          const canvasWidth = canvas.width
          const canvasHeight = canvas.height
          
          // 이미지가 캔버스에 맞도록 스케일 계산 (cover 방식)
          const scaleX = canvasWidth / img.width
          const scaleY = canvasHeight / img.height
          const scale = Math.max(scaleX, scaleY) // 이미지가 캔버스를 완전히 덮도록
          
          const fabricImage = new fabric.Image(img, {
            left: canvasWidth / 2,
            top: canvasHeight / 2,
            scaleX: scale,
            scaleY: scale,
            originX: 'center',
            originY: 'center',
            selectable: true, // 배경 이미지도 선택 가능하게 변경
            evented: true, // 이벤트 활성화
            type: 'background', // 배경 이미지 타입
            opacity: backgroundOpacity, // 설정된 투명도 적용
            cornerSize: 8, // 크기 조절 핸들 크기
            transparentCorners: false
          })
          
          // 배경 이미지를 맨 뒤로 보내기
          fabricCanvasRef.current.add(fabricImage)
          fabricCanvasRef.current.sendToBack(fabricImage)
          fabricCanvasRef.current.renderAll()
        }
        img.src = imageData
      }
    }
    reader.readAsDataURL(file)
  }

  // 배경 이미지 제거
  const removeBackgroundImage = () => {
    if (!fabricCanvasRef.current) return
    
    const canvas = fabricCanvasRef.current
    const objects = canvas.getObjects()
    
    // 배경 이미지 타입의 객체들 제거
    objects.forEach(obj => {
      if (obj.type === 'background') {
        canvas.remove(obj)
      }
    })
    
    canvas.renderAll()
    setBackgroundImage(null)
    setShowBackgroundUpload(false)
  }

  // 배경 이미지 크기 자동 맞춤
  const fitBackgroundImageToCanvas = () => {
    if (!fabricCanvasRef.current) return
    
    const canvas = fabricCanvasRef.current
    const objects = canvas.getObjects()
    
    // 배경 이미지 찾기
    const backgroundImage = objects.find(obj => obj.type === 'background')
    if (!backgroundImage) return
    
    const canvasWidth = canvas.width
    const canvasHeight = canvas.height
    
    // 이미지가 캔버스에 맞도록 스케일 계산 (cover 방식)
    const scaleX = canvasWidth / (backgroundImage.width * backgroundImage.scaleX)
    const scaleY = canvasHeight / (backgroundImage.height * backgroundImage.scaleY)
    const scale = Math.max(scaleX, scaleY)
    
    // 이미지 크기와 위치 조정
    backgroundImage.set({
      scaleX: scale,
      scaleY: scale,
      left: canvasWidth / 2,
      top: canvasHeight / 2,
      originX: 'center',
      originY: 'center'
    })
    
    canvas.renderAll()
  }

  // 배경 이미지 투명도 조절
  const updateBackgroundOpacity = (opacity) => {
    if (!fabricCanvasRef.current) return
    
    const canvas = fabricCanvasRef.current
    const objects = canvas.getObjects()
    
    // 배경 이미지 찾기
    const backgroundImage = objects.find(obj => obj.type === 'background')
    if (!backgroundImage) return
    
    // 투명도 업데이트
    backgroundImage.set('opacity', opacity)
    canvas.renderAll()
  }

  // 이미지 선택하여 캔버스에 추가 (편집 이미지)
  const handleImageSelect = (imageData) => {
    if (!fabricCanvasRef.current) return

    const img = new Image()
    img.onload = () => {
      const fabricImage = new fabric.Image(img, {
        left: 50,
        top: 50,
        scaleX: 0.5,
        scaleY: 0.5,
        selectable: true,
        evented: true,
        type: 'editable' // 편집 이미지 타입 (인쇄 포함)
      })

      fabricCanvasRef.current.add(fabricImage)
      fabricCanvasRef.current.setActiveObject(fabricImage)
      fabricCanvasRef.current.renderAll()

      // 속성 패널에 선택된 객체 전달
      if (onPropertyChange) {
        onPropertyChange('selectedObject', fabricImage)
      }
    }
    img.src = imageData.url
  }


  // 이미지 추가 버튼 클릭
  const handleAddImage = () => {
    setShowImageUpload(!showImageUpload)
  }

  // 배경 이미지 업로드 버튼 클릭
  const handleAddBackgroundImage = () => {
    setShowBackgroundUpload(!showBackgroundUpload)
  }

  // 객체 안전성 확인
  const validateObject = (obj) => {
    if (!obj) return false
    if (!fabricCanvasRef.current) return false
    
    const objects = fabricCanvasRef.current.getObjects()
    return objects.includes(obj)
  }

  return (
    <div className="w-full h-full">
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
            onClick={() => {
              const data = exportCanvas()
              console.log('Canvas JSON:', data)
            }}
            className="px-3 py-2 bg-blue-500 text-white text-sm rounded hover:bg-blue-600"
          >
            JSON 내보내기
          </button>
        </div>
      </div>
      
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
          <div className="space-y-3">
            <input
              type="file"
              accept="image/*"
              onChange={handleBackgroundImageUpload}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
            />
            {backgroundImage && (
              <div className="space-y-2">
                <div className="flex justify-between items-center p-2 bg-yellow-100 rounded">
                  <span className="text-sm text-yellow-800">
                    업로드됨: {backgroundImage.name} (인쇄 시 제외)
                  </span>
                  <button
                    onClick={removeBackgroundImage}
                    className="text-red-500 hover:text-red-700 text-sm"
                  >
                    제거
                  </button>
                </div>
                
                {/* 배경 이미지 조절 버튼들 */}
                <div className="flex space-x-2">
                  <button
                    onClick={fitBackgroundImageToCanvas}
                    className="flex-1 px-3 py-2 bg-blue-500 text-white text-xs rounded hover:bg-blue-600"
                  >
                    캔버스에 맞춤
                  </button>
                  <button
                    onClick={() => {
                      const canvas = fabricCanvasRef.current
                      const objects = canvas.getObjects()
                      const backgroundImage = objects.find(obj => obj.type === 'background')
                      if (backgroundImage) {
                        canvas.setActiveObject(backgroundImage)
                        canvas.renderAll()
                      }
                    }}
                    className="flex-1 px-3 py-2 bg-green-500 text-white text-xs rounded hover:bg-green-600"
                  >
                    선택하여 조절
                  </button>
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
                  💡 배경 이미지를 선택하면 크기 조절 핸들로 자유롭게 조정할 수 있습니다
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 이미지 업로드 패널 (편집 이미지) */}
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
          <ImageUpload
            onImageUpload={handleImageUpload}
            onImageSelect={handleImageSelect}
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
    </div>
  )
}
