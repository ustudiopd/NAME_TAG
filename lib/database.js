import { supabase } from './supabaseClient'

// 프로필 관련 데이터베이스 함수들

/**
 * 모든 프로필 조회
 */
export async function getAllProfiles() {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select(`
        *,
        events (
          id,
          event_name,
          event_date
        )
      `)
      .order('created_at', { ascending: false })
    
    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('Error fetching profiles:', error)
    return { data: null, error }
  }
}

/**
 * 특정 행사의 프로필 조회
 */
export async function getProfilesByEvent(eventId) {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select(`
        *,
        events (
          id,
          event_name,
          event_date
        )
      `)
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
 * 프로필 생성
 */
export async function createProfile(profileData) {
  try {
    console.log('Creating profile with data:', profileData)
    
    const { data, error } = await supabase
      .from('profiles')
      .insert([profileData])
      .select()
      .single()
    
    if (error) {
      console.error('Supabase error:', error)
      throw error
    }
    
    console.log('Profile created successfully:', data)
    return { data, error: null }
  } catch (error) {
    console.error('Error creating profile:', error)
    return { data: null, error }
  }
}

/**
 * 프로필 업데이트
 */
export async function updateProfile(id, updates) {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    
    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('Error updating profile:', error)
    return { data: null, error }
  }
}

/**
 * 프로필 삭제
 */
export async function deleteProfile(id) {
  try {
    const { error } = await supabase
      .from('profiles')
      .delete()
      .eq('id', id)
    
    if (error) throw error
    return { error: null }
  } catch (error) {
    console.error('Error deleting profile:', error)
    return { error }
  }
}

/**
 * 체크인 상태 업데이트
 */
export async function updateCheckInStatus(id, isCheckedIn) {
  try {
    const updates = {
      is_checked_in: isCheckedIn,
      checked_in_at: isCheckedIn ? new Date().toISOString() : null
    }
    
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    
    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('Error updating check-in status:', error)
    return { data: null, error }
  }
}

/**
 * 대량 프로필 생성 (엑셀 업로드용)
 */
export async function createProfilesBulk(profilesData) {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .insert(profilesData)
      .select()
    
    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('Error creating profiles in bulk:', error)
    return { data: null, error }
  }
}
