'use client'

import { useState } from 'react'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import JSZip from 'jszip'
import { fabric } from 'fabric'

export default function OutputPanel({ 
  canvasRef, 
  selectedProfile, 
  profiles = [], 
  selectedProfiles = [],
  updateCanvasWithProfile,
  selectionMode = 'individual' // 선택모드 추가
}) {
  const [isExporting, setIsExporting] = useState(false)
  const [exportProgress, setExportProgress] = useState(0)
  const [printSettings, setPrintSettings] = useState({
    offsetX: 0, // mm 미세 조정
    offsetY: 0, // mm 미세 조정
    includeBackground: false, // 배경 이미지 포함 여부
    includeText: true, // 텍스트 포함 여부
    includeImages: true, // 편집 이미지 포함 여부
    includeQR: true // QR코드 포함 여부
  })

  // 선택적 인쇄를 위한 캔버스 필터링
  const getFilteredCanvasDataURL = (canvas) => {
    if (!canvas) return null

    // 원본 캔버스의 모든 객체 가져오기
    const objects = canvas.getObjects()
    
    // 임시 캔버스 생성
    const tempCanvas = new fabric.Canvas(null, {
      width: canvas.width,
      height: canvas.height,
      backgroundColor: '#ffffff'
    })

    // 설정에 따라 객체 필터링하여 임시 캔버스에 추가
    objects.forEach(obj => {
      let shouldInclude = false

      // 객체 타입별 포함 여부 결정
      switch (obj.type) {
        case 'i-text':
          shouldInclude = printSettings.includeText
          break
        case 'image':
          shouldInclude = printSettings.includeImages
          break
        case 'background':
          shouldInclude = printSettings.includeBackground
          break
        case 'editable':
          shouldInclude = printSettings.includeImages
          break
        case 'qr':
          shouldInclude = printSettings.includeQR
          break
        case 'border':
          shouldInclude = false // 경계선은 인쇄 시 제외
          break
        default:
          // 기본적으로 텍스트로 처리
          shouldInclude = printSettings.includeText
      }

      if (shouldInclude) {
        // 객체 복제하여 임시 캔버스에 추가
        obj.clone((cloned) => {
          // 미세 조정 적용
          cloned.set({
            left: (cloned.left || 0) + printSettings.offsetX * 3.78, // mm to px 변환 (대략)
            top: (cloned.top || 0) + printSettings.offsetY * 3.78
          })
          tempCanvas.add(cloned)
        })
      }
    })

    tempCanvas.renderAll()
    
    // 임시 캔버스를 이미지로 변환 (고해상도)
    const dataURL = tempCanvas.toDataURL({
      format: 'png',
      quality: 1,
      multiplier: 4 // 해상도를 4배로 증가 (2배 → 4배)
    })

    // 임시 캔버스 정리
    tempCanvas.dispose()
    
    return dataURL
  }

  // 개별 명찰 PDF 출력
  const exportToPDF = async () => {
    if (!canvasRef || !selectedProfile) return

    try {
      setIsExporting(true)
      
      // 캔버스를 이미지로 변환
      const canvas = canvasRef
      const dataURL = canvas.toDataURL({
        format: 'png',
        quality: 1,
        multiplier: 2
      })

      // PDF 생성 (A4 사이즈)
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      })

      // 명찰 크기 계산 (85mm x 54mm - 표준 명함 크기)
      const cardWidth = 85
      const cardHeight = 54
      
      // A4 중앙에 배치
      const x = (210 - cardWidth) / 2  // A4 width = 210mm
      const y = (297 - cardHeight) / 2  // A4 height = 297mm

      // 이미지 추가
      pdf.addImage(dataURL, 'PNG', x, y, cardWidth, cardHeight)

      // 파일명 생성
      const fileName = `명찰_${selectedProfile.name}_${selectedProfile.company || ''}.pdf`
      
      // 다운로드
      pdf.save(fileName)
      
    } catch (error) {
      console.error('PDF 출력 오류:', error)
      alert('PDF 출력 중 오류가 발생했습니다.')
    } finally {
      setIsExporting(false)
    }
  }

  // 개별 명찰 이미지 출력
  const exportToImage = async () => {
    if (!canvasRef || !selectedProfile) return

    try {
      setIsExporting(true)
      
      // 캔버스를 이미지로 변환
      const canvas = canvasRef
      const dataURL = canvas.toDataURL({
        format: 'png',
        quality: 1,
        multiplier: 3  // 고해상도
      })

      // 다운로드 링크 생성
      const link = document.createElement('a')
      link.download = `명찰_${selectedProfile.name}_${selectedProfile.company || ''}.png`
      link.href = dataURL
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
    } catch (error) {
      console.error('이미지 출력 오류:', error)
      alert('이미지 출력 중 오류가 발생했습니다.')
    } finally {
      setIsExporting(false)
    }
  }

  // 일괄 출력 (선택된 명단들)
  const exportBatch = async (format = 'pdf') => {
    if (!canvasRef || selectedProfiles.length === 0) return

    try {
      setIsExporting(true)
      setExportProgress(0)

      const zip = new JSZip()
      const targetProfiles = profiles.filter(p => selectedProfiles.includes(p.id))

      for (let i = 0; i < targetProfiles.length; i++) {
        const profile = targetProfiles[i]
        setExportProgress(Math.round(((i + 1) / targetProfiles.length) * 100))

        // 캔버스에 프로필 데이터 적용 (임시)
        await updateCanvasWithProfileData(profile)
        
        // 잠시 대기 (렌더링 완료 대기)
        await new Promise(resolve => setTimeout(resolve, 500))

        if (format === 'pdf') {
          // PDF 생성
          const dataURL = canvasRef.toDataURL({
            format: 'png',
            quality: 1,
            multiplier: 2
          })

          const pdf = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4'
          })

          const cardWidth = 85
          const cardHeight = 54
          const x = (210 - cardWidth) / 2
          const y = (297 - cardHeight) / 2

          pdf.addImage(dataURL, 'PNG', x, y, cardWidth, cardHeight)
          
          const pdfBlob = pdf.output('blob')
          zip.file(`명찰_${profile.name}_${profile.company || ''}.pdf`, pdfBlob)
          
        } else {
          // 이미지 생성
          const dataURL = canvasRef.toDataURL({
            format: 'png',
            quality: 1,
            multiplier: 3
          })

          // Base64를 Blob으로 변환
          const response = await fetch(dataURL)
          const blob = await response.blob()
          
          zip.file(`명찰_${profile.name}_${profile.company || ''}.png`, blob)
        }
      }

      // ZIP 파일 다운로드
      const zipBlob = await zip.generateAsync({ type: 'blob' })
      const link = document.createElement('a')
      link.download = `명찰_일괄출력_${targetProfiles.length}개.zip`
      link.href = URL.createObjectURL(zipBlob)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(link.href)

    } catch (error) {
      console.error('일괄 출력 오류:', error)
      alert('일괄 출력 중 오류가 발생했습니다.')
    } finally {
      setIsExporting(false)
      setExportProgress(0)
    }
  }

  // 캔버스에 프로필 데이터 적용 (일괄 출력용)
  const updateCanvasWithProfileData = async (profile) => {
    if (!canvasRef) return

    return new Promise((resolve) => {
      if (updateCanvasWithProfile) {
        // 외부 함수 사용
        updateCanvasWithProfile(profile)
        setTimeout(resolve, 100) // 렌더링 완료 대기
      } else {
        // 내부 함수 사용 (fallback)
        const objects = canvasRef.getObjects()

        objects.forEach((obj) => {
          if (obj.type === 'i-text') {
            // 기본 텍스트를 프로필 데이터로 교체
            if (obj.text === '회사명' || obj.text.includes('회사')) {
              obj.set('text', profile.company || '회사명')
            } else if (obj.text === '이름' || obj.text.includes('이름')) {
              obj.set('text', profile.name || '이름')
            } else if (obj.text === '직급' || obj.text.includes('직급')) {
              obj.set('text', profile.title || '직급')
            }
          }
        })

        canvasRef.renderAll()
        resolve()
      }
    })
  }

  // 프린트 미리보기
  const printPreview = () => {
    if (!canvasRef || !selectedProfile) return

    try {
      const dataURL = canvasRef.toDataURL({
        format: 'png',
        quality: 1,
        multiplier: 2
      })

      // 새 창에서 프린트 미리보기
      const printWindow = window.open('', '_blank')
      printWindow.document.write(`
        <html>
          <head>
            <title>명찰 프린트 미리보기 - ${selectedProfile.name}</title>
            <style>
              body { 
                margin: 0; 
                padding: 20px; 
                display: flex; 
                justify-content: center; 
                align-items: center;
                min-height: 100vh;
                background: #f0f0f0;
              }
              .namecard { 
                width: 85mm; 
                height: 54mm; 
                border: 1px dashed #ccc;
                background: white;
                display: flex;
                justify-content: center;
                align-items: center;
              }
              img { 
                max-width: 100%; 
                max-height: 100%; 
                object-fit: contain;
              }
              @media print {
                body { background: white; }
                .namecard { border: none; }
              }
            </style>
          </head>
          <body>
            <div class="namecard">
              <img src="${dataURL}" alt="명찰" />
            </div>
          </body>
        </html>
      `)
      printWindow.document.close()
    } catch (error) {
      console.error('프린트 미리보기 오류:', error)
      alert('프린트 미리보기 중 오류가 발생했습니다.')
    }
  }

  // 직접 프린터 출력 (9.5cm x 12.5cm 사전 인쇄된 명찰 용지용)
  const printDirect = () => {
    if (!canvasRef || !selectedProfile) return

    try {
      // 선택적 인쇄를 위한 필터링된 이미지 데이터 가져오기
      const dataURL = getFilteredCanvasDataURL(canvasRef)
      if (!dataURL) {
        alert('인쇄할 데이터가 없습니다.')
        return
      }

      // 프린터 출력용 HTML 생성 (9.5cm x 12.5cm 용지)
      const printHTML = `
        <html>
          <head>
            <title>명찰 출력 - ${selectedProfile.name}</title>
            <style>
              @page {
                size: 9cm 12.5cm;
                margin: 0;
              }
              body { 
                margin: 0; 
                padding: 0;
                background: white;
                width: 9cm;
                height: 12.5cm;
                position: relative;
              }
              .namecard { 
                width: 100%;
                height: 100%;
                position: absolute;
                top: 0;
                left: 0;
              }
              img { 
                width: 100%;
                height: 100%;
                object-fit: contain;
                image-rendering: -webkit-optimize-contrast;
                image-rendering: crisp-edges;
                image-rendering: pixelated;
              }
            </style>
          </head>
          <body>
            <div class="namecard">
              <img src="${dataURL}" alt="명찰" />
            </div>
          </body>
        </html>
      `

      // 새 창에서 프린터 출력
      const printWindow = window.open('', '_blank')
      printWindow.document.write(printHTML)
      printWindow.document.close()
      
      // 프린터 다이얼로그 열기
      setTimeout(() => {
        printWindow.print()
      }, 500)
      
    } catch (error) {
      console.error('프린터 출력 오류:', error)
      alert('프린터 출력 중 오류가 발생했습니다.')
    }
  }

  // 일괄 프린터 출력
  const printBatch = async () => {
    if (!canvasRef || selectedProfiles.length === 0) return

    try {
      setIsExporting(true)
      setExportProgress(0)

      const targetProfiles = profiles.filter(p => selectedProfiles.includes(p.id))
      const printHTML = await generateBatchPrintHTML(targetProfiles)

      // 새 창에서 일괄 프린터 출력
      const printWindow = window.open('', '_blank')
      printWindow.document.write(printHTML)
      printWindow.document.close()
      
      // 프린터 다이얼로그 열기
      setTimeout(() => {
        printWindow.print()
      }, 1000)
      
    } catch (error) {
      console.error('일괄 프린터 출력 오류:', error)
      alert('일괄 프린터 출력 중 오류가 발생했습니다.')
    } finally {
      setIsExporting(false)
      setExportProgress(0)
    }
  }

  // 일괄 프린터 출력용 HTML 생성 (9.5cm x 12.5cm 개별 용지)
  const generateBatchPrintHTML = async (targetProfiles) => {
    let html = `
      <html>
        <head>
          <title>명찰 일괄 출력 - ${targetProfiles.length}개</title>
          <style>
            @page {
              size: 9cm 12.5cm;
              margin: 0;
            }
            body { 
              margin: 0; 
              padding: 0;
              background: white;
              font-family: Arial, sans-serif;
            }
            .namecard { 
              width: 9cm;
              height: 12.5cm;
              background: white;
              page-break-after: always;
              position: relative;
            }
            .namecard:last-child {
              page-break-after: auto;
            }
            img { 
              width: 100%;
              height: 100%;
              object-fit: contain;
              image-rendering: -webkit-optimize-contrast;
              image-rendering: crisp-edges;
              image-rendering: pixelated;
            }
          </style>
        </head>
        <body>
    `

    for (let i = 0; i < targetProfiles.length; i++) {
      const profile = targetProfiles[i]
      setExportProgress(Math.round(((i + 1) / targetProfiles.length) * 100))

      // 캔버스에 프로필 데이터 적용
      await updateCanvasWithProfileData(profile)
      
      // 잠시 대기 (렌더링 완료 대기)
      await new Promise(resolve => setTimeout(resolve, 300))

      // 선택적 인쇄를 위한 필터링된 이미지 데이터 가져오기
      const dataURL = getFilteredCanvasDataURL(canvasRef)
      
      if (dataURL) {
        html += `
          <div class="namecard">
            <img src="${dataURL}" alt="명찰 - ${profile.name}" />
          </div>
        `
      }
    }

    html += `
        </body>
      </html>
    `

    return html
  }

  return (
    <div className="p-4 space-y-4">
      {/* 인쇄 설정 */}
      <div className="border-b border-gray-200 pb-4">
        <h4 className="text-sm font-semibold text-gray-900 mb-3">인쇄 설정</h4>
        
        {/* 미세 조정 */}
        <div className="grid grid-cols-2 gap-2 mb-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">X축 조정 (mm)</label>
            <input
              type="number"
              step="0.1"
              value={printSettings.offsetX}
              onChange={(e) => setPrintSettings(prev => ({ ...prev, offsetX: parseFloat(e.target.value) || 0 }))}
              className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Y축 조정 (mm)</label>
            <input
              type="number"
              step="0.1"
              value={printSettings.offsetY}
              onChange={(e) => setPrintSettings(prev => ({ ...prev, offsetY: parseFloat(e.target.value) || 0 }))}
              className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
            />
          </div>
        </div>

        {/* 선택적 인쇄 설정 */}
        <div className="space-y-2">
          <label className="block text-xs font-medium text-gray-700">인쇄 요소 선택</label>
          <div className="grid grid-cols-2 gap-2">
            <label className="flex items-center text-xs">
              <input
                type="checkbox"
                checked={printSettings.includeText}
                onChange={(e) => setPrintSettings(prev => ({ ...prev, includeText: e.target.checked }))}
                className="mr-1"
              />
              텍스트
            </label>
            <label className="flex items-center text-xs">
              <input
                type="checkbox"
                checked={printSettings.includeImages}
                onChange={(e) => setPrintSettings(prev => ({ ...prev, includeImages: e.target.checked }))}
                className="mr-1"
              />
              편집 이미지
            </label>
            <label className="flex items-center text-xs">
              <input
                type="checkbox"
                checked={printSettings.includeQR}
                onChange={(e) => setPrintSettings(prev => ({ ...prev, includeQR: e.target.checked }))}
                className="mr-1"
              />
              QR코드
            </label>
            <label className="flex items-center text-xs">
              <input
                type="checkbox"
                checked={printSettings.includeBackground}
                onChange={(e) => setPrintSettings(prev => ({ ...prev, includeBackground: e.target.checked }))}
                className="mr-1"
              />
              배경 이미지
            </label>
          </div>
        </div>
      </div>

      {/* 개별 출력 */}
      <div className="border-b border-gray-200 pb-4">
        <h4 className="text-sm font-semibold text-gray-900 mb-3">개별 출력</h4>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={exportToPDF}
            disabled={!selectedProfile || isExporting}
            className="flex items-center justify-center px-3 py-2 bg-red-600 text-white text-sm rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            PDF
          </button>
          <button
            onClick={exportToImage}
            disabled={!selectedProfile || isExporting}
            className="flex items-center justify-center px-3 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            이미지
          </button>
        </div>
        <div className="grid grid-cols-2 gap-2 mt-2">
          <button
            onClick={printPreview}
            disabled={!selectedProfile || isExporting}
            className="flex items-center justify-center px-3 py-2 bg-gray-600 text-white text-sm rounded hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            미리보기
          </button>
          <button
            onClick={printDirect}
            disabled={!selectedProfile || isExporting}
            className="flex items-center justify-center px-3 py-2 bg-green-600 text-white text-sm rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            프린터 출력
          </button>
        </div>
      </div>

      {/* 일괄 출력 - 선택모드가 'batch'일 때만 표시 */}
      {selectionMode === 'batch' && (
        <div>
          <h4 className="text-sm font-semibold text-gray-900 mb-3">
            일괄 출력 {selectedProfiles.length > 0 && `(${selectedProfiles.length}개 선택)`}
          </h4>
          
          {/* 선택된 사람이 없을 때 안내 메시지 */}
          {selectedProfiles.length === 0 ? (
            <div className="text-center p-4 text-gray-500 text-sm bg-gray-50 rounded-lg">
              <div className="text-gray-400 text-2xl mb-2">👥</div>
              <div>명단에서 출력할 사람들을 선택해주세요</div>
              <div className="text-xs text-gray-400 mt-1">체크박스를 클릭하여 여러 명을 선택할 수 있습니다</div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => exportBatch('pdf')}
                  disabled={isExporting}
                  className="flex items-center justify-center px-3 py-2 bg-red-600 text-white text-sm rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                  PDF 일괄
                </button>
                <button
                  onClick={() => exportBatch('image')}
                  disabled={isExporting}
                  className="flex items-center justify-center px-3 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  이미지 일괄
                </button>
              </div>
              <button
                onClick={printBatch}
                disabled={isExporting}
                className="w-full mt-2 flex items-center justify-center px-3 py-2 bg-green-600 text-white text-sm rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                일괄 프린터 출력 ({selectedProfiles.length}개)
              </button>
            </>
          )}
        </div>
      )}

      {/* 진행률 표시 */}
      {isExporting && (
        <div className="mt-4 p-3 bg-blue-50 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-blue-900">출력 중...</span>
            <span className="text-sm text-blue-700">{exportProgress}%</span>
          </div>
          <div className="w-full bg-blue-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
              style={{ width: `${exportProgress}%` }}
            ></div>
          </div>
        </div>
      )}

      {/* 프린터 설정 안내 */}
      <div className="mt-4 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
        <div className="text-sm font-medium text-yellow-900 mb-2">
          🖨️ 사전 인쇄된 명찰 용지 출력 안내
        </div>
        <div className="text-xs text-yellow-700 space-y-1">
          <div>• 프린터에 9cm x 12.5cm 명찰 용지를 넣어주세요</div>
          <div>• 프린터 설정에서 용지 크기를 "사용자 정의"로 설정하세요</div>
          <div>• 용지 크기: 9cm x 12.5cm</div>
          <div>• 배경 이미지는 가이드용이므로 기본적으로 인쇄되지 않습니다</div>
          <div>• 위치가 맞지 않으면 X/Y축 조정으로 미세 조정하세요</div>
          <div>• 고품질 출력을 위해 "고품질" 또는 "최고 품질"을 선택하세요</div>
        </div>
      </div>

      {/* 안내 메시지 */}
      {!selectedProfile && (
        <div className="text-center p-4 text-gray-500 text-sm">
          명단을 선택하여 출력을 시작하세요
        </div>
      )}
    </div>
  )
}
