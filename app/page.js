'use client'

import { useState, useEffect } from 'react'
import { getAllEvents } from '../lib/eventDatabase'
import EventCard from '../components/EventCard'
import EventForm from '../components/EventForm'

export default function Home() {
  const [events, setEvents] = useState([])
  const [showEventForm, setShowEventForm] = useState(false)
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  // 행사 목록 로드
  useEffect(() => {
    loadEvents()
  }, [])

  const loadEvents = async () => {
    try {
      const { data, error } = await getAllEvents()
      if (error) throw error
      setEvents(data || [])
    } catch (error) {
      console.error('Error loading events:', error)
    }
  }

  const handleEventAdded = (newEvent) => {
    setEvents(prev => [newEvent, ...prev])
    setShowEventForm(false)
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

          {events.length === 0 ? (
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
              {events.map((event) => (
                <EventCard
                  key={event.id}
                  event={event}
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
    </div>
  )
}