/**
 * 가상화된 명단 목록 컴포넌트
 * 대량 데이터 처리 시 성능 최적화를 위한 가상 스크롤링
 */

import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { getProfilesByEvent, updateCheckInStatus } from '../lib/database'

const ITEM_HEIGHT = 80 // 각 항목의 고정 높이
const CONTAINER_HEIGHT = 400 // 컨테이너 높이
const BUFFER_SIZE = 5 // 렌더링 버퍼 크기

export default function VirtualizedProfileList({ 
  onProfileSelect, 
  selectedProfileId, 
  refreshTrigger, 
  selectedEventId,
  onProfilesLoad,
  onSelectedProfilesChange,
  selectionMode,
  onSelectionModeChange
}) {
  const [profiles, setProfiles] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedProfiles, setSelectedProfiles] = useState(new Set())
  const [searchTerm, setSearchTerm] = useState('')
  const [scrollTop, setScrollTop] = useState(0)
  const [isScrolling, setIsScrolling] = useState(false)
  
  const containerRef = useRef(null)
  const scrollTimeoutRef = useRef(null)

  useEffect(() => {
    if (selectedEventId) {
      loadProfiles()
    }
  }, [selectedEventId])

  useEffect(() => {
    if (refreshTrigger && selectedEventId) {
      loadProfiles()
    }
  }, [refreshTrigger])

  useEffect(() => {
    setSelectedProfiles(new Set())
  }, [selectionMode])

  const loadProfiles = async () => {
    try {
      setLoading(true)
      const { data, error } = await getProfilesByEvent(selectedEventId)
      
      if (error) throw error
      setProfiles(data || [])
      setError(null)
      
      if (onProfilesLoad) {
        onProfilesLoad(data || [])
      }
    } catch (err) {
      console.error('Error loading profiles:', err)
      setError('명단을 불러오는 중 오류가 발생했습니다.')
      setProfiles([])
    } finally {
      setLoading(false)
    }
  }

  // 검색 필터링된 명단
  const filteredProfiles = useMemo(() => {
    if (!searchTerm.trim()) return profiles
    
    const term = searchTerm.toLowerCase()
    return profiles.filter(profile => 
      profile.name?.toLowerCase().includes(term) ||
      profile.company?.toLowerCase().includes(term) ||
      profile.title?.toLowerCase().includes(term)
    )
  }, [profiles, searchTerm])

  // 가상화 계산
  const totalHeight = filteredProfiles.length * ITEM_HEIGHT
  const visibleCount = Math.ceil(CONTAINER_HEIGHT / ITEM_HEIGHT)
  const startIndex = Math.max(0, Math.floor(scrollTop / ITEM_HEIGHT) - BUFFER_SIZE)
  const endIndex = Math.min(
    filteredProfiles.length,
    startIndex + visibleCount + BUFFER_SIZE * 2
  )
  
  const visibleProfiles = filteredProfiles.slice(startIndex, endIndex)
  const offsetY = startIndex * ITEM_HEIGHT

  // 스크롤 이벤트 핸들러
  const handleScroll = useCallback((e) => {
    const newScrollTop = e.target.scrollTop
    setScrollTop(newScrollTop)
    
    // 스크롤 상태 표시
    setIsScrolling(true)
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current)
    }
    
    scrollTimeoutRef.current = setTimeout(() => {
      setIsScrolling(false)
    }, 150)
  }, [])

  // 체크인 상태 업데이트
  const handleCheckIn = async (profileId, isCheckedIn) => {
    try {
      const { error } = await updateCheckInStatus(profileId, isCheckedIn)
      if (error) throw error
      
      setProfiles(prev => 
        prev.map(profile => 
          profile.id === profileId 
            ? { 
                ...profile, 
                is_checked_in: isCheckedIn,
                checked_in_at: isCheckedIn ? new Date().toISOString() : null
              }
            : profile
        )
      )
    } catch (err) {
      console.error('Error updating check-in status:', err)
    }
  }

  // 전체 선택/해제
  const handleSelectAll = () => {
    if (selectedProfiles.size === filteredProfiles.length) {
      setSelectedProfiles(new Set())
      if (onSelectedProfilesChange) {
        onSelectedProfilesChange(new Set())
      }
    } else {
      const newSelectedProfiles = new Set(filteredProfiles.map(p => p.id))
      setSelectedProfiles(newSelectedProfiles)
      if (onSelectedProfilesChange) {
        onSelectedProfilesChange(newSelectedProfiles)
      }
    }
  }

  // 프로필 클릭 핸들러
  const handleProfileClick = (profile, e) => {
    // 이벤트 전파 방지 (이름 편집 등 다른 클릭 이벤트와 충돌 방지)
    if (e) {
      e.stopPropagation()
      e.preventDefault()
    }
    
    if (selectionMode === 'individual') {
      onProfileSelect(profile)
    }
    
    if (selectionMode === 'batch') {
      setSelectedProfiles(prev => {
        const newSet = new Set(prev)
        if (newSet.has(profile.id)) {
          newSet.delete(profile.id)
        } else {
          newSet.add(profile.id)
        }
        
        if (onSelectedProfilesChange) {
          onSelectedProfilesChange(newSet)
        }
        
        return newSet
      })
    }
  }

  const checkedInCount = profiles.filter(p => p.is_checked_in).length
  const isAllSelected = filteredProfiles.length > 0 && selectedProfiles.size === filteredProfiles.length

  if (loading) {
    return (
      <div className="p-4 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="text-sm text-gray-500 mt-2">명단을 불러오는 중...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4 text-center">
        <div className="text-red-500 text-sm">{error}</div>
        <button 
          onClick={loadProfiles}
          className="mt-2 text-blue-600 hover:text-blue-800 text-sm"
        >
          다시 시도
        </button>
      </div>
    )
  }

  if (profiles.length === 0) {
    return (
      <div className="p-4 text-center">
        <div className="text-gray-400 text-4xl mb-2">👥</div>
        <p className="text-sm text-gray-500">등록된 명단이 없습니다</p>
        <p className="text-xs text-gray-400 mt-1">명단을 추가해보세요</p>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      {/* 헤더 */}
      <div className="p-3 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between mb-2">
          <div className="text-sm font-medium text-gray-700">
            명단 목록 ({profiles.length}명)
            {searchTerm && (
              <span className="text-blue-600 ml-1">
                (검색: {filteredProfiles.length}명)
              </span>
            )}
          </div>
          <button
            onClick={handleSelectAll}
            className={`text-xs px-2 py-1 rounded transition-colors ${
              isAllSelected
                ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {isAllSelected ? '전체 해제' : '전체 선택'}
          </button>
        </div>
        
        {/* 선택 모드 전환 */}
        <div className="mb-2">
          <div className="flex items-center space-x-4">
            <span className="text-xs text-gray-600">선택 모드:</span>
            <div className="flex bg-white rounded-md border border-gray-300 overflow-hidden">
              <button
                onClick={() => onSelectionModeChange('individual')}
                className={`px-3 py-1 text-xs transition-colors ${
                  selectionMode === 'individual'
                    ? 'bg-blue-500 text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                개별 선택
              </button>
              <button
                onClick={() => onSelectionModeChange('batch')}
                className={`px-3 py-1 text-xs transition-colors ${
                  selectionMode === 'batch'
                    ? 'bg-blue-500 text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                일괄 선택
              </button>
            </div>
          </div>
        </div>
        
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>체크인: {checkedInCount}명</span>
          <span>선택: {selectedProfiles.size}명</span>
        </div>
      </div>

      {/* 검색 바 */}
      <div className="p-3 border-b border-gray-200 bg-white">
        <div className="relative">
          <input
            type="text"
            placeholder="이름, 회사, 직급으로 검색..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-3 py-2 pl-8 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* 검색 결과 없음 */}
      {searchTerm && filteredProfiles.length === 0 && (
        <div className="p-4 text-center">
          <div className="text-gray-400 text-2xl mb-2">🔍</div>
          <p className="text-sm text-gray-500">검색 결과가 없습니다</p>
          <p className="text-xs text-gray-400 mt-1">다른 검색어를 시도해보세요</p>
        </div>
      )}

      {/* 가상화된 명단 목록 */}
      {filteredProfiles.length > 0 && (
        <div className="flex-1 relative">
          <div
            ref={containerRef}
            className="h-full overflow-y-auto"
            onScroll={handleScroll}
            style={{ height: CONTAINER_HEIGHT }}
          >
            {/* 가상 스크롤 컨테이너 */}
            <div style={{ height: totalHeight, position: 'relative' }}>
              <div
                style={{
                  transform: `translateY(${offsetY}px)`,
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0
                }}
              >
                {visibleProfiles.map((profile, index) => (
                  <div
                    key={profile.id}
                    style={{ height: ITEM_HEIGHT }}
                    className={`p-3 border-b border-gray-100 cursor-pointer transition-all duration-200 ${
                      selectedProfileId === profile.id
                        ? 'bg-blue-50 border-blue-200'
                        : selectedProfiles.has(profile.id)
                        ? 'bg-blue-25 border-blue-100'
                        : 'bg-white hover:bg-gray-50'
                    }`}
                    onClick={(e) => handleProfileClick(profile, e)}
                  >
                    <div className="flex items-center justify-between h-full">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <h4 className="font-medium text-gray-900 truncate">
                            {profile.name}
                          </h4>
                          {selectedProfiles.has(profile.id) && (
                            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                          )}
                        </div>
                        {profile.company && (
                          <p className="text-sm text-gray-600 truncate">
                            {profile.company}
                          </p>
                        )}
                        {profile.title && (
                          <p className="text-xs text-gray-500 truncate">
                            {profile.title}
                          </p>
                        )}
                      </div>
                      <div className="ml-2 flex-shrink-0">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleCheckIn(profile.id, !profile.is_checked_in)
                          }}
                          className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                            profile.is_checked_in
                              ? 'bg-green-500 border-green-500 text-white'
                              : 'border-gray-300 hover:border-green-400'
                          }`}
                          title={profile.is_checked_in ? '체크인됨' : '체크인하기'}
                        >
                          {profile.is_checked_in && (
                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          {/* 스크롤 인디케이터 */}
          {isScrolling && (
            <div className="absolute top-2 right-2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
              스크롤 중...
            </div>
          )}
        </div>
      )}

      {/* 하단 통계 */}
      <div className="p-3 border-t border-gray-200 bg-gray-50">
        <div className="text-xs text-gray-500 text-center">
          체크인률: {profiles.length > 0 ? Math.round((checkedInCount / profiles.length) * 100) : 0}%
        </div>
      </div>
    </div>
  )
}
