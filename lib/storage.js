import { supabase } from './supabaseClient'

const BUCKET_NAME = 'namecard-images'

/**
 * 이미지 파일 업로드
 */
export async function uploadImage(file, fileName) {
  try {
    // 파일 타입 검증
    if (!file.type.startsWith('image/')) {
      throw new Error('파일은 이미지 형식이어야 합니다.')
    }
    
    // 파일 크기 제한 (5MB)
    const maxSize = 5 * 1024 * 1024
    if (file.size > maxSize) {
      throw new Error('파일 크기는 5MB를 초과할 수 없습니다.')
    }
    
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      })
    
    if (error) throw error
    
    // 공개 URL 생성
    const { data: urlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(fileName)
    
    return { 
      data: { ...data, publicUrl: urlData.publicUrl }, 
      error: null 
    }
  } catch (error) {
    console.error('Error uploading image:', error)
    return { data: null, error }
  }
}

/**
 * 이미지 삭제
 */
export async function deleteImage(fileName) {
  try {
    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .remove([fileName])
    
    if (error) throw error
    return { error: null }
  } catch (error) {
    console.error('Error deleting image:', error)
    return { error }
  }
}

/**
 * 모든 이미지 목록 조회
 */
export async function listImages() {
  try {
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .list()
    
    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('Error listing images:', error)
    return { data: null, error }
  }
}

/**
 * 이미지 공개 URL 생성
 */
export function getImagePublicUrl(fileName) {
  const { data } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(fileName)
  
  return data.publicUrl
}
