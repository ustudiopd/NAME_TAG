'use client'

import { useState } from 'react'
import { createEvent } from '../lib/eventDatabase'

export default function EventForm({ onEventAdded, onClose }) {
  const [formData, setFormData] = useState({
    event_name: '',
    event_date: '',
    description: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!formData.event_name.trim()) {
      setError('행사명은 필수 입력 항목입니다.')
      return
    }

    if (!formData.event_date) {
      setError('행사 날짜는 필수 입력 항목입니다.')
      return
    }

    try {
      setLoading(true)
      setError(null)

      const { data, error } = await createEvent(formData)
      
      if (error) throw error
      
      console.log('Event created successfully:', data)
      onEventAdded(data)
    } catch (err) {
      console.error('Error creating event:', err)
      setError(err.message || '행사 생성 중 오류가 발생했습니다.')
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
        <h2 className="text-xl font-semibold mb-4">새 행사 추가</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="event_name" className="block text-sm font-medium text-gray-700 mb-1">
              행사명 *
            </label>
            <input
              type="text"
              id="event_name"
              name="event_name"
              value={formData.event_name}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="예: 2024년 신년회"
              required
            />
          </div>

          <div>
            <label htmlFor="event_date" className="block text-sm font-medium text-gray-700 mb-1">
              행사 날짜 *
            </label>
            <input
              type="date"
              id="event_date"
              name="event_date"
              value={formData.event_date}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
              설명 (선택사항)
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="행사에 대한 간단한 설명을 입력하세요"
            />
          </div>

          {error && (
            <div className="text-red-600 text-sm bg-red-50 p-3 rounded-md">
              {error}
            </div>
          )}

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
              disabled={loading}
            >
              취소
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading}
            >
              {loading ? '생성 중...' : '행사 생성'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
