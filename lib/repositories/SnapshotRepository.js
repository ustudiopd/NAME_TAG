/**
 * SnapshotRepository
 * EventLayout의 상태 히스토리 관리 (Undo/자동저장용)
 * canvas_json을 메인 데이터로 사용하며, 기존 company_text 등은 하위호환을 위해 유지
 */

import { supabase } from '../supabaseClient'

/**
 * Snapshot 타입 정의
 * @typedef {Object} Snapshot
 * @property {string} id
 * @property {string} eventId
 * @property {string|null} profileId - null이면 이벤트별 스냅샷
 * @property {string} snapshotName
 * @property {Object} canvasJson - Fabric.js 캔버스 JSON 전체 (텍스트 내용 포함)
 * @property {string} snapshotKind - 'autosave' | 'manual' | 'undo'
 * @property {string} createdAt
 * @property {string} updatedAt
 */

/**
 * 이벤트별 최신 스냅샷 조회
 * @param {string} eventId
 * @param {string} kind - 'autosave' | 'manual' | 'undo' (선택)
 * @returns {Promise<Snapshot|null>}
 */
export async function getLatestSnapshot(eventId, kind = null) {
  try {
    let query = supabase
      .from('text_object_snapshots')
      .select('*')
      .eq('event_id', eventId)
      .is('profile_id', null) // 이벤트별 스냅샷만
      .order('created_at', { ascending: false })
      .limit(1)

    if (kind) {
      query = query.eq('snapshot_kind', kind)
    }

    const { data, error } = await query.maybeSingle()

    if (error) {
      if (error.code === 'PGRST116') {
        return null
      }
      throw error
    }

    if (!data) return null

    return mapToSnapshot(data)
  } catch (error) {
    console.error('Error fetching latest snapshot:', error)
    return null
  }
}

/**
 * 이벤트별 모든 스냅샷 조회 (히스토리)
 * @param {string} eventId
 * @param {number} limit
 * @returns {Promise<Snapshot[]>}
 */
export async function getSnapshotsByEvent(eventId, limit = 20) {
  try {
    const { data, error } = await supabase
      .from('text_object_snapshots')
      .select('*')
      .eq('event_id', eventId)
      .is('profile_id', null)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) throw error

    return (data || []).map(mapToSnapshot)
  } catch (error) {
    console.error('Error fetching snapshots by event:', error)
    return []
  }
}

/**
 * 스냅샷 ID로 조회
 * @param {string} snapshotId
 * @returns {Promise<Snapshot|null>}
 */
export async function getSnapshotById(snapshotId) {
  try {
    const { data, error } = await supabase
      .from('text_object_snapshots')
      .select('*')
      .eq('id', snapshotId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return null
      }
      throw error
    }

    return data ? mapToSnapshot(data) : null
  } catch (error) {
    console.error('Error fetching snapshot by id:', error)
    return null
  }
}

/**
 * 자동저장 스냅샷 생성
 * @param {string} eventId
 * @param {Object} canvasJson - Fabric.js 캔버스 JSON
 * @returns {Promise<Snapshot>}
 */
export async function createAutosaveSnapshot(eventId, canvasJson) {
  try {
    // 기존 자동저장 스냅샷이 있으면 업데이트, 없으면 생성
    const existing = await getLatestSnapshot(eventId, 'autosave')

    if (existing) {
      // 업데이트
      const { data, error } = await supabase
        .from('text_object_snapshots')
        .update({
          canvas_json: canvasJson,
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id)
        .select()
        .single()

      if (error) throw error
      return mapToSnapshot(data)
    } else {
      // 생성
      const { data, error } = await supabase
        .from('text_object_snapshots')
        .insert([{
          event_id: eventId,
          profile_id: null,
          snapshot_name: `자동저장_${new Date().toISOString()}`,
          canvas_json: canvasJson,
          snapshot_kind: 'autosave'
        }])
        .select()
        .single()

      if (error) throw error
      return mapToSnapshot(data)
    }
  } catch (error) {
    console.error('Error creating autosave snapshot:', error)
    throw error
  }
}

/**
 * 수동 저장 스냅샷 생성
 * @param {string} eventId
 * @param {Object} canvasJson
 * @param {string} snapshotName
 * @returns {Promise<Snapshot>}
 */
export async function createManualSnapshot(eventId, canvasJson, snapshotName) {
  try {
    const { data, error } = await supabase
      .from('text_object_snapshots')
      .insert([{
        event_id: eventId,
        profile_id: null,
        snapshot_name: snapshotName || `수동저장_${new Date().toISOString()}`,
        canvas_json: canvasJson,
        snapshot_kind: 'manual'
      }])
      .select()
      .single()

    if (error) throw error
    return mapToSnapshot(data)
  } catch (error) {
    console.error('Error creating manual snapshot:', error)
    throw error
  }
}

/**
 * 되돌리기용 스냅샷 생성
 * @param {string} eventId
 * @param {Object} canvasJson
 * @returns {Promise<Snapshot>}
 */
export async function createUndoSnapshot(eventId, canvasJson) {
  try {
    const { data, error } = await supabase
      .from('text_object_snapshots')
      .insert([{
        event_id: eventId,
        profile_id: null,
        snapshot_name: `되돌리기_${new Date().toISOString()}`,
        canvas_json: canvasJson,
        snapshot_kind: 'undo'
      }])
      .select()
      .single()

    if (error) throw error
    return mapToSnapshot(data)
  } catch (error) {
    console.error('Error creating undo snapshot:', error)
    throw error
  }
}

/**
 * 스냅샷 삭제
 * @param {string} snapshotId
 * @returns {Promise<void>}
 */
export async function deleteSnapshot(snapshotId) {
  try {
    const { error } = await supabase
      .from('text_object_snapshots')
      .delete()
      .eq('id', snapshotId)

    if (error) throw error
  } catch (error) {
    console.error('Error deleting snapshot:', error)
    throw error
  }
}

/**
 * 이전 스냅샷 조회 (되돌리기용)
 * @param {string} eventId
 * @param {string} currentSnapshotId
 * @returns {Promise<Snapshot|null>}
 */
export async function getPreviousSnapshot(eventId, currentSnapshotId) {
  try {
    // 현재 스냅샷의 생성 시간 조회
    const current = await getSnapshotById(currentSnapshotId)
    if (!current) return null

    // 현재보다 이전의 스냅샷 조회
    const { data, error } = await supabase
      .from('text_object_snapshots')
      .select('*')
      .eq('event_id', eventId)
      .is('profile_id', null)
      .lt('created_at', current.createdAt)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) {
      if (error.code === 'PGRST116') {
        return null
      }
      throw error
    }

    return data ? mapToSnapshot(data) : null
  } catch (error) {
    console.error('Error fetching previous snapshot:', error)
    return null
  }
}

/**
 * DB 데이터를 Snapshot 객체로 변환
 * @param {any} data
 * @returns {Snapshot}
 */
function mapToSnapshot(data) {
  return {
    id: data.id,
    eventId: data.event_id,
    profileId: data.profile_id,
    snapshotName: data.snapshot_name,
    canvasJson: data.canvas_json || data.full_state, // canvas_json 우선, 없으면 full_state
    snapshotKind: data.snapshot_kind || 'autosave',
    createdAt: data.created_at,
    updatedAt: data.updated_at
  }
}

