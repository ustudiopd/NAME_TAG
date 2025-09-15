import { useState, useEffect } from 'react'
import { 
  getPrizeDraws, 
  createPrizeDraw, 
  deletePrizeDraw,
  duplicatePrizeDraw,
  testSupabaseConnection
} from '../lib/prizeDrawDatabase'
import PrizeDrawCard from './PrizeDrawCard'

export default function PrizeDrawManager({ eventId }) {
  const [prizeDraws, setPrizeDraws] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newDrawTitle, setNewDrawTitle] = useState('')
  const [newDrawDescription, setNewDrawDescription] = useState('')
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    loadPrizeDraws()
  }, [eventId])

  // 새창에서 오는 메시지 리스너
  useEffect(() => {
    const handleMessage = (event) => {
      if (event.data.type === 'PRIZE_DRAW_UPDATED') {
        loadPrizeDraws() // 목록 새로고침
      }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [])

  const loadPrizeDraws = async () => {
    try {
      setLoading(true)
      const { data, error } = await getPrizeDraws(eventId)
      if (error) throw error
      setPrizeDraws(data || [])
    } catch (err) {
      console.error('Error loading prize draws:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleCreatePrizeDraw = async () => {
    if (!newDrawTitle.trim()) {
      alert('경품추첨 제목을 입력해주세요.')
      return
    }

    // 중복 제목 확인
    const isDuplicate = prizeDraws.some(draw => 
      draw.title.toLowerCase() === newDrawTitle.trim().toLowerCase()
    )
    
    if (isDuplicate) {
      alert('이미 같은 이름의 경품추첨이 있습니다. 다른 이름을 사용해주세요.')
      return
    }

    try {
      setCreating(true)
      
      // Supabase 연결 테스트
      const connectionTest = await testSupabaseConnection()
      if (!connectionTest.success) {
        throw new Error(`데이터베이스 연결 실패: ${connectionTest.error?.message}`)
      }

      const { data, error } = await createPrizeDraw(eventId, {
        title: newDrawTitle.trim(),
        description: newDrawDescription.trim() || null,
        is_active: true
      })

      if (error) throw error

      if (data) {
        setPrizeDraws(prev => [data, ...prev])
        setNewDrawTitle('')
        setNewDrawDescription('')
        setShowCreateForm(false)
        alert('경품추첨이 성공적으로 생성되었습니다.')
      }
    } catch (err) {
      console.error('Error creating prize draw:', err)
      alert(`경품추첨 생성 중 오류가 발생했습니다: ${err.message}`)
    } finally {
      setCreating(false)
    }
  }

  const handleDeletePrizeDraw = async (prizeDrawId) => {
    if (!confirm('이 경품추첨을 삭제하시겠습니까? 관련된 모든 경품과 결과도 함께 삭제됩니다.')) return

    try {
      const { error } = await deletePrizeDraw(prizeDrawId)
      if (error) throw error
      
      setPrizeDraws(prev => prev.filter(draw => draw.id !== prizeDrawId))
      alert('경품추첨이 삭제되었습니다.')
    } catch (err) {
      console.error('Error deleting prize draw:', err)
      alert('경품추첨 삭제 중 오류가 발생했습니다.')
    }
  }

  const handleDuplicatePrizeDraw = async (prizeDraw) => {
    const newTitle = `${prizeDraw.title} (복사본)`
    
    try {
      const { data, error } = await duplicatePrizeDraw(prizeDraw.id, newTitle)
      if (error) throw error
      
      if (data) {
        setPrizeDraws(prev => [data, ...prev])
        alert('경품추첨이 복사되었습니다.')
      }
    } catch (err) {
      console.error('Error duplicating prize draw:', err)
      alert('경품추첨 복사 중 오류가 발생했습니다.')
    }
  }

  if (loading) {
    return (
      <div className="p-4 text-center">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-orange-500 mx-auto"></div>
        <p className="text-sm text-gray-500 mt-2">경품추첨을 불러오는 중...</p>
      </div>
    )
  }

  return (
    <div className="w-full">
      {/* 헤더 */}
      <div className="flex items-center justify-between p-3 bg-gray-50 border-b border-gray-200">
        <div>
          <h4 className="text-sm font-semibold text-gray-900">경품추첨 관리</h4>
          <p className="text-xs text-gray-500 mt-1">
            {prizeDraws.length}개의 경품추첨이 있습니다
          </p>
        </div>
        <button
          onClick={() => setShowCreateForm(true)}
          className="px-3 py-2 bg-orange-600 text-white text-sm rounded-md hover:bg-orange-700 transition-colors"
        >
          새 경품추첨 생성
        </button>
      </div>

      {/* 생성 폼 */}
      {showCreateForm && (
        <div className="p-4 border-b border-gray-200 bg-white">
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                경품추첨 제목 *
              </label>
              <input
                type="text"
                placeholder="예: 2024년 연말 경품추첨"
                value={newDrawTitle}
                onChange={(e) => setNewDrawTitle(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                maxLength={100}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                설명 (선택사항)
              </label>
              <textarea
                placeholder="경품추첨에 대한 간단한 설명을 입력하세요"
                value={newDrawDescription}
                onChange={(e) => setNewDrawDescription(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                rows={2}
                maxLength={500}
              />
            </div>
            <div className="flex space-x-2">
              <button
                onClick={handleCreatePrizeDraw}
                disabled={!newDrawTitle.trim() || creating}
                className="flex-1 bg-orange-600 text-white text-sm px-4 py-2 rounded-md hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {creating ? '생성 중...' : '생성'}
              </button>
              <button
                onClick={() => {
                  setShowCreateForm(false)
                  setNewDrawTitle('')
                  setNewDrawDescription('')
                }}
                className="flex-1 bg-gray-500 text-white text-sm px-4 py-2 rounded-md hover:bg-gray-600 transition-colors"
              >
                취소
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 경품추첨 목록 */}
      <div className="max-h-96 overflow-y-auto">
        {prizeDraws.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-gray-400 text-4xl mb-3">🎁</div>
            <p className="text-sm text-gray-500">생성된 경품추첨이 없습니다</p>
            <p className="text-xs text-gray-400 mt-1">새 경품추첨을 생성해보세요</p>
          </div>
        ) : (
          <div className="space-y-2 p-3">
            {prizeDraws.map((prizeDraw) => (
              <PrizeDrawCard
                key={prizeDraw.id}
                prizeDraw={prizeDraw}
                onDelete={() => handleDeletePrizeDraw(prizeDraw.id)}
                onDuplicate={() => handleDuplicatePrizeDraw(prizeDraw)}
                onUpdate={loadPrizeDraws}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
