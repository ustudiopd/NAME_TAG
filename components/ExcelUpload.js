'use client'

import { useState, useRef, useCallback } from 'react'
import * as XLSX from 'xlsx'
import { createProfilesBulk } from '../lib/database'
import { generateSampleExcel, validateExcelFile } from '../lib/excelUtils'
import ColumnMapping from './ColumnMapping'

export default function ExcelUpload({ onUploadComplete, onClose, eventId }) {
  const [isDragOver, setIsDragOver] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState(null)
  const [previewData, setPreviewData] = useState(null)
  const [showColumnMapping, setShowColumnMapping] = useState(false)
  const [rawData, setRawData] = useState(null)
  const fileInputRef = useRef(null)

  // 파일 처리 함수
  const processFile = useCallback(async (file) => {
    if (!file) return

    // 파일 검증
    const validation = validateExcelFile(file)
    if (!validation.valid) {
      setError(validation.error)
      return
    }

    try {
      setIsProcessing(true)
      setError(null)
      setProgress(10)

      // 파일 읽기
      const data = await file.arrayBuffer()
      setProgress(30)

      // XLSX로 파싱
      const workbook = XLSX.read(data, { type: 'array' })
      const sheetName = workbook.SheetNames[0]
      const worksheet = workbook.Sheets[sheetName]
      setProgress(50)

      // JSON으로 변환
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 })
      setProgress(70)

      if (jsonData.length < 2) {
        setError('데이터가 충분하지 않습니다. 최소 2행(헤더 + 데이터)이 필요합니다.')
        return
      }

      // 원본 데이터 저장
      setRawData({
        headers: jsonData[0].map(h => h?.toString().trim()),
        data: jsonData,
        fileName: file.name
      })

      // 컬럼 매핑 화면으로 이동
      setShowColumnMapping(true)

      setProgress(100)
    } catch (err) {
      console.error('File processing error:', err)
      setError('파일 처리 중 오류가 발생했습니다: ' + err.message)
    } finally {
      setIsProcessing(false)
    }
  }, [])


  // 실제 업로드 실행
  const handleUpload = async () => {
    if (!previewData) return

    try {
      setIsProcessing(true)
      setError(null)

      const { data, error } = await createProfilesBulk(previewData.profiles)

      if (error) {
        setError('데이터 업로드 중 오류가 발생했습니다: ' + error.message)
      } else {
        // 성공
        onUploadComplete?.(data)
        onClose?.()
      }
    } catch (err) {
      setError('업로드 중 오류가 발생했습니다: ' + err.message)
    } finally {
      setIsProcessing(false)
    }
  }

  // 드래그 이벤트 핸들러
  const handleDragOver = (e) => {
    e.preventDefault()
    setIsDragOver(true)
  }

  const handleDragLeave = (e) => {
    e.preventDefault()
    setIsDragOver(false)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setIsDragOver(false)
    
    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      processFile(files[0])
    }
  }

  // 파일 선택 핸들러
  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files)
    if (files.length > 0) {
      processFile(files[0])
    }
  }

  // 파일 선택 버튼 클릭
  const handleSelectFile = () => {
    fileInputRef.current?.click()
  }

  // 컬럼 매핑 완료
  const handleMappingComplete = (profiles) => {
    setPreviewData({
      profiles,
      totalCount: profiles.length,
      fileName: rawData.fileName
    })
    setShowColumnMapping(false)
  }

  // 컬럼 매핑 취소
  const handleMappingCancel = () => {
    setShowColumnMapping(false)
    setRawData(null)
    setProgress(0)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-semibold mb-4">엑셀 파일 업로드</h2>

        {showColumnMapping ? (
          <ColumnMapping
            headers={rawData?.headers}
            sampleData={rawData?.data}
            onMappingComplete={handleMappingComplete}
            onCancel={handleMappingCancel}
            eventId={eventId}
          />
        ) : !previewData ? (
          <div>
            {/* 파일 업로드 영역 */}
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                isDragOver 
                  ? 'border-blue-500 bg-blue-50' 
                  : 'border-gray-300 hover:border-gray-400'
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <div className="space-y-4">
                <div className="text-4xl">📊</div>
                <div>
                  <p className="text-lg font-medium text-gray-700">
                    엑셀 파일을 드래그하거나 클릭하여 선택하세요
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    .xlsx, .xls, .csv 파일 지원 (최대 10MB)
                  </p>
                </div>
                
                <div className="flex space-x-2">
                  <button
                    onClick={handleSelectFile}
                    disabled={isProcessing}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                  >
                    파일 선택
                  </button>
                  <button
                    onClick={generateSampleExcel}
                    disabled={isProcessing}
                    className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:opacity-50"
                  >
                    샘플 다운로드
                  </button>
                </div>
                
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>
            </div>

            {/* 파일 형식 안내 */}
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <h3 className="font-medium text-gray-700 mb-2">파일 형식 안내</h3>
              <div className="text-sm text-gray-600 space-y-1">
                <p>• 첫 번째 행은 헤더여야 합니다</p>
                <p>• <strong>이름</strong> 컬럼은 필수입니다</p>
                <p>• <strong>회사명</strong>, <strong>직급</strong> 컬럼은 선택사항입니다</p>
                <p>• 업로드 후 컬럼을 직접 매핑할 수 있습니다</p>
                <p>• 컬럼명은 자유롭게 설정 가능합니다</p>
              </div>
            </div>
          </div>
        ) : (
          <div>
            {/* 미리보기 */}
            <div className="mb-4">
              <h3 className="font-medium text-gray-700 mb-2">
                업로드할 데이터 미리보기 ({previewData.totalCount}개)
              </h3>
              <p className="text-sm text-gray-500">파일: {previewData.fileName}</p>
            </div>

            <div className="max-h-64 overflow-y-auto border rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-3 py-2 text-left">이름</th>
                    <th className="px-3 py-2 text-left">회사명</th>
                    <th className="px-3 py-2 text-left">직급</th>
                  </tr>
                </thead>
                <tbody>
                  {previewData.profiles.slice(0, 10).map((profile, index) => (
                    <tr key={index} className="border-t">
                      <td className="px-3 py-2">{profile.name}</td>
                      <td className="px-3 py-2">{profile.company || '-'}</td>
                      <td className="px-3 py-2">{profile.title || '-'}</td>
                    </tr>
                  ))}
                  {previewData.profiles.length > 10 && (
                    <tr className="border-t bg-gray-50">
                      <td colSpan="3" className="px-3 py-2 text-center text-gray-500">
                        ... 외 {previewData.profiles.length - 10}개 더
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 진행률 표시 */}
        {isProcessing && (
          <div className="mt-4">
            <div className="flex justify-between text-sm text-gray-600 mb-1">
              <span>처리 중...</span>
              <span>{progress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {/* 에러 메시지 */}
        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        {/* 버튼들 */}
        <div className="flex space-x-3 mt-6">
          {previewData ? (
            <>
              <button
                onClick={handleUpload}
                disabled={isProcessing}
                className="flex-1 bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 disabled:opacity-50"
              >
                {isProcessing ? '업로드 중...' : '업로드 실행'}
              </button>
              <button
                onClick={() => {
                  setPreviewData(null)
                  setError(null)
                  setProgress(0)
                }}
                disabled={isProcessing}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 disabled:opacity-50"
              >
                다시 선택
              </button>
            </>
          ) : null}
          
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 disabled:opacity-50"
          >
            취소
          </button>
        </div>
      </div>
    </div>
  )
}
