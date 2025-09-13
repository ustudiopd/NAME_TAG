'use client'

import { useState, useEffect } from 'react'
import { getProfilesByEvent } from '../lib/database'
import ProfileList from './ProfileList'
import CanvasEditor from './CanvasEditor'
import PropertyPanel from './PropertyPanel'
import ProfileForm from './ProfileForm'
import ExcelUpload from './ExcelUpload'

export default function EventDetailView({ 
  event, 
  selectedProfile, 
  onProfileSelect, 
  onEventChange, 
  refreshTrigger 
}) {
  const [showProfileForm, setShowProfileForm] = useState(false)
  const [showExcelUpload, setShowExcelUpload] = useState(false)
  const [selectedObject, setSelectedObject] = useState(null)

  const handleProfileAdded = () => {
    onEventChange()
    setShowProfileForm(false)
  }

  const handleExcelUploadComplete = () => {
    onEventChange()
    setShowExcelUpload(false)
  }


  const handleCanvasUpdate = () => {
    // 캔버스 업데이트 로직
  }

  const handlePropertyChange = (property, value) => {
    if (property === 'selectedObject') {
      setSelectedObject(value)
    } else if (selectedObject) {
      selectedObject.set(property, value)
      selectedObject.canvas?.renderAll()
    }
  }

  return (
    <div className="h-full">
      {/* 상단 액션 바 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">{event.event_name}</h2>
            <p className="text-sm text-gray-600">
              {new Date(event.event_date).toLocaleDateString('ko-KR', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                weekday: 'long'
              })}
            </p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={() => setShowProfileForm(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors text-sm font-medium"
            >
              명단 추가
            </button>
            <button
              onClick={() => setShowExcelUpload(true)}
              className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors text-sm font-medium"
            >
              엑셀 업로드
            </button>
          </div>
        </div>
      </div>

      {/* 3단 레이아웃 */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-200px)]">
        {/* 왼쪽: 명단 목록 */}
        <div className="lg:col-span-3">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 h-full">
            <ProfileList
              onProfileSelect={onProfileSelect}
              selectedProfileId={selectedProfile?.id}
              refreshTrigger={refreshTrigger}
              selectedEventId={event.id}
            />
          </div>
        </div>

        {/* 가운데: 캔버스 편집 */}
        <div className="lg:col-span-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 h-full flex flex-col">
            <div className="p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">명찰 편집</h3>
              {selectedProfile ? (
                <p className="text-sm text-gray-600 mt-1">
                  {selectedProfile.name} - {selectedProfile.company} - {selectedProfile.title}
                </p>
              ) : (
                <p className="text-sm text-gray-500 mt-1">명단을 선택하여 편집을 시작하세요</p>
              )}
            </div>
            <div className="flex-1 p-4">
              {selectedProfile ? (
                <CanvasEditor
                  selectedProfile={selectedProfile}
                  onCanvasUpdate={handleCanvasUpdate}
                  selectedObject={selectedObject}
                  onPropertyChange={handlePropertyChange}
                />
              ) : (
                <div className="h-full flex items-center justify-center text-center">
                  <div>
                    <div className="text-gray-400 text-6xl mb-4">🎨</div>
                    <h4 className="text-lg font-medium text-gray-900 mb-2">명단을 선택하세요</h4>
                    <p className="text-gray-500">좌측에서 명단을 클릭하여 명찰 편집을 시작하세요</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 오른쪽: 속성 패널 */}
        <div className="lg:col-span-3">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 h-full flex flex-col">
            <div className="p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">속성</h3>
              <p className="text-sm text-gray-600 mt-1">
                {selectedObject ? '선택된 객체의 속성을 조절하세요' : '객체를 선택하세요'}
              </p>
            </div>
            <div className="flex-1 overflow-y-auto">
              <PropertyPanel 
                selectedObject={selectedObject} 
                onPropertyChange={handlePropertyChange} 
              />
            </div>
          </div>
        </div>
      </div>

      {/* 모달들 */}
      {showProfileForm && (
        <ProfileForm
          onProfileAdded={handleProfileAdded}
          onClose={() => setShowProfileForm(false)}
          eventId={event.id}
        />
      )}

      {showExcelUpload && (
        <ExcelUpload
          onUploadComplete={handleExcelUploadComplete}
          onClose={() => setShowExcelUpload(false)}
          eventId={event.id}
        />
      )}

    </div>
  )
}
