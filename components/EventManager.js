'use client'

import { useState, useEffect } from 'react'
import { getAllEvents, createEvent, updateEvent, deleteEvent, getEventStats } from '../lib/eventDatabase'

export default function EventManager({ 
  selectedEventId, 
  onEventSelect, 
  onEventChange 
}) {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showEventForm, setShowEventForm] = useState(false)
  const [editingEvent, setEditingEvent] = useState(null)

  useEffect(() => {
    loadEvents()
  }, [])

  const loadEvents = async () => {
    try {
      setLoading(true)
      const { data, error } = await getAllEvents()
      
      if (error) {
        setError(error.message)
      } else {
        setEvents(data || [])
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleEventSelect = (event) => {
    onEventSelect?.(event)
  }

  const handleCreateEvent = () => {
    setEditingEvent(null)
    setShowEventForm(true)
  }

  const handleEditEvent = (event) => {
    setEditingEvent(event)
    setShowEventForm(true)
  }

  const handleDeleteEvent = async (eventId) => {
    if (!confirm('이 행사를 삭제하시겠습니까? 관련된 모든 명단도 함께 삭제됩니다.')) {
      return
    }

    try {
      const { error } = await deleteEvent(eventId)
      if (error) {
        setError(error.message)
      } else {
        await loadEvents()
        onEventChange?.()
      }
    } catch (err) {
      setError(err.message)
    }
  }

  if (loading) {
    return (
      <div className="p-4">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4 text-red-600">
        <p>오류가 발생했습니다: {error}</p>
        <button 
          onClick={loadEvents}
          className="mt-2 px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200"
        >
          다시 시도
        </button>
      </div>
    )
  }

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">행사 목록</h2>
        <button
          onClick={handleCreateEvent}
          className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
        >
          행사 추가
        </button>
      </div>
      
      {events.length === 0 ? (
        <div className="text-center text-gray-500 py-8">
          <p>등록된 행사가 없습니다.</p>
          <p className="text-sm mt-2">"행사 추가" 버튼을 클릭하여 새 행사를 만드세요.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {events.map((event) => (
            <EventCard
              key={event.id}
              event={event}
              isSelected={selectedEventId === event.id}
              onSelect={() => handleEventSelect(event)}
              onEdit={() => handleEditEvent(event)}
              onDelete={() => handleDeleteEvent(event.id)}
            />
          ))}
        </div>
      )}

      {/* 행사 추가/편집 폼 */}
      {showEventForm && (
        <EventForm
          event={editingEvent}
          onSave={async (eventData) => {
            try {
              if (editingEvent) {
                await updateEvent(editingEvent.id, eventData)
              } else {
                await createEvent(eventData)
              }
              await loadEvents()
              setShowEventForm(false)
              onEventChange?.()
            } catch (err) {
              setError(err.message)
            }
          }}
          onClose={() => setShowEventForm(false)}
        />
      )}
    </div>
  )
}

// 행사 카드 컴포넌트
function EventCard({ event, isSelected, onSelect, onEdit, onDelete }) {
  const [stats, setStats] = useState(null)

  useEffect(() => {
    loadStats()
  }, [event.id])

  const loadStats = async () => {
    try {
      const { data } = await getEventStats(event.id)
      setStats(data)
    } catch (err) {
      console.error('Error loading stats:', err)
    }
  }

  return (
    <div
      className={`p-3 border rounded-lg cursor-pointer transition-colors ${
        isSelected
          ? 'border-blue-500 bg-blue-50'
          : 'border-gray-200 hover:border-gray-300'
      }`}
      onClick={onSelect}
    >
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <h3 className="font-medium text-gray-900">{event.event_name}</h3>
          <p className="text-sm text-gray-600">
            {new Date(event.event_date).toLocaleDateString('ko-KR', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </p>
          {stats && (
            <div className="text-xs text-gray-500 mt-1">
              총 {stats.total}명 | 체크인 {stats.checkedIn}명 | 미체크인 {stats.notCheckedIn}명
            </div>
          )}
        </div>
        
        <div className="flex space-x-1 ml-2">
          <button
            onClick={(e) => {
              e.stopPropagation()
              onEdit()
            }}
            className="p-1 text-gray-400 hover:text-gray-600"
            title="편집"
          >
            ✏️
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              onDelete()
            }}
            className="p-1 text-gray-400 hover:text-red-600"
            title="삭제"
          >
            🗑️
          </button>
        </div>
      </div>
    </div>
  )
}

// 행사 폼 컴포넌트
function EventForm({ event, onSave, onClose }) {
  const [formData, setFormData] = useState({
    event_name: event?.event_name || '',
    event_date: event?.event_date || new Date().toISOString().split('T')[0],
    description: event?.description || ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!formData.event_name.trim()) {
      setError('행사명은 필수입니다.')
      return
    }

    try {
      setLoading(true)
      setError(null)
      await onSave(formData)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <h2 className="text-xl font-semibold mb-4">
          {event ? '행사 편집' : '새 행사 추가'}
        </h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="event_name" className="block text-sm font-medium text-gray-700 mb-1">
              행사명 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="event_name"
              name="event_name"
              value={formData.event_name}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="예: 9.19 행사"
            />
          </div>

          <div>
            <label htmlFor="event_date" className="block text-sm font-medium text-gray-700 mb-1">
              행사 날짜
            </label>
            <input
              type="date"
              id="event_date"
              name="event_date"
              value={formData.event_date}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
              설명
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="행사에 대한 간단한 설명"
            />
          </div>

          {error && (
            <div className="text-red-600 text-sm">
              {error}
            </div>
          )}

          <div className="flex space-x-3 pt-4">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? '저장 중...' : '저장'}
            </button>
            
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400"
            >
              취소
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
