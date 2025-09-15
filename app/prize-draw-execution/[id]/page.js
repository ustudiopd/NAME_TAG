'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { getPrizeDraw } from '../../../lib/prizeDrawDatabase'
import PrizeDrawExecution from '../../../components/PrizeDrawExecution'

export default function PrizeDrawExecutionPage() {
  const params = useParams()
  const prizeDrawId = params.id
  const [prizeDraw, setPrizeDraw] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (prizeDrawId) {
      loadPrizeDraw()
    }
  }, [prizeDrawId])

  const loadPrizeDraw = async () => {
    try {
      setLoading(true)
      const { data, error } = await getPrizeDraw(prizeDrawId)
      
      if (error) throw error
      
      if (data) {
        setPrizeDraw(data)
      } else {
        setError('경품추첨을 찾을 수 없습니다.')
      }
    } catch (err) {
      console.error('Error loading prize draw:', err)
      setError('경품추첨을 불러오는 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleUpdate = () => {
    // 부모 창에 업데이트 알림
    if (window.opener) {
      window.opener.postMessage({ type: 'PRIZE_DRAW_UPDATED' }, '*')
    }
    // 새창 닫기
    window.close()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto mb-4"></div>
          <p className="text-lg text-gray-700">경품추첨 실행을 불러오는 중...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">오류 발생</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => window.close()}
            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
          >
            창 닫기
          </button>
        </div>
      </div>
    )
  }

  if (!prizeDraw) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-gray-500 text-6xl mb-4">❓</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">경품추첨을 찾을 수 없습니다</h1>
          <p className="text-gray-600 mb-4">요청하신 경품추첨이 존재하지 않습니다.</p>
          <button
            onClick={() => window.close()}
            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
          >
            창 닫기
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 반응형 CSS */}
      <style jsx>{`
        @media (min-width: 1500px) {
          .responsive-container {
            max-width: 1920px;
            margin: 0 auto;
          }
        }
      `}</style>
      
      {/* 헤더 */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-6xl responsive-container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">경품추첨 실행</h1>
              <p className="text-gray-600 mt-1">{prizeDraw.title}</p>
            </div>
            <button
              onClick={() => window.close()}
              className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
            >
              창 닫기
            </button>
          </div>
        </div>
      </div>

      {/* 메인 내용 */}
      <div className="max-w-6xl responsive-container mx-auto px-4 py-6">
        <PrizeDrawExecution 
          prizeDraw={prizeDraw}
          onUpdate={handleUpdate}
        />
      </div>
    </div>
  )
}
