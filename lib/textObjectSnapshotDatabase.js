import { supabase } from './supabaseClient'

/**
 * 텍스트 객체 스냅샷 저장
 */
export async function saveTextObjectSnapshot({
  eventId,
  profileId,
  snapshotName,
  companyText,
  companyLayout,
  nameText,
  nameLayout,
  titleText,
  titleLayout,
  fullState
}) {
  try {
    const { data, error } = await supabase
      .from('text_object_snapshots')
      .insert([{
        event_id: eventId,
        profile_id: profileId,
        snapshot_name: snapshotName || `스냅샷_${new Date().toISOString()}`,
        company_text: companyText,
        company_layout: companyLayout,
        name_text: nameText,
        name_layout: nameLayout,
        title_text: titleText,
        title_layout: titleLayout,
        full_state: fullState || {
          company: { text: companyText, layout: companyLayout },
          name: { text: nameText, layout: nameLayout },
          title: { text: titleText, layout: titleLayout }
        }
      }])
      .select()
      .single()

    if (error) {
      console.error('텍스트 객체 스냅샷 저장 실패:', error)
      return { success: false, error, data: null }
    }

    console.log('텍스트 객체 스냅샷 저장 성공:', data.id)
    return { success: true, error: null, data }
  } catch (error) {
    console.error('텍스트 객체 스냅샷 저장 오류:', error)
    return { success: false, error, data: null }
  }
}

/**
 * 이벤트별 최신 스냅샷 가져오기 (에디트창용 단일 스냅샷)
 */
export async function getLatestSnapshotByEvent(eventId) {
  try {
    const { data, error } = await supabase
      .from('text_object_snapshots')
      .select('id, event_id, profile_id, snapshot_name, company_text, company_layout, name_text, name_layout, title_text, title_layout, full_state, created_at, updated_at')
      .eq('event_id', eventId)
      .is('profile_id', null) // profile_id가 null인 것만 (이벤트별 단일 스냅샷)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) {
      console.error('이벤트별 스냅샷 조회 실패:', error)
      return { success: false, error, data: null }
    }

    if (!data) {
      // 데이터 없음
      return { success: true, error: null, data: null }
    }

    return { success: true, error: null, data }
  } catch (error) {
    console.error('이벤트별 스냅샷 조회 오류:', error)
    return { success: false, error, data: null }
  }
}

/**
 * 이벤트별 스냅샷 저장 또는 업데이트 (단일 스냅샷)
 */
export async function saveOrUpdateEventSnapshot({
  eventId,
  snapshotName,
  companyText,
  companyLayout,
  nameText,
  nameLayout,
  titleText,
  titleLayout,
  fullState
}) {
  try {
    // 기존 스냅샷 확인
    const { data: existing } = await supabase
      .from('text_object_snapshots')
      .select('id')
      .eq('event_id', eventId)
      .is('profile_id', null)
      .maybeSingle()

    if (existing) {
      // 기존 스냅샷 업데이트
      const { data, error } = await supabase
        .from('text_object_snapshots')
        .update({
          snapshot_name: snapshotName || `스냅샷_${new Date().toISOString()}`,
          company_text: companyText,
          company_layout: companyLayout,
          name_text: nameText,
          name_layout: nameLayout,
          title_text: titleText,
          title_layout: titleLayout,
          full_state: fullState || {
            company: { text: companyText, layout: companyLayout },
            name: { text: nameText, layout: nameLayout },
            title: { text: titleText, layout: titleLayout }
          },
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id)
        .select()
        .single()

      if (error) {
        console.error('스냅샷 업데이트 실패:', error)
        return { success: false, error, data: null }
      }

      console.log('스냅샷 업데이트 성공:', data.id)
      return { success: true, error: null, data }
    } else {
      // 새 스냅샷 생성
      const { data, error } = await supabase
        .from('text_object_snapshots')
        .insert([{
          event_id: eventId,
          profile_id: null, // 이벤트별 단일 스냅샷이므로 profile_id는 null
          snapshot_name: snapshotName || `스냅샷_${new Date().toISOString()}`,
          company_text: companyText,
          company_layout: companyLayout,
          name_text: nameText,
          name_layout: nameLayout,
          title_text: titleText,
          title_layout: titleLayout,
          full_state: fullState || {
            company: { text: companyText, layout: companyLayout },
            name: { text: nameText, layout: nameLayout },
            title: { text: titleText, layout: titleLayout }
          }
        }])
        .select()
        .single()

      if (error) {
        console.error('스냅샷 생성 실패:', error)
        return { success: false, error, data: null }
      }

      console.log('스냅샷 생성 성공:', data.id)
      return { success: true, error: null, data }
    }
  } catch (error) {
    console.error('스냅샷 저장/업데이트 오류:', error)
    return { success: false, error, data: null }
  }
}

/**
 * 프로필별 모든 스냅샷 가져오기 (되돌리기 목록용)
 */
export async function getAllSnapshots(profileId, limit = 20) {
  try {
    const { data, error } = await supabase
      .from('text_object_snapshots')
      .select('*')
      .eq('profile_id', profileId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('스냅샷 목록 조회 실패:', error)
      return { success: false, error, data: null }
    }

    return { success: true, error: null, data: data || [] }
  } catch (error) {
    console.error('스냅샷 목록 조회 오류:', error)
    return { success: false, error, data: null }
  }
}

/**
 * 특정 스냅샷 가져오기 (되돌리기용)
 */
export async function getSnapshotById(snapshotId) {
  try {
    const { data, error } = await supabase
      .from('text_object_snapshots')
      .select('*')
      .eq('id', snapshotId)
      .single()

    if (error) {
      console.error('스냅샷 조회 실패:', error)
      return { success: false, error, data: null }
    }

    return { success: true, error: null, data }
  } catch (error) {
    console.error('스냅샷 조회 오류:', error)
    return { success: false, error, data: null }
  }
}

/**
 * 스냅샷 삭제
 */
export async function deleteSnapshot(snapshotId) {
  try {
    const { error } = await supabase
      .from('text_object_snapshots')
      .delete()
      .eq('id', snapshotId)

    if (error) {
      console.error('스냅샷 삭제 실패:', error)
      return { success: false, error }
    }

    return { success: true, error: null }
  } catch (error) {
    console.error('스냅샷 삭제 오류:', error)
    return { success: false, error }
  }
}

/**
 * 이벤트별 모든 스냅샷 가져오기
 */
export async function getSnapshotsByEvent(eventId, limit = 100) {
  try {
    const { data, error } = await supabase
      .from('text_object_snapshots')
      .select('*')
      .eq('event_id', eventId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('이벤트별 스냅샷 조회 실패:', error)
      return { success: false, error, data: null }
    }

    return { success: true, error: null, data: data || [] }
  } catch (error) {
    console.error('이벤트별 스냅샷 조회 오류:', error)
    return { success: false, error, data: null }
  }
}

