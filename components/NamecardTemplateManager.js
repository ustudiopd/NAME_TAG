'use client'

import { useState, useEffect } from 'react'
import { 
  getNamecardTemplates, 
  getNamecardTemplateById,
  saveNamecardTemplate, 
  deleteNamecardTemplate,
  setDefaultTemplate,
  duplicateNamecardTemplate,
  testSupabaseConnection
} from '../lib/namecardDatabase'

export default function NamecardTemplateManager({ 
  eventId, 
  onTemplateSelect, 
  onTemplateSave,
  currentCanvasJson 
}) {
  const [templates, setTemplates] = useState([])
  const [loading, setLoading] = useState(true)
  const [showSaveForm, setShowSaveForm] = useState(false)
  const [templateName, setTemplateName] = useState('')
  const [saving, setSaving] = useState(false)
  const [showJsonModal, setShowJsonModal] = useState(false)
  const [selectedTemplateJson, setSelectedTemplateJson] = useState(null)

  useEffect(() => {
    if (eventId) {
      loadTemplates()
    }
  }, [eventId])

  const loadTemplates = async () => {
    try {
      setLoading(true)
      const { data, error } = await getNamecardTemplates(eventId)
      if (error) throw error
      setTemplates(data || [])
    } catch (err) {
      console.error('Error loading templates:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveTemplate = async () => {
    console.log('Saving template:', { templateName, currentCanvasJson, eventId })
    
    if (!templateName.trim()) {
      alert('템플릿 이름을 입력해주세요.')
      return
    }
    
    if (!currentCanvasJson) {
      alert('저장할 캔버스 데이터가 없습니다. 명찰을 편집한 후 다시 시도해주세요.')
      return
    }

    try {
      setSaving(true)
      
      // 먼저 Supabase 연결 테스트
      const connectionTest = await testSupabaseConnection()
      if (!connectionTest.success) {
        throw new Error(`데이터베이스 연결 실패: ${connectionTest.error?.message}`)
      }
      
      const { data, error } = await saveNamecardTemplate(eventId, templateName.trim(), currentCanvasJson)
      if (error) throw error
      
      console.log('Template saved successfully:', data)
      setTemplates(prev => [data, ...prev])
      setTemplateName('')
      setShowSaveForm(false)
      
      if (onTemplateSave) {
        onTemplateSave(data)
      }
      
      alert('템플릿이 성공적으로 저장되었습니다.')
    } catch (err) {
      console.error('Error saving template:', err)
      alert(`템플릿 저장 중 오류가 발생했습니다: ${err.message}`)
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteTemplate = async (templateId) => {
    if (!confirm('이 템플릿을 삭제하시겠습니까?')) return

    try {
      const { error } = await deleteNamecardTemplate(templateId)
      if (error) throw error
      
      setTemplates(prev => prev.filter(t => t.id !== templateId))
    } catch (err) {
      console.error('Error deleting template:', err)
      alert('템플릿 삭제 중 오류가 발생했습니다.')
    }
  }

  const handleSetDefault = async (templateId) => {
    try {
      const { error } = await setDefaultTemplate(eventId, templateId)
      if (error) throw error
      
      setTemplates(prev => 
        prev.map(t => ({ ...t, is_default: t.id === templateId }))
      )
    } catch (err) {
      console.error('Error setting default template:', err)
      alert('기본 템플릿 설정 중 오류가 발생했습니다.')
    }
  }

  const handleDuplicateTemplate = async (template) => {
    const newName = `${template.template_name} (복사본)`
    try {
      const { data, error } = await duplicateNamecardTemplate(template.id, newName)
      if (error) throw error
      
      setTemplates(prev => [data, ...prev])
    } catch (err) {
      console.error('Error duplicating template:', err)
      alert('템플릿 복사 중 오류가 발생했습니다.')
    }
  }

  const handleLoadTemplate = async (templateId) => {
    try {
      setLoading(true)
      const { data, error } = await getNamecardTemplateById(templateId)
      if (error) throw error
      
      console.log('Loading template:', data)
      
      if (onTemplateSelect) {
        onTemplateSelect(data)
      }
      
      alert('템플릿이 불러와졌습니다.')
    } catch (err) {
      console.error('Error loading template:', err)
      alert(`템플릿 불러오기 중 오류가 발생했습니다: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleShowJson = (template) => {
    setSelectedTemplateJson(template.canvas_json)
    setShowJsonModal(true)
  }

  const handleTemplateSelect = (template) => {
    if (onTemplateSelect) {
      onTemplateSelect(template)
    }
  }

  if (loading) {
    return (
      <div className="p-4 text-center">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
        <p className="text-sm text-gray-500 mt-2">템플릿을 불러오는 중...</p>
      </div>
    )
  }

  return (
    <div className="w-full">
      {/* 헤더 - 상단 배치용으로 수정 */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h4 className="text-sm font-semibold text-gray-900">저장된 템플릿</h4>
          <p className="text-xs text-gray-500 mt-1">
            {templates.length}개의 템플릿이 저장되어 있습니다
          </p>
        </div>
        <button
          onClick={() => setShowSaveForm(true)}
          className={`px-3 py-2 rounded-md transition-colors text-sm font-medium ${
            currentCanvasJson 
              ? 'bg-blue-600 text-white hover:bg-blue-700' 
              : 'bg-gray-400 text-gray-200 cursor-not-allowed'
          }`}
          disabled={!currentCanvasJson}
          title={currentCanvasJson ? '현재 디자인을 템플릿으로 저장' : '명찰을 편집한 후 저장 가능'}
        >
          {currentCanvasJson ? '현재 디자인 저장' : '저장 불가 (편집 필요)'}
        </button>
      </div>

      {/* 저장 폼 */}
      {showSaveForm && (
        <div className="p-3 border-b border-gray-200 bg-white">
          <div className="space-y-2">
            <input
              type="text"
              placeholder="템플릿 이름을 입력하세요"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
              maxLength={50}
            />
            <div className="flex space-x-1">
              <button
                onClick={handleSaveTemplate}
                disabled={!templateName.trim() || saving}
                className="flex-1 bg-green-600 text-white text-xs px-2 py-1 rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? '저장 중...' : '저장'}
              </button>
              <button
                onClick={() => setShowSaveForm(false)}
                className="flex-1 bg-gray-500 text-white text-xs px-2 py-1 rounded hover:bg-gray-600"
              >
                취소
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 템플릿 목록 - 절반 크기에 맞게 조정 */}
      <div className="max-h-40 overflow-y-auto">
        {templates.length === 0 ? (
          <div className="text-center py-6">
            <div className="text-gray-400 text-3xl mb-2">📄</div>
            <p className="text-sm text-gray-500">저장된 템플릿이 없습니다</p>
            <p className="text-xs text-gray-400 mt-1">명찰을 편집한 후 저장해보세요</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {templates.map((template) => (
              <div
                key={template.id}
                className={`p-2 rounded border cursor-pointer transition-colors ${
                  template.is_default
                    ? 'bg-blue-50 border-blue-200'
                    : 'bg-white border-gray-200 hover:bg-gray-50'
                }`}
                onClick={() => handleTemplateSelect(template)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-1 mb-1">
                      <h4 className="text-xs font-medium text-gray-900 truncate">
                        {template.template_name}
                      </h4>
                      {template.is_default && (
                        <span className="text-xs bg-blue-100 text-blue-700 px-1 py-0.5 rounded-full">
                          기본
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500">
                      {new Date(template.created_at).toLocaleDateString('ko-KR')}
                    </p>
                  </div>
                  <div className="flex items-center space-x-1 ml-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleLoadTemplate(template.id)
                      }}
                      className="text-blue-500 hover:text-blue-700 p-1"
                      title="불러오기"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                      </svg>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDuplicateTemplate(template)
                      }}
                      className="text-gray-400 hover:text-gray-600 p-1"
                      title="복사"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleShowJson(template)
                      }}
                      className="text-purple-500 hover:text-purple-700 p-1"
                      title="JSON 보기"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </button>
                    {!template.is_default && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleSetDefault(template.id)
                        }}
                        className="text-gray-400 hover:text-blue-600 p-1"
                        title="기본으로 설정"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </button>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDeleteTemplate(template.id)
                      }}
                      className="text-gray-400 hover:text-red-600 p-1"
                      title="삭제"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* JSON 보기 모달 */}
      {showJsonModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[80vh] flex flex-col">
            <div className="p-4 border-b border-gray-200 bg-gray-50">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-900">템플릿 JSON 데이터</h3>
                <button
                  onClick={() => setShowJsonModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="p-4 flex-1 overflow-auto">
              <pre className="bg-gray-100 p-4 rounded-lg text-sm overflow-auto max-h-96">
                {JSON.stringify(selectedTemplateJson, null, 2)}
              </pre>
            </div>
            <div className="p-4 border-t border-gray-200 bg-gray-50">
              <div className="flex justify-end space-x-2">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(JSON.stringify(selectedTemplateJson, null, 2))
                    alert('JSON이 클립보드에 복사되었습니다.')
                  }}
                  className="px-4 py-2 bg-blue-500 text-white text-sm rounded hover:bg-blue-600"
                >
                  클립보드에 복사
                </button>
                <button
                  onClick={() => setShowJsonModal(false)}
                  className="px-4 py-2 bg-gray-500 text-white text-sm rounded hover:bg-gray-600"
                >
                  닫기
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
