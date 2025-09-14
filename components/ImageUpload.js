'use client'

import { useState, useRef } from 'react'

export default function ImageUpload({ onImageUpload, onImageSelect }) {
  const [isDragging, setIsDragging] = useState(false)
  const [uploadedImages, setUploadedImages] = useState([])
  const fileInputRef = useRef(null)

  const handleFileSelect = (files) => {
    const imageFiles = Array.from(files).filter(file => 
      file.type.startsWith('image/')
    )

    imageFiles.forEach(file => {
      const reader = new FileReader()
      reader.onload = (e) => {
        const imageData = {
          id: Date.now() + Math.random(),
          name: file.name,
          url: e.target.result,
          file: file
        }
        
        setUploadedImages(prev => [...prev, imageData])
        
        if (onImageUpload) {
          onImageUpload(imageData)
        }
      }
      reader.readAsDataURL(file)
    })
  }

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

  const handleFileInputChange = (e) => {
    const files = e.target.files
    handleFileSelect(files)
  }

  const handleImageClick = (image) => {
    if (onImageSelect) {
      onImageSelect(image)
    }
  }

  const removeImage = (imageId) => {
    setUploadedImages(prev => prev.filter(img => img.id !== imageId))
  }

  return (
    <div className="w-full">
      {/* 업로드 영역 */}
      <div
        className={`border-2 border-dashed rounded-lg p-4 text-center transition-colors ${
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
          JPG, PNG, GIF 파일 지원
        </p>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*"
          onChange={handleFileInputChange}
          className="hidden"
        />
      </div>

      {/* 업로드된 이미지 목록 */}
      {uploadedImages.length > 0 && (
        <div className="mt-4">
          <h4 className="text-sm font-semibold text-gray-900 mb-2">
            업로드된 이미지 ({uploadedImages.length})
          </h4>
          <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto">
            {uploadedImages.map((image) => (
              <div
                key={image.id}
                className="relative group cursor-pointer"
                onClick={() => handleImageClick(image)}
              >
                <img
                  src={image.url}
                  alt={image.name}
                  className="w-full h-16 object-cover rounded border border-gray-200 hover:border-blue-400 transition-colors"
                />
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all rounded flex items-center justify-center">
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    removeImage(image.id)
                  }}
                  className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-xs hover:bg-red-600 transition-colors"
                >
                  ×
                </button>
                <p className="text-xs text-gray-500 mt-1 truncate" title={image.name}>
                  {image.name}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

