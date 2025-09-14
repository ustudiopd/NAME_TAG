'use client'

import { useState, useEffect, useRef } from 'react'
import { uploadImage, listImages, deleteImage, checkImageExists } from '../lib/storage'

export default function ImageUploadLibrary({ onImageSelect, onImageUpload, type = 'image' }) {
  const [isDragging, setIsDragging] = useState(false)
  const [uploadedImages, setUploadedImages] = useState([])
  const [libraryImages, setLibraryImages] = useState([])
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [activeTab, setActiveTab] = useState('library') // 'library' or 'upload'
  const [searchTerm, setSearchTerm] = useState('')
  const [showDuplicateWarning, setShowDuplicateWarning] = useState(false)
  const [duplicateFileName, setDuplicateFileName] = useState('')
  const fileInputRef = useRef(null)

  // 컴포넌트 마운트 시 이미지 라이브러리 로드
  useEffect(() => {
    loadImageLibrary()
  }, [])

  // 이미지 라이브러리 로드
  const loadImageLibrary = async () => {
    try {
      setLoading(true)
      const { data, error } = await listImages()
      if (error) throw error
      setLibraryImages(data || [])
    } catch (err) {
      console.error('Error loading image library:', err)
    } finally {
      setLoading(false)
    }
  }

  // 파일 선택 처리
  const handleFileSelect = async (files) => {
    const imageFiles = Array.from(files).filter(file => 
      file.type.startsWith('image/')
    )

    for (const file of imageFiles) {
      await handleSingleFileUpload(file)
    }
  }

  // 단일 파일 업로드 처리
  const handleSingleFileUpload = async (file) => {
    try {
      setUploading(true)
      
      // 파일명 중복 확인
      const { exists } = await checkImageExists(file.name)
      if (exists) {
        setDuplicateFileName(file.name)
        setShowDuplicateWarning(true)
        return
      }

      // 고유한 파일명 생성 (안전한 문자만 사용)
      const timestamp = Date.now()
      const extension = file.name.split('.').pop() || 'png'
      const baseName = file.name.replace(/\.[^/.]+$/, '') // 확장자 제거
      const safeBaseName = baseName.replace(/[^a-zA-Z0-9._-]/g, '_').toLowerCase()
      const fileName = `${type}_${timestamp}_${safeBaseName}.${extension}`
      
      // Supabase에 업로드
      const { data, error } = await uploadImage(file, fileName)
      if (error) throw error

      const imageData = {
        id: Date.now() + Math.random(),
        name: file.name,
        fileName: fileName,
        url: data.publicUrl,
        file: file,
        created_at: new Date().toISOString()
      }
      
      setUploadedImages(prev => [...prev, imageData])
      setLibraryImages(prev => [imageData, ...prev])
      
      if (onImageUpload) {
        onImageUpload(imageData)
      }
      
    } catch (err) {
      console.error('Error uploading file:', err)
      alert(`이미지 업로드 중 오류가 발생했습니다: ${err.message}`)
    } finally {
      setUploading(false)
    }
  }

  // 드래그 앤 드롭 처리
  const handleDragOver = (e) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setIsDragging(false)
    
    const files = e.dataTransfer.files
    handleFileSelect(files)
  }

  // 파일 입력 처리
  const handleFileInputChange = (e) => {
    const files = e.target.files
    handleFileSelect(files)
  }

  // 이미지 선택 처리
  const handleImageClick = (image) => {
    if (onImageSelect) {
      onImageSelect(image)
    }
  }

  // 이미지 삭제 처리
  const handleDeleteImage = async (image) => {
    if (!confirm('이 이미지를 삭제하시겠습니까?')) return

    try {
      const { error } = await deleteImage(image.fileName)
      if (error) throw error

      setLibraryImages(prev => prev.filter(img => img.id !== image.id))
      setUploadedImages(prev => prev.filter(img => img.id !== image.id))
      
      alert('이미지가 삭제되었습니다.')
    } catch (err) {
      console.error('Error deleting image:', err)
      alert('이미지 삭제 중 오류가 발생했습니다.')
    }
  }

  // 중복 파일명 경고 처리
  const handleDuplicateConfirm = async () => {
    setShowDuplicateWarning(false)
    // 기존 파일을 덮어쓰거나 새 이름으로 업로드
    const file = fileInputRef.current?.files?.[0]
    if (file) {
      const newFileName = `${type}_${Date.now()}_${file.name}`
      await handleSingleFileUpload(file)
    }
  }

  // 검색 필터링
  const filteredImages = libraryImages.filter(img => 
    img.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // 파일 크기 포맷팅
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* 탭 메뉴 */}
      <div className="flex border-b border-gray-200 mb-4">
        <button
          onClick={() => setActiveTab('library')}
          className={`px-4 py-2 text-sm font-medium ${
            activeTab === 'library'
              ? 'border-b-2 border-blue-500 text-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          이미지 라이브러리 ({libraryImages.length})
        </button>
        <button
          onClick={() => setActiveTab('upload')}
          className={`px-4 py-2 text-sm font-medium ${
            activeTab === 'upload'
              ? 'border-b-2 border-blue-500 text-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          새 이미지 업로드
        </button>
      </div>

      {/* 이미지 라이브러리 탭 */}
      {activeTab === 'library' && (
        <div>
          {/* 검색 바 */}
          <div className="mb-4">
            <input
              type="text"
              placeholder="이미지 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* 이미지 그리드 */}
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-sm text-gray-500 mt-2">이미지를 불러오는 중...</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {filteredImages.map((image) => (
                <div
                  key={image.id}
                  className="relative group cursor-pointer border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow"
                  onClick={() => handleImageClick(image)}
                >
                  <img
                    src={image.url}
                    alt={image.name}
                    className="w-full h-24 object-cover"
                  />
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-200 flex items-center justify-center">
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleImageClick(image)
                        }}
                        className="bg-blue-500 text-white px-3 py-1 rounded text-xs mr-1"
                      >
                        선택
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeleteImage(image)
                        }}
                        className="bg-red-500 text-white px-3 py-1 rounded text-xs"
                      >
                        삭제
                      </button>
                    </div>
                  </div>
                  <div className="p-2">
                    <p className="text-xs text-gray-600 truncate" title={image.name}>
                      {image.name}
                    </p>
                    <p className="text-xs text-gray-400">
                      {formatFileSize(image.size)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {filteredImages.length === 0 && !loading && (
            <div className="text-center py-8 text-gray-500">
              {searchTerm ? '검색 결과가 없습니다.' : '업로드된 이미지가 없습니다.'}
            </div>
          )}
        </div>
      )}

      {/* 새 이미지 업로드 탭 */}
      {activeTab === 'upload' && (
        <div>
          {/* 업로드 영역 */}
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              isDragging 
                ? 'border-blue-400 bg-blue-50' 
                : 'border-gray-300 hover:border-gray-400'
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="text-gray-400 text-4xl mb-2">📷</div>
            <p className="text-sm text-gray-600 mb-1">
              이미지를 드래그하거나 클릭하여 업로드
            </p>
            <p className="text-xs text-gray-500">
              JPG, PNG, GIF, WebP 파일 지원 (최대 5MB)
            </p>
            {uploading && (
              <div className="mt-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                <p className="text-sm text-gray-500 mt-2">업로드 중...</p>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*"
              onChange={handleFileInputChange}
              className="hidden"
            />
          </div>

          {/* 최근 업로드된 이미지 */}
          {uploadedImages.length > 0 && (
            <div className="mt-6">
              <h3 className="text-sm font-medium text-gray-700 mb-3">최근 업로드된 이미지</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {uploadedImages.map((image) => (
                  <div
                    key={image.id}
                    className="relative group cursor-pointer border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow"
                    onClick={() => handleImageClick(image)}
                  >
                    <img
                      src={image.url}
                      alt={image.name}
                      className="w-full h-24 object-cover"
                    />
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-200 flex items-center justify-center">
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleImageClick(image)
                          }}
                          className="bg-blue-500 text-white px-3 py-1 rounded text-xs"
                        >
                          선택
                        </button>
                      </div>
                    </div>
                    <div className="p-2">
                      <p className="text-xs text-gray-600 truncate" title={image.name}>
                        {image.name}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 중복 파일명 경고 모달 */}
      {showDuplicateWarning && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">파일명 중복</h3>
            <p className="text-sm text-gray-600 mb-4">
              "{duplicateFileName}" 파일이 이미 존재합니다. 덮어쓰시겠습니까?
            </p>
            <div className="flex space-x-3">
              <button
                onClick={() => setShowDuplicateWarning(false)}
                className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                취소
              </button>
              <button
                onClick={handleDuplicateConfirm}
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
              >
                덮어쓰기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
