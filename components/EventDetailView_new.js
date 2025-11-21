/**
 * EventDetailView (새 버전)
 * useNamecardEditor 훅을 사용하여 새 아키텍처로 통합
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import { useNamecardEditor } from '../hooks/useNamecardEditor'
import { getProfilesByEvent } from '../lib/database'
import ProfileList from './ProfileList'
import PropertyPanel from './PropertyPanel_new'
import CanvasViewport from './CanvasViewport'
import ProfileForm from './ProfileForm'
import ExcelUpload from './ExcelUpload'
import NamecardTemplateManager from './NamecardTemplateManager'
import NamecardTemplateSettings from './NamecardTemplateSettings'
import OutputPanel from './OutputPanel'
import PrizeDrawPanel from './PrizeDrawPanel'
import ImageUploadLibrary from './ImageUploadLibrary'

export default function EventDetailView({ 
  event, 
  selectedProfile, 
  onProfileSelect, 
  onEventChange, 
  refreshTrigger 
}) {
  // 새 에디터 훅 사용
  const editor = useNamecardEditor(event?.id, {
    paperWidthCm: 9.0,
    paperHeightCm: 12.5,
    showGuidelines: true
  })

  const [showProfileForm, setShowProfileForm] = useState(false)
  const [showExcelUpload, setShowExcelUpload] = useState(false)
  const [profiles, setProfiles] = useState([])
  const [selectedProfiles, setSelectedProfiles] = useState(new Set())
  const [showTemplateSettings, setShowTemplateSettings] = useState(false)
  const [currentTemplate, setCurrentTemplate] = useState(null)
  const [isTemplateCollapsed, setIsTemplateCollapsed] = useState(true)
  const [isOutputCollapsed, setIsOutputCollapsed] = useState(true)
  const [isPrizeDrawCollapsed, setIsPrizeDrawCollapsed] = useState(true)
  const [showBackgroundImageModal, setShowBackgroundImageModal] = useState(false) // 배경 이미지 모달 상태
  const [selectionMode, setSelectionMode] = useState('individual')
  const [isClient, setIsClient] = useState(false)

  // 프로필이 로드되고 선택된 프로필이 없으면 첫 번째 프로필 자동 선택
  useEffect(() => {
    if (profiles.length > 0 && !selectedProfile && onProfileSelect) {
      console.log('🔹 첫 번째 프로필 자동 선택:', profiles[0].name)
      onProfileSelect(profiles[0])
    }
  }, [profiles, selectedProfile, onProfileSelect])

  // 선택된 프로필이 변경될 때 에디터에 바인딩
  useEffect(() => {
    if (editor?.commands && selectedProfile) {
      editor.commands.bindProfile(selectedProfile)
    }
  }, [selectedProfile?.id, editor?.commands])

  // 클라이언트 렌더링 완료 확인
  useEffect(() => {
    setIsClient(true)
  }, [])

  // 선택모드 변경 핸들러
  const handleSelectionModeChange = (newMode) => {
    setSelectionMode(newMode)
    setSelectedProfiles(new Set())
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

  // 템플릿 선택 핸들러
  const handleTemplateSelect = useCallback(async (template) => {
    if (editor?.commands && template) {
      console.log('Loading template:', template.template_name || template.templateName)
      // 템플릿을 캔버스에 로드
      await editor.commands.loadTemplate(template)
      
      // 템플릿 로드 후 프로필 텍스트가 비어있을 수 있으므로
      // 현재 선택된 프로필이 있다면 다시 바인딩
      if (selectedProfile) {
        editor.commands.bindProfile(selectedProfile)
      }
    }
  }, [editor?.commands, selectedProfile])

  // 템플릿 저장 핸들러
  const handleTemplateSave = async (templateData) => {
    console.log('Template saved:', templateData)
    // NamecardTemplateManager에서 이미 저장 처리하므로 여기서는 알림만
    if (templateData) {
      setCurrentTemplate(templateData)
    }
  }

  // 현재 캔버스 JSON 가져오기
  const getCurrentCanvasJson = () => {
    if (editor?.commands?.getCanvasJSON) {
      return editor.commands.getCanvasJSON()
    }
    if (editor?.commands?.exportJson) {
      return editor.commands.exportJson()
    }
    return null
  }

  // 배경 이미지 선택 핸들러
  const handleBackgroundImageSelect = (imageData) => {
    if (editor?.commands && imageData?.url) {
      console.log('Setting background image:', imageData.url)
      editor.commands.setBackgroundImage(imageData.url)
      setShowBackgroundImageModal(false)
    }
  }

  const handleBackgroundImage = useCallback(() => {
    console.log('Background image button clicked, opening modal')
    setShowBackgroundImageModal(true)
  }, [])

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

      {/* 템플릿 관리 + 출력 패널 */}
      <div className="mb-4 space-y-4">
        {/* 템플릿 관리 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-4 border-b border-gray-200 bg-gray-50">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => setIsTemplateCollapsed(!isTemplateCollapsed)}
                  className="p-1 hover:bg-gray-200 rounded transition-colors"
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
                  getCurrentCanvasJson={getCurrentCanvasJson}
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
                canvasRef={editor?.state?.canvasReady ? editor?.commands?.getCanvas() : null}
                selectedProfile={selectedProfile}
                profiles={profiles}
                selectedProfiles={Array.from(selectedProfiles)}
                updateCanvasWithProfile={editor?.commands?.bindProfile}
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

      {/* 3단 수평 레이아웃 */}
      <div className="grid grid-cols-1 lg:grid-cols-10 gap-4 h-[calc(100vh-320px)]">
        {/* 왼쪽: 명단 목록 */}
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

        {/* 가운데: 캔버스 편집 */}
        <div className="lg:col-span-5">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 h-full flex flex-col">
            <div className="p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">명찰 편집</h3>
              {selectedProfile ? (
                <p className="text-sm text-gray-600 mt-1 truncate">
                  {selectedProfile.name} - {selectedProfile.company} - {selectedProfile.title}
                </p>
              ) : (
                <p className="text-sm text-gray-500 mt-1">명단을 선택하세요</p>
              )}
            </div>
            <div className="flex-1 p-4 min-h-[600px]">
              {selectionMode === 'individual' ? (
                isClient && editor ? (
                  <CanvasViewport 
                    editor={editor}
                    onBackgroundImage={handleBackgroundImage}
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
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 오른쪽: 속성 패널 */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 h-full">
            <div className="p-4 border-b border-gray-200 bg-gray-50">
              <h3 className="text-lg font-semibold text-gray-900">속성</h3>
              <p className="text-sm text-gray-600 mt-1">
                {editor?.state?.selectedObjectProps ? '객체 속성을 조절하세요' : '객체를 선택하세요'}
              </p>
            </div>
            <div className="p-4 h-[calc(100%-80px)] overflow-y-auto">
              <PropertyPanel 
                selectedObjectProps={editor?.state?.selectedObjectProps}
                onChange={editor?.commands?.updateSelectedObject}
                onAlign={editor?.commands?.alignSelected}
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

      {/* 배경 이미지 선택 모달 */}
      {showBackgroundImageModal && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]"
          onClick={(e) => {
            // 모달 배경 클릭 시 닫기
            if (e.target === e.currentTarget) {
              setShowBackgroundImageModal(false)
            }
          }}
        >
          <div 
            className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">배경 이미지 선택</h3>
              <button
                onClick={() => {
                  console.log('Closing background image modal')
                  setShowBackgroundImageModal(false)
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-4">
              <ImageUploadLibrary
                onImageSelect={handleBackgroundImageSelect}
                type="background"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

