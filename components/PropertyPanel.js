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
      setProperties(selectedObject)
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

  // 숫자 입력 핸들러
  const handleNumberChange = (property, value) => {
    const numValue = parseFloat(value) || 0
    handlePropertyChange(property, numValue)
  }

  // 색상 입력 핸들러
  const handleColorChange = (property, value) => {
    handlePropertyChange(property, value)
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
          <p className="text-sm mt-2">캔버스에서 텍스트를 클릭하면</p>
          <p className="text-sm">속성을 편집할 수 있습니다</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4">
      <h3 className="text-lg font-semibold mb-4">속성 패널</h3>
      
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

        {/* 크기 */}
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

        {/* 폰트 */}
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
              <label className="block text-sm text-gray-600 mb-1">폰트 크기</label>
              <input
                type="number"
                value={properties.fontSize}
                onChange={(e) => handleNumberChange('fontSize', e.target.value)}
                min="8"
                max="72"
                className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
              />
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

        {/* 색상 */}
        <div className="border-b pb-4">
          <h4 className="font-medium text-gray-700 mb-3">색상</h4>
          <div>
            <label className="block text-sm text-gray-600 mb-1">텍스트 색상</label>
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
          </div>
        </div>
      </div>
    </div>
  )
}
