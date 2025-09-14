import { supabase } from './supabaseClient'
import { getCachedData, CACHE_KEYS, invalidateCachePattern } from './cache'

// 행사 관련 데이터베이스 함수들

/**
 * 특정 행사 조회 (캐시 적용)
 */
export async function getEventById(eventId) {
  const cacheKey = `${CACHE_KEYS.EVENT_DETAIL}_${eventId}`
  
  try {
    const data = await getCachedData(cacheKey, async () => {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('id', eventId)
        .single()
      
      if (error) throw error
      return data
    })
    
    return { data, error: null }
  } catch (error) {
    console.error('Error fetching event by id:', error)
    return { data: null, error }
  }
}

/**
 * 모든 행사 조회 (캐시 적용)
 */
export async function getAllEvents() {
  try {
    const data = await getCachedData(CACHE_KEYS.EVENTS, async () => {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .order('event_date', { ascending: false })
      
      if (error) throw error
      return data
    })
    
    return { data, error: null }
  } catch (error) {
    console.error('Error fetching events:', error)
    return { data: null, error }
  }
}

/**
 * 모든 행사와 통계를 한 번에 조회 (최적화된 쿼리)
 */
export async function getAllEventsWithStats() {
  try {
    const data = await getCachedData(`${CACHE_KEYS.EVENTS}_with_stats`, async () => {
      // 행사 목록 조회
      const { data: events, error: eventsError } = await supabase
        .from('events')
        .select('*')
        .order('event_date', { ascending: false })
      
      if (eventsError) throw eventsError
      
      // 각 행사별 통계 조회 (배치 처리)
      const eventIds = events.map(event => event.id)
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('event_id, is_checked_in')
        .in('event_id', eventIds)
      
      if (profilesError) throw profilesError
      
      // 통계 계산
      const statsMap = {}
      profiles.forEach(profile => {
        if (!statsMap[profile.event_id]) {
          statsMap[profile.event_id] = { total: 0, checkedIn: 0, notCheckedIn: 0 }
        }
        statsMap[profile.event_id].total++
        if (profile.is_checked_in) {
          statsMap[profile.event_id].checkedIn++
        } else {
          statsMap[profile.event_id].notCheckedIn++
        }
      })
      
      // 행사 데이터에 통계 추가
      return events.map(event => ({
        ...event,
        stats: statsMap[event.id] || { total: 0, checkedIn: 0, notCheckedIn: 0 }
      }))
    })
    
    return { data, error: null }
  } catch (error) {
    console.error('Error fetching events with stats:', error)
    return { data: null, error }
  }
}

/**
 * 행사 생성 (캐시 무효화)
 */
export async function createEvent(eventData) {
  try {
    const { data, error } = await supabase
      .from('events')
      .insert([eventData])
      .select()
      .single()
    
    if (error) throw error
    
    // 관련 캐시 무효화
    invalidateCachePattern('events')
    
    return { data, error: null }
  } catch (error) {
    console.error('Error creating event:', error)
    return { data: null, error }
  }
}

/**
 * 행사 업데이트 (캐시 무효화)
 */
export async function updateEvent(id, updates) {
  try {
    const { data, error } = await supabase
      .from('events')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    
    if (error) throw error
    
    // 관련 캐시 무효화
    invalidateCachePattern('events')
    invalidateCachePattern(`event_detail_${id}`)
    
    return { data, error: null }
  } catch (error) {
    console.error('Error updating event:', error)
    return { data: null, error }
  }
}

/**
 * 행사 삭제 (캐시 무효화)
 */
export async function deleteEvent(id) {
  try {
    const { error } = await supabase
      .from('events')
      .delete()
      .eq('id', id)
    
    if (error) throw error
    
    // 관련 캐시 무효화
    invalidateCachePattern('events')
    invalidateCachePattern(`event_detail_${id}`)
    
    return { error: null }
  } catch (error) {
    console.error('Error deleting event:', error)
    return { error }
  }
}

/**
 * 특정 행사의 프로필 조회
 */
export async function getProfilesByEvent(eventId, sortBy = 'created_at') {
  try {
    let orderColumn = 'created_at'
    let ascending = false
    
    // 정렬 기준에 따라 컬럼과 방향 설정
    switch (sortBy) {
      case 'name':
        orderColumn = 'name'
        ascending = true
        break
      case 'company':
        orderColumn = 'company'
        ascending = true
        break
      case 'created_at':
      default:
        orderColumn = 'created_at'
        ascending = false // 최신순 (등록순)
        break
    }
    
    console.log('eventDatabase: 정렬 쿼리 실행 - 컬럼:', orderColumn, '방향:', ascending ? '오름차순' : '내림차순')
    
    let query = supabase
      .from('profiles')
      .select('*')
      .eq('event_id', eventId)
    
    // 기본 정렬 적용
    query = query.order(orderColumn, { ascending })
    
    const { data, error } = await query
    
    if (error) throw error
    console.log('eventDatabase: 쿼리 결과 - 데이터 개수:', data?.length || 0)
    
    // 정렬 결과 확인을 위한 로그
    if (data && data.length > 0) {
      console.log('eventDatabase: 정렬 결과 샘플 (처음 3개):', data.slice(0, 3).map(p => ({
        name: p.name,
        company: p.company,
        created_at: p.created_at
      })))
    }
    
    return { data, error: null }
  } catch (error) {
    console.error('Error fetching profiles by event:', error)
    return { data: null, error }
  }
}

/**
 * 행사별 프로필 통계
 */
export async function getEventStats(eventId) {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('is_checked_in')
      .eq('event_id', eventId)
    
    if (error) throw error
    
    const total = data.length
    const checkedIn = data.filter(p => p.is_checked_in).length
    const notCheckedIn = total - checkedIn
    
    return { 
      data: { total, checkedIn, notCheckedIn }, 
      error: null 
    }
  } catch (error) {
    console.error('Error fetching event stats:', error)
    return { data: null, error }
  }
}
