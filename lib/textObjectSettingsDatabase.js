import { supabase } from './supabaseClient'

/**
 * 텍스트 객체 설정 저장
 */
export async function saveTextObjectSettings(eventId, settings) {
  try {
    console.log('Saving text object settings:', { eventId, settings })
    
    // 기존 설정이 있는지 확인
    const { data: existing } = await supabase
      .from('text_object_settings')
      .select('id')
      .eq('event_id', eventId)
      .maybeSingle()
    
    let result
    if (existing) {
      // 업데이트
      const { data, error } = await supabase
        .from('text_object_settings')
        .update({
          text_content: settings.textContent || '',
          left_position: settings.left || 170,
          top_position: settings.top || 236,
          font_size: settings.fontSize || 32,
          font_family: settings.fontFamily || 'Arial',
          font_weight: settings.fontWeight || 'bold',
          fill_color: settings.fill || '#000000',
          text_align: settings.textAlign || 'center',
          origin_x: settings.originX || 'center',
          origin_y: settings.originY || 'center',
          angle: settings.angle || 0,
          opacity: settings.opacity || 1.0,
          scale_x: settings.scaleX || 1.0,
          scale_y: settings.scaleY || 1.0,
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id)
        .select()
        .single()
      
      if (error) throw error
      result = { data, error: null }
    } else {
      // 새로 생성
      const { data, error } = await supabase
        .from('text_object_settings')
        .insert([{
          event_id: eventId,
          text_content: settings.textContent || '',
          left_position: settings.left || 170,
          top_position: settings.top || 236,
          font_size: settings.fontSize || 32,
          font_family: settings.fontFamily || 'Arial',
          font_weight: settings.fontWeight || 'bold',
          fill_color: settings.fill || '#000000',
          text_align: settings.textAlign || 'center',
          origin_x: settings.originX || 'center',
          origin_y: settings.originY || 'center',
          angle: settings.angle || 0,
          opacity: settings.opacity || 1.0,
          scale_x: settings.scaleX || 1.0,
          scale_y: settings.scaleY || 1.0
        }])
        .select()
        .single()
      
      if (error) throw error
      result = { data, error: null }
    }
    
    console.log('Text object settings saved successfully')
    return result
  } catch (error) {
    console.error('Error saving text object settings:', error)
    return { data: null, error }
  }
}

/**
 * 텍스트 객체 설정 불러오기
 */
export async function getTextObjectSettings(eventId) {
  try {
    const { data, error } = await supabase
      .from('text_object_settings')
      .select('*')
      .eq('event_id', eventId)
      .maybeSingle()
    
    if (error) throw error
    
    if (!data) {
      return { data: null, error: null } // 설정이 없으면 null 반환
    }
    
    // 데이터베이스 형식을 객체 형식으로 변환
    const settings = {
      id: data.id,
      textContent: data.text_content,
      left: parseFloat(data.left_position),
      top: parseFloat(data.top_position),
      fontSize: data.font_size,
      fontFamily: data.font_family,
      fontWeight: data.font_weight,
      fill: data.fill_color,
      textAlign: data.text_align,
      originX: data.origin_x,
      originY: data.origin_y,
      angle: parseFloat(data.angle),
      opacity: parseFloat(data.opacity),
      scaleX: parseFloat(data.scale_x),
      scaleY: parseFloat(data.scale_y),
      createdAt: data.created_at,
      updatedAt: data.updated_at
    }
    
    return { data: settings, error: null }
  } catch (error) {
    console.error('Error loading text object settings:', error)
    return { data: null, error }
  }
}

/**
 * 기본 설정으로 초기화
 */
export function getDefaultTextObjectSettings() {
  return {
    textContent: '이름',
    left: 170,
    top: 236,
    fontSize: 32,
    fontFamily: 'Arial',
    fontWeight: 'bold',
    fill: '#000000',
    textAlign: 'center',
    originX: 'center',
    originY: 'center',
    angle: 0,
    opacity: 1.0,
    scaleX: 1.0,
    scaleY: 1.0
  }
}

