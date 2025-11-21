'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { getEventById } from '../../../lib/eventDatabase'
import EventDetailView from '../../../components/EventDetailView_new'
import { TestDataButton } from '../../../lib/testData'

export default function EventPage() {
  const params = useParams()
  const router = useRouter()
  const eventId = params.eventId

  const [event, setEvent] = useState(null)
  const [selectedProfile, setSelectedProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  // 행사 정보 로드
  useEffect(() => {
    if (eventId) {
      loadEvent()
    }
  }, [eventId])

  const loadEvent = async () => {
    try {
      setLoading(true)
      const { data, error } = await getEventById(eventId)
      
      if (error) throw error
      
      if (!data) {
        setError('행사를 찾을 수 없습니다.')
        return
      }
      
      setEvent(data)
      setError(null)
    } catch (err) {
      console.error('Error loading event:', err)
      setError('행사를 불러오는 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleProfileSelect = (profile) => {
    setSelectedProfile(profile)
  }

  const handleEventChange = () => {
    setRefreshTrigger(prev => prev + 1)
  }

  const handleBackToEvents = () => {
    router.push('/')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-600 mt-4">행사 정보를 불러오는 중...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">오류가 발생했습니다</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <div className="space-x-3">
            <button
              onClick={loadEvent}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
            >
              다시 시도
            </button>
            <button
              onClick={handleBackToEvents}
              className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 transition-colors"
            >
              행사 목록으로
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-gray-400 text-6xl mb-4">📅</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">행사를 찾을 수 없습니다</h2>
          <p className="text-gray-600 mb-4">요청하신 행사가 존재하지 않거나 삭제되었습니다.</p>
          <button
            onClick={handleBackToEvents}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
          >
            행사 목록으로 돌아가기
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
            <div className="flex items-center space-x-4">
              <button
                onClick={handleBackToEvents}
                className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium transition-colors"
              >
                ← 행사 목록으로
              </button>
              <div className="h-6 w-px bg-gray-300"></div>
              <h1 className="text-xl font-semibold text-gray-900">{event.event_name}</h1>
            </div>
            <div className="flex items-center space-x-3">
              <TestDataButton onDataAdded={() => setRefreshTrigger(prev => prev + 1)} />
              <div className="text-sm text-gray-600">
                {new Date(event.event_date).toLocaleDateString('ko-KR', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  weekday: 'long'
                })}
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <EventDetailView
          event={event}
          selectedProfile={selectedProfile}
          onProfileSelect={handleProfileSelect}
          onEventChange={handleEventChange}
          refreshTrigger={refreshTrigger}
        />
      </main>
    </div>
  )
}
