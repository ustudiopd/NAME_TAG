'use client'

import { useEffect, useRef, useState } from 'react'
import { fabric } from 'fabric'
import ContextMenu from './ContextMenu'
import { uploadImage } from '../lib/storage'

export default function CanvasEditor({ selectedProfile, onCanvasUpdate, selectedObject, onPropertyChange }) {
  const canvasRef = useRef(null)
  const fabricCanvasRef = useRef(null)
  const [isCanvasReady, setIsCanvasReady] = useState(false)
  const [contextMenu, setContextMenu] = useState({ visible: false, position: null })
  const [rightClickedObject, setRightClickedObject] = useState(null)
  const [showJsonView, setShowJsonView] = useState(false)
  const [jsonData, setJsonData] = useState(null)

  // 캔버스 초기화
  useEffect(() => {
    if (!canvasRef.current) return

    // Fabric.js 캔버스 생성 (9cm x 12.5cm 비율에 맞춤)
    // 9:12.5 = 360:500 비율로 설정 (실제 cm 단위는 인쇄 시 적용)
    const canvas = new fabric.Canvas(canvasRef.current, {
      width: 360,  // 9cm에 해당
      height: 500, // 12.5cm에 해당
      backgroundColor: '#ffffff',
      selection: true,
      preserveObjectStacking: true,
      // 선택 우선순위 설정
      selectionColor: 'rgba(100, 100, 255, 0.3)',
      selectionBorderColor: 'rgba(255, 255, 255, 0.3)',
      selectionLineWidth: 1,
    })

    fabricCanvasRef.current = canvas
    setIsCanvasReady(true)

    // 캔버스 이벤트 리스너
    canvas.on('selection:created', handleSelection)
    canvas.on('selection:updated', handleSelection)
    canvas.on('selection:cleared', handleSelectionCleared)
    canvas.on('object:modified', handleObjectModified)
    canvas.on('object:moving', handleObjectMoving)
    canvas.on('object:scaling', handleObjectScaling)
    canvas.on('object:rotating', handleObjectRotating)
    canvas.on('mouse:down', handleMouseDown)
    canvas.on('mouse:up', handleMouseUp)
    canvas.on('mouse:over', handleMouseOver)
    canvas.on('mouse:out', handleMouseOut)

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

  // 기본 명찰 템플릿 생성
  const createDefaultTemplate = (canvas) => {
    // 캔버스 중앙 좌표 (9cm x 12.5cm 기준)
    const centerX = canvas.width / 2  // 180
    const centerY = canvas.height / 2 // 250

    // 회사명 텍스트
    const companyText = new fabric.IText('회사명', {
      left: centerX,
      top: centerY - 60,
      fontSize: 16,
      fontFamily: 'Arial',
      fill: '#333333',
      textAlign: 'center',
      originX: 'center',
      originY: 'center',
      // 텍스트 객체는 크기 조절을 폰트 크기로만 제한
      lockScalingX: true,
      lockScalingY: true,
      lockUniScaling: true,
    })

    // 이름 텍스트
    const nameText = new fabric.IText('이름', {
      left: centerX,
      top: centerY,
      fontSize: 24,
      fontFamily: 'Arial',
      fontWeight: 'bold',
      fill: '#000000',
      textAlign: 'center',
      originX: 'center',
      originY: 'center',
      // 텍스트 객체는 크기 조절을 폰트 크기로만 제한
      lockScalingX: true,
      lockScalingY: true,
      lockUniScaling: true,
    })

    // 직급 텍스트
    const titleText = new fabric.IText('직급', {
      left: centerX,
      top: centerY + 60,
      fontSize: 14,
      fontFamily: 'Arial',
      fill: '#666666',
      textAlign: 'center',
      originX: 'center',
      originY: 'center',
      // 텍스트 객체는 크기 조절을 폰트 크기로만 제한
      lockScalingX: true,
      lockScalingY: true,
      lockUniScaling: true,
    })

    // 텍스트 객체들을 캔버스에 추가
    canvas.add(companyText, nameText, titleText)
    canvas.renderAll()
  }

  // 프로필 데이터로 캔버스 업데이트
  const updateCanvasWithProfile = (profile) => {
    if (!fabricCanvasRef.current) return

    const canvas = fabricCanvasRef.current
    const objects = canvas.getObjects()

    // 각 텍스트 객체 업데이트
    objects.forEach((obj) => {
      if (obj.type === 'i-text') {
        switch (obj.text) {
          case '회사명':
            obj.set('text', profile.company || '회사명')
            break
          case '이름':
            obj.set('text', profile.name || '이름')
            break
          case '직급':
            obj.set('text', profile.title || '직급')
            break
        }
      }
    })

    canvas.renderAll()
  }

  // 선택된 객체의 속성 변경 처리
  useEffect(() => {
    if (!fabricCanvasRef.current || !selectedObject) return

    const canvas = fabricCanvasRef.current
    const activeObject = canvas.getActiveObject()
    
    if (activeObject && onPropertyChange) {
      // 속성 변경을 캔버스에 반영
      const updateObject = (property, value) => {
        // 정렬 처리
        if (property === 'alignment') {
          if (value === 'centerHorizontal') {
            // 가로 가운데 정렬 - 정확한 중앙 계산
            const centerX = canvas.width / 2  // 180px
            console.log('CanvasEditor 가로 가운데 정렬:', { 
              canvasWidth: canvas.width, 
              centerX, 
              currentLeft: activeObject.left,
              currentOriginX: activeObject.originX,
              objectWidth: activeObject.width
            })
            
            // Fabric.js의 centerH() 메서드 사용으로 정확한 가로 가운데 정렬
            activeObject.centerH()
            activeObject.setCoords()
          } else if (value === 'centerVertical') {
            // 세로 가운데 정렬 - 정확한 중앙 계산
            const centerY = canvas.height / 2  // 250px
            console.log('CanvasEditor 세로 가운데 정렬:', { 
              canvasHeight: canvas.height, 
              centerY, 
              currentTop: activeObject.top,
              currentOriginY: activeObject.originY,
              objectHeight: activeObject.height
            })
            
            // Fabric.js의 centerV() 메서드 사용으로 정확한 세로 가운데 정렬
            activeObject.centerV()
            activeObject.setCoords()
          }
          // 정렬 후 캔버스 다시 그리기
          canvas.renderAll()
        }
        // 텍스트 객체의 경우 특별 처리
        else if (activeObject.type === 'i-text' || activeObject.type === 'text') {
          if (property === 'fontSize') {
            // 폰트 크기 변경 시 스케일은 1로 유지
            activeObject.set({
              fontSize: value,
              scaleX: 1,
              scaleY: 1,
              lockScalingX: true,
              lockScalingY: true,
              lockUniScaling: true,
            })
          } else if (property === 'width' || property === 'height') {
            // 텍스트 객체는 크기 조절을 폰트 크기로만 제한
            return // 크기 변경 무시
          } else {
            activeObject.set(property, value)
          }
        } else {
          activeObject.set(property, value)
        }
        
        canvas.renderAll()
        
        // 변경된 속성을 부모 컴포넌트에 알림
        if (onCanvasUpdate) {
          onCanvasUpdate({
            type: 'propertyChange',
            object: activeObject,
            properties: getObjectProperties(activeObject)
          })
        }
      }

      // 속성 변경 이벤트 리스너 등록
      onPropertyChange(updateObject)
    }
  }, [selectedObject, onPropertyChange])

  // 객체 선택 이벤트 처리
  const handleSelection = (e) => {
    const activeObject = e.selected?.[0]
    if (activeObject) {
      // 배경 이미지인 경우 선택을 제한하고 텍스트 객체 우선 선택
      if (activeObject.type === 'image' && activeObject.isBackground) {
        // 배경 이미지 선택 시 다른 객체가 있는지 확인
        const canvas = fabricCanvasRef.current
        const objects = canvas.getObjects()
        const textObjects = objects.filter(obj => 
          (obj.type === 'i-text' || obj.type === 'text') && !obj.isBackground
        )
        
        if (textObjects.length > 0) {
          // 텍스트 객체가 있으면 배경 선택 해제
          canvas.discardActiveObject()
          canvas.renderAll()
          return
        }
      }
      
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
    const obj = e.target
    
    // 텍스트 객체의 경우 크기 조절을 폰트 크기로 변환
    if (obj.type === 'i-text' || obj.type === 'text') {
      // 스케일이 변경된 경우 폰트 크기로 변환
      if (obj.scaleX !== 1 || obj.scaleY !== 1) {
        // 스케일 변화량을 정수 단위로 계산
        const scaleFactor = Math.max(obj.scaleX, obj.scaleY)
        const scaleChange = scaleFactor - 1 // 변화량 (예: 1.2 -> 0.2)
        
        // 변화량에 따라 폰트 크기 조정 (최소 1씩 증가/감소)
        let fontSizeChange = 0
        if (Math.abs(scaleChange) >= 0.1) { // 10% 이상 변화 시
          fontSizeChange = Math.round(scaleChange * 10) // 10% 변화당 1pt 증가
        }
        
        const newFontSize = Math.max(8, obj.fontSize + fontSizeChange)
        
        obj.set({
          fontSize: newFontSize,
          scaleX: 1,
          scaleY: 1,
          lockScalingX: true,
          lockScalingY: true,
          lockUniScaling: true,
        })
      }
    }
    
    // 캔버스 다시 그리기
    fabricCanvasRef.current.renderAll()
    
    if (onCanvasUpdate) {
      onCanvasUpdate({
        type: 'modification',
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
    } else if (e.e.button === 0) { // 좌클릭
      // 텍스트 객체 우선 선택을 위한 처리
      const canvas = fabricCanvasRef.current
      const pointer = canvas.getPointer(e.e)
      const objects = canvas.getObjects()
      
      // 클릭된 위치의 객체들을 z-index 순으로 정렬
      const objectsAtPointer = objects.filter(obj => {
        if (obj.isBackground) return false
        return obj.containsPoint(pointer)
      }).sort((a, b) => b.zIndex - a.zIndex)
      
      // 텍스트 객체가 있으면 우선 선택
      const textObject = objectsAtPointer.find(obj => 
        obj.type === 'i-text' || obj.type === 'text'
      )
      
      if (textObject) {
        canvas.setActiveObject(textObject)
        canvas.renderAll()
      }
    }
  }

  // 마우스 업 이벤트
  const handleMouseUp = (e) => {
    // 일반적인 마우스 업 처리
  }

  // 마우스 오버 이벤트 (호버 효과)
  const handleMouseOver = (e) => {
    if (e.target) {
      // 텍스트 객체에 마우스 오버 시 커서 변경
      if (e.target.type === 'i-text' || e.target.type === 'text') {
        fabricCanvasRef.current.defaultCursor = 'text'
      } else {
        fabricCanvasRef.current.defaultCursor = 'move'
      }
    }
  }

  // 마우스 아웃 이벤트
  const handleMouseOut = (e) => {
    fabricCanvasRef.current.defaultCursor = 'default'
  }

  // 객체 이동 이벤트 처리 (실시간 속성 업데이트)
  const handleObjectMoving = (e) => {
    const obj = e.target
    if (onCanvasUpdate) {
      onCanvasUpdate({
        type: 'moving',
        object: obj,
        properties: getObjectProperties(obj)
      })
    }
  }

  // 객체 크기 조절 이벤트 처리 (실시간 속성 업데이트)
  const handleObjectScaling = (e) => {
    const obj = e.target
    
    // 텍스트 객체의 경우 크기 조절을 폰트 크기로 변환
    if (obj.type === 'i-text' || obj.type === 'text') {
      if (obj.scaleX !== 1 || obj.scaleY !== 1) {
        // 스케일 변화량을 정수 단위로 계산
        const scaleFactor = Math.max(obj.scaleX, obj.scaleY)
        const scaleChange = scaleFactor - 1 // 변화량 (예: 1.2 -> 0.2)
        
        // 변화량에 따라 폰트 크기 조정 (최소 1씩 증가/감소)
        let fontSizeChange = 0
        if (Math.abs(scaleChange) >= 0.1) { // 10% 이상 변화 시
          fontSizeChange = Math.round(scaleChange * 10) // 10% 변화당 1pt 증가
        }
        
        const newFontSize = Math.max(8, obj.fontSize + fontSizeChange)
        
        obj.set({
          fontSize: newFontSize,
          scaleX: 1,
          scaleY: 1,
          lockScalingX: true,
          lockScalingY: true,
          lockUniScaling: true,
        })
      }
    }
    
    if (onCanvasUpdate) {
      onCanvasUpdate({
        type: 'scaling',
        object: obj,
        properties: getObjectProperties(obj)
      })
    }
  }

  // 객체 회전 이벤트 처리 (실시간 속성 업데이트)
  const handleObjectRotating = (e) => {
    const obj = e.target
    if (onCanvasUpdate) {
      onCanvasUpdate({
        type: 'rotating',
        object: obj,
        properties: getObjectProperties(obj)
      })
    }
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

    if (!activeObject) return

    switch (action) {
      case 'fontSizeUp':
        activeObject.set('fontSize', Math.min(activeObject.fontSize + 2, 72))
        break
      case 'fontSizeDown':
        activeObject.set('fontSize', Math.max(activeObject.fontSize - 2, 8))
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
        navigator.clipboard.writeText(activeObject.text)
        break
      case 'duplicate':
        // 객체 복제
        activeObject.clone((cloned) => {
          cloned.set({
            left: activeObject.left + 10,
            top: activeObject.top + 10
          })
          canvas.add(cloned)
          canvas.setActiveObject(cloned)
        })
        break
      case 'delete':
        canvas.remove(activeObject)
        break
      case 'bringToFront':
        canvas.bringToFront(activeObject)
        break
      case 'sendToBack':
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
      left: Math.round(obj.left),
      top: Math.round(obj.top),
      width: Math.round(obj.width * obj.scaleX),
      height: Math.round(obj.height * obj.scaleY),
      fontSize: obj.fontSize,
      fontFamily: obj.fontFamily,
      fontWeight: obj.fontWeight,
      fill: obj.fill,
      textAlign: obj.textAlign,
      angle: Math.round(obj.angle),
      scaleX: obj.scaleX,
      scaleY: obj.scaleY,
    }
  }

  // 캔버스 내보내기 (JSON)
  const exportCanvas = () => {
    if (!fabricCanvasRef.current) return null
    
    // 이미지 객체들을 포함한 전체 JSON 내보내기
    const jsonData = fabricCanvasRef.current.toJSON(['id', 'src', 'crossOrigin'])
    
    // 이미지 객체들의 src 정보를 명시적으로 저장
    const objectsWithImageData = jsonData.objects.map(obj => {
      if (obj.type === 'image') {
        return {
          ...obj,
          src: obj.src || obj._element?.src,
          crossOrigin: obj.crossOrigin || 'anonymous'
        }
      }
      return obj
    })
    
    return {
      ...jsonData,
      objects: objectsWithImageData,
      // 이미지 메타데이터 추가
      imageMetadata: {
        hasImages: objectsWithImageData.some(obj => obj.type === 'image'),
        imageCount: objectsWithImageData.filter(obj => obj.type === 'image').length,
        backgroundImage: jsonData.backgroundImage
      }
    }
  }

  // 캔버스 불러오기 (JSON)
  const importCanvas = (jsonData) => {
    if (!fabricCanvasRef.current) return
    
    console.log('템플릿 불러오기 시작:', jsonData)
    
    // 기존 캔버스 초기화
    fabricCanvasRef.current.clear()
    
    // 캔버스 크기 설정
    if (jsonData.canvas) {
      fabricCanvasRef.current.setDimensions({
        width: jsonData.canvas.width || 360,
        height: jsonData.canvas.height || 500
      })
      fabricCanvasRef.current.setBackgroundColor(jsonData.canvas.backgroundColor || '#ffffff')
    }
    
    // JSON 데이터 로드
    fabricCanvasRef.current.loadFromJSON(jsonData, () => {
      console.log('템플릿 로드 완료, 객체 수:', fabricCanvasRef.current.getObjects().length)
      
      // 모든 객체의 좌표 업데이트 및 설정
      fabricCanvasRef.current.getObjects().forEach(obj => {
        obj.setCoords()
        
        // 텍스트 객체의 경우 크기 조절 제한 설정
        if (obj.type === 'i-text' || obj.type === 'text') {
          obj.set({
            lockScalingX: true,
            lockScalingY: true,
            lockUniScaling: true,
          })
        }
        
        // 이미지 객체의 경우 crossOrigin 설정
        if (obj.type === 'image') {
          obj.set({
            crossOrigin: 'anonymous'
          })
        }
      })
      
      fabricCanvasRef.current.renderAll()
      
      // 이미지 메타데이터 로그
      if (jsonData.imageMetadata) {
        console.log('이미지 메타데이터:', jsonData.imageMetadata)
      }
      
      // 부모 컴포넌트에 업데이트 알림
      if (onCanvasUpdate) {
        onCanvasUpdate({
          type: 'templateLoaded',
          canvas: fabricCanvasRef.current,
          objects: fabricCanvasRef.current.getObjects(),
          imageMetadata: jsonData.imageMetadata
        })
      }
    }, (error) => {
      console.error('템플릿 로드 실패:', error)
    })
  }

  // 캔버스 초기화
  const clearCanvas = () => {
    if (!fabricCanvasRef.current) return
    fabricCanvasRef.current.clear()
    createDefaultTemplate(fabricCanvasRef.current)
  }

  // 이미지 객체를 캔버스에 추가
  const addImageToCanvas = (imageData) => {
    if (!fabricCanvasRef.current) return
    
    fabric.Image.fromURL(imageData.url, (img) => {
      // 이미지 크기 제한
      const maxSize = 200
      if (img.width > maxSize || img.height > maxSize) {
        const scale = Math.min(maxSize / img.width, maxSize / img.height)
        img.scale(scale)
      }
      
      // 캔버스 중앙에 배치
      img.set({
        left: fabricCanvasRef.current.width / 2,
        top: fabricCanvasRef.current.height / 2,
        originX: 'center',
        originY: 'center',
        crossOrigin: 'anonymous'
      })
      
      fabricCanvasRef.current.add(img)
      fabricCanvasRef.current.setActiveObject(img)
      fabricCanvasRef.current.renderAll()
      
      console.log('이미지 추가됨:', imageData.name)
    }, {
      crossOrigin: 'anonymous'
    })
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

  // 캔버스 이미지로 내보내기
  const exportAsImage = () => {
    if (!fabricCanvasRef.current) return
    return fabricCanvasRef.current.toDataURL({
      format: 'png',
      quality: 1,
      multiplier: 2
    })
  }

  // 외부에서 사용할 수 있는 함수들을 ref에 노출
  useEffect(() => {
    if (fabricCanvasRef.current) {
      fabricCanvasRef.current.importCanvas = importCanvas
      fabricCanvasRef.current.exportCanvas = exportCanvas
      fabricCanvasRef.current.clearCanvas = clearCanvas
      fabricCanvasRef.current.addImageToCanvas = addImageToCanvas
    }
  }, [importCanvas, exportCanvas, clearCanvas, addImageToCanvas])

  return (
    <div className="w-full h-full">
      <div className="mb-4 flex justify-between items-center">
        <h3 className="text-lg font-semibold">명찰 편집</h3>
        <div className="space-x-2">
          <button
            onClick={clearCanvas}
            className="px-3 py-1 bg-gray-500 text-white text-sm rounded hover:bg-gray-600"
          >
            초기화
          </button>
          <button
            onClick={viewJson}
            className="px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600"
          >
            JSON 보기
          </button>
          <button
            onClick={() => {
              // 테스트용 템플릿 불러오기
              const testTemplate = {
                "canvas": {
                  "width": 340,
                  "height": 472,
                  "backgroundColor": "#ffffff"
                },
                "objects": [
                  {
                    "top": 0,
                    "left": 0,
                    "type": "background",
                    "scaleX": 0.31539888682745826,
                    "scaleY": 0.3328631875881523,
                    "opacity": 0.7
                  },
                  {
                    "top": 0,
                    "fill": "transparent",
                    "left": 0,
                    "type": "border",
                    "angle": 0,
                    "width": 340,
                    "height": 472,
                    "scaleX": 1,
                    "scaleY": 1,
                    "stroke": "#cccccc",
                    "strokeWidth": 2
                  },
                  {
                    "top": 10,
                    "fill": "#999999",
                    "left": 10,
                    "type": "border",
                    "angle": 0,
                    "width": 69.087890625,
                    "height": 13.559999999999997,
                    "scaleX": 1,
                    "scaleY": 1,
                    "stroke": null,
                    "strokeWidth": 1
                  },
                  {
                    "top": 158,
                    "fill": "#000000",
                    "left": 170,
                    "text": "OASYS STUDIO",
                    "type": "i-text",
                    "angle": 0,
                    "width": 187.53662109375,
                    "height": 28.25,
                    "scaleX": 1,
                    "scaleY": 1,
                    "originX": "center",
                    "originY": "center",
                    "fontSize": 25,
                    "fontStyle": "normal",
                    "textAlign": "center",
                    "fontFamily": "Arial",
                    "fontWeight": "normal"
                  },
                  {
                    "top": 250,
                    "fill": "#000000",
                    "left": 170,
                    "text": "안석현",
                    "type": "i-text",
                    "angle": 0,
                    "width": 193.2,
                    "height": 79.09999999999998,
                    "scaleX": 1,
                    "scaleY": 1,
                    "originX": "center",
                    "originY": "center",
                    "fontSize": 70,
                    "fontStyle": "normal",
                    "textAlign": "center",
                    "fontFamily": "Arial",
                    "fontWeight": "bold"
                  },
                  {
                    "top": 338,
                    "fill": "#000000",
                    "left": 170,
                    "text": "CSO",
                    "type": "i-text",
                    "angle": 0,
                    "width": 43.33984375,
                    "height": 22.599999999999998,
                    "scaleX": 1,
                    "scaleY": 1,
                    "originX": "center",
                    "originY": "center",
                    "fontSize": 20,
                    "fontStyle": "normal",
                    "textAlign": "center",
                    "fontFamily": "Arial",
                    "fontWeight": "normal"
                  }
                ],
                "version": "1.0",
                "backgroundImage": null,
                "imageMetadata": {
                  "hasImages": false,
                  "imageCount": 0,
                  "backgroundImage": null
                }
              }
              importCanvas(testTemplate)
            }}
            className="px-3 py-1 bg-green-500 text-white text-sm rounded hover:bg-green-600"
          >
            테스트 템플릿 불러오기
          </button>
          <button
            onClick={() => {
              // 테스트용 이미지 추가
              const testImage = {
                name: "test-image.png",
                url: "https://via.placeholder.com/100x100/FF0000/FFFFFF?text=TEST",
                id: Date.now()
              }
              addImageToCanvas(testImage)
            }}
            className="px-3 py-1 bg-purple-500 text-white text-sm rounded hover:bg-purple-600"
          >
            테스트 이미지 추가
          </button>
        </div>
      </div>
      
      <div className="border-2 border-gray-300 rounded-lg overflow-hidden relative">
        <canvas
          ref={canvasRef}
          className="block mx-auto"
          onContextMenu={(e) => e.preventDefault()} // 기본 우클릭 메뉴 비활성화
        />
      </div>
      
      {!isCanvasReady && (
        <div className="flex items-center justify-center h-64 bg-gray-100">
          <div className="text-gray-500">캔버스 로딩 중...</div>
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
            
            {jsonData?.imageMetadata && (
              <div className="mt-4 p-3 bg-blue-50 rounded">
                <h4 className="font-medium text-blue-800 mb-2">이미지 메타데이터</h4>
                <div className="text-sm text-blue-700">
                  <p>이미지 포함: {jsonData.imageMetadata.hasImages ? '예' : '아니오'}</p>
                  <p>이미지 개수: {jsonData.imageMetadata.imageCount}개</p>
                  <p>배경 이미지: {jsonData.imageMetadata.backgroundImage ? '있음' : '없음'}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
