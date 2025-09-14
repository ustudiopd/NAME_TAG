'use client'

import { useState, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import React from 'react'
import { usePrefetch } from '../lib/prefetch'

const EventCard = React.memo(({ 
  event, 
  onSelect,
  editingEvent,
  editValue,
  onEditStart,
  onEditCancel,
  onEditSave,
  onDeleteEvent,
  setEditValue
}) => {
  const router = useRouter()
  const [isHovered, setIsHovered] = useState(false)
  const { handleHover, handleFocus: prefetchFocus, handleClick: prefetchClick } = usePrefetch()

  const formatDate = useCallback((dateString) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'short'
    })
  }, [])

  const getEventStatus = useCallback((eventDate) => {
    const today = new Date()
    const eventDateObj = new Date(eventDate)
    const diffTime = eventDateObj - today
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays < 0) return { text: '종료', color: 'text-gray-500' }
    if (diffDays === 0) return { text: '오늘', color: 'text-red-600' }
    if (diffDays === 1) return { text: '내일', color: 'text-orange-600' }
    if (diffDays <= 7) return { text: `${diffDays}일 후`, color: 'text-yellow-600' }
    return { text: `${diffDays}일 후`, color: 'text-green-600' }
  }, [])

  const status = useMemo(() => getEventStatus(event.event_date), [event.event_date, getEventStatus])

  const handleClick = useCallback(() => {
    // 편집 중이면 클릭 무시
    if (editingEvent === event.id) {
      return
    }
    
    // 프리페칭 트리거
    prefetchClick(event.id)
    // 동적 라우팅으로 행사 상세 페이지로 이동
    router.push(`/event/${event.id}`)
  }, [router, event.id, prefetchClick, editingEvent])

  const handleMouseEnter = useCallback(() => {
    setIsHovered(true)
    // 호버 시 프리페칭
    handleHover(event.id)
  }, [handleHover, event.id])

  const handleMouseLeave = useCallback(() => setIsHovered(false), [])

  const handleFocus = useCallback(() => {
    // 포커스 시 프리페칭
    prefetchFocus(event.id)
  }, [prefetchFocus, event.id])

  // 통계 정보 표시
  const statsText = useMemo(() => {
    if (event.stats) {
      return `총 ${event.stats.total}명 | 체크인 ${event.stats.checkedIn}명 | 미체크인 ${event.stats.notCheckedIn}명`
    }
    return '명단 관리'
  }, [event.stats])

  return (
    <div
      className={`bg-white rounded-lg shadow-md border border-gray-200 p-6 cursor-pointer transition-all duration-200 ${
        isHovered ? 'shadow-lg transform -translate-y-1' : 'hover:shadow-md'
      }`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={handleFocus}
      onClick={handleClick}
      tabIndex={0}
      role="button"
      aria-label={`${event.event_name} 행사 선택`}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          {editingEvent === event.id ? (
            <input
              type="text"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  onEditSave(event.id, editValue.trim())
                } else if (e.key === 'Escape') {
                  onEditCancel()
                }
              }}
              onBlur={() => onEditSave(event.id, editValue.trim())}
              onClick={(e) => e.stopPropagation()}
              className="text-lg font-semibold text-gray-900 mb-2 w-full border border-gray-300 rounded px-2 py-1"
              autoFocus
            />
          ) : (
            <h3 
              className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2 cursor-pointer hover:bg-gray-100 px-1 py-0.5 rounded"
              onClick={(e) => {
                e.stopPropagation()
                onEditStart(event.id, event.event_name)
              }}
              title="클릭하여 행사명 수정"
            >
              {event.event_name}
            </h3>
          )}
          <p className="text-sm text-gray-600 mb-3">
            {formatDate(event.event_date)}
          </p>
          {event.description && (
            <p className="text-sm text-gray-500 line-clamp-2">
              {event.description}
            </p>
          )}
        </div>
        <div className="ml-3 flex items-center space-x-2">
          <div className={`px-2 py-1 rounded-full text-xs font-medium ${status.color} bg-gray-100`}>
            {status.text}
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation()
              onDeleteEvent(event.id, event.event_name)
            }}
            className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1 rounded"
            title="행사 삭제"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center text-sm text-gray-500">
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          {statsText}
        </div>
        <div className="flex items-center text-gray-400">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </div>
    </div>
  )
})

// 컴포넌트 비교 함수 (성능 최적화)
EventCard.displayName = 'EventCard'

export default EventCard
