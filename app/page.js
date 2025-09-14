'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { getAllEventsWithStats, updateEvent, deleteEvent } from '../lib/eventDatabase'
import EventCard from '../components/EventCard'
import EventForm from '../components/EventForm'
import { initializePrefetch } from '../lib/prefetch'
import { performanceMonitor, enablePerformanceMonitoring } from '../lib/performanceMonitor'

export default function Home() {
  const [events, setEvents] = useState([])
  const [showEventForm, setShowEventForm] = useState(false)
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [editingEvent, setEditingEvent] = useState(null) // 편집 중인 행사 ID
  const [editValue, setEditValue] = useState('') // 편집 중인 값
  const [showPasswordModal, setShowPasswordModal] = useState(false) // 암호 입력 모달 표시
  const [passwordValue, setPasswordValue] = useState('') // 입력된 암호
  const [pendingDeleteEvent, setPendingDeleteEvent] = useState(null) // 삭제 대기 중인 행사

  // 행사 목록 로드 (최적화된 쿼리 사용)
  useEffect(() => {
    // 성능 모니터링 시작
    performanceMonitor.startPageLoad()
    
    loadEvents()
    // 프리페칭 시스템 초기화
    initializePrefetch()
    // 성능 모니터링 활성화
    enablePerformanceMonitoring()
  }, [])

  const loadEvents = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      const startTime = performance.now()
      const { data, error } = await getAllEventsWithStats()
      const loadTime = performance.now() - startTime
      
      console.log(`행사 목록 로딩 시간: ${loadTime.toFixed(2)}ms`)
      
      if (error) throw error
      setEvents(data || [])
      
      // 페이지 로드 완료
      performanceMonitor.endPageLoad()
    } catch (error) {
      console.error('Error loading events:', error)
      setError('행사 목록을 불러오는 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }, [])

  const handleEventAdded = useCallback((newEvent) => {
    setEvents(prev => [newEvent, ...prev])
    setShowEventForm(false)
  }, [])

  // 행사 이름 편집 시작
  const handleEditStart = (eventId, currentName) => {
    setEditingEvent(eventId)
    setEditValue(currentName || '')
  }

  // 행사 이름 편집 취소
  const handleEditCancel = () => {
    setEditingEvent(null)
    setEditValue('')
  }

  // 행사 이름 편집 저장
  const handleEditSave = async (eventId, newName) => {
    try {
      console.log('행사 이름 업데이트 시작:', { eventId, newName })
      
      const { error } = await updateEvent(eventId, { event_name: newName })
      
      if (error) {
        console.error('행사 이름 업데이트 실패:', error)
        alert('행사 이름 업데이트에 실패했습니다.')
        return
      }

      // 로컬 상태 업데이트
      setEvents(prev => prev.map(event => 
        event.id === eventId 
          ? { ...event, event_name: newName }
          : event
      ))

      console.log('행사 이름 업데이트 완료')
      handleEditCancel()
      
    } catch (err) {
      console.error('행사 이름 업데이트 오류:', err)
      alert('행사 이름 업데이트 중 오류가 발생했습니다.')
    }
  }

  // 행사 삭제 요청 (암호 확인)
  const handleDeleteEvent = (eventId, eventName) => {
    setPendingDeleteEvent({ id: eventId, name: eventName })
    setShowPasswordModal(true)
    setPasswordValue('')
  }

  // 암호 확인 후 실제 삭제 실행
  const handlePasswordConfirm = async () => {
    const ADMIN_PASSWORD = '823300'
    
    if (passwordValue !== ADMIN_PASSWORD) {
      alert('암호가 올바르지 않습니다.')
      setPasswordValue('')
      return
    }

    if (!pendingDeleteEvent) return

    try {
      console.log('행사 삭제 시작:', pendingDeleteEvent.id)
      
      const { error } = await deleteEvent(pendingDeleteEvent.id)
      
      if (error) {
        console.error('행사 삭제 실패:', error)
        alert('행사 삭제에 실패했습니다.')
        return
      }

      // 로컬 상태에서 제거
      setEvents(prev => prev.filter(event => event.id !== pendingDeleteEvent.id))
      
      console.log('행사 삭제 완료')
      alert('행사가 삭제되었습니다.')
      
    } catch (err) {
      console.error('행사 삭제 오류:', err)
      alert('행사 삭제 중 오류가 발생했습니다.')
    } finally {
      // 모달 닫기
      setShowPasswordModal(false)
      setPendingDeleteEvent(null)
      setPasswordValue('')
    }
  }

  // 암호 입력 모달 닫기
  const handlePasswordCancel = () => {
    setShowPasswordModal(false)
    setPendingDeleteEvent(null)
    setPasswordValue('')
  }

  const handleRefresh = useCallback(() => {
    setRefreshTrigger(prev => prev + 1)
    performanceMonitor.incrementUserInteractions()
    loadEvents()
  }, [loadEvents])

  // 메모이제이션된 이벤트 목록
  const memoizedEvents = useMemo(() => events, [events])

  // 로딩 상태 UI
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <h1 className="text-xl font-semibold text-gray-900">명찰 제작 시스템</h1>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">행사 목록</h2>
              <p className="text-gray-600 mt-1">명찰을 제작할 행사를 선택하세요</p>
            </div>
            <div className="animate-pulse bg-gray-200 h-10 w-24 rounded"></div>
          </div>

          {/* 스켈레톤 UI */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, index) => (
              <div key={index} className="bg-white rounded-lg shadow-md border border-gray-200 p-6 animate-pulse">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="h-5 bg-gray-200 rounded w-3/4 mb-2"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/2 mb-3"></div>
                    <div className="h-3 bg-gray-200 rounded w-full"></div>
                  </div>
                  <div className="ml-3 h-6 bg-gray-200 rounded-full w-16"></div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="h-4 bg-gray-200 rounded w-20"></div>
                  <div className="h-5 bg-gray-200 rounded w-5"></div>
                </div>
              </div>
            ))}
          </div>
        </main>
      </div>
    )
  }

  // 에러 상태 UI
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">오류가 발생했습니다</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={handleRefresh}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
          >
            다시 시도
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <h1 className="text-xl font-semibold text-gray-900">명찰 제작 시스템</h1>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div>
          <div className="flex justify-between items-center mb-8">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">행사 목록</h2>
              <p className="text-gray-600 mt-1">명찰을 제작할 행사를 선택하세요</p>
            </div>
            <button
              onClick={() => setShowEventForm(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
            >
              행사 추가
            </button>
          </div>

          {memoizedEvents.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-400 text-6xl mb-4">📅</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">등록된 행사가 없습니다</h3>
              <p className="text-gray-600 mb-4">새로운 행사를 추가하여 명찰을 제작해보세요</p>
              <button
                onClick={() => setShowEventForm(true)}
                className="bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 transition-colors"
              >
                첫 번째 행사 추가하기
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {memoizedEvents.map((event) => (
                <EventCard
                  key={event.id}
                  event={event}
                  editingEvent={editingEvent}
                  editValue={editValue}
                  onEditStart={handleEditStart}
                  onEditCancel={handleEditCancel}
                  onEditSave={handleEditSave}
                  onDeleteEvent={handleDeleteEvent}
                  setEditValue={setEditValue}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      {/* 모달들 */}
      {showEventForm && (
        <EventForm
          onEventAdded={handleEventAdded}
          onClose={() => setShowEventForm(false)}
        />
      )}

      {/* 암호 입력 모달 */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-96 max-w-md mx-4">
            <div className="flex items-center mb-4">
              <div className="flex-shrink-0">
                <svg className="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-lg font-medium text-gray-900">
                  관리자 권한 필요
                </h3>
                <p className="text-sm text-gray-500">
                  행사 삭제를 위해 관리자 암호를 입력하세요
                </p>
              </div>
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                삭제할 행사: <span className="font-semibold text-red-600">{pendingDeleteEvent?.name}</span>
              </label>
              <input
                type="password"
                value={passwordValue}
                onChange={(e) => setPasswordValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handlePasswordConfirm()
                  } else if (e.key === 'Escape') {
                    handlePasswordCancel()
                  }
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                placeholder="관리자 암호를 입력하세요"
                autoFocus
              />
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={handlePasswordCancel}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
              >
                취소
              </button>
              <button
                onClick={handlePasswordConfirm}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                삭제
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}