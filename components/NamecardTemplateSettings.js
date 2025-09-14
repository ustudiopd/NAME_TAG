'use client'

import { useState, useRef } from 'react'
import { fabric } from 'fabric'

export default function NamecardTemplateSettings({ 
  onTemplateUpdate, 
  currentTemplate = null 
}) {
  const [template, setTemplate] = useState({
    name: '',
    width: 9.0, // cm (정확한 명찰 크기)
    height: 12.5, // cm
    backgroundImage: null,
    printAreas: [], // 인쇄 가능 영역들
    elements: [] // 텍스트, 이미지, QR코드 등 요소들
  })
  
  const [isEditing, setIsEditing] = useState(false)
  const [selectedArea, setSelectedArea] = useState(null)
  const fileInputRef = useRef(null)

  // 배경 이미지 업로드
  const handleBackgroundImageUpload = (event) => {
    const file = event.target.files[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      const imageData = e.target.result
      setTemplate(prev => ({
        ...prev,
        backgroundImage: {
          url: imageData,
          name: file.name,
          type: 'background' // 가이드용, 인쇄 제외
        }
      }))
    }
    reader.readAsDataURL(file)
  }

  // 용지 크기 변경
  const handleSizeChange = (field, value) => {
    const newValue = parseFloat(value)
    if (newValue > 0) {
      setTemplate(prev => ({
        ...prev,
        [field]: newValue
      }))
    }
  }

  // 인쇄 영역 추가
  const addPrintArea = () => {
    const newArea = {
      id: Date.now(),
      name: `영역 ${template.printAreas.length + 1}`,
      x: 0,
      y: 0,
      width: 50, // mm
      height: 20, // mm
      type: 'text' // text, image, qr
    }
    
    setTemplate(prev => ({
      ...prev,
      printAreas: [...prev.printAreas, newArea]
    }))
  }

  // 인쇄 영역 삭제
  const removePrintArea = (areaId) => {
    setTemplate(prev => ({
      ...prev,
      printAreas: prev.printAreas.filter(area => area.id !== areaId)
    }))
  }

  // 인쇄 영역 속성 변경
  const updatePrintArea = (areaId, field, value) => {
    setTemplate(prev => ({
      ...prev,
      printAreas: prev.printAreas.map(area => 
        area.id === areaId 
          ? { ...area, [field]: parseFloat(value) || 0 }
          : area
      )
    }))
  }

  // 템플릿 저장
  const saveTemplate = () => {
    if (onTemplateUpdate) {
      onTemplateUpdate(template)
    }
    setIsEditing(false)
  }

  // 템플릿 불러오기
  const loadTemplate = (loadedTemplate) => {
    setTemplate(loadedTemplate)
    setIsEditing(false)
  }

  return (
    <div className="space-y-4">
      {/* 템플릿 이름 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          템플릿 이름
        </label>
        <input
          type="text"
          value={template.name}
          onChange={(e) => setTemplate(prev => ({ ...prev, name: e.target.value }))}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="명찰 템플릿 이름을 입력하세요"
        />
      </div>

      {/* 용지 크기 설정 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          명찰 용지 크기 (cm)
        </label>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs text-gray-500 mb-1">너비</label>
            <input
              type="number"
              step="0.1"
              value={template.width}
              onChange={(e) => handleSizeChange('width', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">높이</label>
            <input
              type="number"
              step="0.1"
              value={template.height}
              onChange={(e) => handleSizeChange('height', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* 배경 이미지 업로드 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          배경 이미지 (가이드용)
        </label>
        <div className="space-y-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleBackgroundImageUpload}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {template.backgroundImage ? '배경 이미지 변경' : '배경 이미지 업로드'}
          </button>
          {template.backgroundImage && (
            <div className="text-xs text-gray-500">
              업로드됨: {template.backgroundImage.name} (인쇄 시 제외)
            </div>
          )}
        </div>
      </div>

      {/* 인쇄 영역 관리 */}
      <div>
        <div className="flex justify-between items-center mb-2">
          <label className="block text-sm font-medium text-gray-700">
            인쇄 영역 설정
          </label>
          <button
            onClick={addPrintArea}
            className="px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600"
          >
            영역 추가
          </button>
        </div>
        
        <div className="space-y-2 max-h-40 overflow-y-auto">
          {template.printAreas.map((area) => (
            <div key={area.id} className="p-3 border border-gray-200 rounded-md bg-gray-50">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium">{area.name}</span>
                <button
                  onClick={() => removePrintArea(area.id)}
                  className="text-red-500 hover:text-red-700 text-sm"
                >
                  삭제
                </button>
              </div>
              
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <label className="block text-gray-500 mb-1">X (mm)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={area.x}
                    onChange={(e) => updatePrintArea(area.id, 'x', e.target.value)}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                  />
                </div>
                <div>
                  <label className="block text-gray-500 mb-1">Y (mm)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={area.y}
                    onChange={(e) => updatePrintArea(area.id, 'y', e.target.value)}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                  />
                </div>
                <div>
                  <label className="block text-gray-500 mb-1">너비 (mm)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={area.width}
                    onChange={(e) => updatePrintArea(area.id, 'width', e.target.value)}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                  />
                </div>
                <div>
                  <label className="block text-gray-500 mb-1">높이 (mm)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={area.height}
                    onChange={(e) => updatePrintArea(area.id, 'height', e.target.value)}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                  />
                </div>
              </div>
              
              <div className="mt-2">
                <label className="block text-gray-500 mb-1 text-xs">타입</label>
                <select
                  value={area.type}
                  onChange={(e) => updatePrintArea(area.id, 'type', e.target.value)}
                  className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                >
                  <option value="text">텍스트</option>
                  <option value="image">이미지</option>
                  <option value="qr">QR코드</option>
                </select>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 액션 버튼 */}
      <div className="flex space-x-2">
        <button
          onClick={saveTemplate}
          className="flex-1 px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500"
        >
          템플릿 저장
        </button>
        <button
          onClick={() => setIsEditing(!isEditing)}
          className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500"
        >
          {isEditing ? '취소' : '편집'}
        </button>
      </div>

      {/* 미리보기 영역 */}
      {template.backgroundImage && (
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            미리보기
          </label>
          <div 
            className="border-2 border-gray-300 rounded-md p-4 bg-white"
            style={{
              width: `${template.width * 10}px`, // 1cm = 10px (대략적)
              height: `${template.height * 10}px`,
              position: 'relative'
            }}
          >
            <img
              src={template.backgroundImage.url}
              alt="배경 이미지"
              className="w-full h-full object-contain"
            />
            {/* 인쇄 영역 표시 */}
            {template.printAreas.map((area) => (
              <div
                key={area.id}
                className="absolute border-2 border-blue-500 bg-blue-100 bg-opacity-50"
                style={{
                  left: `${(area.x / template.width) * 100}%`,
                  top: `${(area.y / template.height) * 100}%`,
                  width: `${(area.width / template.width) * 100}%`,
                  height: `${(area.height / template.height) * 100}%`,
                }}
              >
                <div className="text-xs text-blue-700 p-1">
                  {area.name} ({area.type})
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
