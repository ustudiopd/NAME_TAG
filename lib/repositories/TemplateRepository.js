/**
 * TemplateRepository
 * 전역 템플릿 관리 (namecards 테이블의 is_global = true인 것만)
 * 템플릿은 재사용 가능한 기본 디자인이며, 텍스트 객체는 dataField로 프로필 필드와 연결
 */

import { supabase } from '../supabaseClient'

/**
 * Template 타입 정의
 * @typedef {Object} Template
 * @property {string} id
 * @property {string|null} eventId - null이면 전역 템플릿
 * @property {string} templateName
 * @property {Object} canvasJson - Fabric.js 캔버스 JSON
 * @property {boolean} isDefault
 * @property {boolean} isGlobal
 * @property {Object|null} templateSettings
 * @property {number} paperWidthCm
 * @property {number} paperHeightCm
 * @property {string|null} backgroundImageUrl
 * @property {Object|null} printAreas
 * @property {string} createdAt
 * @property {string} updatedAt
 */

/**
 * 모든 전역 템플릿 조회
 * @returns {Promise<Template[]>}
 */
export async function getAllTemplates() {
  try {
    const { data, error } = await supabase
      .from('namecards')
      .select('*')
      .eq('is_global', true)
      .order('created_at', { ascending: false })

    if (error) throw error

    return (data || []).map(mapToTemplate)
  } catch (error) {
    console.error('Error fetching templates:', error)
    return []
  }
}

/**
 * 기본 템플릿 조회
 * @returns {Promise<Template|null>}
 */
export async function getDefaultTemplate() {
  try {
    const { data, error } = await supabase
      .from('namecards')
      .select('*')
      .eq('is_global', true)
      .eq('is_default', true)
      .maybeSingle()  // .single() → .maybeSingle() 변경 (406 에러 방지)

    if (error) {
      // 406 에러는 PostgREST가 뷰를 인식하지 못하는 경우
      if (error.code === 'PGRST106' || error.message?.includes('406')) {
        console.warn('기본 템플릿을 PostgREST가 인식하지 못함. 기본 템플릿이 없는 것으로 처리합니다.')
        return null
      }
      if (error.code === 'PGRST116') {
        // 기본 템플릿이 없는 경우 (정상)
        return null
      }
      console.error('Error fetching default template:', error)
      return null
    }

    // 기본 템플릿이 없어도 에러가 아니라 null로 처리
    return data ? mapToTemplate(data) : null
  } catch (error) {
    console.error('Error fetching default template:', error)
    return null
  }
}

/**
 * 템플릿 ID로 조회
 * @param {string} templateId
 * @returns {Promise<Template|null>}
 */
export async function getTemplateById(templateId) {
  try {
    const { data, error } = await supabase
      .from('namecards')
      .select('*')
      .eq('id', templateId)
      .eq('is_global', true)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return null
      }
      throw error
    }

    return data ? mapToTemplate(data) : null
  } catch (error) {
    console.error('Error fetching template by id:', error)
    return null
  }
}

/**
 * 템플릿 저장
 * @param {Omit<Template, 'id' | 'createdAt' | 'updatedAt'>} template
 * @returns {Promise<Template>}
 */
export async function saveTemplate(template) {
  try {
    // UUID 생성 (브라우저 환경)
    let id
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      id = crypto.randomUUID()
    } else {
      // Fallback: 간단한 UUID v4 생성
      id = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0
        const v = c === 'x' ? r : (r & 0x3 | 0x8)
        return v.toString(16)
      })
    }

    const { data, error } = await supabase
      .from('namecards')
      .insert([{
        id: id, // 명시적으로 UUID 제공
        event_id: null, // 전역 템플릿은 event_id가 null
        template_name: template.templateName,
        canvas_json: template.canvasJson,
        is_default: template.isDefault || false,
        is_global: true, // 항상 전역 템플릿
        template_settings: template.templateSettings,
        paper_width_cm: template.paperWidthCm || 9.0,
        paper_height_cm: template.paperHeightCm || 12.5,
        background_image_url: template.backgroundImageUrl,
        print_areas: template.printAreas
      }])
      .select()
      .single()

    if (error) throw error

    return mapToTemplate(data)
  } catch (error) {
    console.error('Error saving template:', error)
    throw error
  }
}

