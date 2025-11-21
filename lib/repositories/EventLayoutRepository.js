/**
 * EventLayoutRepository
 * 이벤트별 레이아웃(위치/스타일) 저장/로드 담당
 * 텍스트 내용은 포함하지 않고, 텍스트는 항상 선택된 프로필로부터 가져옴
 */

import { supabase } from '../supabaseClient'

/**
 * EventLayout 타입 정의
 * @typedef {Object} EventLayout
 * @property {string} id
 * @property {string} eventId
 * @property {string|null} templateId
 * @property {Object} canvasJson - Fabric.js 캔버스 JSON (텍스트 내용 제외)
 * @property {number} paperWidthCm
 * @property {number} paperHeightCm
 * @property {string|null} backgroundImageUrl
 * @property {Object|null} printAreas
 * @property {string} createdAt
 * @property {string} updatedAt
 */

/**
 * 이벤트별 레이아웃 조회
 * @param {string} eventId
 * @returns {Promise<EventLayout|null>}
 */
export async function getEventLayout(eventId) {
  try {
    const { data, error } = await supabase
      .from('event_layouts')
      .select('*')
      .eq('event_id', eventId)
      .maybeSingle() // single() 대신 maybeSingle() 사용

    if (error) {
      // 406 에러는 PostgREST가 뷰를 인식하지 못하는 경우
      if (error.code === 'PGRST106' || error.message?.includes('406')) {
        console.warn('EventLayout 뷰를 PostgREST가 인식하지 못함. 레이아웃이 없는 것으로 처리합니다.')
        return null
      }
      if (error.code === 'PGRST116') {
        // 레이아웃이 없는 경우 (정상)
        return null
      }
      console.error('Error fetching event layout:', error)
      return null // 에러 발생 시 null 반환하여 앱이 계속 작동하도록
    }

    if (!data) return null

    return {
      id: data.id,
      eventId: data.event_id,
      templateId: data.template_id,
      canvasJson: data.canvas_json,
      paperWidthCm: data.paper_width_cm,
      paperHeightCm: data.paper_height_cm,
      backgroundImageUrl: data.background_image_url,
      printAreas: data.print_areas,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    }
  } catch (error) {
    console.error('Error fetching event layout:', error)
    return null
  }
}

/**
 * 이벤트별 레이아웃 저장/업데이트
 * @param {Omit<EventLayout, 'id' | 'createdAt' | 'updatedAt'>} layout
 * @returns {Promise<EventLayout>}
 */
export async function saveEventLayout(layout) {
  try {
    // 데이터 검증
    if (!layout.eventId) {
      throw new Error('eventId is required')
    }

    if (!layout.canvasJson) {
      console.warn('canvasJson is missing, using empty object')
    }

    // 데이터 정규화
    const upsertData = {
      event_id: layout.eventId,
      template_id: layout.templateId || null,
      canvas_json: layout.canvasJson || {},
      paper_width_cm: layout.paperWidthCm ? parseFloat(layout.paperWidthCm) : 9.0,
      paper_height_cm: layout.paperHeightCm ? parseFloat(layout.paperHeightCm) : 12.5,
      background_image_url: layout.backgroundImageUrl || null,
      print_areas: layout.printAreas || null
      // updated_at은 DB의 DEFAULT 또는 트리거에서 처리
    }

    // canvas_json이 유효한 객체인지 확인
    if (typeof upsertData.canvas_json !== 'object' || upsertData.canvas_json === null) {
      console.warn('Invalid canvas_json, using empty object')
      upsertData.canvas_json = {}
    }

    console.log('Saving event layout:', {
      eventId: upsertData.event_id,
      hasCanvasJson: !!upsertData.canvas_json,
      canvasJsonType: typeof upsertData.canvas_json,
      canvasJsonKeys: upsertData.canvas_json && typeof upsertData.canvas_json === 'object' ? Object.keys(upsertData.canvas_json) : []
    })

    // 먼저 기존 레이아웃이 있는지 확인
    const { data: existing, error: checkError } = await supabase
      .from('event_layouts')
      .select('id')
      .eq('event_id', layout.eventId)
      .maybeSingle()

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('Error checking existing layout:', checkError)
      // 계속 진행 (새로 생성 시도)
    }

    let data, error

    if (existing) {
      // 업데이트
      const { data: updateData, error: updateError } = await supabase
        .from('event_layouts')
        .update(upsertData)
        .eq('event_id', layout.eventId)
        .select()
        .single()

      data = updateData
      error = updateError
    } else {
      // 삽입
      const { data: insertData, error: insertError } = await supabase
        .from('event_layouts')
        .insert(upsertData)
        .select()
        .single()

      data = insertData
      error = insertError
    }

    if (error) {
      console.error('Error saving event layout - details:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
        existing: !!existing
      })
      throw error
    }

    if (!data) {
      throw new Error('No data returned from save operation')
    }

    return {
      id: data.id,
      eventId: data.event_id,
      templateId: data.template_id,
      canvasJson: data.canvas_json,
      paperWidthCm: data.paper_width_cm,
      paperHeightCm: data.paper_height_cm,
      backgroundImageUrl: data.background_image_url,
      printAreas: data.print_areas,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    }
  } catch (error) {
    console.error('Error saving event layout:', error)
    throw error
  }
}

/**
 * 이벤트별 레이아웃 삭제
 * @param {string} eventId
 * @returns {Promise<void>}
 */
export async function deleteEventLayout(eventId) {
  try {
    const { error } = await supabase
      .from('event_layouts')
      .delete()
      .eq('event_id', eventId)

    if (error) throw error
  } catch (error) {
    console.error('Error deleting event layout:', error)
    throw error
  }
}

/**
 * 템플릿 ID로 레이아웃 생성
 * @param {string} eventId
 * @param {string} templateId
 * @param {Object} canvasJson
 * @returns {Promise<EventLayout>}
 */
export async function createEventLayoutFromTemplate(eventId, templateId, canvasJson) {
  try {
    // 템플릿 정보 가져오기
    const { data: template, error: templateError } = await supabase
      .from('namecards')
      .select('paper_width_cm, paper_height_cm, background_image_url, print_areas')
      .eq('id', templateId)
      .single()

    if (templateError) throw templateError

    return await saveEventLayout({
      eventId,
      templateId,
      canvasJson,
      paperWidthCm: template.paper_width_cm || 9.0,
      paperHeightCm: template.paper_height_cm || 12.5,
      backgroundImageUrl: template.background_image_url,
      printAreas: template.print_areas
    })
  } catch (error) {
    console.error('Error creating event layout from template:', error)
    throw error
  }
}

