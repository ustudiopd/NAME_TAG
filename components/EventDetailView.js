'use client'

import { useState, useEffect, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { getProfilesByEvent } from '../lib/database'
import ProfileList from './ProfileList'
import PropertyPanel from './PropertyPanel'
import ProfileForm from './ProfileForm'
import ExcelUpload from './ExcelUpload'
import NamecardTemplateManager from './NamecardTemplateManager'
import NamecardTemplateSettings from './NamecardTemplateSettings'
import OutputPanel from './OutputPanel'
import PrizeDrawPanel from './PrizeDrawPanel'

// CanvasEditor를 dynamic import로 불러와서 SSR 완전 비활성화
const CanvasEditor = dynamic(() => import('./CanvasEditor_new'), { 
  ssr: false,
  loading: () => <div className="flex items-center justify-center h-96 bg-gray-50 rounded-lg">
    <div className="text-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
      <div className="text-sm text-gray-600">캔버스 로딩 중...</div>
    </div>
  </div>
})

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
  const [currentCanvasJson, setCurrentCanvasJson] = useState(null)
  const [canvasRef, setCanvasRef] = useState(null)
  const [canvasMethods, setCanvasMethods] = useState(null)
  const [profiles, setProfiles] = useState([])
  const [selectedProfiles, setSelectedProfiles] = useState(new Set())
  const [showTemplateSettings, setShowTemplateSettings] = useState(false)
  const [currentTemplate, setCurrentTemplate] = useState(null)
  const [isTemplateCollapsed, setIsTemplateCollapsed] = useState(true)
  const [isOutputCollapsed, setIsOutputCollapsed] = useState(true)
  const [isPrizeDrawCollapsed, setIsPrizeDrawCollapsed] = useState(true)
  const [selectionMode, setSelectionMode] = useState('individual') // 'individual' 또는 'batch'
  const [isClient, setIsClient] = useState(false) // 클라이언트 렌더링 상태

  // 선택모드 변경 핸들러
  const handleSelectionModeChange = (newMode) => {
    setSelectionMode(newMode)
    // 선택모드 변경 시 선택된 프로필들 초기화
    setSelectedProfiles(new Set())
    // 개별 선택 모드로 변경 시 선택된 프로필도 초기화
    if (newMode === 'individual') {
      onProfileSelect(null)
    }
  }

  const handleProfileAdded = () => {
    onEventChange()
    setShowProfileForm(false)
  }

  const handleExcelUploadComplete = () => {
    onEventChange()
    setShowExcelUpload(false)
  }

  // 클라이언트 렌더링 완료 확인
  useEffect(() => {
    setIsClient(true)
  }, [])


  const handleCanvasUpdate = (updateData) => {
    console.log('Canvas updated:', updateData)
    
    // 캔버스 업데이트 로직
    if (updateData && updateData.type === 'modification') {
      // 캔버스가 수정될 때마다 JSON 업데이트
      if (canvasRef && canvasRef.getCurrentCanvasJson) {
        const json = canvasRef.getCurrentCanvasJson()
        setCurrentCanvasJson(json)
      }
    } else if (updateData?.type === 'layerChanged') {
      // 레이어 순서 변경 시 선택된 객체 유지
      console.log('Layer changed:', updateData.object)
      setSelectedObject(updateData.object)
    }
  }

  // 선택된 프로필이 변경될 때는 CanvasEditor 내부에서 처리하므로 여기서는 제거
  // 중복 호출 방지를 위해 EventDetailView에서는 처리하지 않음

  const handleTemplateSelect = (template) => {
    console.log('EventDetailView handleTemplateSelect called:', template)
    console.log('CanvasRef:', canvasRef)
    
    if (canvasRef && canvasRef.loadTemplate) {
      console.log('Calling loadTemplate...')
      canvasRef.loadTemplate(template)
    } else {
      console.error('CanvasRef or loadTemplate not available, retrying in 100ms...')
      // 캔버스가 아직 준비되지 않았을 수 있으므로 잠시 후 재시도
      setTimeout(() => {
        if (canvasRef && canvasRef.loadTemplate) {
          console.log('Retry: Calling loadTemplate...')
          canvasRef.loadTemplate(template)
        } else {
          console.error('CanvasRef still not available after retry')
        }
      }, 100)
    }
  }

  const handleTemplateSave = (template) => {
    console.log('Template saved:', template)
    // 템플릿 저장 후 현재 캔버스 JSON 업데이트
    if (canvasRef && canvasRef.getCurrentCanvasJson) {
      const json = canvasRef.getCurrentCanvasJson()
      setCurrentCanvasJson(json)
    }
  }

  const handleCanvasRef = useCallback((canvasInstance) => {
    // canvasInstance가 유효한지 확인
    if (!canvasInstance) {
      console.log('EventDetailView: Invalid canvas instance received')
      return
    }
    
    // 이미 같은 인스턴스인지 확인하여 무한 루프 방지
    if (canvasRef && canvasRef.fabricCanvasRef === canvasInstance.fabricCanvasRef) {
      console.log('EventDetailView: Same canvas instance, skipping update')
      return
    }
    
    console.log('EventDetailView: Setting new canvas instance:', canvasInstance)
    console.log('Canvas methods available:', canvasInstance?.loadTemplate ? 'Yes' : 'No')
    setCanvasRef(canvasInstance)
    setCanvasMethods(canvasInstance)
  }, [canvasRef])

  // 현재 캔버스 JSON 가져오기
  const getCurrentCanvasJson = () => {
    if (canvasRef && canvasRef.getCurrentCanvasJson) {
      return canvasRef.getCurrentCanvasJson()
    }
    return null
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

      {/* 템플릿 관리 + 출력 패널 - 세로 배치 */}
      <div className="mb-4 space-y-4">
        {/* 템플릿 관리 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-4 border-b border-gray-200 bg-gray-50">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => setIsTemplateCollapsed(!isTemplateCollapsed)}
                  className="p-1 hover:bg-gray-200 rounded transition-colors"
                  title={isTemplateCollapsed ? '펼치기' : '접기'}
                >
                  <svg 
                    className={`w-4 h-4 text-gray-600 transition-transform ${isTemplateCollapsed ? 'rotate-180' : ''}`}
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">명찰 템플릿 관리</h3>
                  <p className="text-sm text-gray-600 mt-1">명찰 디자인을 저장하고 불러와서 사용하세요</p>
                </div>
              </div>
              <button
                onClick={() => setShowTemplateSettings(!showTemplateSettings)}
                className="px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600"
              >
                {showTemplateSettings ? '닫기' : '템플릿 설정'}
              </button>
            </div>
          </div>
          {!isTemplateCollapsed && (
            <div className="p-4">
              {showTemplateSettings ? (
                <NamecardTemplateSettings
                  onTemplateUpdate={setCurrentTemplate}
                  currentTemplate={currentTemplate}
                />
              ) : (
              <NamecardTemplateManager
                eventId={event.id}
                onTemplateSelect={handleTemplateSelect}
                onTemplateSave={handleTemplateSave}
                currentCanvasJson={getCurrentCanvasJson()}
              />
              )}
            </div>
          )}
        </div>

        {/* 출력 패널 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-4 border-b border-gray-200 bg-gray-50">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => setIsOutputCollapsed(!isOutputCollapsed)}
                  className="p-1 hover:bg-gray-200 rounded transition-colors"
                  title={isOutputCollapsed ? '펼치기' : '접기'}
                >
                  <svg 
                    className={`w-4 h-4 text-gray-600 transition-transform ${isOutputCollapsed ? 'rotate-180' : ''}`}
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">출력</h3>
                  <p className="text-sm text-gray-600 mt-1">명찰을 PDF나 이미지로 출력하세요</p>
                </div>
              </div>
            </div>
          </div>
          {!isOutputCollapsed && (
            <div className="p-4">
              <OutputPanel
                canvasRef={canvasRef?.fabricCanvasRef || canvasRef}
                selectedProfile={selectedProfile}
                profiles={profiles}
                selectedProfiles={Array.from(selectedProfiles)}
                updateCanvasWithProfile={canvasRef?.updateCanvasWithProfile}
                selectionMode={selectionMode}
                eventId={event.id}
              />
            </div>
          )}
        </div>

        {/* 경품추첨 섹션 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div 
            className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 transition-colors"
            onClick={() => setIsPrizeDrawCollapsed(!isPrizeDrawCollapsed)}
          >
            <div className="flex items-center space-x-3">
              <button className="text-gray-400 hover:text-gray-600 transition-colors">
                <svg 
                  className={`w-5 h-5 transition-transform ${isPrizeDrawCollapsed ? 'rotate-0' : 'rotate-180'}`}
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">경품추첨</h3>
                <p className="text-sm text-gray-600 mt-1">경품추첨을 설정하고 실행하세요</p>
              </div>
            </div>
          </div>
          {!isPrizeDrawCollapsed && (
            <div className="p-4">
              <PrizeDrawPanel eventId={event.id} />
            </div>
          )}
        </div>
      </div>

      {/* 3단 수평 레이아웃 - 명단(30% 축소), 캔버스(50% 확대), 속성(20% 유지) */}
      <div className="grid grid-cols-1 lg:grid-cols-10 gap-4 h-[calc(100vh-320px)]">
        {/* 왼쪽: 명단 목록 (30% 축소) */}
        <div className="lg:col-span-3">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 h-full">
            <ProfileList
              onProfileSelect={onProfileSelect}
              selectedProfileId={selectedProfile?.id}
              refreshTrigger={refreshTrigger}
              selectedEventId={event.id}
              onProfilesLoad={setProfiles}
              onSelectedProfilesChange={setSelectedProfiles}
              selectionMode={selectionMode}
              onSelectionModeChange={handleSelectionModeChange}
            />
          </div>
        </div>

        {/* 가운데: 캔버스 편집 (50% 확대) */}
        <div className="lg:col-span-5">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 h-full flex flex-col">
            <div className="p-4 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">명찰 편집</h3>
                  {selectedProfile ? (
                    <p className="text-sm text-gray-600 mt-1 truncate">
                      {selectedProfile.name} - {selectedProfile.company} - {selectedProfile.title}
                    </p>
                  ) : (
                    <p className="text-sm text-gray-500 mt-1">명단을 선택하세요</p>
                  )}
                </div>
                <button
                  onClick={async () => {
                    if (canvasRef && canvasRef.saveCurrentSettings) {
                      const result = await canvasRef.saveCurrentSettings()
                      if (result.success) {
                        alert('설정이 저장되었습니다.')
                      } else {
                        alert('설정 저장에 실패했습니다: ' + (result.error?.message || '알 수 없는 오류'))
                      }
                    } else {
                      alert('캔버스가 아직 준비되지 않았습니다.')
                    }
                  }}
                  className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors font-medium"
                  title="현재 텍스트 객체 설정 저장"
                >
                  설정 저장
                </button>
              </div>
            </div>
            <div className="flex-1 p-4 min-h-[600px]">
              {selectionMode === 'individual' ? (
                isClient ? (
                  <CanvasEditor
                    selectedProfile={selectedProfile}
                    onCanvasUpdate={handleCanvasUpdate}
                    selectedObject={selectedObject}
                    onPropertyChange={handlePropertyChange}
                    eventId={event.id}
                    onTemplateLoad={handleCanvasRef}
                    onCanvasRef={setCanvasRef}
                  />
                ) : (
                  <div className="flex items-center justify-center h-96 bg-gray-50 rounded-lg">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
                      <div className="text-sm text-gray-600">캔버스 로딩 중...</div>
                    </div>
                  </div>
                )
              ) : (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center text-gray-500">
                    <div className="text-4xl mb-4">👥</div>
                    <div className="text-lg font-medium mb-2">일괄 선택 모드</div>
                    <div className="text-sm">명단에서 출력할 사람들을 선택해주세요</div>
                    <div className="text-xs text-gray-400 mt-2">
                      선택된 사람들은 일괄 출력 패널에서 출력할 수 있습니다
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 오른쪽: 속성 패널 (20% 유지) */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 h-full">
            <div className="p-4 border-b border-gray-200 bg-gray-50">
              <h3 className="text-lg font-semibold text-gray-900">속성</h3>
              <p className="text-sm text-gray-600 mt-1">
                {selectedObject ? '객체 속성을 조절하세요' : '객체를 선택하세요'}
              </p>
            </div>
            <div className="p-4 h-[calc(100%-80px)] overflow-y-auto">
              <PropertyPanel 
                selectedObject={selectedObject} 
                onPropertyChange={handlePropertyChange}
                canvasRef={canvasRef?.fabricCanvasRef || canvasRef}
                canvasMethods={canvasMethods}
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
