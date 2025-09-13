'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function EventCard({ event, onSelect }) {
  const router = useRouter()
  const [isHovered, setIsHovered] = useState(false)

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'short'
    })
  }

  const getEventStatus = (eventDate) => {
    const today = new Date()
    const eventDateObj = new Date(eventDate)
    const diffTime = eventDateObj - today
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays < 0) return { text: '종료', color: 'text-gray-500' }
    if (diffDays === 0) return { text: '오늘', color: 'text-red-600' }
    if (diffDays === 1) return { text: '내일', color: 'text-orange-600' }
    if (diffDays <= 7) return { text: `${diffDays}일 후`, color: 'text-yellow-600' }
    return { text: `${diffDays}일 후`, color: 'text-green-600' }
  }

  const status = getEventStatus(event.event_date)

  const handleClick = () => {
    // 동적 라우팅으로 행사 상세 페이지로 이동
    router.push(`/event/${event.id}`)
  }

  return (
    <div
      className={`bg-white rounded-lg shadow-md border border-gray-200 p-6 cursor-pointer transition-all duration-200 ${
        isHovered ? 'shadow-lg transform -translate-y-1' : 'hover:shadow-md'
      }`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleClick}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2">
            {event.event_name}
          </h3>
          <p className="text-sm text-gray-600 mb-3">
            {formatDate(event.event_date)}
          </p>
          {event.description && (
            <p className="text-sm text-gray-500 line-clamp-2">
              {event.description}
            </p>
          )}
        </div>
        <div className={`ml-3 px-2 py-1 rounded-full text-xs font-medium ${status.color} bg-gray-100`}>
          {status.text}
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center text-sm text-gray-500">
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          명단 관리
        </div>
        <div className="flex items-center text-gray-400">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </div>
    </div>
  )
}
