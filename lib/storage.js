import { supabase } from './supabaseClient'

const BUCKET_NAME = 'namecard-images'

/**
 * 파일명을 안전하게 변환
 */
function sanitizeFileName(fileName) {
  // 특수문자 제거 및 안전한 문자로 변환
  return fileName
    .replace(/[^a-zA-Z0-9._-]/g, '_') // 영문, 숫자, 점, 언더스코어, 하이픈만 허용
    .replace(/_{2,}/g, '_') // 연속된 언더스코어를 하나로
    .replace(/^_+|_+$/g, '') // 앞뒤 언더스코어 제거
    .toLowerCase() // 소문자로 변환
}

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
    
    // 파일명 안전하게 변환
    const safeFileName = sanitizeFileName(fileName)
    
    // 파일명이 비어있거나 너무 짧으면 기본값 사용
    if (!safeFileName || safeFileName.length < 3) {
      const timestamp = Date.now()
      const extension = file.name.split('.').pop() || 'png'
      const defaultName = `image_${timestamp}.${extension}`
      fileName = defaultName
    } else {
      fileName = safeFileName
    }
    
    console.log('Uploading file:', { originalName: file.name, safeFileName: fileName })
    
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
 * 이미지 공개 URL 생성
 */
export function getImagePublicUrl(fileName) {
  const { data } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(fileName)
  
  return data.publicUrl
}

/**
 * 버킷의 모든 이미지 목록 조회
 */
export async function listImages() {
  try {
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .list('', {
        limit: 100,
        offset: 0,
        sortBy: { column: 'created_at', order: 'desc' }
      })
    
    if (error) throw error
    
    // 이미지 파일만 필터링
    const imageFiles = data.filter(file => 
      file.name.match(/\.(jpg|jpeg|png|gif|webp)$/i)
    )
    
    // 각 이미지의 공개 URL 생성
    const imagesWithUrl = imageFiles.map(file => ({
      name: file.name,
      size: file.metadata?.size || 0,
      created_at: file.created_at,
      url: getImagePublicUrl(file.name),
      id: file.id
    }))
    
    return { data: imagesWithUrl, error: null }
  } catch (error) {
    console.error('Error listing images:', error)
    return { data: null, error }
  }
}

/**
 * 이미지 파일명 중복 확인
 */
export async function checkImageExists(fileName) {
  try {
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .list('', {
        search: fileName
      })
    
    if (error) throw error
    
    return { exists: data.length > 0, error: null }
  } catch (error) {
    console.error('Error checking image existence:', error)
    return { exists: false, error }
  }
}