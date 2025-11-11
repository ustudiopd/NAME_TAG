'use client'

import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { getProfilesByEvent, updateCheckInStatus, updateProfile } from '../lib/database'

export default function ProfileList({ 
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
  const [isScrolling, setIsScrolling] = useState(false)
  const [sortBy, setSortBy] = useState('created_at') // 정렬 기준: 'created_at', 'name', 'company'
  const [editingProfile, setEditingProfile] = useState(null) // 편집 중인 프로필 ID
  const [editingField, setEditingField] = useState(null) // 편집 중인 필드 ('name' 또는 'company')
  const [editValue, setEditValue] = useState('') // 편집 중인 값
  
  // 스크롤 설정
  const scrollTimeoutRef = useRef(null)

  // 전화번호 마스킹 함수
  const maskPhoneNumber = (phone) => {
    if (!phone) return null
    // 010-1234-5678 -> 010-****-5678
    return phone.replace(/(\d{3})-(\d{4})-(\d{4})/, '$1-****-$3')
  }

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

  // 선택 모드 변경 시 선택된 프로필들 초기화
  useEffect(() => {
    setSelectedProfiles(new Set())
  }, [selectionMode])

  const loadProfiles = async (sortByParam = sortBy) => {
    try {
      console.log('ProfileList: 프로필 로드 시작 - 정렬 기준:', sortByParam, '이벤트 ID:', selectedEventId)
      setLoading(true)
      const { data, error } = await getProfilesByEvent(selectedEventId, sortByParam)
      
      if (error) throw error
      console.log('ProfileList: 프로필 로드 완료 - 데이터 개수:', data?.length || 0)
      
      // 정렬 결과 확인을 위한 로그
      if (data && data.length > 0) {
        console.log('ProfileList: 정렬 결과 샘플 (처음 3개):', data.slice(0, 3).map(p => ({
          name: p.name,
          company: p.company,
          created_at: p.created_at
        })))
      }
      
      setProfiles(data || [])
      setError(null)
      
      // 부모 컴포넌트에 프로필 목록 전달
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

  // 정렬 옵션 변경 시 서버에서 데이터 다시 로드
  const handleSortChange = async (newSortBy) => {
    console.log('ProfileList: 정렬 변경 요청:', newSortBy)
    setSortBy(newSortBy)
    await loadProfiles(newSortBy)
  }

  // 편집 시작
  const handleEditStart = (profileId, field, currentValue) => {
    setEditingProfile(profileId)
    setEditingField(field)
    setEditValue(currentValue || '')
  }

  // 편집 취소
  const handleEditCancel = () => {
    setEditingProfile(null)
    setEditingField(null)
    setEditValue('')
  }

  // 편집 저장
  const handleEditSave = async (profileId, field, newValue) => {
    try {
      console.log('ProfileList: 프로필 업데이트 시작:', { profileId, field, newValue })
      
      const { error } = await updateProfile(profileId, { [field]: newValue })
      
      if (error) {
        console.error('ProfileList: 프로필 업데이트 실패:', error)
        alert('프로필 업데이트에 실패했습니다.')
        return
      }

      // 로컬 상태 업데이트
      setProfiles(prev => prev.map(profile => 
        profile.id === profileId 
          ? { ...profile, [field]: newValue }
          : profile
      ))

      console.log('ProfileList: 프로필 업데이트 완료')
      handleEditCancel()
      
    } catch (err) {
      console.error('ProfileList: 프로필 업데이트 오류:', err)
      alert('프로필 업데이트 중 오류가 발생했습니다.')
    }
  }

  // 검색 필터링 및 한국어 정렬 적용
  const filteredProfiles = useMemo(() => {
    let filtered = profiles
    
    // 검색 필터링 적용
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase()
      filtered = profiles.filter(profile => 
        profile.name?.toLowerCase().includes(term) ||
        profile.company?.toLowerCase().includes(term) ||
        profile.title?.toLowerCase().includes(term) ||
        profile.phone_number?.toLowerCase().includes(term) ||
        profile.email?.toLowerCase().includes(term)
      )
    }
    
    // 한국어 정렬을 위한 클라이언트 사이드 정렬
    if (sortBy === 'name' || sortBy === 'company') {
      console.log('ProfileList: 한국어 정렬 적용 - 기준:', sortBy)
      filtered = [...filtered].sort((a, b) => {
        const aValue = a[sortBy] || ''
        const bValue = b[sortBy] || ''
        const result = aValue.localeCompare(bValue, 'ko', { 
          numeric: true,
          sensitivity: 'base'
        })
        return result
      })
      
      // 정렬 결과 확인
      console.log('ProfileList: 정렬 후 샘플 (처음 3개):', filtered.slice(0, 3).map(p => ({
        name: p.name,
        company: p.company,
        [sortBy]: p[sortBy]
      })))
    }
    
    return filtered
  }, [profiles, searchTerm, sortBy])

  // 모든 명단 표시 (스크롤로만 제어)
  const currentProfiles = filteredProfiles

  // 스크롤 이벤트 핸들러 (스크롤 상태만 표시)
  const handleScroll = useCallback((e) => {
    // 스크롤 상태 표시
    setIsScrolling(true)
    clearTimeout(scrollTimeoutRef.current)
    scrollTimeoutRef.current = setTimeout(() => {
      setIsScrolling(false)
    }, 150)
  }, [])

  const handleCheckIn = async (profileId, isCheckedIn) => {
    try {
      const { error } = await updateCheckInStatus(profileId, isCheckedIn)
      if (error) throw error
      
      // 로컬 상태 업데이트
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

  // 체크인 전체 해제
  const handleClearAllCheckIns = async () => {
    if (!confirm('모든 체크인을 해제하시겠습니까?')) {
      return
    }

    try {
      // 체크인된 모든 프로필의 ID 수집
      const checkedInProfileIds = profiles
        .filter(p => p.is_checked_in)
        .map(p => p.id)
      
      console.log(`체크인 해제할 프로필 수: ${checkedInProfileIds.length}`)
      
      if (checkedInProfileIds.length === 0) {
        alert('체크인된 사람이 없습니다.')
        return
      }
      
      // 각 프로필을 순차적으로 체크인 해제
      for (const profileId of checkedInProfileIds) {
        const { error } = await updateCheckInStatus(profileId, false)
        if (error) {
          console.error(`프로필 ${profileId} 체크인 해제 실패:`, error)
          throw error
        }
      }
      
      // 로컬 상태 업데이트
      setProfiles(prev => 
        prev.map(profile => ({
          ...profile,
          is_checked_in: false,
          checked_in_at: null
        }))
      )
      
      console.log('모든 체크인이 해제되었습니다.')
      alert(`${checkedInProfileIds.length}명의 체크인이 해제되었습니다.`)
    } catch (err) {
      console.error('Error clearing all check-ins:', err)
      alert(`체크인 해제 중 오류가 발생했습니다: ${err.message}`)
    }
  }

  const handleSelectAll = () => {
    if (selectedProfiles.size === filteredProfiles.length) {
      // 전체 해제
      setSelectedProfiles(new Set())
      // 부모 컴포넌트에 선택 상태 전달
      if (onSelectedProfilesChange) {
        onSelectedProfilesChange(new Set())
      }
    } else {
      // 전체 선택 (필터링된 결과 기준)
      const newSelectedProfiles = new Set(filteredProfiles.map(p => p.id))
      setSelectedProfiles(newSelectedProfiles)
      // 부모 컴포넌트에 선택 상태 전달
      if (onSelectedProfilesChange) {
        onSelectedProfilesChange(newSelectedProfiles)
      }
    }
  }

  const handleProfileClick = (profile, e) => {
    // 이벤트 전파 방지 (이름 편집 등 다른 클릭 이벤트와 충돌 방지)
    if (e) {
      e.stopPropagation()
      e.preventDefault()
    }
    
    // 편집 중이면 편집 취소
    if (editingProfile) {
      handleEditCancel()
      return
    }
    
    // 개별 선택 모드일 때만 onProfileSelect 호출
    if (selectionMode === 'individual') {
      onProfileSelect(profile)
    }
    
    // 선택 상태 토글 (일괄 선택 모드에서만)
    if (selectionMode === 'batch') {
      setSelectedProfiles(prev => {
        const newSet = new Set(prev)
        if (newSet.has(profile.id)) {
          newSet.delete(profile.id)
        } else {
          newSet.add(profile.id)
        }
        
        // 부모 컴포넌트에 선택 상태 전달
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
      {/* 헤더 - 개수 표시 및 선택 모드 */}
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
        
        {/* 정렬 옵션 */}
        <div className="mb-2">
          <div className="flex items-center space-x-4">
            <span className="text-xs text-gray-600">정렬 기준:</span>
            <div className="flex bg-white rounded-md border border-gray-300 overflow-hidden">
              <button
                onClick={() => handleSortChange('created_at')}
                disabled={loading}
                className={`px-3 py-1 text-xs transition-colors ${
                  sortBy === 'created_at'
                    ? 'bg-green-500 text-white'
                    : loading 
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
                title="등록순 (최신순) - DB 저장 순서"
              >
                등록순 {sortBy === 'created_at' && '↓'} {loading && sortBy === 'created_at' && '...'}
              </button>
              <button
                onClick={() => handleSortChange('name')}
                disabled={loading}
                className={`px-3 py-1 text-xs transition-colors ${
                  sortBy === 'name'
                    ? 'bg-green-500 text-white'
                    : loading 
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
                title="이름순 (가나다순) - DB 정렬"
              >
                이름순 {sortBy === 'name' && '↑'} {loading && sortBy === 'name' && '...'}
              </button>
              <button
                onClick={() => handleSortChange('company')}
                disabled={loading}
                className={`px-3 py-1 text-xs transition-colors ${
                  sortBy === 'company'
                    ? 'bg-green-500 text-white'
                    : loading 
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
                title="회사순 (가나다순) - DB 정렬"
              >
                회사순 {sortBy === 'company' && '↑'} {loading && sortBy === 'company' && '...'}
              </button>
            </div>
          </div>
        </div>
        
        <div className="flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center space-x-2">
            <span>체크인: {checkedInCount}명</span>
            {checkedInCount > 0 && (
              <button
                onClick={handleClearAllCheckIns}
                className="text-red-600 hover:text-red-800 hover:underline"
                title="모든 체크인 해제"
              >
                전체 해제
              </button>
            )}
          </div>
          <span>선택: {selectedProfiles.size}명</span>
        </div>
      </div>

      {/* 검색 바 */}
      <div className="p-3 border-b border-gray-200 bg-white">
        <div className="relative">
          <input
            type="text"
            placeholder="이름, 회사, 직급, 전화번호, 이메일로 검색..."
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

      {/* 명단 목록 - 페이지네이션 및 스크롤 */}
      {filteredProfiles.length > 0 && (
        <div className="flex-1 flex flex-col">
          {/* 명단 목록 컨테이너 */}
          <div 
            className="flex-1 overflow-y-auto profile-list-container relative"
            onScroll={handleScroll}
            style={{ maxHeight: '800px' }}
          >
            <div className="p-2 space-y-1">
              {currentProfiles.map((profile) => (
              <div
                key={profile.id}
                className={`p-2 rounded-lg border cursor-pointer transition-all duration-200 ${
                  selectedProfileId === profile.id
                    ? 'bg-blue-50 border-blue-200 shadow-sm'
                    : selectedProfiles.has(profile.id)
                    ? 'bg-blue-25 border-blue-100 shadow-sm'
                    : 'bg-white border-gray-200 hover:bg-gray-50 hover:border-gray-300'
                }`}
                onClick={(e) => handleProfileClick(profile, e)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      {editingProfile === profile.id && editingField === 'name' ? (
                        <div className="flex items-center space-x-1 flex-1">
                          <input
                            type="text"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                handleEditSave(profile.id, 'name', editValue.trim())
                              } else if (e.key === 'Escape') {
                                handleEditCancel()
                              }
                            }}
                            onBlur={() => handleEditSave(profile.id, 'name', editValue.trim())}
                            onClick={(e) => e.stopPropagation()}
                            className="text-sm font-medium text-gray-900 border border-gray-300 rounded px-1 py-0.5 flex-1 min-w-0"
                            autoFocus
                          />
                        </div>
                      ) : (
                        <h4 
                          className="font-medium text-gray-900 truncate text-sm cursor-pointer hover:bg-gray-100 px-1 py-0.5 rounded"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleEditStart(profile.id, 'name', profile.name)
                          }}
                          title="클릭하여 이름 수정"
                        >
                          {profile.name}
                        </h4>
                      )}
                      {selectedProfiles.has(profile.id) && (
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      )}
                    </div>
                    {profile.company && (
                      <div className="flex items-center">
                        {editingProfile === profile.id && editingField === 'company' ? (
                          <div className="flex items-center space-x-1 flex-1">
                            <input
                              type="text"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  handleEditSave(profile.id, 'company', editValue.trim())
                                } else if (e.key === 'Escape') {
                                  handleEditCancel()
                                }
                              }}
                              onBlur={() => handleEditSave(profile.id, 'company', editValue.trim())}
                              onClick={(e) => e.stopPropagation()}
                              className="text-xs text-gray-600 border border-gray-300 rounded px-1 py-0.5 flex-1 min-w-0"
                              autoFocus
                            />
                          </div>
                        ) : (
                          <p 
                            className="text-xs text-gray-600 truncate cursor-pointer hover:bg-gray-100 px-1 py-0.5 rounded"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleEditStart(profile.id, 'company', profile.company)
                            }}
                            title="클릭하여 회사명 수정"
                          >
                            {profile.company}
                          </p>
                        )}
                      </div>
                    )}
                    {profile.title && (
                      <p className="text-xs text-gray-500 truncate">
                        {profile.title}
                      </p>
                    )}
                    {(profile.phone_number || profile.email) && (
                      <div className="flex items-center space-x-2 mt-1">
                        {profile.phone_number && (
                          <span className="text-xs text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
                            📞 {maskPhoneNumber(profile.phone_number)}
                          </span>
                        )}
                        {profile.email && (
                          <span className="text-xs text-green-600 bg-green-50 px-1.5 py-0.5 rounded">
                            ✉️ {profile.email}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="ml-2 flex-shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleCheckIn(profile.id, !profile.is_checked_in)
                      }}
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                        profile.is_checked_in
                          ? 'bg-green-500 border-green-500 text-white'
                          : 'border-gray-300 hover:border-green-400'
                      }`}
                      title={profile.is_checked_in ? '체크인됨' : '체크인하기'}
                    >
                      {profile.is_checked_in && (
                        <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
              </div>
              ))}
            </div>
            
            {/* 스크롤 인디케이터 */}
            {isScrolling && (
              <div className="absolute top-2 right-2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
                스크롤 중...
              </div>
            )}
            
          </div>
          
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