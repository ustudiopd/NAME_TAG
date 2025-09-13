'use client'

import { useEffect, useRef, useState } from 'react'
import { fabric } from 'fabric'
import ContextMenu from './ContextMenu'

export default function CanvasEditor({ selectedProfile, onCanvasUpdate, selectedObject, onPropertyChange }) {
  const canvasRef = useRef(null)
  const fabricCanvasRef = useRef(null)
  const [isCanvasReady, setIsCanvasReady] = useState(false)
  const [contextMenu, setContextMenu] = useState({ visible: false, position: null })
  const [rightClickedObject, setRightClickedObject] = useState(null)

  // 캔버스 초기화
  useEffect(() => {
    if (!canvasRef.current) return

    // Fabric.js 캔버스 생성
    const canvas = new fabric.Canvas(canvasRef.current, {
      width: 400,
      height: 300,
      backgroundColor: '#ffffff',
      selection: true,
      preserveObjectStacking: true,
    })

    fabricCanvasRef.current = canvas
    setIsCanvasReady(true)

    // 캔버스 이벤트 리스너
    canvas.on('selection:created', handleSelection)
    canvas.on('selection:updated', handleSelection)
    canvas.on('selection:cleared', handleSelectionCleared)
    canvas.on('object:modified', handleObjectModified)
    canvas.on('mouse:down', handleMouseDown)
    canvas.on('mouse:up', handleMouseUp)

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
    // 회사명 텍스트
    const companyText = new fabric.IText('회사명', {
      left: 200,
      top: 50,
      fontSize: 16,
      fontFamily: 'Arial',
      fill: '#333333',
      textAlign: 'center',
      originX: 'center',
      originY: 'center',
    })

    // 이름 텍스트
    const nameText = new fabric.IText('이름', {
      left: 200,
      top: 100,
      fontSize: 24,
      fontFamily: 'Arial',
      fontWeight: 'bold',
      fill: '#000000',
      textAlign: 'center',
      originX: 'center',
      originY: 'center',
    })

    // 직급 텍스트
    const titleText = new fabric.IText('직급', {
      left: 200,
      top: 150,
      fontSize: 14,
      fontFamily: 'Arial',
      fill: '#666666',
      textAlign: 'center',
      originX: 'center',
      originY: 'center',
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
        activeObject.set(property, value)
        canvas.renderAll()
      }

      // 속성 변경 이벤트 리스너 등록
      onPropertyChange(updateObject)
    }
  }, [selectedObject, onPropertyChange])

  // 객체 선택 이벤트 처리
  const handleSelection = (e) => {
    const activeObject = e.selected?.[0]
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
    if (onCanvasUpdate) {
      onCanvasUpdate({
        type: 'modification',
        object: e.target,
        properties: getObjectProperties(e.target)
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
            onClick={() => {
              const data = exportCanvas()
              console.log('Canvas JSON:', data)
            }}
            className="px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600"
          >
            JSON 내보내기
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
    </div>
  )
}