/**
 * 템플릿 업데이트
 * @param {string} templateId
 * @param {Partial<Omit<Template, 'id' | 'createdAt' | 'updatedAt'>>} updates
 * @returns {Promise<Template>}
 */
export async function updateTemplate(templateId, updates) {
  try {
    const updateData = {}
    
    if (updates.templateName !== undefined) updateData.template_name = updates.templateName
    if (updates.canvasJson !== undefined) updateData.canvas_json = updates.canvasJson
    if (updates.isDefault !== undefined) updateData.is_default = updates.isDefault
    if (updates.templateSettings !== undefined) updateData.template_settings = updates.templateSettings
    if (updates.paperWidthCm !== undefined) updateData.paper_width_cm = updates.paperWidthCm
    if (updates.paperHeightCm !== undefined) updateData.paper_height_cm = updates.paperHeightCm
    if (updates.backgroundImageUrl !== undefined) updateData.background_image_url = updates.backgroundImageUrl
    if (updates.printAreas !== undefined) updateData.print_areas = updates.printAreas
    
    updateData.updated_at = new Date().toISOString()

    const { data, error } = await supabase
      .from('namecards')
      .update(updateData)
      .eq('id', templateId)
      .eq('is_global', true)
      .select()
      .single()

    if (error) throw error

    return mapToTemplate(data)
  } catch (error) {
    console.error('Error updating template:', error)
    throw error
  }
}

/**
 * 템플릿 삭제
 * @param {string} templateId
 * @returns {Promise<void>}
 */
export async function deleteTemplate(templateId) {
  try {
    const { error } = await supabase
      .from('namecards')
      .delete()
      .eq('id', templateId)
      .eq('is_global', true)

    if (error) throw error
  } catch (error) {
    console.error('Error deleting template:', error)
    throw error
  }
}

/**
 * 기본 템플릿 설정
 * @param {string} templateId
 * @returns {Promise<Template>}
 */
export async function setDefaultTemplate(templateId) {
  try {
    // 먼저 모든 전역 템플릿을 기본값 해제
    await supabase
      .from('namecards')
      .update({ is_default: false })
      .eq('is_global', true)

    // 선택된 템플릿을 기본값으로 설정
    return await updateTemplate(templateId, { isDefault: true })
  } catch (error) {
    console.error('Error setting default template:', error)
    throw error
  }
}

/**
 * 템플릿 복사
 * @param {string} templateId
 * @param {string} newTemplateName
 * @returns {Promise<Template>}
 */
export async function duplicateTemplate(templateId, newTemplateName) {
  try {
    const original = await getTemplateById(templateId)
    if (!original) {
      throw new Error('Template not found')
    }

    return await saveTemplate({
      eventId: null,
      templateName: newTemplateName,
      canvasJson: original.canvasJson,
      isDefault: false,
      isGlobal: true,
      templateSettings: original.templateSettings,
      paperWidthCm: original.paperWidthCm,
      paperHeightCm: original.paperHeightCm,
      backgroundImageUrl: original.backgroundImageUrl,
      printAreas: original.printAreas
    })
  } catch (error) {
    console.error('Error duplicating template:', error)
    throw error
  }
}

/**
 * DB 데이터를 Template 객체로 변환
 * @param {any} data
 * @returns {Template}
 */
function mapToTemplate(data) {
  return {
    id: data.id,
    eventId: data.event_id,
    templateName: data.template_name,
    canvasJson: data.canvas_json,
    isDefault: data.is_default || false,
    isGlobal: data.is_global || false,
    templateSettings: data.template_settings,
    paperWidthCm: data.paper_width_cm || 9.0,
    paperHeightCm: data.paper_height_cm || 12.5,
    backgroundImageUrl: data.background_image_url,
    printAreas: data.print_areas,
    createdAt: data.created_at,
    updatedAt: data.updated_at
  }
}

