import { supabase } from './supabaseClient'

// 행사 관련 데이터베이스 함수들

/**
 * 특정 행사 조회
 */
export async function getEventById(eventId) {
  try {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('id', eventId)
      .single()
    
    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('Error fetching event by id:', error)
    return { data: null, error }
  }
}

/**
 * 모든 행사 조회
 */
export async function getAllEvents() {
  try {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .order('event_date', { ascending: false })
    
    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('Error fetching events:', error)
    return { data: null, error }
  }
}

/**
 * 행사 생성
 */
export async function createEvent(eventData) {
  try {
    const { data, error } = await supabase
      .from('events')
      .insert([eventData])
      .select()
      .single()
    
    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('Error creating event:', error)
    return { data: null, error }
  }
}

/**
 * 행사 업데이트
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
    return { data, error: null }
  } catch (error) {
    console.error('Error updating event:', error)
    return { data: null, error }
  }
}

/**
 * 행사 삭제
 */
export async function deleteEvent(id) {
  try {
    const { error } = await supabase
      .from('events')
      .delete()
      .eq('id', id)
    
    if (error) throw error
    return { error: null }
  } catch (error) {
    console.error('Error deleting event:', error)
    return { error }
  }
}

/**
 * 특정 행사의 프로필 조회
 */
export async function getProfilesByEvent(eventId) {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('event_id', eventId)
      .order('created_at', { ascending: false })
    
    if (error) throw error
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
