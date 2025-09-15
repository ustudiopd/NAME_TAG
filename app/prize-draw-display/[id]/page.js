'use client'

import { useState, useEffect } from 'react'
import { getPrizeDraw, getPrizes, getPrizeWinners } from '../../../lib/prizeDrawDatabase'
import FullscreenCardDraw from '../../../components/FullscreenCardDraw'

export default function PrizeDrawDisplay({ params }) {
  const [prizeDraw, setPrizeDraw] = useState(null)
  const [prizes, setPrizes] = useState([])
  const [winners, setWinners] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCardDraw, setShowCardDraw] = useState(false)
  const [currentPrize, setCurrentPrize] = useState(null)
  const [currentWinners, setCurrentWinners] = useState([])

  useEffect(() => {
    if (params?.id) {
      // 초기 로드만
      loadPrizeDrawData(true)
    }
  }, [params?.id])

  // 부모 창에서 오는 메시지 수신
  useEffect(() => {
    const handleMessage = (event) => {
      if (event.data?.type === 'PRIZE_DRAW_START') {
        console.log('경품추첨 시작 알림 수신:', event.data.prize)
        setCurrentPrize(event.data.prize)
        setCurrentWinners([])
        setShowCardDraw(true)
      } else if (event.data?.type === 'PRIZE_DRAW_RESULT') {
        console.log('경품추첨 결과 수신:', event.data.winners)
        setCurrentWinners(event.data.winners)
        // 데이터 새로고침
        loadPrizeDrawData(false)
      } else if (event.data?.type === 'PRIZE_DRAW_UPDATE') {
        console.log('경품추첨 업데이트 알림 수신:', event.data.updatedWinners)
        // 재추첨 결과로 현재 당첨자 업데이트
        if (event.data.updatedWinners) {
          setCurrentWinners(event.data.updatedWinners)
        } else {
          // 데이터 새로고침
          loadPrizeDrawData(false)
        }
      } else if (event.data?.type === 'PRIZE_DRAW_RESET') {
        console.log('경품추첨 초기화 알림 수신')
        // 데이터 새로고침
        loadPrizeDrawData(false)
        // 카드 뒤집기 화면 닫기
        setShowCardDraw(false)
        setCurrentPrize(null)
        setCurrentWinners([])
      }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [])

  const loadPrizeDrawData = async (isInitialLoad = false) => {
    try {
      if (isInitialLoad) {
        setLoading(true)
      }
      
      // 경품추첨 정보 로드
      console.log('loadPrizeDrawData 호출됨:', { paramsId: params.id, isInitialLoad })
      const { data: prizeDrawData, error: prizeDrawError } = await getPrizeDraw(params.id)
      if (prizeDrawError) throw prizeDrawError
      console.log('경품추첨 데이터 로드됨:', prizeDrawData)
      setPrizeDraw(prizeDrawData)

      // 경품 목록 로드
      const { data: prizesData, error: prizesError } = await getPrizes(params.id)
      if (prizesError) throw prizesError
      setPrizes(prizesData || [])

      // 당첨자 목록 로드
      const { data: winnersData, error: winnersError } = await getPrizeWinners(params.id)
      if (winnersError) throw winnersError
      setWinners(winnersData || [])

    } catch (err) {
      console.error('Error loading prize draw data:', err)
    } finally {
      if (isInitialLoad) {
        setLoading(false)
      }
    }
  }

  const handleShowCardDraw = (prizeId) => {
    const prize = prizes.find(p => p.id === prizeId)
    const prizeWinners = winners.filter(w => w.prize_id === prizeId)
    
    if (prize && prizeWinners.length > 0) {
      setCurrentPrize(prize)
      setCurrentWinners(prizeWinners)
      setShowCardDraw(true)
    }
  }


  const handleRedraw = async (cardIndex, winnerId) => {
    console.log('재추첨 요청:', { cardIndex, winnerId })
    
    // 카드 뒤집기 애니메이션 시작 (재추첨 중임을 표시)
    setCurrentWinners(prev => {
      const newWinners = [...prev]
      // 해당 카드를 임시로 뒤집기 해제하여 "추첨중..." 표시
      return newWinners
    })
    
    // 부모 창(경품추첨 실행창)에 재추첨 요청 메시지 전송
    try {
      // window.opener와 window.parent 모두 시도
      const targetWindow = window.opener || window.parent
      
      if (targetWindow && !targetWindow.closed) {
        targetWindow.postMessage({ 
          type: 'PRIZE_DRAW_REDRAW_REQUEST', 
          prizeId: currentPrize.id, 
          cardIndex,
          winnerId 
        }, '*')
        console.log('재추첨 요청 메시지 전송 완료 (opener/parent)')
      } else {
        console.log('부모 창이 열려있지 않음 - opener:', !!window.opener, 'parent:', !!window.parent)
        
        // 직접 부모 창에 접근 시도
        if (window.parent !== window) {
          window.parent.postMessage({ 
            type: 'PRIZE_DRAW_REDRAW_REQUEST', 
            prizeId: currentPrize.id, 
            cardIndex,
            winnerId 
          }, '*')
          console.log('재추첨 요청 메시지 전송 완료 (parent 직접)')
        }
      }
    } catch (error) {
      console.error('재추첨 요청 전송 오류:', error)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center text-white">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-orange-500 mx-auto mb-4"></div>
          <p className="text-2xl font-bold">로딩 중...</p>
        </div>
      </div>
    )
  }

  if (!prizeDraw) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center text-white">
          <p className="text-2xl font-bold">경품추첨 정보를 찾을 수 없습니다.</p>
        </div>
      </div>
    )
  }

  console.log('PrizeDrawDisplayPage 렌더링:', { 
    loading, 
    prizeDrawTitle: prizeDraw?.title, 
    prizeDrawName: prizeDraw?.name,
    showCardDraw, 
    currentPrize: currentPrize?.name,
    currentWinnersLength: currentWinners.length 
  })

  return (
    <div className="min-h-screen bg-black text-white">
      {/* 전체화면 카드 뒤집기 */}
      {showCardDraw && currentPrize && currentWinners.length > 0 && (
        <FullscreenCardDraw
          winners={currentWinners}
          prizeName={currentPrize.name}
          onRedraw={handleRedraw}
        />
      )}

      {/* 메인 화면 - 검은색 배경 빈화면 */}
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="text-8xl mb-8">🎁</div>
          <div className="text-6xl font-black text-white">
            {prizeDraw?.title || '경품추첨'}
          </div>
        </div>
      </div>
    </div>
  )
}
