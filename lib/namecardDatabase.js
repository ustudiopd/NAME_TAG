import { supabase } from './supabaseClient'

// 명찰 템플릿 관련 데이터베이스 함수들

/**
 * Supabase 연결 테스트
 */
export async function testSupabaseConnection() {
  try {
    const { data, error } = await supabase
      .from('namecards')
      .select('id')
      .limit(1)
    
    if (error) {
      console.error('Supabase connection test failed:', error)
      return { success: false, error }
    }
    
    console.log('Supabase connection test successful')
    return { success: true, error: null }
  } catch (error) {
    console.error('Supabase connection test error:', error)
    return { success: false, error }
  }
}

/**
 * 명찰 템플릿 저장
 */
export async function saveNamecardTemplate(eventId, templateName, canvasJson) {
  try {
    console.log('Saving template with data:', { eventId, templateName, canvasJson })
    
    const { data, error } = await supabase
      .from('namecards')
      .insert([{
        event_id: eventId,
        template_name: templateName,
        canvas_json: canvasJson,
        is_default: false,
        template_settings: null,
        paper_width_cm: 9.0,
        paper_height_cm: 12.5,
        background_image_url: null,
        print_areas: null
      }])
      .select('id, event_id, template_name, canvas_json, is_default, created_at, updated_at')
      .single()
    
    if (error) {
      console.error('Supabase error:', error)
      throw error
    }
    
    console.log('Template saved successfully:', data)
    return { data, error: null }
  } catch (error) {
    console.error('Error saving namecard template:', error)
    return { data: null, error }
  }
}

/**
 * 특정 행사의 명찰 템플릿 목록 조회
 */
export async function getNamecardTemplates(eventId) {
  try {
    const { data, error } = await supabase
      .from('namecards')
      .select('id, event_id, template_name, canvas_json, is_default, created_at, updated_at')
      .eq('event_id', eventId)
      .order('created_at', { ascending: false })
    
    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('Error fetching namecard templates:', error)
    return { data: null, error }
  }
}

/**
 * 특정 명찰 템플릿 조회
 */
export async function getNamecardTemplateById(templateId) {
  try {
    const { data, error } = await supabase
      .from('namecards')
      .select('id, event_id, template_name, canvas_json, is_default, created_at, updated_at')
      .eq('id', templateId)
      .single()
    
    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('Error fetching namecard template by id:', error)
    return { data: null, error }
  }
}

/**
 * 명찰 템플릿 수정
 */
export async function updateNamecardTemplate(templateId, updates) {
  try {
    const { data, error } = await supabase
      .from('namecards')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', templateId)
      .select()
      .single()
    
    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('Error updating namecard template:', error)
    return { data: null, error }
  }
}

/**
 * 명찰 템플릿 삭제
 */
export async function deleteNamecardTemplate(templateId) {
  try {
    const { error } = await supabase
      .from('namecards')
      .delete()
      .eq('id', templateId)
    
    if (error) throw error
    return { error: null }
  } catch (error) {
    console.error('Error deleting namecard template:', error)
    return { error }
  }
}

/**
 * 기본 템플릿으로 설정
 */
export async function setDefaultTemplate(eventId, templateId) {
  try {
    // 먼저 해당 행사의 모든 템플릿을 기본값 해제
    await supabase
      .from('namecards')
      .update({ is_default: false })
      .eq('event_id', eventId)
    
    // 선택된 템플릿을 기본값으로 설정
    const { data, error } = await supabase
      .from('namecards')
      .update({ is_default: true })
      .eq('id', templateId)
      .select()
      .single()
    
    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('Error setting default template:', error)
    return { data: null, error }
  }
}

/**
 * 기본 템플릿 조회
 */
export async function getDefaultTemplate(eventId) {
  try {
    const { data, error } = await supabase
      .from('namecards')
      .select('*')
      .eq('event_id', eventId)
      .eq('is_default', true)
      .single()
    
    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('Error fetching default template:', error)
    return { data: null, error }
  }
}

/**
 * 명찰 템플릿 복사
 */
export async function duplicateNamecardTemplate(templateId, newTemplateName) {
  try {
    // 원본 템플릿 조회
    const { data: originalTemplate, error: fetchError } = await getNamecardTemplateById(templateId)
    if (fetchError) throw fetchError
    
    // 복사본 생성
    const { data, error } = await supabase
      .from('namecards')
      .insert([{
        event_id: originalTemplate.event_id,
        template_name: newTemplateName,
        canvas_json: originalTemplate.canvas_json,
        is_default: false
      }])
      .select()
      .single()
    
    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('Error duplicating namecard template:', error)
    return { data: null, error }
  }
}
