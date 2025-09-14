'use client'

import { useState, useEffect } from 'react'

export default function PropertyPanel({ selectedObject, onPropertyChange }) {
  const [properties, setProperties] = useState({
    left: 0,
    top: 0,
    width: 0,
    height: 0,
    fontSize: 16,
    fontFamily: 'Arial',
    fontWeight: 'normal',
    fill: '#000000',
    textAlign: 'left',
    angle: 0,
    scaleX: 1,
    scaleY: 1,
  })

  // 선택된 객체가 변경될 때 속성 업데이트
  useEffect(() => {
    if (selectedObject) {
      // Fabric.js 객체에서 필요한 속성만 추출
      const extractedProperties = {
        left: Math.round(selectedObject.left || 0),
        top: Math.round(selectedObject.top || 0),
        width: Math.round((selectedObject.width || 0) * (selectedObject.scaleX || 1)),
        height: Math.round((selectedObject.height || 0) * (selectedObject.scaleY || 1)),
        fontSize: selectedObject.fontSize || 16,
        fontFamily: selectedObject.fontFamily || 'Arial',
        fontWeight: selectedObject.fontWeight || 'normal',
        fontStyle: selectedObject.fontStyle || 'normal',
        fill: selectedObject.fill || '#000000',
        textAlign: selectedObject.textAlign || 'left',
        angle: Math.round(selectedObject.angle || 0),
        scaleX: selectedObject.scaleX || 1,
        scaleY: selectedObject.scaleY || 1,
        opacity: selectedObject.opacity || 1,
        stroke: selectedObject.stroke || 'transparent',
        strokeWidth: selectedObject.strokeWidth || 0,
        originX: selectedObject.originX || 'left',
        originY: selectedObject.originY || 'top'
      }
      
      console.log('PropertyPanel: Extracted properties:', extractedProperties)
      setProperties(extractedProperties)
    }
  }, [selectedObject])

  // 실시간 속성 동기화를 위한 추가 useEffect
  useEffect(() => {
    if (selectedObject) {
      // 객체의 속성이 변경될 때마다 실시간으로 업데이트
      const updateProperties = () => {
        const extractedProperties = {
          left: Math.round(selectedObject.left || 0),
          top: Math.round(selectedObject.top || 0),
          width: Math.round((selectedObject.width || 0) * (selectedObject.scaleX || 1)),
          height: Math.round((selectedObject.height || 0) * (selectedObject.scaleY || 1)),
          fontSize: selectedObject.fontSize || 16,
          fontFamily: selectedObject.fontFamily || 'Arial',
          fontWeight: selectedObject.fontWeight || 'normal',
          fontStyle: selectedObject.fontStyle || 'normal',
          fill: selectedObject.fill || '#000000',
          textAlign: selectedObject.textAlign || 'left',
          angle: Math.round(selectedObject.angle || 0),
          scaleX: selectedObject.scaleX || 1,
          scaleY: selectedObject.scaleY || 1,
          opacity: selectedObject.opacity || 1,
          stroke: selectedObject.stroke || 'transparent',
          strokeWidth: selectedObject.strokeWidth || 0,
          originX: selectedObject.originX || 'left',
          originY: selectedObject.originY || 'top'
        }
        setProperties(extractedProperties)
      }

      // 객체 이벤트 리스너 등록
      selectedObject.on('moving', updateProperties)
      selectedObject.on('scaling', updateProperties)
      selectedObject.on('rotating', updateProperties)
      selectedObject.on('modified', updateProperties)

      return () => {
        // 이벤트 리스너 정리
        selectedObject.off('moving', updateProperties)
        selectedObject.off('scaling', updateProperties)
        selectedObject.off('rotating', updateProperties)
        selectedObject.off('modified', updateProperties)
      }
    }
  }, [selectedObject])

  // 속성 변경 핸들러
  const handlePropertyChange = (property, value) => {
    const newProperties = { ...properties, [property]: value }
    setProperties(newProperties)
    
    if (onPropertyChange) {
      onPropertyChange(property, value)
    }
  }

  // 실시간 속성 동기화를 위한 useEffect
  useEffect(() => {
    if (selectedObject && onPropertyChange) {
      // 선택된 객체의 속성이 변경될 때마다 실시간으로 반영
      const updateObject = (property, value) => {
        if (selectedObject.type === 'i-text' || selectedObject.type === 'text') {
          if (property === 'fontSize') {
            selectedObject.set({
              fontSize: value,
              scaleX: 1,
              scaleY: 1,
              lockScalingX: true,
              lockScalingY: true,
              lockUniScaling: true,
            })
          } else if (property === 'width' || property === 'height') {
            // 텍스트 객체는 크기 조절 무시
            return
          } else {
            selectedObject.set(property, value)
          }
        } else {
          selectedObject.set(property, value)
        }
      }

      onPropertyChange(updateObject)
    }
  }, [selectedObject, onPropertyChange])

  // 숫자 입력 핸들러
  const handleNumberChange = (property, value) => {
    const numValue = parseFloat(value) || 0
    handlePropertyChange(property, numValue)
  }

  // 색상 입력 핸들러
  const handleColorChange = (property, value) => {
    handlePropertyChange(property, value)
  }

  // 정렬 핸들러
  const handleAlignment = (alignmentType) => {
    if (!selectedObject) return

    // 캔버스 크기 (9cm x 12.5cm 비율: 360x500)
    const canvasWidth = 360
    const canvasHeight = 500

    if (alignmentType === 'centerHorizontal') {
      // 가로 가운데 정렬 - 더 정확한 중앙 계산
      const centerX = canvasWidth / 2  // 180px
      console.log('가로 가운데 정렬 전:', { 
        canvasWidth, 
        centerX, 
        currentLeft: selectedObject.left,
        currentOriginX: selectedObject.originX,
        objectWidth: selectedObject.width
      })
      
      // 현재 originX에 따라 중앙 좌표 계산
      let targetLeft = centerX
      if (selectedObject.originX === 'left') {
        // 왼쪽 기준이면 중앙으로 이동
        targetLeft = centerX - (selectedObject.width / 2)
      } else if (selectedObject.originX === 'right') {
        // 오른쪽 기준이면 중앙으로 이동
        targetLeft = centerX + (selectedObject.width / 2)
      }
      
      // Fabric.js의 centerH() 메서드 사용으로 정확한 가로 가운데 정렬
      selectedObject.centerH()
      
      // 좌표 업데이트 및 캔버스 다시 그리기
      selectedObject.setCoords()
      selectedObject.canvas?.renderAll()
      
      // 정렬 후 위치 확인
      console.log('정렬 후 위치:', { 
        left: selectedObject.left, 
        originX: selectedObject.originX,
        width: selectedObject.width,
        actualCenterX: selectedObject.left,
        expectedCenterX: centerX
      })
    } else if (alignmentType === 'centerVertical') {
      // 세로 가운데 정렬 - originY를 먼저 설정하고 top을 중앙으로 이동
      const centerY = canvasHeight / 2  // 250px
      console.log('세로 가운데 정렬:', { canvasHeight, centerY, currentTop: selectedObject.top })
      
      // Fabric.js의 centerV() 메서드 사용으로 정확한 세로 가운데 정렬
      selectedObject.centerV()
      
      // 좌표 업데이트 및 캔버스 다시 그리기
      selectedObject.setCoords()
      selectedObject.canvas?.renderAll()
      
      // 정렬 후 위치 확인
      console.log('정렬 후 위치:', { 
        top: selectedObject.top, 
        originY: selectedObject.originY,
        height: selectedObject.height
      })
    }

    // 정렬 후 속성 패널 업데이트
    const updateProperties = () => {
      const extractedProperties = {
        left: Math.round(selectedObject.left || 0),
        top: Math.round(selectedObject.top || 0),
        width: Math.round((selectedObject.width || 0) * (selectedObject.scaleX || 1)),
        height: Math.round((selectedObject.height || 0) * (selectedObject.scaleY || 1)),
        fontSize: selectedObject.fontSize || 16,
        fontFamily: selectedObject.fontFamily || 'Arial',
        fontWeight: selectedObject.fontWeight || 'normal',
        fontStyle: selectedObject.fontStyle || 'normal',
        fill: selectedObject.fill || '#000000',
        textAlign: selectedObject.textAlign || 'left',
        angle: Math.round(selectedObject.angle || 0),
        scaleX: selectedObject.scaleX || 1,
        scaleY: selectedObject.scaleY || 1,
        opacity: selectedObject.opacity || 1,
        stroke: selectedObject.stroke || 'transparent',
        strokeWidth: selectedObject.strokeWidth || 0,
        originX: selectedObject.originX || 'left',
        originY: selectedObject.originY || 'top'
      }
      setProperties(extractedProperties)
    }

    // 정렬 후 속성 업데이트
    updateProperties()

    // 변경사항을 부모 컴포넌트에 알림
    if (onPropertyChange) {
      onPropertyChange('alignment', alignmentType)
    }
  }

  // 폰트 패밀리 옵션
  const fontFamilies = [
    'Arial',
    'Helvetica',
    'Times New Roman',
    'Georgia',
    'Verdana',
    'Tahoma',
    'Courier New',
    'Impact',
    'Comic Sans MS',
    'Trebuchet MS',
  ]

  // 텍스트 정렬 옵션
  const textAlignOptions = [
    { value: 'left', label: '왼쪽' },
    { value: 'center', label: '가운데' },
    { value: 'right', label: '오른쪽' },
  ]

  if (!selectedObject) {
    return (
      <div className="p-4">
        <h3 className="text-lg font-semibold mb-4">속성 패널</h3>
        <div className="text-center text-gray-500 py-8">
          <p>객체를 선택하세요</p>
          <p className="text-sm mt-2">캔버스에서 객체를 클릭하면</p>
          <p className="text-sm">속성을 편집할 수 있습니다</p>
        </div>
      </div>
    )
  }

  // 객체 타입에 따른 UI 분기
  const objectType = selectedObject.type || 'unknown'
  const isTextObject = objectType === 'i-text' || objectType === 'text'
  const isImageObject = objectType === 'image'
  const isBackgroundObject = objectType === 'background'

  return (
    <div className="p-4">
      <h3 className="text-lg font-semibold mb-4">속성 패널</h3>
      
      {/* 객체 타입 표시 */}
      <div className="mb-4 p-2 bg-gray-100 rounded text-sm">
        <span className="font-medium">타입:</span> 
        <span className="ml-2">
          {isTextObject && '텍스트'}
          {isImageObject && '이미지'}
          {isBackgroundObject && '배경 이미지'}
          {!isTextObject && !isImageObject && !isBackgroundObject && objectType}
        </span>
      </div>
      
      <div className="space-y-4">
        {/* 위치 */}
        <div className="border-b pb-4">
          <h4 className="font-medium text-gray-700 mb-3">위치</h4>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-gray-600 mb-1">X 좌표</label>
              <input
                type="number"
                value={Math.round(properties.left)}
                onChange={(e) => handleNumberChange('left', e.target.value)}
                className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Y 좌표</label>
              <input
                type="number"
                value={Math.round(properties.top)}
                onChange={(e) => handleNumberChange('top', e.target.value)}
                className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
              />
            </div>
          </div>
        </div>

        {/* 크기 - 텍스트 객체가 아닌 경우에만 표시 */}
        {!isTextObject && (
          <div className="border-b pb-4">
            <h4 className="font-medium text-gray-700 mb-3">크기</h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-gray-600 mb-1">너비</label>
                <input
                  type="number"
                  value={Math.round(properties.width)}
                  onChange={(e) => handleNumberChange('width', e.target.value)}
                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">높이</label>
                <input
                  type="number"
                  value={Math.round(properties.height)}
                  onChange={(e) => handleNumberChange('height', e.target.value)}
                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                />
              </div>
            </div>
          </div>
        )}

        {/* 폰트 - 텍스트 객체만 */}
        {isTextObject && (
          <div className="border-b pb-4">
            <h4 className="font-medium text-gray-700 mb-3">폰트</h4>
          <div className="space-y-3">
            <div>
              <label className="block text-sm text-gray-600 mb-1">폰트 패밀리</label>
              <select
                value={properties.fontFamily}
                onChange={(e) => handlePropertyChange('fontFamily', e.target.value)}
                className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
              >
                {fontFamilies.map((font) => (
                  <option key={font} value={font} style={{ fontFamily: font }}>
                    {font}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm text-gray-600 mb-1">폰트 크기 (텍스트 크기)</label>
              <input
                type="number"
                value={properties.fontSize}
                onChange={(e) => handleNumberChange('fontSize', e.target.value)}
                min="8"
                max="72"
                className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
              />
              <p className="text-xs text-gray-500 mt-1">
                마우스로 텍스트 크기를 조절하면 폰트 크기가 변경됩니다
              </p>
            </div>

            <div>
              <label className="block text-sm text-gray-600 mb-1">폰트 스타일</label>
              <select
                value={properties.fontWeight}
                onChange={(e) => handlePropertyChange('fontWeight', e.target.value)}
                className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
              >
                <option value="normal">일반</option>
                <option value="bold">굵게</option>
                <option value="100">얇게</option>
                <option value="300">가벼움</option>
                <option value="500">중간</option>
                <option value="700">굵게</option>
                <option value="900">매우 굵게</option>
              </select>
            </div>

            <div>
              <label className="block text-sm text-gray-600 mb-1">텍스트 정렬</label>
              <select
                value={properties.textAlign}
                onChange={(e) => handlePropertyChange('textAlign', e.target.value)}
                className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
              >
                {textAlignOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
        )}

        {/* 색상 */}
        <div className="border-b pb-4">
          <h4 className="font-medium text-gray-700 mb-3">색상</h4>
          <div>
            <label className="block text-sm text-gray-600 mb-1">
              {isTextObject ? '텍스트 색상' : '색상'}
            </label>
            <div className="flex items-center space-x-2">
              <input
                type="color"
                value={properties.fill}
                onChange={(e) => handleColorChange('fill', e.target.value)}
                className="w-8 h-8 border border-gray-300 rounded cursor-pointer"
              />
              <input
                type="text"
                value={properties.fill}
                onChange={(e) => handleColorChange('fill', e.target.value)}
                className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                placeholder="#000000"
              />
            </div>
          </div>
        </div>

        {/* 전체 정렬 - 모든 객체에 적용 */}
        <div className="border-b pb-4">
          <h4 className="font-medium text-gray-700 mb-3">전체 정렬</h4>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => handleAlignment('centerHorizontal')}
              className="px-3 py-2 text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 rounded border border-blue-300"
            >
              가로 가운데
            </button>
            <button
              onClick={() => handleAlignment('centerVertical')}
              className="px-3 py-2 text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 rounded border border-blue-300"
            >
              세로 가운데
            </button>
          </div>
        </div>

        {/* 변형 */}
        <div>
          <h4 className="font-medium text-gray-700 mb-3">변형</h4>
          <div className="space-y-3">
            <div>
              <label className="block text-sm text-gray-600 mb-1">회전 (도)</label>
              <input
                type="number"
                value={Math.round(properties.angle)}
                onChange={(e) => handleNumberChange('angle', e.target.value)}
                min="-360"
                max="360"
                className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
              />
            </div>
            
            {/* 텍스트 객체가 아닌 경우에만 스케일 조절 표시 */}
            {!isTextObject && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">가로 비율</label>
                  <input
                    type="number"
                    value={properties.scaleX.toFixed(2)}
                    onChange={(e) => handleNumberChange('scaleX', e.target.value)}
                    min="0.1"
                    max="3"
                    step="0.1"
                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">세로 비율</label>
                  <input
                    type="number"
                    value={properties.scaleY.toFixed(2)}
                    onChange={(e) => handleNumberChange('scaleY', e.target.value)}
                    min="0.1"
                    max="3"
                    step="0.1"
                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                  />
                </div>
              </div>
            )}
            
            {/* 텍스트 객체의 경우 안내 메시지 */}
            {isTextObject && (
              <div className="p-3 bg-blue-50 rounded text-sm text-blue-700">
                <p className="font-medium">텍스트 크기 조절 안내</p>
                <p className="mt-1">
                  텍스트 객체는 폰트 크기로만 크기를 조절할 수 있습니다.
                  마우스로 텍스트를 드래그하여 크기를 조절하면 폰트 크기가 변경됩니다.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
