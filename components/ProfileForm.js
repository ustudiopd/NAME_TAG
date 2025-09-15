import { useState } from 'react'
import { createProfile } from '../lib/database'

export default function ProfileForm({ onProfileAdded, onClose, eventId }) {
  const [formData, setFormData] = useState({
    company: '',
    name: '',
    title: '',
    phone_number: '',
    email: '',
    event_id: eventId || null
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const validatePhoneNumber = (phone) => {
    if (!phone) return true // 선택사항이므로 빈 값은 허용
    
    // 숫자만 추출하여 길이 확인
    const numbers = phone.replace(/[^\d]/g, '')
    
    // 10자리 또는 11자리만 허용
    if (numbers.length !== 10 && numbers.length !== 11) return false
    
    // 010으로 시작하는지 확인 (11자리인 경우)
    if (numbers.length === 11 && !numbers.startsWith('010')) return false
    
    return true
  }

  const validateEmail = (email) => {
    if (!email) return true // 선택사항이므로 빈 값은 허용
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!formData.name.trim()) {
      setError('이름은 필수 입력 항목입니다.')
      return
    }

    if (!validatePhoneNumber(formData.phone_number)) {
      setError('전화번호 형식이 올바르지 않습니다.')
      return
    }

    if (!validateEmail(formData.email)) {
      setError('이메일 형식이 올바르지 않습니다.')
      return
    }

    try {
      setLoading(true)
      setError(null)
      
      const { data, error } = await createProfile({
        ...formData,
        company: formData.company.trim() || null,
        name: formData.name.trim(),
        title: formData.title.trim() || null,
        phone_number: formData.phone_number.trim() || null,
        email: formData.email.trim() || null,
        is_checked_in: false,
        checked_in_at: null
      })

      if (error) {
        console.error('Profile creation error:', error)
        setError(error.message || '명단 추가 중 오류가 발생했습니다.')
      } else {
        console.log('Profile added successfully:', data)
        // 성공 시 폼 초기화 및 콜백 호출
        setFormData({ company: '', name: '', title: '', phone_number: '', email: '' })
        onProfileAdded?.(data)
        onClose?.()
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const formatPhoneNumber = (value) => {
    // 숫자만 추출
    const numbers = value.replace(/[^\d]/g, '')
    
    // 11자리 이하로 제한
    if (numbers.length > 11) return value
    
    // 010-1234-5678 형식으로 포맷팅
    if (numbers.length <= 3) return numbers
    if (numbers.length <= 7) return `${numbers.slice(0, 3)}-${numbers.slice(3)}`
    return `${numbers.slice(0, 3)}-${numbers.slice(3, 7)}-${numbers.slice(7)}`
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    
    if (name === 'phone_number') {
      const formatted = formatPhoneNumber(value)
      setFormData(prev => ({
        ...prev,
        [name]: formatted
      }))
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }))
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-semibold mb-4">새 명단 추가</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              이름 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="이름을 입력하세요"
            />
          </div>

          <div>
            <label htmlFor="company" className="block text-sm font-medium text-gray-700 mb-1">
              회사명
            </label>
            <input
              type="text"
              id="company"
              name="company"
              value={formData.company}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="회사명을 입력하세요"
            />
          </div>

          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
              직급
            </label>
            <input
              type="text"
              id="title"
              name="title"
              value={formData.title}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="직급을 입력하세요"
            />
          </div>

          <div>
            <label htmlFor="phone_number" className="block text-sm font-medium text-gray-700 mb-1">
              전화번호 <span className="text-gray-400 text-xs">(선택사항)</span>
            </label>
            <input
              type="tel"
              id="phone_number"
              name="phone_number"
              value={formData.phone_number}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="010-1234-5678"
              maxLength={13}
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              이메일 <span className="text-gray-400 text-xs">(선택사항)</span>
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="example@company.com"
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
              {loading ? '추가 중...' : '추가'}
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
