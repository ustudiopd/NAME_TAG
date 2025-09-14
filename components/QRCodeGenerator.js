'use client'

import { useState, useEffect } from 'react'
import QRCode from 'qrcode'

export default function QRCodeGenerator({ 
  data, 
  size = 100, 
  onQRCodeGenerated,
  className = '' 
}) {
  const [qrCodeDataURL, setQrCodeDataURL] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (data) {
      generateQRCode(data)
    }
  }, [data, size])

  const generateQRCode = async (qrData) => {
    if (!qrData) return

    try {
      setIsGenerating(true)
      setError('')

      const options = {
        width: size,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        },
        errorCorrectionLevel: 'M'
      }

      const dataURL = await QRCode.toDataURL(qrData, options)
      setQrCodeDataURL(dataURL)
      
      if (onQRCodeGenerated) {
        onQRCodeGenerated(dataURL)
      }
    } catch (err) {
      console.error('QR코드 생성 오류:', err)
      setError('QR코드 생성에 실패했습니다.')
    } finally {
      setIsGenerating(false)
    }
  }

  const downloadQRCode = () => {
    if (!qrCodeDataURL) return

    const link = document.createElement('a')
    link.download = `qrcode_${data || 'data'}.png`
    link.href = qrCodeDataURL
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  if (isGenerating) {
    return (
      <div className={`flex items-center justify-center ${className}`}>
        <div className="text-sm text-gray-500">QR코드 생성 중...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`flex items-center justify-center ${className}`}>
        <div className="text-sm text-red-500">{error}</div>
      </div>
    )
  }

  if (!qrCodeDataURL) {
    return (
      <div className={`flex items-center justify-center ${className}`}>
        <div className="text-sm text-gray-400">QR코드 데이터를 입력하세요</div>
      </div>
    )
  }

  return (
    <div className={`flex flex-col items-center space-y-2 ${className}`}>
      <img
        src={qrCodeDataURL}
        alt="QR Code"
        className="border border-gray-300 rounded"
        style={{ width: size, height: size }}
      />
      <button
        onClick={downloadQRCode}
        className="px-2 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600"
      >
        다운로드
      </button>
    </div>
  )
}

