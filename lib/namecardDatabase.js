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
 * 명찰 템플릿 저장 (전역으로 통일)
 */
export async function saveNamecardTemplate(eventId, templateName, canvasJson) {
  try {
    console.log('Saving global template with data:', { templateName, canvasJson })
    
    const { data, error } = await supabase
      .from('namecards')
      .insert([{
        event_id: null, // 모든 템플릿을 전역으로 처리
        template_name: templateName,
        canvas_json: canvasJson,
        is_default: false,
        is_global: true, // 모든 템플릿을 전역으로 설정
        template_settings: null,
        paper_width_cm: 9.0,
        paper_height_cm: 12.5,
        background_image_url: null,
        print_areas: null
      }])
      .select('id, event_id, template_name, canvas_json, is_default, is_global, created_at, updated_at')
      .single()
    
    if (error) {
      console.error('Supabase error:', error)
      throw error
    }
    
    console.log('Global template saved successfully:', data)
    return { data, error: null }
  } catch (error) {
    console.error('Error saving namecard template:', error)
    return { data: null, error }
  }
}

/**
 * 전역 템플릿 목록 조회 (행사별 구분 제거)
 */
export async function getNamecardTemplates(eventId) {
  try {
    // eventId는 무시하고 모든 전역 템플릿을 반환
    const { data, error } = await supabase
      .from('namecards')
      .select('id, event_id, template_name, canvas_json, is_default, is_global, created_at, updated_at')
      .eq('is_global', true)
      .order('created_at', { ascending: false })
    
    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('Error fetching global templates:', error)
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
      .select('id, event_id, template_name, canvas_json, is_default, is_global, created_at, updated_at')
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
 * 명찰 템플릿 삭제 (전역)
 */
export async function deleteNamecardTemplate(templateId) {
  try {
    const { error } = await supabase
      .from('namecards')
      .delete()
      .eq('id', templateId)
      .eq('is_global', true) // 전역 템플릿만 삭제
    
    if (error) throw error
    return { error: null }
  } catch (error) {
    console.error('Error deleting namecard template:', error)
    return { error }
  }
}

/**
 * 기본 템플릿으로 설정 (전역)
 */
export async function setDefaultTemplate(eventId, templateId) {
  try {
    // 먼저 모든 전역 템플릿을 기본값 해제
    await supabase
      .from('namecards')
      .update({ is_default: false })
      .eq('is_global', true)
    
    // 선택된 템플릿을 기본값으로 설정
    const { data, error } = await supabase
      .from('namecards')
      .update({ is_default: true })
      .eq('id', templateId)
      .eq('is_global', true)
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
 * 기본 템플릿 조회 (전역)
 */
export async function getDefaultTemplate(eventId) {
  try {
    const { data, error } = await supabase
      .from('namecards')
      .select('*')
      .eq('is_global', true)
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
 * 명찰 템플릿 복사 (전역)
 */
export async function duplicateNamecardTemplate(templateId, newTemplateName) {
  try {
    // 원본 템플릿 조회
    const { data: originalTemplate, error: fetchError } = await getNamecardTemplateById(templateId)
    if (fetchError) throw fetchError
    
    // 복사본 생성 (전역으로)
    const { data, error } = await supabase
      .from('namecards')
      .insert([{
        event_id: null, // 전역 템플릿
        template_name: newTemplateName,
        canvas_json: originalTemplate.canvas_json,
        is_default: false,
        is_global: true, // 전역으로 설정
        template_settings: originalTemplate.template_settings,
        paper_width_cm: originalTemplate.paper_width_cm,
        paper_height_cm: originalTemplate.paper_height_cm,
        background_image_url: originalTemplate.background_image_url,
        print_areas: originalTemplate.print_areas
      }])
      .select('id, event_id, template_name, canvas_json, is_default, is_global, created_at, updated_at')
      .single()
    
    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('Error duplicating namecard template:', error)
    return { data: null, error }
  }
}

// ===== 전역 템플릿 관련 함수들 =====

/**
 * 전역 템플릿 저장
 */
export async function saveGlobalTemplate(templateName, canvasJson) {
  try {
    console.log('Saving global template with data:', { templateName, canvasJson })
    
    const { data, error } = await supabase
      .from('namecards')
      .insert([{
        event_id: null, // 전역 템플릿은 event_id가 NULL
        template_name: templateName,
        canvas_json: canvasJson,
        is_default: false,
        is_global: true, // 전역 템플릿으로 설정
        template_settings: null,
        paper_width_cm: 9.0,
        paper_height_cm: 12.5,
        background_image_url: null,
        print_areas: null
      }])
      .select('id, event_id, template_name, canvas_json, is_default, is_global, created_at, updated_at')
      .single()
    
    if (error) {
      console.error('Supabase error:', error)
      throw error
    }
    
    console.log('Global template saved successfully:', data)
    return { data, error: null }
  } catch (error) {
    console.error('Error saving global template:', error)
    return { data: null, error }
  }
}

/**
 * 전역 템플릿 목록 조회
 */
export async function getGlobalTemplates() {
  try {
    const { data, error } = await supabase
      .from('namecards')
      .select('id, event_id, template_name, canvas_json, is_default, is_global, created_at, updated_at')
      .eq('is_global', true)
      .order('created_at', { ascending: false })
    
    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('Error fetching global templates:', error)
    return { data: null, error }
  }
}

/**
 * 템플릿을 전역 템플릿으로 복사
 */
export async function copyTemplateToGlobal(templateId, newTemplateName) {
  try {
    // 원본 템플릿 조회
    const { data: originalTemplate, error: fetchError } = await getNamecardTemplateById(templateId)
    if (fetchError) throw fetchError
    
    // 전역 템플릿으로 복사
    const { data, error } = await supabase
      .from('namecards')
      .insert([{
        event_id: null, // 전역 템플릿은 event_id가 NULL
        template_name: newTemplateName,
        canvas_json: originalTemplate.canvas_json,
        is_default: false,
        is_global: true,
        template_settings: originalTemplate.template_settings,
        paper_width_cm: originalTemplate.paper_width_cm,
        paper_height_cm: originalTemplate.paper_height_cm,
        background_image_url: originalTemplate.background_image_url,
        print_areas: originalTemplate.print_areas
      }])
      .select()
      .single()
    
    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('Error copying template to global:', error)
    return { data: null, error }
  }
}

/**
 * 전역 템플릿을 특정 행사로 복사
 */
export async function copyGlobalTemplateToEvent(globalTemplateId, eventId, newTemplateName) {
  try {
    // 전역 템플릿 조회
    const { data: globalTemplate, error: fetchError } = await getNamecardTemplateById(globalTemplateId)
    if (fetchError) throw fetchError
    
    if (!globalTemplate.is_global) {
      throw new Error('Template is not a global template')
    }
    
    // 행사별 템플릿으로 복사
    const { data, error } = await supabase
      .from('namecards')
      .insert([{
        event_id: eventId,
        template_name: newTemplateName,
        canvas_json: globalTemplate.canvas_json,
        is_default: false,
        is_global: false,
        template_settings: globalTemplate.template_settings,
        paper_width_cm: globalTemplate.paper_width_cm,
        paper_height_cm: globalTemplate.paper_height_cm,
        background_image_url: globalTemplate.background_image_url,
        print_areas: globalTemplate.print_areas
      }])
      .select()
      .single()
    
    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('Error copying global template to event:', error)
    return { data: null, error }
  }
}

/**
 * 전역 템플릿 삭제
 */
export async function deleteGlobalTemplate(templateId) {
  try {
    const { error } = await supabase
      .from('namecards')
      .delete()
      .eq('id', templateId)
      .eq('is_global', true) // 전역 템플릿만 삭제
    
    if (error) throw error
    return { error: null }
  } catch (error) {
    console.error('Error deleting global template:', error)
    return { error }
  }
}

/**
 * 기존 행사별 템플릿들을 전역으로 마이그레이션
 */
export async function migrateTemplatesToGlobal() {
  try {
    console.log('Starting template migration to global...')
    
    // 1. 기존 행사별 템플릿들을 전역으로 변경
    const { data: updateData, error: updateError } = await supabase
      .from('namecards')
      .update({
        event_id: null,
        is_global: true
      })
      .eq('is_global', false)
      .not('event_id', 'is', null)
      .select()
    
    if (updateError) throw updateError
    
    console.log(`Migrated ${updateData?.length || 0} templates to global`)
    
    // 2. 중복된 템플릿 이름 처리
    const { data: allTemplates, error: fetchError } = await supabase
      .from('namecards')
      .select('id, template_name, created_at')
      .eq('is_global', true)
      .order('template_name')
      .order('created_at')
    
    if (fetchError) throw fetchError
    
    // 같은 이름의 템플릿들을 찾아서 번호 추가
    const nameGroups = {}
    allTemplates.forEach(template => {
      if (!nameGroups[template.template_name]) {
        nameGroups[template.template_name] = []
      }
      nameGroups[template.template_name].push(template)
    })
    
    // 중복된 이름이 있는 템플릿들에 번호 추가
    for (const [templateName, templates] of Object.entries(nameGroups)) {
      if (templates.length > 1) {
        for (let i = 1; i < templates.length; i++) {
          const newName = `${templateName} (${i})`
          const { error: renameError } = await supabase
      .from('namecards')
            .update({ template_name: newName })
            .eq('id', templates[i].id)
          
          if (renameError) {
            console.error(`Error renaming template ${templates[i].id}:`, renameError)
          }
        }
      }
    }
    
    // 3. 마이그레이션 결과 확인
    const { data: finalCount, error: countError } = await supabase
      .from('namecards')
      .select('id', { count: 'exact' })
      .eq('is_global', true)
    
    if (countError) throw countError
    
    console.log(`Migration completed. Total global templates: ${finalCount?.length || 0}`)
    
    return { 
      success: true, 
      migratedCount: updateData?.length || 0,
      totalGlobalTemplates: finalCount?.length || 0
    }
  } catch (error) {
    console.error('Error migrating templates to global:', error)
    return { success: false, error }
  }
}
