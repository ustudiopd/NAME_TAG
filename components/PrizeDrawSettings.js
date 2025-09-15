import { useState, useEffect } from 'react'
import { 
  updatePrizeDraw, 
  getPrizeDraw,
  getPrizes, 
  createPrize, 
  updatePrize, 
  deletePrize 
} from '../lib/prizeDrawDatabase'
import { getProfilesByEvent } from '../lib/database'

export default function PrizeDrawSettings({ prizeDraw, onUpdate }) {
  const [title, setTitle] = useState(prizeDraw.title || '')
  const [description, setDescription] = useState(prizeDraw.description || '')
  const [isActive, setIsActive] = useState(prizeDraw.is_active || true)
  const [prizes, setPrizes] = useState([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  
  // 참가자 설정
  const [participants, setParticipants] = useState([])
  const [participantFilter, setParticipantFilter] = useState('checked_in') // 'all', 'checked_in'
  const [selectedParticipants, setSelectedParticipants] = useState(new Set())
  const [participantSearch, setParticipantSearch] = useState('')
  const [sortCriteria, setSortCriteria] = useState('registration') // 'registration', 'name', 'company'
  const [sortOrder, setSortOrder] = useState('desc') // 'asc', 'desc'

  // 새 경품 추가 상태
  const [showAddPrize, setShowAddPrize] = useState(false)
  const [newPrize, setNewPrize] = useState({
    name: '',
    description: '',
    quantity: 1,
    rank_order: 1,
    image_url: ''
  })

  useEffect(() => {
    loadPrizes()
    loadParticipants()
  }, [prizeDraw.id])

  const loadParticipants = async () => {
    try {
      // 전체 참가자 목록 로드 (체크인 여부와 관계없이)
      const { data, error } = await getProfilesByEvent(prizeDraw.event_id)
      if (error) throw error
      setParticipants(data || [])
      
      // 참가자 로딩 완료 후 선택 상태 복원
      if (prizeDraw.selected_participants && Array.isArray(prizeDraw.selected_participants)) {
        console.log('참가자 로딩 완료 후 복원할 참가자 ID들:', prizeDraw.selected_participants)
        setSelectedParticipants(new Set(prizeDraw.selected_participants))
      }
    } catch (err) {
      console.error('Error loading participants:', err)
    }
  }

  const loadPrizes = async () => {
    try {
      setLoading(true)
      const { data, error } = await getPrizes(prizeDraw.id)
      if (error) throw error
      setPrizes(data || [])
    } catch (err) {
      console.error('Error loading prizes:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveSettings = async () => {
    if (!title.trim()) {
      alert('경품추첨 제목을 입력해주세요.')
      return
    }

    try {
      setSaving(true)
      
      // 선택된 참가자 ID 배열을 JSON으로 변환
      const selectedParticipantsArray = Array.from(selectedParticipants)
      console.log('저장할 참가자 ID들:', selectedParticipantsArray)
      console.log('선택된 참가자 수:', selectedParticipantsArray.length)
      
      const { error } = await updatePrizeDraw(prizeDraw.id, {
        title: title.trim(),
        description: description.trim(),
        is_active: isActive,
        selected_participants: selectedParticipantsArray
      })

      if (error) throw error
      
      // 저장 후 데이터 새로고침
      const { data: updatedPrizeDraw, error: reloadError } = await getPrizeDraw(prizeDraw.id)
      if (!reloadError && updatedPrizeDraw) {
        console.log('저장 후 새로고침된 데이터:', updatedPrizeDraw)
        console.log('새로고침된 selected_participants:', updatedPrizeDraw.selected_participants)
      }
      
      if (onUpdate) onUpdate()
      alert(`설정이 저장되었습니다.\n선택된 참가자: ${selectedParticipantsArray.length}명`)
    } catch (err) {
      console.error('Error saving settings:', err)
      alert('설정 저장 중 오류가 발생했습니다.')
    } finally {
      setSaving(false)
    }
  }

  const handleAddPrize = async () => {
    if (!newPrize.name.trim()) {
      alert('경품명을 입력해주세요.')
      return
    }

    try {
      const { data, error } = await createPrize(prizeDraw.id, {
        ...newPrize,
        rank_order: prizes.length + 1
      })

      if (error) throw error

      setPrizes(prev => [...prev, data])
      setNewPrize({
        name: '',
        description: '',
        quantity: 1,
        rank_order: 1,
        image_url: ''
      })
      setShowAddPrize(false)
      alert('경품이 추가되었습니다.')
    } catch (err) {
      console.error('Error adding prize:', err)
      alert('경품 추가 중 오류가 발생했습니다.')
    }
  }

  const handleUpdatePrize = async (prizeId, updates) => {
    try {
      const { error } = await updatePrize(prizeId, updates)
      if (error) throw error

      setPrizes(prev => 
        prev.map(prize => 
          prize.id === prizeId ? { ...prize, ...updates } : prize
        )
      )
      alert('경품이 수정되었습니다.')
    } catch (err) {
      console.error('Error updating prize:', err)
      alert('경품 수정 중 오류가 발생했습니다.')
    }
  }

  const handleDeletePrize = async (prizeId) => {
    if (!confirm('이 경품을 삭제하시겠습니까?')) return

    try {
      const { error } = await deletePrize(prizeId)
      if (error) throw error

      setPrizes(prev => prev.filter(prize => prize.id !== prizeId))
      alert('경품이 삭제되었습니다.')
    } catch (err) {
      console.error('Error deleting prize:', err)
      alert('경품 삭제 중 오류가 발생했습니다.')
    }
  }

  const movePrize = (index, direction) => {
    const newPrizes = [...prizes]
    const newIndex = direction === 'up' ? index - 1 : index + 1

    if (newIndex >= 0 && newIndex < newPrizes.length) {
      [newPrizes[index], newPrizes[newIndex]] = [newPrizes[newIndex], newPrizes[index]]
      
      // rank_order 업데이트
      newPrizes.forEach((prize, idx) => {
        prize.rank_order = idx + 1
        handleUpdatePrize(prize.id, { rank_order: idx + 1 })
      })

      setPrizes(newPrizes)
    }
  }

  // 필터링 및 정렬된 참가자 목록
  const filteredParticipants = participants
    .filter(participant => {
      // 검색 조건만 적용 (체크인 필터 제거)
      if (participantSearch) {
        const searchTerm = participantSearch.toLowerCase()
        return (
          participant.name?.toLowerCase().includes(searchTerm) ||
          participant.company?.toLowerCase().includes(searchTerm) ||
          participant.title?.toLowerCase().includes(searchTerm) ||
          participant.phone_number?.toLowerCase().includes(searchTerm) ||
          participant.email?.toLowerCase().includes(searchTerm)
        )
      }
      
      return true
    })
    .sort((a, b) => {
      let comparison = 0
      
      switch (sortCriteria) {
        case 'name':
          comparison = (a.name || '').localeCompare(b.name || '', 'ko')
          break
        case 'company':
          comparison = (a.company || '').localeCompare(b.company || '', 'ko')
          break
        case 'registration':
        default:
          // 등록순 (created_at 기준)
          comparison = new Date(a.created_at) - new Date(b.created_at)
          break
      }
      
      return sortOrder === 'desc' ? -comparison : comparison
    })

  const handleParticipantToggle = (participantId) => {
    const newSelected = new Set(selectedParticipants)
    if (newSelected.has(participantId)) {
      newSelected.delete(participantId)
    } else {
      newSelected.add(participantId)
    }
    setSelectedParticipants(newSelected)
  }

  const handleSelectAllParticipants = () => {
    const allIds = new Set(filteredParticipants.map(p => p.id))
    setSelectedParticipants(allIds)
  }

  const handleDeselectAllParticipants = () => {
    setSelectedParticipants(new Set())
  }

  return (
    <div className="space-y-6">
      {/* 기본 정보 설정 */}
      <div>
        <h5 className="text-sm font-semibold text-gray-900 mb-3">기본 정보</h5>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              경품추첨 제목 *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
              placeholder="경품추첨 제목을 입력하세요"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              설명
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
              rows={2}
              placeholder="경품추첨에 대한 설명을 입력하세요"
            />
          </div>
          <div className="flex items-center">
            <input
              type="checkbox"
              id="isActive"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
            />
            <label htmlFor="isActive" className="ml-2 text-sm text-gray-700">
              활성 상태
            </label>
          </div>
        </div>
      </div>

      {/* 참가자 설정 */}
      <div>
        <h5 className="text-sm font-semibold text-gray-900 mb-3">참가자 설정</h5>
        
        {/* 참가자 정보 */}
        <div className="space-y-3 mb-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-700">
              전체 참가자: <span className="font-semibold">{participants.length}명</span>
              <span className="ml-2 text-xs text-gray-500">
                (체크인 완료: {participants.filter(p => p.is_checked_in).length}명)
              </span>
            </div>
          </div>
          
          {/* 정렬 기준 */}
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium text-gray-700">정렬 기준:</span>
            <div className="flex space-x-1">
              <button
                onClick={() => {
                  setSortCriteria('registration')
                  setSortOrder(sortCriteria === 'registration' && sortOrder === 'desc' ? 'asc' : 'desc')
                }}
                className={`px-3 py-1 text-xs rounded ${
                  sortCriteria === 'registration'
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                등록순 {sortCriteria === 'registration' && (sortOrder === 'desc' ? '↓' : '↑')}
              </button>
              <button
                onClick={() => {
                  setSortCriteria('name')
                  setSortOrder(sortCriteria === 'name' && sortOrder === 'asc' ? 'desc' : 'asc')
                }}
                className={`px-3 py-1 text-xs rounded ${
                  sortCriteria === 'name'
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                이름순 {sortCriteria === 'name' && (sortOrder === 'asc' ? '↑' : '↓')}
              </button>
              <button
                onClick={() => {
                  setSortCriteria('company')
                  setSortOrder(sortCriteria === 'company' && sortOrder === 'asc' ? 'desc' : 'asc')
                }}
                className={`px-3 py-1 text-xs rounded ${
                  sortCriteria === 'company'
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                회사순 {sortCriteria === 'company' && (sortOrder === 'asc' ? '↑' : '↓')}
              </button>
            </div>
          </div>
          
          <div className="flex space-x-2">
            <input
              type="text"
              placeholder="이름, 회사, 직급, 전화번호, 이메일로 검색..."
              value={participantSearch}
              onChange={(e) => setParticipantSearch(e.target.value)}
              className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
            <button
              onClick={handleSelectAllParticipants}
              className="px-3 py-2 text-xs bg-green-600 text-white rounded hover:bg-green-700"
            >
              전체 선택
            </button>
            <button
              onClick={handleDeselectAllParticipants}
              className="px-3 py-2 text-xs bg-gray-600 text-white rounded hover:bg-gray-700"
            >
              전체 해제
            </button>
          </div>
        </div>

        {/* 참가자 목록 */}
        <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-lg">
          {filteredParticipants.length === 0 ? (
            <div className="p-4 text-center text-gray-500 text-sm">
              {participantSearch ? '검색 결과가 없습니다' : '참가자가 없습니다'}
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {filteredParticipants.map((participant) => (
                <div key={participant.id} className="p-3 hover:bg-gray-50">
                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={selectedParticipants.has(participant.id)}
                      onChange={() => handleParticipantToggle(participant.id)}
                      className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {participant.name || '이름 없음'}
                        </p>
                        {participant.is_checked_in && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            체크인
                          </span>
                        )}
                      </div>
                      <div className="flex items-center space-x-4 text-xs text-gray-500">
                        {participant.company && (
                          <span>{participant.company}</span>
                        )}
                        {participant.title && (
                          <span>{participant.title}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        <div className="mt-2 text-sm text-gray-600">
          <div className="flex items-center justify-between">
            <div>
              선택된 참가자: <span className="font-semibold text-orange-600">{selectedParticipants.size}명</span>
              {selectedParticipants.size > 0 && (
                <span className="ml-2 text-xs text-gray-500">
                  (전체 {participants.length}명 중)
                </span>
              )}
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-xs text-gray-500">
                {sortCriteria === 'registration' && '등록순'}
                {sortCriteria === 'name' && '이름순'}
                {sortCriteria === 'company' && '회사순'}
                {sortOrder === 'asc' ? ' ↑' : ' ↓'}
              </span>
              <button
                onClick={() => {
                  console.log('현재 선택된 참가자 ID들:', Array.from(selectedParticipants))
                  console.log('저장된 참가자 선택 정보:', prizeDraw.selected_participants)
                  console.log('참가자 목록:', participants.map(p => ({ id: p.id, name: p.name })))
                }}
                className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
              >
                디버그
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 경품 관리 */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h5 className="text-sm font-semibold text-gray-900">경품 관리</h5>
          <button
            onClick={() => setShowAddPrize(true)}
            className="px-3 py-1 bg-orange-600 text-white text-xs rounded-md hover:bg-orange-700 transition-colors"
          >
            경품 추가
          </button>
        </div>

        {/* 새 경품 추가 폼 */}
        {showAddPrize && (
          <div className="p-3 bg-gray-50 rounded-md mb-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  경품명 *
                </label>
                <input
                  type="text"
                  value={newPrize.name}
                  onChange={(e) => setNewPrize(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-orange-500"
                  placeholder="예: 1등 상품권"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  수량 *
                </label>
                <input
                  type="number"
                  min="1"
                  value={newPrize.quantity}
                  onChange={(e) => setNewPrize(prev => ({ ...prev, quantity: parseInt(e.target.value) || 1 }))}
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-orange-500"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  설명
                </label>
                <input
                  type="text"
                  value={newPrize.description}
                  onChange={(e) => setNewPrize(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-orange-500"
                  placeholder="경품에 대한 설명"
                />
              </div>
            </div>
            <div className="flex space-x-2 mt-3">
              <button
                onClick={handleAddPrize}
                className="px-3 py-1 bg-orange-600 text-white text-xs rounded hover:bg-orange-700"
              >
                추가
              </button>
              <button
                onClick={() => setShowAddPrize(false)}
                className="px-3 py-1 bg-gray-500 text-white text-xs rounded hover:bg-gray-600"
              >
                취소
              </button>
            </div>
          </div>
        )}

        {/* 경품 목록 */}
        {loading ? (
          <div className="text-center py-4">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-orange-500 mx-auto"></div>
            <p className="text-xs text-gray-500 mt-1">경품을 불러오는 중...</p>
          </div>
        ) : prizes.length === 0 ? (
          <div className="text-center py-4 text-gray-500">
            <p className="text-sm">등록된 경품이 없습니다</p>
          </div>
        ) : (
          <div className="space-y-2">
            {prizes.map((prize, index) => (
              <div key={prize.id} className="flex items-center space-x-2 p-2 bg-gray-50 rounded">
                <span className="text-xs text-gray-500 w-6">{prize.rank_order}등</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{prize.name}</p>
                  {prize.description && (
                    <p className="text-xs text-gray-500 truncate">{prize.description}</p>
                  )}
                </div>
                <span className="text-xs text-gray-500">{prize.quantity}개</span>
                <div className="flex space-x-1">
                  <button
                    onClick={() => movePrize(index, 'up')}
                    disabled={index === 0}
                    className="text-gray-400 hover:text-gray-600 disabled:opacity-30"
                    title="위로 이동"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                    </svg>
                  </button>
                  <button
                    onClick={() => movePrize(index, 'down')}
                    disabled={index === prizes.length - 1}
                    className="text-gray-400 hover:text-gray-600 disabled:opacity-30"
                    title="아래로 이동"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleDeletePrize(prize.id)}
                    className="text-gray-400 hover:text-red-600"
                    title="삭제"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 저장 버튼 */}
      <div className="flex justify-end pt-4 border-t border-gray-200">
        <button
          onClick={handleSaveSettings}
          disabled={saving || !title.trim()}
          className="px-4 py-2 bg-orange-600 text-white text-sm rounded-md hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {saving ? '저장 중...' : '설정 저장'}
        </button>
      </div>
    </div>
  )
}
