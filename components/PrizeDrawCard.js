import { useState } from 'react'
import PrizeDrawSettings from './PrizeDrawSettings'
import PrizeDrawExecution from './PrizeDrawExecution'

export default function PrizeDrawCard({ 
  prizeDraw, 
  onDelete, 
  onDuplicate, 
  onUpdate 
}) {
  const [activeTab, setActiveTab] = useState('settings')
  const [isExpanded, setIsExpanded] = useState(false)

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded)
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="border border-gray-200 rounded-lg bg-white shadow-sm">
      {/* 카드 헤더 */}
      <div 
        className="flex items-center justify-between p-3 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={toggleExpanded}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2 mb-1">
            <h4 className="text-sm font-semibold text-gray-900 truncate">
              {prizeDraw.title}
            </h4>
            <span className={`text-xs px-2 py-1 rounded-full ${
              prizeDraw.is_active 
                ? 'bg-green-100 text-green-700' 
                : 'bg-gray-100 text-gray-700'
            }`}>
              {prizeDraw.is_active ? '활성' : '비활성'}
            </span>
          </div>
          {prizeDraw.description && (
            <p className="text-xs text-gray-500 truncate">
              {prizeDraw.description}
            </p>
          )}
          <p className="text-xs text-gray-400 mt-1">
            생성: {formatDate(prizeDraw.created_at)}
          </p>
        </div>
        
        <div className="flex items-center space-x-1 ml-2">
          <button
            onClick={(e) => {
              e.stopPropagation()
              onDuplicate()
            }}
            className="text-gray-400 hover:text-blue-600 p-1"
            title="복사"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              if (confirm('이 경품추첨을 삭제하시겠습니까?')) {
                onDelete()
              }
            }}
            className="text-gray-400 hover:text-red-600 p-1"
            title="삭제"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
          <svg 
            className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {/* 확장된 내용 */}
      {isExpanded && (
        <div className="border-t border-gray-200">
          {/* 탭 네비게이션 */}
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => {
                // 새창으로 설정 열기
                       const settingsWindow = window.open(
                         `/prize-draw-settings/${prizeDraw.id}`,
                         `settings_${prizeDraw.id}`,
                         'width=1500,height=900,scrollbars=yes,resizable=yes,menubar=no,toolbar=no,location=no,status=no'
                       )
                
                // 새창이 닫힐 때 부모 창 새로고침
                const checkClosed = setInterval(() => {
                  if (settingsWindow.closed) {
                    clearInterval(checkClosed)
                    if (onUpdate) onUpdate()
                  }
                }, 1000)
              }}
              className="flex-1 px-4 py-2 text-sm font-medium transition-colors text-orange-600 hover:text-orange-700 hover:bg-orange-50"
            >
              ⚙️ 설정 (새창)
            </button>
            <button
              onClick={() => {
                // 새창으로 실행 열기
                       const executionWindow = window.open(
                         `/prize-draw-execution/${prizeDraw.id}`,
                         `execution_${prizeDraw.id}`,
                         'width=1500,height=1000,scrollbars=yes,resizable=yes,menubar=no,toolbar=no,location=no,status=no'
                       )
                
                // 새창이 닫힐 때 부모 창 새로고침
                const checkClosed = setInterval(() => {
                  if (executionWindow.closed) {
                    clearInterval(checkClosed)
                    if (onUpdate) onUpdate()
                  }
                }, 1000)
              }}
              className="flex-1 px-4 py-2 text-sm font-medium transition-colors text-orange-600 hover:text-orange-700 hover:bg-orange-50"
            >
              ▶️ 실행 (새창)
            </button>
          </div>

          {/* 안내 메시지 */}
          <div className="p-4 text-center text-gray-500 text-sm">
            <p>⚙️ 설정 또는 ▶️ 실행 버튼을 클릭하여 새창에서 작업하세요</p>
            <p className="text-xs mt-1">새창에서 작업 후 창을 닫으면 자동으로 목록이 새로고침됩니다</p>
          </div>
        </div>
      )}
    </div>
  )
}
